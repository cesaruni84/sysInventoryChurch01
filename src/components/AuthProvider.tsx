import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, type AuthState } from '@/lib/auth-context'
import { traducirError, urlConfirmacion } from '@/lib/auth-errores'
import type { Sede } from '@/lib/sedes'
import { supabase } from '@/lib/supabase'

const CLAVE_SEDE = 'inventario.sedeActiva'
/** Nombre anterior de la clave; se sigue leyendo para no pedir la sede de nuevo. */
const CLAVE_SEDE_ANTERIOR = 'inventario.lugarActivo'

function leerSedeGuardada(): Sede | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_SEDE) ?? localStorage.getItem(CLAVE_SEDE_ANTERIOR) ?? 'null')
    return v && typeof v.id === 'number' && typeof v.nombre === 'string' ? { id: v.id, nombre: v.nombre } : null
  } catch {
    return null
  }
}

function guardarSede(sede: Sede) {
  try {
    localStorage.setItem(CLAVE_SEDE, JSON.stringify(sede))
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la sede vale solo para esta pestaña.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  // Sin Supabase configurado no hay sesión posible: se muestra el login con el aviso.
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [sedeActiva, setSedeActiva] = useState<Sede | null>(leerSedeGuardada)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva)
      // Al cerrar sesión no deben quedar datos del inventario en caché.
      if (!nueva) queryClient.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const value = useMemo<AuthState>(() => {
    const elegirSede = (sede: Sede) => {
      setSedeActiva(sede)
      guardarSede(sede)
    }
    return {
      session,
      sedeActiva,
      elegirSede,
      async iniciarSesion(email, password, sede) {
        if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(traducirError(error.code, error.message))
        elegirSede(sede)
      },
      async registrarse({ email, password, nombre, apellido, sedeId }) {
        if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // El trigger crear_perfil() copia estos datos a public.perfiles (lugar_id = sede).
            data: { nombre, apellido, lugar_id: sedeId },
            // El enlace del correo de confirmación abre /confirmar-correo en esta misma app.
            emailRedirectTo: urlConfirmacion(),
          },
        })
        // Si el correo ya existe, Supabase responde sin error (para no revelar cuentas);
        // la pantalla muestra el mismo mensaje de "revisa tu correo".
        if (error) throw new Error(traducirError(error.code, error.message))
      },
      async cerrarSesion() {
        await supabase?.auth.signOut()
      },
    }
  }, [session, sedeActiva])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
