import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '../api/types/employee'
import type { LoginRequest } from '../api/types/auth'
import { login as loginApi, logout as logoutApi, fetchMe } from '../api/endpoints/auth'

interface AuthState {
  employee: Employee | null
  permissions: string[]
  officeScopes: number[]
  token: string | null
  /** true selama app baru load & belum tau status login - dipakai ProtectedRoute buat nahan render sebelum redirect prematur. */
  isRestoring: boolean

  login: (payload: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

/**
 * SATU-SATUNYA tempat token/employee/permissions/officeScopes disimpan.
 * TIDAK BOLEH ada payroll/employee-list/dashboard/business data apapun
 * di sini (aturan D) - itu semua tanggung jawab TanStack Query nanti
 * per-feature, bukan authStore.
 *
 * `persist` middleware nyimpen ke localStorage lewat key 'myjap-auth' -
 * TAPI cuma field `token` yang di-persist (lihat partialize). employee/
 * permissions/officeScopes SENGAJA tidak disimpan ke localStorage -
 * selalu di-fetch ulang fresh dari GET /me tiap kali app dibuka lagi
 * (restoreSession). Alasan: kalau permission user diubah HRD di server
 * sementara browser-nya masih kebuka lama, kita gak mau frontend jalan
 * dengan data permission BASI dari localStorage - lebih aman selalu
 * fresh, walau konsekuensinya 1 request /me tambahan tiap buka app.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      employee: null,
      permissions: [],
      officeScopes: [],
      token: null,
      isRestoring: true,

      login: async (payload) => {
        // POST /login TIDAK mengembalikan permissions/office_scopes sama
        // sekali (sudah diverifikasi ke kode di Langkah 2) - jadi
        // GET /me kedua ini BUKAN kenyamanan, itu SATU-SATUNYA cara
        // dapetin permissions/officeScopes setelah login. 2 request ini
        // konsekuensi langsung dari bentuk response backend, bukan
        // desain yang saya karang sendiri.
        const loginData = await loginApi(payload)
        set({ token: loginData.access_token })

        const me = await fetchMe()
        set({
          employee: me.employee,
          permissions: me.permissions,
          officeScopes: me.office_scopes,
        })
      },

      logout: async () => {
        try {
          await logoutApi()
        } catch {
          // Tetap lanjut bersihin state lokal walau request logout ke
          // server gagal (mis. network putus) - user tetap harus bisa
          // "keluar" dari sisi browser meski server gak sempat dikabari.
        }
        set({ employee: null, permissions: [], officeScopes: [], token: null })
      },

      restoreSession: async () => {
        const { token } = get()

        if (!token) {
          set({ isRestoring: false })
          return
        }

        try {
          const me = await fetchMe()
          set({
            employee: me.employee,
            permissions: me.permissions,
            officeScopes: me.office_scopes,
            isRestoring: false,
          })
        } catch {
          // Token yang ke-persist ternyata udah invalid/expired di server
          // (dicek lewat GET /me gagal, biasanya 401) - bersihin semua,
          // anggap belum login.
          set({ employee: null, permissions: [], officeScopes: [], token: null, isRestoring: false })
        }
      },
    }),
    {
      name: 'myjap-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
)

/**
 * Selector, BUKAN field tersimpan - dihitung ulang dari `token` tiap
 * render, gak mungkin "kelupaan di-update" di suatu tempat karena
 * gak pernah di-set manual sama sekali.
 */
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token)

/**
 * Selector derived - persis aturan B: eksplisit cek role_code, BUKAN
 * mengandalkan asumsi "kalau permissions array udah lengkap pasti admin".
 * Dihitung ulang dari `employee` tiap render, sama seperti isAuthenticated.
 */
export const useIsSuperAdmin = () =>
  useAuthStore((s) => s.employee?.role?.role_code === 'SUPER_ADMIN')
