import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

// Unidades de medida (tabla `unidades_medida`, migración 0018). `bienes.unidad_medida` guarda el código.

/** Código de la unidad (mismo check que la columna `unidades_medida.codigo`). */
export const PATRON_CODIGO = /^[A-Z0-9]{2,5}$/

/** Grupo de la unidad (columna `unidades_medida.tipo`, valores fijos). */
export const TIPOS_UNIDAD = ['Cantidades y agrupaciones', 'Peso', 'Volumen y capacidad', 'Longitud y superficie'] as const
export type TipoUnidad = (typeof TIPOS_UNIDAD)[number]

/** Datos que se editan en Configuración → Unidades de medida. */
export interface DatosUnidad {
  codigo: string
  nombre: string
  tipo: TipoUnidad
  descripcion: string | null
  activo: boolean
}

export interface Unidad extends DatosUnidad {
  id: number
  fecha_registro: string
}

const KEY = ['unidades'] as const

function db() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase
}

function errorUnidad(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Ya existe una unidad con ese código.')
  return new Error(error.message)
}

/** Todas las unidades, también las inactivas, por grupo y código. */
export function useUnidades() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Unidad[]> => {
      const { data, error } = await db()
        .from('unidades_medida')
        .select('id, codigo, nombre, tipo, descripcion, activo, fecha_registro')
        .order('id')
      if (error) throw errorUnidad(error)
      // `tipo` llega como texto; el check de la tabla garantiza que es uno de TIPOS_UNIDAD.
      return data as Unidad[]
    },
  })
}

/** Unidades agrupadas por tipo, en el orden de `TIPOS_UNIDAD`, sin los grupos vacíos. */
export function agruparPorTipo(unidades: Unidad[]) {
  return TIPOS_UNIDAD.map((tipo) => ({ tipo, unidades: unidades.filter((u) => u.tipo === tipo) })).filter((g) => g.unidades.length > 0)
}

export function useGuardarUnidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: number; datos: DatosUnidad }) => {
      const consulta =
        id === undefined ? db().from('unidades_medida').insert(datos) : db().from('unidades_medida').update(datos).eq('id', id)
      const { error } = await consulta
      if (error) throw errorUnidad(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** No hay FK (los bienes guardan el código como texto), así que se revisa a mano si está en uso. */
export function useEliminarUnidad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (unidad: Pick<Unidad, 'id' | 'codigo'>) => {
      const { data, error: errorUso } = await db().from('bienes').select('id').eq('unidad_medida', unidad.codigo).limit(1)
      if (errorUso) throw errorUnidad(errorUso)
      if (data.length > 0) throw new Error('No se puede eliminar porque hay bienes con esta unidad. Desactívala en su lugar.')
      const { error } = await db().from('unidades_medida').delete().eq('id', unidad.id)
      if (error) throw errorUnidad(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
