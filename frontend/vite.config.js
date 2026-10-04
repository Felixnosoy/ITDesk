import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // El build de produccion queda con la URL de la API fija adentro. Si falta
  // VITE_API_URL se cortaria el build en vez de publicar una app que llama a
  // "undefined/auth/login" y falla recien en el navegador.
  if (command === 'build') {
    const { VITE_API_URL } = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }

    if (!/^https?:\/\/.+/.test(VITE_API_URL ?? '')) {
      throw new Error(
        'Falta VITE_API_URL (ej. https://mi-backend.onrender.com/api). ' +
        'Se configura como variable de entorno en el hosting, o en frontend/.env.production.local para un build local.'
      )
    }
  }

  return {
    plugins: [react()],
  }
})
