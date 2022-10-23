import mongoose from 'mongoose'
import { after, before } from 'mocha'
import { MongoMemoryServer } from 'mongodb-memory-server'
import globby from 'globby'
import path from 'path'
import fs from 'fs/promises'

let mongo = null

const connect = async () => {
  if (mongo) return

  // mongoose.set('debug', false)

  mongo = await MongoMemoryServer.create({
    replSet: { dbName: 'sapienza-test' },
  })

  const uri = mongo.getUri()

  await mongoose.connect(uri, {
    dbName: 'migoose-test',
    autoCreate: true,
  })
}

const clearDatabase = async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map(async collection => {
      await collection.deleteMany({})
    }),
  )
}

before(async () => {
  await connect()

  // Clean All Migrations
  const files = await globby(path.posix.join('tests/migrations', '*.{js,ts}'))

  for (const file of files) {
    await fs.unlink(file)
  }
})

beforeEach(async () => {
  await clearDatabase()
})

after(async () => {
  await clearDatabase()

  // noinspection JSConstantReassignment
  /**
   * We need to clear the schemas and models otherwise Mocha will try to
   * overwrite them since the same instance is utilized.
   */
  mongoose.connection.models = {}
  // noinspection JSConstantReassignment
  mongoose.models = {}

  await Promise.all(
    Object.values(mongoose.connection.collections).map(async collection => {
      await collection.dropIndexes()
    }),
  )

  await mongoose.disconnect()
  await mongo.stop()
  mongo = null
})
