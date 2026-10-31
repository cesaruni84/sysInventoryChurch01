import { valorTotal, type Bien } from './bienes'
import { formatFecha } from './utils'

/** Datos del encabezado del formato "Inventario Físico de Bienes y Enseres". */
export interface ParametrosReporte {
  sede: string
  /** Distrito de la sede (`lugares.distrito`); si falta, se usa el de la iglesia. */
  distrito: string | null
  fecha: string // ISO yyyy-mm-dd
}

export const IGLESIA = {
  ministerio: 'TIEMPO DE RESTAURACIÓN',
  nombre: 'IGLESIA CRISTIANA DE AVIVAMIENTO',
  /** Distrito por defecto del encabezado, para sedes sin distrito registrado. */
  distrito: 'VITARTE',
  titulo: 'INVENTARIO FÍSICO DE BIENES Y ENSERES',
}

/** Distrito que va en el primer recuadro del encabezado. */
export function distritoEncabezado(p: Pick<ParametrosReporte, 'distrito'>) {
  return (p.distrito?.trim() || IGLESIA.distrito).toUpperCase()
}

/** Firmas al pie del reporte. */
export const FIRMAS = ['ELABORADO POR', 'REVISADO POR', 'APROBADO POR'] as const

/** Marca de la columna de estado (B/R/M) que corresponde al bien. */
export const MARCA_ESTADO = '✓'

/** Columnas del formato, en el mismo orden que la hoja Excel (A–P). */
export const COLUMNAS = [
  { titulo: 'N°\nORD.', ancho: 6 },
  { titulo: 'CÓDIGO\nCLASIFICACIÓN\nDEL BIEN', ancho: 14 },
  { titulo: 'DESCRIPCIÓN DEL BIEN (CARACTERÍSTICAS)', ancho: 34 },
  { titulo: 'MARCA', ancho: 12 },
  { titulo: 'MODELO', ancho: 12 },
  { titulo: 'SERIE', ancho: 12 },
  { titulo: 'COLOR', ancho: 9 },
  { titulo: 'UBICACIÓN DEL\nBIEN', ancho: 14 },
  { titulo: 'UNIDAD DE\nMEDIDA', ancho: 10 },
  { titulo: 'FECHA DE\nADQUISICIÓN\nO DONACIÓN', ancho: 12 },
  { titulo: 'DOCUMENTO\nDE\nSUSTENTO', ancho: 12 },
  // ESTADO: B, R, M
  { titulo: 'B', ancho: 4.5 },
  { titulo: 'R', ancho: 4.5 },
  { titulo: 'M', ancho: 4.5 },
  { titulo: 'CANT.', ancho: 7 },
  { titulo: 'VALOR\nUNITARIO', ancho: 12 },
] as const

export const COL_ESTADO_INICIO = 11 // índice 0-based de la columna "B"

/** Columnas (0-based) centradas: N°, unidad, fecha, B/R/M y cantidad. */
export const COLUMNAS_CENTRADAS = new Set([0, 8, 9, 11, 12, 13, 14])

/** Una fila del formato como valores de texto/número por columna. */
export function filaReporte(b: Bien, n: number): (string | number)[] {
  return [
    n,
    b.codigo_clasificacion ?? '',
    b.descripcion,
    b.marca ?? '',
    b.modelo ?? '',
    b.serie ?? '',
    b.color ?? '',
    b.ubicacion,
    b.unidad_medida,
    formatFecha(b.fecha_adquisicion),
    b.documento ?? '',
    b.estado === 'B' ? MARCA_ESTADO : '',
    b.estado === 'R' ? MARCA_ESTADO : '',
    b.estado === 'M' ? MARCA_ESTADO : '',
    b.cantidad,
    b.valor_unitario,
  ]
}

export function totalesReporte(bienes: Bien[]) {
  return {
    cantidad: bienes.reduce((s, b) => s + b.cantidad, 0),
    valor: bienes.reduce((s, b) => s + valorTotal(b), 0),
  }
}

export function etiquetaTotales(n: number) {
  return `TOTALES (${n} ${n === 1 ? 'bien' : 'bienes'})`
}

export function nombreArchivo(p: ParametrosReporte) {
  const sede = p.sede.trim().replace(/[^\p{L}\p{N}]+/gu, '_') || 'Inventario'
  return `Inventario_Fisico_${sede}_${p.fecha}.xlsx`
}
