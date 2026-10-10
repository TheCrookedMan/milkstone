import './sync-theme-colors.mjs'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const target = join(root, 'skills/milk-white-web-design/assets/shadcn-catalog')
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const selected = [
  'vue', 'reka-ui', '@vueuse/core', '@lucide/vue', 'lucide-vue-next',
  '@internationalized/date', '@unovis/vue', '@unovis/ts', '@tanstack/vue-table',
  'vee-validate', '@vee-validate/zod', 'zod', 'embla-carousel-vue', 'vue-input-otp',
  'vue-sonner', 'clsx', 'tailwind-merge', 'class-variance-authority',
  '@fontsource-variable/noto-sans-sc', '@fontsource/ibm-plex-sans',
  'tailwindcss', '@tailwindcss/vite', 'tw-animate-css', 'vite',
  '@vitejs/plugin-vue', 'typescript', 'vue-tsc', '@types/node',
]
await mkdir(join(target, 'src/styles'), { recursive:true })
for (const [from, to] of [
  ['src/components/ui', 'src/components/ui'],
  ['src/components/shadcn-gallery', 'src/components/shadcn-gallery'],
  ['src/components/ShadcnGallery.vue', 'src/components/ShadcnGallery.vue'],
  ['src/data/shadcn-catalog.ts', 'src/data/shadcn-catalog.ts'],
  ['src/lib/utils.ts', 'src/lib/utils.ts'],
  ['src/styles/shadcn-theme.css', 'src/styles/shadcn-theme.css'],
  ['src/styles/shadcn-metrics.css', 'src/styles/shadcn-metrics.css'],
  ['skills/milk-white-web-design/assets/milk-tokens.css', 'src/styles/milk-tokens.css'],
  ['skills/milk-white-web-design/assets/theme-colors.css', 'src/styles/theme-colors.css'],
  ['skills/milk-white-web-design/assets/theme-controller.ts', 'src/theme-controller.ts'],
  ['skills/milk-white-web-design/assets/press-controller.ts', 'src/press-controller.ts'],
  ['skills/milk-white-web-design/assets/components/ThemeModeSwitch.vue', 'src/components/ThemeModeSwitch.vue'],
  ['public/licenses/shadcn-vue-MIT.txt', 'LICENSE.shadcn-vue.txt'],
  ['docs/shadcn-registry-source.json', 'registry-source.json'],
]) {
  await mkdir(join(target, to, '..'), { recursive:true })
  await cp(join(root, from), join(target, to), { recursive:true })
}
await writeFile(join(target, 'package.json'), JSON.stringify({
  name:'milk-paper-shadcn-catalog', version:manifest.version, private:true,
  type:'module', engines:manifest.engines, packageManager:manifest.packageManager,
  scripts:{ dev:'vite', typecheck:'vue-tsc --noEmit', build:'vite build', preview:'vite preview' },
  devDependencies:Object.fromEntries(selected.map(name => [name, manifest.devDependencies[name]])),
}, null, 2) + '\n')
const configuration = JSON.parse(await readFile(join(root, 'components.json'), 'utf8'))
configuration.tailwind.css = 'src/style.css'
await writeFile(join(target, 'components.json'), JSON.stringify(configuration, null, 2) + '\n')
await writeFile(join(target, 'pnpm-workspace.yaml'), "packages:\n  - '.'\nonlyBuiltDependencies:\n  - esbuild\n  - vue-demi\n")
await cp(join(root, 'tsconfig.json'), join(target, 'tsconfig.json'))
await writeFile(join(target, 'vite.config.ts'), `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins:[vue(), tailwindcss()],
  resolve:{ alias:{ '@':new URL('./src', import.meta.url).pathname } },
  server:{host:'127.0.0.1'}, preview:{host:'127.0.0.1'}
})\n`)
await writeFile(join(target, 'index.html'), `<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#e9eaee"><title>MILK / 纸面组件集</title><script>try{const mode=localStorage.getItem('milk-design-theme')==='dark'?'dark':'light';document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;document.querySelector('meta[name=theme-color]')?.setAttribute('content',mode==='dark'?'#1c1f24':'#e9eaee')}catch{}</script></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n`)
await writeFile(join(target, 'src/main.ts'), `import { createApp } from 'vue'
import '@fontsource-variable/noto-sans-sc'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import App from './App.vue'
import { initTheme } from './theme-controller'
import { initPressFeedback } from './press-controller'
import './style.css'
initTheme()
const disposePressFeedback = initPressFeedback()
import.meta.hot?.dispose(disposePressFeedback)
createApp(App).mount('#app')\n`)
await writeFile(join(target, 'src/style.css'), `@import "tailwindcss" source(none);
@source "./";
@import "tw-animate-css";
@import "./styles/theme-colors.css";
@import "./styles/milk-tokens.css";
@import "./styles/shadcn-theme.css";
@import "./styles/shadcn-metrics.css";
.catalog-shell{max-width:1240px;margin:auto;padding:50px 40px 80px}
.catalog-intro{padding:20px 0 35px}.catalog-intro h1{font-size:38px;font-weight:500;margin:12px 0}
.catalog-intro p{color:var(--milk-muted)}.eyebrow{font-size:11px;letter-spacing:2px;color:var(--milk-muted)}
@media(max-width:680px){.catalog-shell{padding:25px 22px 50px}.catalog-intro h1{font-size:28px}}\n`)
await writeFile(join(target, 'src/App.vue'), `<script setup lang="ts">
import ShadcnGallery from './components/ShadcnGallery.vue'
import ThemeModeSwitch from './components/ThemeModeSwitch.vue'
</script>
<template><main class="catalog-shell"><header class="catalog-intro"><ThemeModeSwitch/><span class="eyebrow">MILK / PAPER COMPONENT LIBRARY</span><h1>七十种组件，一种触感。</h1><p>按键、表单、导航与浮层。70 项 shadcn-vue 交互示例，在同一张纸面上展开。</p></header><ShadcnGallery/></main></template>\n`)
console.log('Synced shadcn-vue standalone catalog from the landing page source.')
