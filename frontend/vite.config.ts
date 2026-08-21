import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Só existe quando o CLI do Tauri invoca o Vite (`tauri dev` / `tauri build`)
const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Evita a tela de erro do Vite sobrepor a janela nativa enquanto o Rust
  // ainda está recompilando.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Usado pelo `tauri android dev`/`tauri ios dev` (expõe pro dispositivo
    // físico/emulador em vez de só localhost); sem efeito no build desktop.
    host: process.env.TAURI_DEV_HOST || false,
  },
  // Builda alinhado ao motor do WebView em vez do menor-denominador-comum de
  // browsers — só se aplica ao empacotar via Tauri; fora dele usa o target
  // padrão do Vite (bom o bastante para o deploy web no Render).
  build: {
    ...(isTauri
      ? { target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13' }
      : {}),
    minify: isTauri && process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    sourcemap: !!isTauri && !!process.env.TAURI_ENV_DEBUG,
  },
  // O Tauri injeta variáveis TAURI_ENV_* no processo — sem isso o Vite as
  // descarta e `import.meta.env` fica sem elas.
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
})
