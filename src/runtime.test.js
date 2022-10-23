import { Migoose } from './index'
import { expect } from 'chai'

describe('Migoose Runtime', () => {
  before(async () => {
    await Migoose.createFile('hello world')
    await Migoose.createFile('hello world')
    await Migoose.createFile('hello world')

    await Migoose.generateIndex()
  })

  it('it should load all migrations into memory', async () => {
    await import('../tests/migrations')

    expect(Migoose.migrationList).to.have.length(3)
  })
})
