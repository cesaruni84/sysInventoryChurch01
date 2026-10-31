import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CodigoRol } from './permisos'
import { supabase } from './supabase'

/**
 * Rol del sistema. Son cuatro y fijos (`codigo`, 0017): sus permisos están en las reglas de la base de
 * datos y en `permisosDe()`, así que la app no crea ni borra roles; solo se edita su nombre y descripción.
 */
export interface Rol {
  id: number
  nombre: string
  codigo: CodigoRol
  descripcion: string | null
}

export async function listarRoles(): Promise<Rol[]> {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  const { data, error } = await supabase.from('roles').select('id, nombre, codigo, descripcion').order('id')
  if (error) throw new Error(error.message)
  return data as Rol[]
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: listarRoles, staleTime: 5 * 60_000 })
}

export function useActualizarRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nombre, descripcion }: { id: number; nombre: string; descripcion: string | null }) => {
      if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
      const { error } = await supabase.from('roles').update({ nombre, descripcion }).eq('id', id)
      if (error) throw new Error(error.code === '23505' ? 'Ya existe un rol con ese nombre.' : error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      // El listado de usuarios muestra el nombre del rol.
      qc.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })
}
