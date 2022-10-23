import { isEmpty } from 'lodash'
import { Document, Model, Mongoose, QueryWithHelpers, Schema } from 'mongoose'
import globby from 'globby'
import path from 'path'
import { loadConfig } from './utils/load-config'
import chalk from 'chalk'

type MigrationExecutor = {
  up?: () => Promise<void> | void
  down?: () => Promise<void> | void
}

type MigrationModuleMap = Record<
  string,
  { migration: Promise<{ default: MigrationExecutor }>; name: string }
>

export interface Migration {
  _id?: string
  version?: number
  isLocked?: boolean
  lockedAt?: Date
}

const config = loadConfig()

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

MigrationSchema.methods.getMigrationMapFromFileList = function (
  fileList,
): MigrationModuleMap {
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
      [timestamp]: {
        migration: import(path.resolve('.', filePath)),
        name: path.basename(filePath),
      },
    }
  }, {})
}

MigrationSchema.methods.run = async function (fileList) {
  const migrationMap: MigrationModuleMap =
    this.getMigrationMapFromFileList(fileList)

  const migrationMapEntries = Object.entries(migrationMap)

  if (isEmpty(migrationMapEntries)) {
    console.log(chalk.gray('Migrations already up-to-date.'))
    return
  }

  this.isLocked = true

  await this.save()

  for (const [timestamp, { migration, name }] of migrationMapEntries) {
    console.log(chalk.gray(`Running migration "${name}"...`))

    // @ts-ignore
    const { default: migrationObject } = await migration

    if (!migrationObject.up) {
      throw new Error(`No up() method found for "${name}".`)
    }

    await migrationObject.up()

    this.version = Number(timestamp)

    await this.save()
  }

  this.isLocked = false
  await this.save()
}

MigrationSchema.statics.getState = async function (_id = 'default') {
  const state = await this.findOne({ _id }).lean(false)

  if (!state) {
    await this.create({
      _id,
      version: 0,
    })

    return this.findOne({ _id }).lean(false)
  }

  return state
}

MigrationSchema.statics.migrate = async function (namespace = 'default') {
  const state = await this.getState(namespace)

  if (state?.isLocked) {
    return console.error(chalk.red('Migrations are locked.'))
  }

  console.log(chalk.yellow('Migrations running...'))

  const migrationPath =
    process.env.NODE_ENV === 'production'
      ? config.dir.production
      : config.dir.development

  const files = await globby(path.posix.join(migrationPath, '*.{js,ts}'))

  await state?.run(files)

  console.log(chalk.green('Migrations finished.'))
}

export const getMigrationModel = (mongoose: Mongoose) =>
  mongoose.model<Migration, MigrationModel>('migrations', MigrationSchema)
