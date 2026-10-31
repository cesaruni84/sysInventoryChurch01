import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSedeActiva } from './auth-context'
import { borrarImagen } from './imagenes'
import { supabase } from './supabase'

export type Estado = 'B' | 'R' | 'M'

export const ESTADOS: Record<Estado, string> = {
  B: 'Bueno',
  R: 'Regular',
  M: 'Malo',
}

export interface Bien {
  id: number
  /** Categoría del catálogo `categorias` (0014); opcional. */
  categoria_id: number | null
  codigo_clasificacion: string | null
  descripcion: string
  marca: string | null
  modelo: string | null
  serie: string | null
  color: string | null
  /** Ubicación del catálogo `ubicaciones`; null en bienes antiguos sin enlazar. */
  ubicacion_id: number | null
  /** Descripción de la ubicación, copiada al guardar (la usan filtros y reporte). */
  ubicacion: string
  unidad_medida: string
  fecha_adquisicion: string | null
  documento: string | null
  estado: Estado
  cantidad: number
  valor_unitario: number
  /** Ruta de la imagen en el bucket `bienes` de Storage (solo se muestra en el formulario). */
  imagen: string | null
  /** Sede del bien (FK a la tabla `lugares`). */
  lugar_id: number
  /** Nombre de la sede, copiado al guardar. */
  lugar: string
  created_at: string
  updated_at: string
}

export type BienInput = Omit<Bien, 'id' | 'created_at' | 'updated_at'>

const TABLA = 'bienes'
const KEY = ['bienes'] as const

function db() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase
}

/** Postgres devuelve numeric como string; se normaliza a number. */
function normalizar(row: Bien): Bien {
  return { ...row, valor_unitario: Number(row.valor_unitario), cantidad: Number(row.cantidad) }
}

export async function listarBienes(sedeId: number): Promise<Bien[]> {
  const { data, error } = await db().from(TABLA).select('*').eq('lugar_id', sedeId).order('id', { ascending: true })
  if (error) throw error
  return (data as Bien[]).map(normalizar)
}

export async function obtenerBien(id: number): Promise<Bien> {
  const { data, error } = await db().from(TABLA).select('*').eq('id', id).single()
  if (error) throw error
  return normalizar(data as Bien)
}

export async function crearBien(input: BienInput): Promise<Bien> {
  const { data, error } = await db().from(TABLA).insert(input).select().single()
  if (error) throw error
  return normalizar(data as Bien)
}

export async function actualizarBien(id: number, input: BienInput): Promise<Bien> {
  const { data, error } = await db().from(TABLA).update(input).eq('id', id).select().single()
  if (error) throw error
  return normalizar(data as Bien)
}

export async function eliminarBien(id: number): Promise<void> {
  const { data, error } = await db().from(TABLA).delete().eq('id', id).select('imagen')
  if (error) throw error
  // Borra también la imagen del bien en Storage (si tenía).
  await borrarImagen(data?.[0]?.imagen)
}

// --- Hooks de React Query ---
// Todas las pantallas leen la lista completa de la sede activa (inventario pequeño)
// y derivan filtros y totales en el cliente, así comparten una sola caché por sede.

export function useBienes() {
  const sede = useSedeActiva()
  return useQuery({ queryKey: [...KEY, 'sede', sede.id], queryFn: () => listarBienes(sede.id) })
}

export function useBien(id: number | undefined) {
  return useQuery({
    queryKey: [...KEY, 'id', id],
    queryFn: () => obtenerBien(id!),
    enabled: id !== undefined,
  })
}

export function useGuardarBien() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: BienInput }) =>
      id === undefined ? crearBien(input) : actualizarBien(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useEliminarBien() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: eliminarBien,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

// --- Cálculos derivados ---

export function valorTotal(b: Pick<Bien, 'cantidad' | 'valor_unitario'>) {
  return b.cantidad * b.valor_unitario
}

export function resumen(bienes: Bien[]) {
  const porEstado: Record<Estado, number> = { B: 0, R: 0, M: 0 }
  let unidades = 0
  let valor = 0
  for (const b of bienes) {
    porEstado[b.estado]++
    unidades += b.cantidad
    valor += valorTotal(b)
  }
  return {
    registrados: bienes.length,
    unidades,
    valor,
    ubicaciones: ubicacionesDe(bienes).length,
    porEstado,
  }
}

export function ubicacionesDe(bienes: Bien[]) {
  return [...new Set(bienes.map((b) => b.ubicacion.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  )
}

export function mensajeError(e: unknown) {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Ocurrió un error inesperado.'
}
