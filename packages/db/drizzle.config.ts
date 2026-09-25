import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { defineConfig } from 'drizzle-kit'
import { databasePath } from './src/client.ts'

// drizzle-kit opens the file itself and won't create a missing directory.
mkdirSync(dirname(databasePath), { recursive: true })

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  dbCredentials: { url: databasePath },
  verbose: true,
})
