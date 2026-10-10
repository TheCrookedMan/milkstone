import { defineConfig, type Connect } from 'vite'
import { readFile } from 'node:fs/promises'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
function downloads(server: { middlewares: Connect.Server }) {
  server.middlewares.use(async (req, res, next) => {
    const file = req.url?.split('?')[0]?.slice(1)
    if (!file || !['milk-white-web-design.skill', 'milk-white-web-design.skill.zip', 'milk-white-web-design.tar.gz'].includes(file)) return next()
    try {
      const data = await readFile(new URL(`./public/${file}`, import.meta.url))
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${file}"`)
      res.setHeader('Content-Length', data.length)
      res.setHeader('Cache-Control', 'no-store')
      res.end(req.method === 'HEAD' ? undefined : data)
    } catch (error) { next(error) }
  })
}
export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  plugins: [vue(), tailwindcss(), { name: 'skill-downloads', configureServer: downloads, configurePreviewServer: downloads }],
  server: { host: '0.0.0.0', port: 4340, strictPort: true },
  preview: { host: '0.0.0.0', port: 4340, strictPort: true }
})
