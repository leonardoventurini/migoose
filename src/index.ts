import fs from 'fs/promises'
import path from 'path'
import { loadConfig } from './utils/load-config'
import globby from 'globby'
import { existsSync, mkdirSync } from 'fs'
import { Mongoose } from 'mongoose'
import { Migration, MigrationModel, MigrationSchema } from '@/schema'
import chalk from 'chalk'

export const ES5Template = `
const { Migoose } = require('migoose')

Migoose.addMigration(
  {{timestamp}},
  '{{description}}',
  async function() {}
)
`

export const ES6Template = `
import { Migoose } from 'migoose'

Migoose.addMigration(
  {{timestamp}},
  '{{description}}',
  async function() {}
)
`

export const ImportTemplate = `import './{{filename}}'`

const config = loadConfig()

export const Migoose = {
  migrationList: new Map(),

  model(mongoose: Mongoose) {
    return mongoose.model<Migration, MigrationModel>(
      config.collectionName,
      MigrationSchema,
    )
  },

  addMigration(timestamp: number, description: string, fn: CallableFunction) {
    this.migrationList.set(timestamp, { timestamp, description, fn })
  },

  async getFiles() {
    const files = await globby(path.posix.join(config.dir, '*.{js,ts}'))

    return files.filter(
      f => !f.endsWith('/index.js') && !f.endsWith('/index.ts'),
    )
  },

  async generateIndex() {
    const files = await this.getFiles()

    const imports = files
      .map(f => {
        return ImportTemplate.replace(
          '{{filename}}',
          path.basename(f).split('.')[0],
        )
      })
      .join('\n')

    const index = `${imports}\n`

    await fs.writeFile(
      path.posix.join(config.dir, `index.${config.typescript ? 'ts' : 'js'}`),
      index,
    )
  },

  async createFile(description: string) {
    if (!existsSync(config.dir)) {
      mkdirSync(config.dir)
    }

    let contents = config.es6 ? ES6Template : ES5Template

    const timestamp = Date.now()

    const name = `${timestamp}_${description
      .trim()
      .replace(/ /g, '_')
      .toLowerCase()}.${config.typescript ? 'ts' : 'js'}`

    contents = contents
      .replace('{{timestamp}}', timestamp.toString())
      .replace('{{description}}', description)

    const filename = path.resolve(config.dir, name)

    console.log(chalk.gray(`Creating migration file "${filename}"...`))

    await fs.writeFile(filename, contents.trimStart())

    await this.generateIndex()
  },

  async migrate(mongoose: Mongoose, namespace = 'default') {
    const state = await this.model(mongoose).getState(namespace)

    if (state?.isLocked) {
      return console.error(chalk.red('Migrations are locked.'))
    }

    console.log(chalk.yellow('Migrations running...'))

    await state.run()

    console.log(chalk.green('Migrations finished.'))
  },

  reset() {
    this.migrationList.clear()
  },
}
