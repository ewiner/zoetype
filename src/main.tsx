import { createRoot } from 'react-dom/client'

// Self-hosted fonts (replaces the Google Fonts <link>). @fontsource registers the
// exact same family names, so the font-family strings in the app are unchanged.
// Latin subset only — the app is English, so we skip the Cyrillic/Vietnamese files.
import '@fontsource/bangers/latin-400.css'
import '@fontsource/bubblegum-sans/latin-400.css'
import '@fontsource/bungee-shade/latin-400.css'
import '@fontsource/patrick-hand/latin-400.css'
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/fredoka/latin-400.css'
import '@fontsource/fredoka/latin-600.css'

import './styles/global.css'
import App from './App'

// NOTE: intentionally NOT wrapped in <StrictMode>. This app is built around
// heavy imperative side effects (Pointer Lock, Fullscreen, a virtual cursor,
// Web Audio). StrictMode's deliberate double-invoke of effects in development
// makes those request-gesture-gated APIs misbehave in dev only; the effects all
// clean up after themselves, so production behaviour is unaffected either way.
createRoot(document.getElementById('root')!).render(<App />)
