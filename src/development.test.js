import { Migoose } from './index'
import { expect } from 'chai'
import fs from 'fs/promises'

describe('Migoose Development', () => {
  before(async () => {
    await Migoose.createFile('hello world')
  })

  const getFirstFile = async () => {
    const files = await Migoose.getFiles()

    expect(files).to.have.lengthOf(1)

    return fs.readFile(files[0], 'utf8')
  }

  it('it should generate a file and add it to index', async () => {
    const files = await Migoose.getFiles()

    expect(files).to.have.lengthOf(1)

    expect(files[0]).to.match(/tests\/migrations\/\d+_hello_world\.js/)
  })

  it('it should contain template', async () => {
    const files = await Migoose.getFiles()

    const timestamp = files[0].match(/\d+/)[0]

    const contents = await getFirstFile()

    expect(contents).to.include("import { Migoose } from 'migoose'")

    expect(contents).to.match(/'hello world',/g)

    expect(contents).to.include(timestamp)
  })

  it('should generate the index file', async () => {
    await Migoose.generateIndex()

    const indexContents = await fs.readFile('tests/migrations/index.js', 'utf8')

    expect(indexContents).to.match(/import '\.\/\d+_hello_world'/g)
  })
})
