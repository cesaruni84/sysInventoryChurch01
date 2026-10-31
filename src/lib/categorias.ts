import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Bien } from './bienes'
import { supabase } from './supabase'

// Categorías de bienes (tabla `categorias`, migración 0014). Son comunes a todas las sedes.

/** Prefijo del código de clasificación (mismo check que la columna `categorias.prefijo`). */
export const PATRON_PREFIJO = /^[A-Z]{2,5}$/

/** Tipo contable de la categoría (columna `categorias.tipo`, valores fijos desde 0015). */
export const TIPOS_CONTABLES = ['Activo Fijo', 'Suministro'] as const
export type TipoContable = (typeof TIPOS_CONTABLES)[number]

/** Datos que se editan en Configuración → Categorías. */
export interface DatosCategoria {
  nombre: string
  prefijo: string | null
  tipo: TipoContable | null
  descripcion: string | null
  activo: boolean
}

export interface Categoria extends DatosCategoria {
  id: number
  fecha_registro: string
}

const KEY = ['categorias'] as const

function db() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase
}

function errorCategoria(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Ya existe una categoría con ese nombre o prefijo.')
  if (error.code === '23503') return new Error('No se puede eliminar porque hay bienes en esta categoría. Desactívala en su lugar.')
  return new Error(error.message)
}

/** Todas las categorías, también las inactivas, en orden alfabético. */
export function useCategorias() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await db()
        .from('categorias')
        .select('id, nombre, prefijo, tipo, descripcion, activo, fecha_registro')
        .order('nombre')
      if (error) throw errorCategoria(error)
      return data
    },
  })
}

/** Al cambiar una categoría se refrescan también los bienes (listado y filtros). */
function useRefrescar() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: ['bienes'] })
  }
}

export function useGuardarCategoria() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: number; datos: DatosCategoria }) => {
      const consulta = id === undefined ? db().from('categorias').insert(datos) : db().from('categorias').update(datos).eq('id', id)
      const { error } = await consulta
      if (error) throw errorCategoria(error)
    },
    onSuccess: refrescar,
  })
}

export function useEliminarCategoria() {
  const refrescar = useRefrescar()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await db().from('categorias').delete().eq('id', id)
      if (error) throw errorCategoria(error)
    },
    onSuccess: refrescar,
  })
}

/**
 * Siguiente código de clasificación para un prefijo, según los bienes dados (los de la sede):
 * con COC-001…COC-013 registrados devuelve COC-014. Usa al menos 3 dígitos.
 */
export function siguienteCodigo(prefijo: string, bienes: Pick<Bien, 'codigo_clasificacion'>[]) {
  const patron = new RegExp(`^${prefijo}-(\\d+)$`, 'i')
  let mayor = 0
  for (const b of bienes) {
    const m = b.codigo_clasificacion?.trim().match(patron)
    if (m) mayor = Math.max(mayor, Number(m[1]))
  }
  return `${prefijo}-${String(mayor + 1).padStart(3, '0')}`
}
