import mongoose from 'mongoose'
import { after, before } from 'mocha'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { deleteFiles } from './delete-files'
import chai from 'chai'
import sinonChai from 'sinon-chai'

let mongo = null

chai.use(sinonChai)

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

  await deleteFiles()
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
