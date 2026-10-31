import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

// Mantenimiento genérico de catálogos simples desde Configuración (hoy, ubicaciones; las sedes
// tienen más datos y su propia página, src/pages/configuracion/Sedes.tsx).
// Cada tabla tiene id, un campo de nombre, orden, activo y fecha_registro.

export interface ItemCatalogo {
  id: number
  nombre: string
  orden: number
  activo: boolean
  fecha_registro: string
}

export interface DatosItem {
  nombre: string
  orden: number
  activo: boolean
}

export interface ConfigCatalogo {
  tabla: 'ubicaciones'
  /** Columna que guarda el nombre visible. */
  campoNombre: 'descripcion'
  /** Claves de React Query que dependen del catálogo y se refrescan al cambiarlo. */
  invalidar: string[][]
  /** Los registros pertenecen a una sede (columna `lugar_id`): se listan y crean en la sede indicada. */
  porSede?: boolean
}

export const CATALOGO_UBICACIONES: ConfigCatalogo = {
  tabla: 'ubicaciones',
  campoNombre: 'descripcion',
  invalidar: [['ubicaciones'], ['bienes']],
  porSede: true,
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase
}

function errorCatalogo(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Ya existe un registro con ese nombre.')
  if (error.code === '23503') return new Error('No se puede eliminar porque está en uso (bienes o usuarios). Desactívalo en su lugar.')
  return new Error(error.message)
}

/** En catálogos por sede, exige la sede (evita listar o crear registros sin sede). */
function sedeRequerida(config: ConfigCatalogo, sedeId: number | undefined) {
  if (config.porSede && sedeId === undefined) throw new Error('Falta la sede para este catálogo.')
  return sedeId
}

export function useCatalogo(config: ConfigCatalogo, sedeId?: number) {
  return useQuery({
    queryKey: ['catalogo', config.tabla, config.porSede ? sedeId : 'todas'],
    queryFn: async (): Promise<ItemCatalogo[]> => {
      let consulta = db().from(config.tabla).select(`id, ${config.campoNombre}, orden, activo, fecha_registro`)
      if (config.porSede) consulta = consulta.eq('lugar_id', sedeRequerida(config, sedeId)!)
      const { data, error } = await consulta.order('orden').order(config.campoNombre)
      if (error) throw errorCatalogo(error)
      return (data as unknown as Record<string, unknown>[]).map((r) => ({
        id: r.id as number,
        nombre: r[config.campoNombre] as string,
        orden: r.orden as number,
        activo: r.activo as boolean,
        fecha_registro: r.fecha_registro as string,
      }))
    },
  })
}

function useRefrescar(config: ConfigCatalogo) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['catalogo', config.tabla] })
    for (const key of config.invalidar) qc.invalidateQueries({ queryKey: key })
  }
}

export function useGuardarItem(config: ConfigCatalogo, sedeId?: number) {
  const refrescar = useRefrescar(config)
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: number; datos: DatosItem }) => {
      const fila: Record<string, string | number | boolean> = {
        [config.campoNombre]: datos.nombre,
        orden: datos.orden,
        activo: datos.activo,
      }
      // Al crear en un catálogo por sede se asigna la sede; al editar no se mueve de sede.
      if (id === undefined && config.porSede) fila.lugar_id = sedeRequerida(config, sedeId)!
      const consulta = id === undefined ? db().from(config.tabla).insert(fila) : db().from(config.tabla).update(fila).eq('id', id)
      const { error } = await consulta
      if (error) throw errorCatalogo(error)
    },
    onSuccess: refrescar,
  })
}

export function useEliminarItem(config: ConfigCatalogo) {
  const refrescar = useRefrescar(config)
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await db().from(config.tabla).delete().eq('id', id)
      if (error) throw errorCatalogo(error)
    },
    onSuccess: refrescar,
  })
}
