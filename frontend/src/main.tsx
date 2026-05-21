import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { UnidadProvider } from './lib/unidad'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UnidadProvider>
        <App />
      </UnidadProvider>
    </BrowserRouter>
  </StrictMode>,
)
