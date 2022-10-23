import { Migoose } from './index'
import { expect } from 'chai'
import { deleteFiles } from '../tests/delete-files'
import sinon from 'sinon'
import mongoose from 'mongoose'
import { getMigrationModel } from './schema'

describe('Migoose Runtime', () => {
  const MigrationCollection = getMigrationModel(mongoose)

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

  it('should run all migrations', async () => {
    Migoose.migrationList.forEach(migration => {
      sinon.stub(migration, 'fn').resolves()
    })

    await MigrationCollection.migrate('test')

    Migoose.migrationList.forEach(migration => {
      expect(migration.fn).to.have.been.called
    })
  })

  it('should run all migrations in order', async () => {
    Migoose.migrationList.clear()

    delete require.cache[require.resolve('../tests/migrations')]

    await import('../tests/migrations')

    const order = []

    Migoose.migrationList.forEach(migration => {
      sinon.stub(migration, 'fn').callsFake(() => {
        order.push(migration.description)
      })
    })

    await MigrationCollection.migrate('test')

    expect(order).to.deep.equal([
      'hello world 1',
      'hello world 2',
      'hello world 3',
    ])
  })
})
