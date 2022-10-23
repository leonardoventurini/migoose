import { Migoose } from './index'
import { expect } from 'chai'
import { deleteFiles } from '../tests/delete-files'

describe('Migoose Runtime', () => {
  beforeEach(async () => {
    await deleteFiles()

    await Migoose.createFile('hello world 1')

    await new Promise(resolve => setTimeout(resolve, 10))

    await Migoose.createFile('hello world 2')

    await new Promise(resolve => setTimeout(resolve, 10))

    await Migoose.createFile('hello world 3')

    await Migoose.generateIndex()
  })

  it('it should load all migrations into memory', async () => {
    delete require.cache[require.resolve('../tests/migrations')]

    await import('../tests/migrations')

    expect(Migoose.migrationList).to.have.length(3)

    for (const [timestamp, migration] of Migoose.migrationList) {
      expect(migration).to.have.property('description').which.is.a('string')
      expect(migration).to.have.property('fn').which.is.a('function')
      expect(timestamp).to.be.a('number')
    }
  })
})
