import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

export const supabase = supabaseConfigurado ? createClient(url!, anonKey!) : null

/**
 * Cliente que no guarda ni reemplaza la sesión del navegador. Se usa para registrar
 * cuentas de otras personas (Usuarios → Registro) sin cerrar la sesión de quien registra.
 */
export function clienteSinSesion() {
  if (!supabaseConfigurado) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-registro-temporal' },
  })
}
