import os from 'os'
import fs from 'fs'
import path from 'path'

function createTestFileStorageStream (filename, type, id) {
  const testPath = path.join(os.tmpdir(), filename)
  return [fs.createWriteStream(testPath), testPath]
}

export const createStorageStream = createTestFileStorageStream
