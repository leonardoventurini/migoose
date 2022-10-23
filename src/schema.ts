import { isEmpty } from 'lodash'
import { Document, Model, QueryWithHelpers, Schema } from 'mongoose'
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

  getFreshMigrations(): number[]
}

export interface MigrationModel<
  TSchema = Migration,
  TQueryHelpers = any,
  TMethods = MigrationMethods,
> extends Model<TSchema, TQueryHelpers, TMethods> {
  getState(
    namespace?: string,
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

MigrationSchema.methods.getFreshMigrations = async function () {
  return Array.from(Migoose.migrationList.keys())
    .sort((a, b) => a - b)
    .filter(key => !this.hasRun(key))
}

MigrationSchema.methods.run = async function () {
  const migrations = await this.getFreshMigrations()

  if (isEmpty(migrations)) {
    console.log(chalk.gray('Migrations already up-to-date.'))
    return
  }

  this.isLocked = true

  await this.save()

  for (const timestamp of migrations) {
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
    return await this.create({
      _id,
      version: 0,
    })
  }

  return state
}
