import { isEmpty } from 'lodash'
import { Model, QueryWithHelpers, Schema, Document, Mongoose } from 'mongoose'
import globby from 'globby'
import path from 'path'
import fs from 'fs'

type MigrationExecutor = {
  up?: () => Promise<void> | void
  down?: () => Promise<void> | void
}

type MigrationModuleMap = Record<
  string,
  Promise<{ default: MigrationExecutor }>
>

export interface Migration {
  _id?: string
  version?: number
  isLocked?: boolean
  lockedAt?: Date
}

const config = {
  dir: path.resolve(__dirname, 'migrations'),
  typescript: false
}

const configPath = path.resolve(process.cwd(), '.migooserc.json')
const configExists = fs.existsSync(configPath)

if (configExists) {
  Object.assign(config, require(configPath))
}

export interface MigrationMethods {
  hasRun(timestamp: string): boolean

  getMigrationMapFromFileList(fileList: string[]): MigrationModuleMap

  run(fileList: string[]): void
}

export interface MigrationModel<
  TSchema = Migration,
  TQueryHelpers = any,
  TMethods = MigrationMethods,
  > extends Model<TSchema, TQueryHelpers, TMethods> {
  migrate(namespace: string, ...dir: string[]): Promise<void>

  getState(
    namespace: string,
  ): QueryWithHelpers<
    Document<TSchema, TMethods> | null,
    Document<TSchema, TMethods>,
    TQueryHelpers,
    TSchema
  >
}

const VERSION_FILE_REGEX = /\/(\d{13})[a-z0-9_]*\.[tj]s/

const isValidPath = path => VERSION_FILE_REGEX.test(path)

const getTimestampFromPath = path => path.match(VERSION_FILE_REGEX)?.[1]

export const MigrationSchema = new Schema<
  Migration,
  MigrationModel,
  any,
  MigrationMethods
>({
  _id: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
  },
  isLocked: {
    type: Boolean,
  },
  lockedAt: {
    type: Date,
  },
})

MigrationSchema.methods.hasRun = function (timestamp) {
  return Number(timestamp) <= this.version
}

MigrationSchema.methods.getMigrationMapFromFileList = function (fileList) {
  const filtered = fileList.filter(isValidPath).sort()

  if (isEmpty(filtered)) {
    // eslint-disable-next-line no-console
    console.log('No valid migrations found.')
  }

  return filtered.reduce((acc, filePath) => {
    const timestamp = getTimestampFromPath(filePath)

    if (this.hasRun(timestamp)) return acc

    return {
      ...acc,
      [timestamp]: import(path.resolve('.', filePath)),
    }
  }, {})
}

MigrationSchema.methods.run = async function (fileList) {
  const migrationMap = this.getMigrationMapFromFileList(fileList)

  const migrationMapEntries = Object.entries(migrationMap)

  if (isEmpty(migrationMapEntries)) {
    console.log('Migrations already up-to-date.')
    return
  }

  this.isLocked = true

  await this.save()

  for (const [timestamp, migration] of migrationMapEntries) {
    // @ts-ignore
    const { default: migrationObject } = await migration

    if (!migrationObject.up) {
      throw new Error(`No up() method found for ${timestamp}.`)
    }

    await migrationObject.up()

    this.version = Number(timestamp)

    await this.save()
  }

  this.isLocked = false
  await this.save()
}

MigrationSchema.statics.getState = async function (_id: string = 'default') {
  const state = await this.findOne({ _id })

  if (!state) {
    await this.create({
      _id,
      version: 0,
    })

    return this.findOne({ _id })
  }

  return state
}

MigrationSchema.statics.migrate = async function (
  namespace: string = 'default',
  ...dir: string[]
) {
  const state = await this.getState(namespace)

  if (state?.isLocked) {
    return console.log('Migrations are locked.')
  }

  console.log('Migrations running...')

  let files

  if (isEmpty(dir)) {
    files = await globby(path.posix.join(config.dir, '*.{js,ts}'))
  } else {
    files = await globby(path.posix.join(...dir, '*.{js,ts}'))
  }

  await state?.run(files)

  console.log('Migrations finished.')
}

export const getMigrationModel = (mongoose: Mongoose) => mongoose.model<Migration, MigrationModel>('migrations', MigrationSchema)