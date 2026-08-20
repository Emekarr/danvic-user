import { access, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'

const outputDirectory = resolve('out')
const indexPath = resolve(outputDirectory, 'index.html')
const cloudflare404Path = resolve(outputDirectory, '404.html')

// Cloudflare Pages only enables its built-in SPA route fallback when a
// top-level 404.html is absent. Next static export creates that file even for
// a client-routed application, causing ID-based routes to return Next's 404
// document before the app can dispatch them.
await access(indexPath)
await unlink(cloudflare404Path).catch((error) => {
  if (error?.code !== 'ENOENT') throw error
})

console.log('Prepared static output for Cloudflare Pages SPA routing.')
