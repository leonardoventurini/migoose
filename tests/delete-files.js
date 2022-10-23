import globby from 'globby'
import path from 'path'
import fs from 'fs/promises'

export const deleteFiles = async () => {
  // Clean All Migrations
  const files = await globby(path.posix.join('tests/migrations', '*.{js,ts}'))

  for (const file of files) {
    await fs.unlink(file)
  }
}
