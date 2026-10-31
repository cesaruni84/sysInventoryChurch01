import { useQuery } from '@tanstack/react-query'
import { useAuth } from './auth-context'
import type { Sede } from './sedes'
import { supabase } from './supabase'

/** Códigos fijos de `roles.codigo` (0017). Los nombres visibles pueden cambiar; los códigos no. */
export type CodigoRol = 'admin' | 'encargado' | 'revisor' | 'aprobador'

/** Rol y sede del usuario que tiene la sesión. */
export interface PerfilActual {
  rol: CodigoRol | null
  /** Sede registrada en su perfil: la única a la que accede cualquier rol que no sea Administrador. */
  sede: Sede | null
}

export function usePerfilActual() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['perfil', userId, 'actual'],
    queryFn: async (): Promise<PerfilActual> => {
      if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
      const { data, error } = await supabase
        .from('perfiles')
        .select('roles(codigo), lugares!perfiles_lugar_id_fkey(id, nombre)')
        .eq('id', userId!)
        .maybeSingle<{ roles: { codigo: CodigoRol | null } | null; lugares: Sede | null }>()
      if (error) throw error
      return { rol: data?.roles?.codigo ?? null, sede: data?.lugares ?? null }
    },
    enabled: userId !== undefined,
    staleTime: 5 * 60_000,
  })
}

export interface Permisos {
  rol: CodigoRol | null
  esAdmin: boolean
  /** Registrar, editar y eliminar bienes. */
  editarBienes: boolean
  /** Listar, registrar y editar usuarios (de su sede, salvo el Administrador). */
  gestionarUsuarios: boolean
  eliminarUsuarios: boolean
  gestionarUbicaciones: boolean
  /** Categorías, sedes y roles. */
  gestionarConfiguracion: boolean
  /** Trabajar con una sede distinta a la del perfil. */
  cambiarSede: boolean
}

/** Permisos según el rol. La base de datos los exige con RLS (0017); esto solo ajusta la interfaz. */
export function permisosDe(rol: CodigoRol | null): Permisos {
  const esAdmin = rol === 'admin'
  const puedeGestionar = esAdmin || rol === 'encargado'
  return {
    rol,
    esAdmin,
    editarBienes: puedeGestionar,
    gestionarUsuarios: puedeGestionar,
    eliminarUsuarios: esAdmin,
    gestionarUbicaciones: puedeGestionar,
    gestionarConfiguracion: esAdmin,
    cambiarSede: esAdmin,
  }
}

export function usePermisos(): Permisos {
  const { data } = usePerfilActual()
  return permisosDe(data?.rol ?? null)
}
