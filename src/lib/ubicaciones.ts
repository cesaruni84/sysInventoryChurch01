import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export interface Ubicacion {
  id: number
  descripcion: string
}

/** Ubicaciones activas de una sede (tabla `ubicaciones`), para el combo del registro de bienes. */
export async function listarUbicaciones(sedeId: number): Promise<Ubicacion[]> {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  const { data, error } = await supabase
    .from('ubicaciones')
    .select('id, descripcion')
    .eq('lugar_id', sedeId)
    .eq('activo', true)
    .order('orden')
    .order('descripcion')
  if (error) throw error
  return data
}

/** `sedeId` undefined deja la consulta en espera (p. ej. mientras carga el bien a editar). */
export function useUbicaciones(sedeId: number | undefined) {
  return useQuery({
    queryKey: ['ubicaciones', sedeId],
    queryFn: () => listarUbicaciones(sedeId!),
    enabled: sedeId !== undefined,
    staleTime: 5 * 60_000,
  })
}
