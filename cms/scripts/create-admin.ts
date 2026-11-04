// Creates the first admin so nobody can claim /admin/create-first-user on the public site.
// Run: NODE_ENV=production ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm payload run scripts/create-admin.ts
import { getPayload } from 'payload'
import config from '../src/payload.config'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required')

const payload = await getPayload({ config })
const { totalDocs } = await payload.count({ collection: 'users' })
if (totalDocs > 0) {
  console.log(`users already exist (${totalDocs}); nothing created`)
} else {
  await payload.create({ collection: 'users', data: { email, password } })
  console.log('admin created')
}
process.exit(0)
