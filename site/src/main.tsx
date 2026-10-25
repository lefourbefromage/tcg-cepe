import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Polices auto-hébergées (sous-ensemble latin, graisses utilisées uniquement).
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/unbounded/latin-600.css'
import '@fontsource/unbounded/latin-800.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-700.css'
import '@fontsource/lilita-one/latin-400.css'
import './index.css'
import App from './App.tsx'
import { GameProvider } from './game/GameProvider'
import { preloadCardFrames } from './lib/preload'

preloadCardFrames()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </StrictMode>,
)
