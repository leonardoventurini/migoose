import { boolean, object, string } from 'yup'
import { cosmiconfigSync } from 'cosmiconfig'
import { merge } from 'lodash'
import { resolve } from 'path'

export const loadConfig = () => {
  const explorer = cosmiconfigSync('migoose')

  const cfg = explorer.search()

  const config = merge(
    {
      collectionName: 'migrations',
      dir: resolve(process.cwd(), 'migrations'),
      es6: false,
      typescript: false,
    },
    cfg?.config,
  )

  object({
    collectionName: string().required(),
    dir: string().required(),
    es6: boolean(),
    typescript: boolean(),
  }).validate(config)

  return config
}
