import fs from 'fs/promises'
import path from 'path'
import { loadConfig } from './utils/load-config'
import globby from 'globby'

export const ES5Template = `
const { Migoose } = require('migoose')

Migoose.addMigration(
  {{timestamp}},
  '{{description}}',
  {
    async up() {},
  }
)
`

export const ES6Template = `
import { Migoose } from 'migoose'

Migoose.addMigration(
  {{timestamp}},
  '{{description}}',
  {
    async up() {},
  }
)
`

export const ImportTemplate = `import './{{filename}}'`

const config = loadConfig()

export const Migoose = {
  migrationList: new Map(),

  addMigration(timestamp: number, description: string, fn: CallableFunction) {
    this.migrationList.set(timestamp, { description, fn })
  },

  async getFiles() {
    const files = await globby(path.posix.join(config.dir, '*.{js,ts}'))

    return files.filter(f => f !== 'index.js' && f !== 'index.ts')
  },

  async generateIndex() {
    const files = await this.getFiles()
    const imports = files
      .map(f =>
        ImportTemplate.replace(
          '{{filename}}',
          path.basename(f, config.typescript ? '.ts' : '.js'),
        ),
      )
      .join('\n')

    const index = `${imports}\n`

    await fs.writeFile(
      path.posix.join(config.dir, `index.${config.typescript ? 'ts' : 'js'}`),
      index,
    )
  },

  async createFile(description: string) {
    let contents = config.es6 ? ES6Template : ES5Template

    const timestamp = Date.now()

    const name = `${timestamp}_${description.replace(/ /g, '_')}.${
      config.typescript ? 'ts' : 'js'
    }`

    contents = contents
      .replace('{{timestamp}}', timestamp.toString())
      .replace('{{description}}', description)

    const filename = path.resolve(config.dir, name)

    await fs.writeFile(filename, contents.trimStart())
  },
}
