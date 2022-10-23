import { isEmpty } from 'lodash'
import { Document, Model, Mongoose, QueryWithHelpers, Schema } from 'mongoose'
import chalk from 'chalk'
import { Migoose } from '@/index'

export interface Migration {
  _id?: string
  version?: number
  isLocked?: boolean
  lockedAt?: Date
}

export interface MigrationMethods {
  hasRun(timestamp: string): boolean

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

MigrationSchema.methods.run = async function (fileList) {
  const sortedKeys = Array.from(Migoose.migrationList.keys())
    .sort((a, b) => a - b)
    .filter(key => !this.hasRun(key))

  if (isEmpty(sortedKeys)) {
    console.log(chalk.gray('Migrations already up-to-date.'))
    return
  }

  this.isLocked = true

  await this.save()

  for (const timestamp of sortedKeys) {
    const migration = Migoose.migrationList.get(timestamp)

    console.log(chalk.gray(`Running migration "${migration.description}"...`))

    if (!migration.fn) {
      throw new Error(`No up() method found for "${migration.description}".`)
    }

    await migration.fn()

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

  await state.run()

  console.log(chalk.green('Migrations finished.'))
}

export const getMigrationModel = (mongoose: Mongoose) =>
  mongoose.model<Migration, MigrationModel>('migrations', MigrationSchema)
