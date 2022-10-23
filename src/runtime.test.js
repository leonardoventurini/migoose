import { Migoose } from './index'
import { expect } from 'chai'
import { deleteFiles } from '../tests/delete-files'
import sinon from 'sinon'
import mongoose from 'mongoose'

describe('Migoose Runtime', () => {
  beforeEach(async () => {
    await deleteFiles()

    Migoose.reset()

    await Migoose.createFile('hello world 1')

    await new Promise(resolve => setTimeout(resolve, 10))

    await Migoose.createFile('hello world 2')

    await new Promise(resolve => setTimeout(resolve, 10))

    await Migoose.createFile('hello world 3')

    await Migoose.generateIndex()

    delete require.cache[require.resolve('../tests/migrations')]
  })

  it('it should load all migrations into memory', async () => {
    await import('../tests/migrations')

    expect(Migoose.migrationList).to.have.length(3)

    for (const [timestamp, migration] of Migoose.migrationList) {
      expect(migration).to.have.property('description').which.is.a('string')
      expect(migration).to.have.property('fn').which.is.a('function')
      expect(timestamp).to.be.a('number')
    }
  })

  it('should run all migrations', async () => {
    await import('../tests/migrations')

    Migoose.migrationList.forEach(migration => {
      sinon.stub(migration, 'fn').resolves()
    })

    await Migoose.migrate(mongoose)

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

    await Migoose.migrate(mongoose)

    expect(order).to.deep.equal([
      'hello world 1',
      'hello world 2',
      'hello world 3',
    ])
  })

  it('should not run them twice', async () => {
    await import('../tests/migrations')

    const cachedMigrations = Array.from(Migoose.migrationList.values())

    Migoose.migrationList.forEach(migration => {
      sinon.stub(migration, 'fn').resolves()
    })

    await Migoose.migrate(mongoose)

    Migoose.migrationList.forEach(migration => {
      expect(migration.fn).to.have.been.called
    })

    await Migoose.createFile('hello world 4')

    await new Promise(resolve => setTimeout(resolve, 10))

    await Migoose.createFile('hello world 5')

    await new Promise(resolve => setTimeout(resolve, 10))

    await Migoose.createFile('hello world 6')

    await Migoose.generateIndex()

    delete require.cache[require.resolve('../tests/migrations')]

    await import('../tests/migrations')

    const state = await Migoose.model(mongoose).getState()

    const freshMigrations = await state.getFreshMigrations()

    expect(freshMigrations).to.have.length(3)

    expect(Migoose.migrationList).to.have.length(6)

    const oldMigrations = Array.from(Migoose.migrationList.values()).filter(
      ({ timestamp }) => !freshMigrations.includes(timestamp),
    )

    expect(oldMigrations).to.be.deep.equal(cachedMigrations)

    const newMigrations = Array.from(Migoose.migrationList.values()).filter(
      ({ timestamp }) => freshMigrations.includes(timestamp),
    )

    newMigrations.forEach(migration => {
      sinon.stub(migration, 'fn').resolves()
    })

    await Migoose.migrate(mongoose)

    Migoose.migrationList.forEach(migration => {
      expect(migration.fn).to.have.been.calledOnce
    })
  })
})
