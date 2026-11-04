// Two stages because `next build` needs sharp for blur placeholders, while the Worker bundle must not contain it.
import { execSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const run = (cmd, env = {}) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } })

const store = path.join(root, 'node_modules', '.pnpm')
const sharp = readdirSync(store).find((name) => name.startsWith('sharp@'))
if (!sharp) throw new Error('sharp not found in the pnpm store; wrangler normally brings it in')

const symlinkPatch = path.join(root, 'scripts', 'win-symlink.cjs').split(path.sep).join('/')

run('pnpm exec next build --webpack', {
  NODE_OPTIONS: `--no-deprecation --max-old-space-size=8000 --require=${symlinkPatch}`,
  NODE_PATH: path.join(store, sharp, 'node_modules'),
  SKIP_REMOTE_BINDINGS: '1',
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'build-time-only',
  NEXT_PUBLIC_SERVER_URL: 'https://local.bizhelp.kr',
})
run('pnpm exec opennextjs-cloudflare build --skipNextBuild', {
  NODE_OPTIONS: `--require=${symlinkPatch}`,
})
