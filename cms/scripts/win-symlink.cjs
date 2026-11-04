// Windows without Developer Mode cannot create symlinks, and OpenNext needs them while bundling.
// Directories become junctions and files are copied; neither needs elevated rights.
const fs = require('node:fs')
const path = require('node:path')

if (process.platform === 'win32') {
  const original = fs.symlinkSync
  fs.symlinkSync = (target, linkPath, type) => {
    const resolved = path.resolve(path.dirname(String(linkPath)), String(target))
    if (fs.statSync(resolved).isDirectory()) return original(resolved, linkPath, 'junction')
    return fs.copyFileSync(resolved, linkPath)
  }
}
