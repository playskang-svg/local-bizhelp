// Downloads the Linux build of the latest successful run and deploys it with the local wrangler login.
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const sh = (cmd) => execSync(cmd, { stdio: 'inherit' })
const repo = 'playskang-svg/local-bizhelp'
const runId = execSync(
  `gh run list --repo ${repo} --workflow build.yml --status success --limit 1 --json databaseId --jq ".[0].databaseId"`,
  { encoding: 'utf8' },
).trim()
if (!runId) throw new Error('no successful build run found')

rmSync('.open-next', { recursive: true, force: true })
rmSync('worker-dist', { recursive: true, force: true })
rmSync('open-next.tgz', { force: true })
sh(`gh run download ${runId} --repo ${repo} --name open-next --dir .`)
try {
  sh('tar -xzf open-next.tgz')
} catch {
  sh('tar --force-local -xzf open-next.tgz')
}
rmSync('open-next.tgz')
// Absolute Linux paths in the handler only resolve on the runner, so the runner bundles and this uploads as is.
// OPEN_NEXT_DEPLOY stops wrangler from handing off to opennextjs-cloudflare deploy, which would rebundle here.
execSync('pnpm exec wrangler deploy worker-dist/worker.js --no-bundle', {
  stdio: 'inherit',
  env: { ...process.env, OPEN_NEXT_DEPLOY: 'true' },
})
console.log(`deployed run ${runId}`)
