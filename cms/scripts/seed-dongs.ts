// Fills the 31 Cheonan dongs from ../shared/dongs.json. Safe to re-run: matched by slug.
// Run: pnpm payload run scripts/seed-dongs.ts   (NODE_ENV=production for remote D1)
import fs from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const dongs: { slug: string; name: string; gu: 'dongnam' | 'seobuk'; isatipsSlug: string }[] =
  JSON.parse(fs.readFileSync(path.resolve('../shared/dongs.json'), 'utf8'))

const payload = await getPayload({ config })
for (const data of dongs) {
  const { docs } = await payload.find({ collection: 'dongs', where: { slug: { equals: data.slug } }, limit: 1, depth: 0 })
  if (docs[0]) await payload.update({ collection: 'dongs', id: docs[0].id, data, depth: 0 })
  else await payload.create({ collection: 'dongs', data, depth: 0 })
}
console.log(`seeded ${dongs.length} dongs`)
process.exit(0)
