import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const licenses = join(root, 'public/licenses')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const direct = { ...manifest.dependencies, ...manifest.devDependencies }
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0
const sha256 = data => createHash('sha256').update(data).digest('hex')
const rows = []
let copied = 0

// These files remain independent of the project's license. Never delete old
// notices: a dependency upgrade may need both historical and current copies.
async function preserve(name, version, suffix, data) {
  const slug = name.replace(/^@/, '').replaceAll('/', '-')
  let filename = `${slug}${suffix}.txt`
  let existing
  try { existing = await readFile(join(licenses, filename)) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  if (existing && !existing.equals(data)) {
    filename = `${slug}-${version}${suffix}.txt`
    try {
      const previous = await readFile(join(licenses, filename))
      if (!previous.equals(data)) throw Error(`Conflicting preserved notice for ${name}@${version}`)
      return filename
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  } else if (existing) return filename
  await writeFile(join(licenses, filename), data, { flag: 'wx' })
  copied++
  return filename
}

async function noticeFiles(directory, relative = '') {
  const files = []
  const entries = (await readdir(join(directory, relative), { withFileTypes: true }))
    .sort((a, b) => order(a.name, b.name))
  for (const entry of entries) {
    const path = relative ? `${relative}/${entry.name}` : entry.name
    const notice = /licen[sc]e|notice|copying|copyright/i.test(entry.name)
    if (entry.isFile() && (relative || notice)) files.push(path)
    else if (entry.isDirectory() && notice) files.push(...await noticeFiles(directory, path))
  }
  return files
}

function suffixFor(path) {
  if (/^licen[sc]e(?:\.md|\.txt)?$/i.test(path)) return ''
  if (/^notice(?:\.md|\.txt)?$/i.test(path)) return '-NOTICE'
  return `-${path.replace(/\.(md|txt)$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-')}`
}

await mkdir(licenses, { recursive: true })
for (const name of Object.keys(direct).sort(order)) {
  const directory = join(root, 'node_modules', name)
  const installed = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'))
  if (installed.name !== name || installed.version !== direct[name]) {
    throw Error(`Install the exact pinned dependency before syncing: ${name}`)
  }
  const license = typeof installed.license === 'string'
    ? installed.license : installed.license?.type
  if (!license) throw Error(`Missing package license declaration: ${name}`)
  const files = []
  for (const path of await noticeFiles(directory)) {
    const data = await readFile(join(directory, path))
    files.push(await preserve(name, installed.version, suffixFor(path), data))
  }
  let note = 'Copied from the installed package.'
  if (['embla-carousel-vue', 'embla-carousel-fade'].includes(name) && !files.length) {
    // The published Vue wrapper omits LICENSE; preserve the exact official
    // repository license at the matching v8.6.0 tag instead. No network is
    // needed to regenerate notices after the repository has been cloned.
    if (installed.version !== '8.6.0') throw Error('Review the upstream Embla license for the new version.')
    const data = await readFile(join(licenses, 'embla-carousel-vue.txt'))
    if (sha256(data) !== '992490064b90ec94c302fe5f29dcc14cb44145857064e46f9ffe6c8f511c1093') {
      throw Error('The preserved Embla v8.6.0 license does not match its reviewed source.')
    }
    files.push('embla-carousel-vue.txt')
    note = 'Published package has no LICENSE file; exact [v8.6.0 upstream LICENSE](https://raw.githubusercontent.com/davidjerleke/embla-carousel/v8.6.0/LICENSE) is preserved.'
  } else if (name === 'gsap' && !files.length) {
    const source = await readFile(join(directory, 'gsap-core.js'), 'utf8')
    const banner = source.match(/\/\*![\s\S]*?\*\//)?.[0]
    if (!banner?.includes('@license')) throw Error('Missing GSAP copyright/license banner.')
    const data = Buffer.from([
      `GSAP ${installed.version} — upstream license notice`, '',
      `Package license declaration: ${license}`, '', banner, '',
      'GSAP uses its own Standard "No Charge" license, not MIT.',
      'The installed package has no standalone LICENSE or NOTICE file.',
      'The banner above is copied verbatim from the installed gsap-core.js.',
      'The full governing terms are available from the official license page:',
      'https://gsap.com/standard-license',
      'https://gsap.com/community/standard-license/',
      'This notice does not replace or relicense those terms.', '',
    ].join('\n'))
    files.push(await preserve(name, installed.version, '-license-notice', data))
    note = 'Custom Standard "No Charge" license; **not MIT**. Package declaration and source copyright banner preserved; [official full terms](https://gsap.com/community/standard-license/).'
  }
  if (!files.length) throw Error(`No distributable license notice found: ${name}`)
  const displayLicense = name === 'gsap' ? 'Custom Standard “No Charge”' : license
  rows.push(`| \`${name}\` | ${installed.version} | ${displayLicense} | ${files.map(file => `[${file}](licenses/${file})`).join('<br>')} | ${note} |`)
}

const document = [
  '# Third-party notices', '',
  'Generated by `node scripts/sync-third-party-notices.mjs` from the exact installed versions of every direct dependency in the root `package.json`, including runtime libraries and development tools. Run `pnpm install --frozen-lockfile` before regenerating. This inventory covers direct dependencies, not a complete transitive dependency inventory or a claim that every package is bundled into every demo.', '',
  'Third-party software, fonts and icons retain their own copyright and license terms. The project license does not relicense them. Source-design provenance and historical restrictions are recorded separately in [design-sources.md](design-sources.md). Existing historical license copies are retained when regenerating.', '',
  '## Direct dependency inventory', '',
  '| Package | Installed version | Declared license | Preserved license / notice | Source |',
  '| --- | --- | --- | --- | --- |',
  ...rows, '',
  '## Copied component source, fonts and other retained notices', '',
  '- Local shadcn-vue registry component source is MIT, Copyright (c) 2023 unovue. Its [MIT text](licenses/shadcn-vue-MIT.txt) is retained, including in the standalone catalog. Registry source URLs and hashes are recorded in `docs/shadcn-registry-source.json`.',
  '- Hairline runtime, fixed demonstration page, skill instructions and examples from the installed `hairline-create` skill are MIT, Copyright (c) 2026 Lucas Marques. The original kernel, bench, assembler and validator are preserved unchanged in the optional generation service; the empty-tray SVGs are rendered snapshots. The [MIT text](licenses/hairline-MIT.txt) is retained in both distributions. The authored empty-tray geometry, generation service and Vue integration are Milkstone adaptations.',
  '- Noto Sans SC and IBM Plex Sans fonts remain under SIL Open Font License 1.1. In addition to the Fontsource package license copies above, the retained font notices are [Noto Sans SC](licenses/noto-sans-sc.txt) and [IBM Plex Sans](licenses/ibm-plex-sans.txt).',
  '- Lucide notices preserve the upstream ISC terms and the inherited Feather MIT copyright/permission text; neither icon family is relicensed by the project.',
  '- Apache ECharts includes its upstream NOTICE and the bundled [D3 license](licenses/echarts-licenses-LICENSE-d3.txt). TypeScript includes its upstream third-party notice text in the inventory above.',
  '- GSAP is governed by its custom Standard “No Charge” license, not MIT. Its package omits a standalone license file, so the exact package declaration and source banner are retained and linked to the [official governing terms](https://gsap.com/community/standard-license/).',
  '- No ComfyUI implementation code or model weights are distributed. The workflow adapter is independently authored.', '',
].join('\n')
await writeFile(join(root, 'public/third-party-notices.md'), document)
console.log(`Synced notices for ${rows.length} pinned direct dependencies; added ${copied} license/notice copies.`)
