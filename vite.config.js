import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Custom plugin so `index.html` on disk can reference compiled `/assets/app.js` & `/assets/app.css`
// (allowing direct static serving from the repo root without MIME errors), while `vite` dev server
// uses `/src/main.jsx` with full HMR.
const staticRootCompatPlugin = () => ({
  name: 'static-root-compat',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html
        .replace('<link rel="stylesheet" href="/assets/app.css" />', '')
        .replace('<script type="module" src="/assets/app.js"></script>', '<script type="module" src="/src/main.jsx"></script>')
    },
  },
})

export default defineConfig({
  plugins: [staticRootCompatPlugin(), react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names && assetInfo.names.some((n) => n.endsWith('.css'))) {
            return 'assets/app.css'
          }
          return 'assets/[name][extname]'
        },
      },
    },
  },
})
