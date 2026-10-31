import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Sede } from './sedes'

export interface AuthState {
  /** `undefined` mientras se recupera la sesión guardada al cargar la app. */
  session: Session | null | undefined
  /** Sede con la que se trabaja: todo el inventario se filtra por ella. Se recuerda en este navegador. */
  sedeActiva: Sede | null
  elegirSede: (sede: Sede) => void
  iniciarSesion: (email: string, password: string, sede: Sede) => Promise<void>
  registrarse: (datos: DatosRegistro) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export interface DatosRegistro {
  email: string
  password: string
  nombre: string
  apellido: string
  sedeId: number
}

/** Nombre para mostrar, tomado de los metadatos guardados al registrarse. */
export function nombreUsuario(session: Session | null | undefined) {
  const meta = session?.user.user_metadata as { nombre?: string; apellido?: string } | undefined
  return [meta?.nombre, meta?.apellido].filter(Boolean).join(' ')
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

/** Sede activa en rutas protegidas (RequireAuth garantiza que existe). */
export function useSedeActiva(): Sede {
  const { sedeActiva } = useAuth()
  if (!sedeActiva) throw new Error('No hay sede activa')
  return sedeActiva
}
