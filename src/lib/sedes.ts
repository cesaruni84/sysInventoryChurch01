import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

// En la interfaz se llaman "sedes"; en la base de datos son la tabla `lugares`
// y las columnas `lugar_id` (perfiles, bienes).

export interface Sede {
  id: number
  nombre: string
}

export const TIPOS_SEDE = ['Templo', 'Anexo', 'Casa de oración'] as const
export type TipoSede = (typeof TIPOS_SEDE)[number]

/**
 * Datos que se editan en Configuración → Sedes. `codigo` y `orden` siguen en la tabla pero
 * no en el formulario: al editar no se tocan, y al crear se asigna el orden siguiente.
 */
export interface DatosSede {
  nombre: string
  tipo: TipoSede
  direccion: string | null
  distrito: string | null
  provincia: string | null
  departamento: string | null
  responsable_id: string | null
  activo: boolean
}

/** Sede con todos sus datos (Configuración y encabezado del reporte). Solo con sesión. */
export interface SedeDetalle extends DatosSede {
  id: number
  codigo: string | null
  orden: number
  fecha_registro: string
  responsable: { nombre: string; apellido: string } | null
}

const SELECT_DETALLE =
  'id, nombre, codigo, tipo, direccion, distrito, provincia, departamento, responsable_id, orden, activo, fecha_registro, ' +
  'responsable:perfiles!lugares_responsable_id_fkey(nombre, apellido)'

function db() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase
}

/** Sedes activas. Se pueden leer sin sesión: las usan el login y el registro. */
export async function listarSedes(): Promise<Sede[]> {
  // Con sesión, la RLS deja ver también las inactivas (para Configuración → Sedes); aquí solo van las activas.
  const { data, error } = await db().from('lugares').select('id, nombre').eq('activo', true).order('orden').order('nombre')
  if (error) throw error
  return data
}

export function useSedes() {
  return useQuery({ queryKey: ['sedes'], queryFn: listarSedes, staleTime: 5 * 60_000 })
}

/** Sede registrada en el perfil del usuario (puede no tener). */
export async function sedeDelUsuario(userId: string): Promise<Sede | null> {
  const { data, error } = await db()
    .from('perfiles')
    .select('lugares!perfiles_lugar_id_fkey(id, nombre)')
    .eq('id', userId)
    .maybeSingle<{ lugares: Sede | null }>()
  if (error) throw error
  return data?.lugares ?? null
}

export function useSedeDelUsuario(userId: string | undefined) {
  return useQuery({
    queryKey: ['perfil', userId, 'sede'],
    queryFn: () => sedeDelUsuario(userId!),
    enabled: userId !== undefined,
    staleTime: 5 * 60_000,
  })
}

function errorSede(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Ya existe una sede con ese nombre o código.')
  if (error.code === '23503') return new Error('No se puede eliminar porque está en uso (bienes o usuarios). Desactívala en su lugar.')
  return new Error(error.message)
}

/** Todas las sedes, también las inactivas (Configuración → Sedes). */
export function useSedesDetalle() {
  return useQuery({
    queryKey: ['sedes', 'detalle'],
    queryFn: async (): Promise<SedeDetalle[]> => {
      const { data, error } = await db().from('lugares').select(SELECT_DETALLE).order('orden').order('nombre')
      if (error) throw errorSede(error)
      return data as unknown as SedeDetalle[]
    },
  })
}

/** Una sede con todos sus datos (p. ej. el distrito para el encabezado del reporte). */
export function useSede(id: number) {
  return useQuery({
    queryKey: ['sedes', 'detalle', id],
    queryFn: async (): Promise<SedeDetalle> => {
      const { data, error } = await db().from('lugares').select(SELECT_DETALLE).eq('id', id).single()
      if (error) throw errorSede(error)
      return data as unknown as SedeDetalle
    },
  })
}

/** Al cambiar una sede se refrescan los combos, los usuarios (muestran su sede) y los bienes. */
function useRefrescarSedes() {
  const qc = useQueryClient()
  return () => {
    for (const key of [['sedes'], ['usuarios'], ['perfil'], ['bienes']]) qc.invalidateQueries({ queryKey: key })
  }
}

export function useGuardarSede() {
  const refrescar = useRefrescarSedes()
  return useMutation({
    mutationFn: async ({ id, datos, orden }: { id?: number; datos: DatosSede; orden?: number }) => {
      const consulta =
        id === undefined ? db().from('lugares').insert({ ...datos, orden }) : db().from('lugares').update(datos).eq('id', id)
      const { error } = await consulta
      if (error) throw errorSede(error)
    },
    onSuccess: refrescar,
  })
}

export function useEliminarSede() {
  const refrescar = useRefrescarSedes()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await db().from('lugares').delete().eq('id', id)
      if (error) throw errorSede(error)
    },
    onSuccess: refrescar,
  })
}
