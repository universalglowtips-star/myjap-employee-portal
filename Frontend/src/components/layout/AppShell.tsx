import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

interface AppShellProps {
  title: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Kerangka murni: Sidebar (240px, fixed) + Topbar (72px) + content
 * area. Sesuai Implementation Contract Bagian 2B - "Kerangka: Sidebar
 * + Topbar + content area", props `children`.
 *
 * TIDAK ada logic API/auth di sini - Sidebar & Topbar yang masing-masing
 * konsumsi authStore/PermissionGate sendiri, AppShell cuma nyusun
 * layout-nya.
 */
export function AppShell({ title, actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar title={title} actions={actions} />
        <main className="flex-1 bg-neutral-50 p-8">{children}</main>
      </div>
    </div>
  )
}
