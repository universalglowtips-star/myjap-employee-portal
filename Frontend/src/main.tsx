import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

/**
 * 1 instance QueryClient global (standar TanStack Query - bukan
 * "global state baru", ini cuma cache manager buat server-state,
 * beda konsep dari authStore Zustand yang nyimpen session state).
 * Scope pemakaian awal: CUMA Fase B/Department dulu (keputusan
 * eksplisit) - belum diperluas ke fitur lain.
 */
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
