import type { Bien } from './bienes'

/** Etiquetas por hoja A4: 2 columnas × 5 filas. */
export const ETIQUETAS_POR_HOJA = 10

/** Texto del QR: la URL del bien en esta app, para que la cámara normal del teléfono la abra. */
export function textoQr(id: number) {
  return `${window.location.origin}/bienes/${id}`
}

/**
 * Id del bien a partir de lo que leyó el escáner: la URL del QR (`…/bienes/57`), `BIEN-57`
 * o el número a secas (por si un lector USB entrega solo eso). `null` si no se reconoce.
 */
export function idDesdeTexto(texto: string): number | null {
  const t = texto.trim()
  const m = t.match(/\/bienes\/(\d+)\/?(?:[?#].*)?$/) ?? t.match(/^(?:BIEN-?)?(\d+)$/i)
  if (!m) return null
  const id = Number(m[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

const cache = new Map<string, Promise<string>>()

/** QR como SVG (nítido al imprimir). `qrcode` se carga solo cuando hace falta. */
export function qrSvg(texto: string): Promise<string> {
  let svg = cache.get(texto)
  if (!svg) {
    svg = import('qrcode').then((m) => m.toString(texto, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }))
    cache.set(texto, svg)
  }
  return svg
}

/** Una etiqueta por cada copia pedida de cada bien, en el orden dado. */
export function expandirCopias(items: { bien: Bien; copias: number }[]): Bien[] {
  return items.flatMap(({ bien, copias }) => Array.from({ length: copias }, () => bien))
}

/** Parte la lista en hojas de `ETIQUETAS_POR_HOJA` etiquetas. */
export function enHojas<T>(lista: T[]): T[][] {
  const hojas: T[][] = []
  for (let i = 0; i < lista.length; i += ETIQUETAS_POR_HOJA) hojas.push(lista.slice(i, i + ETIQUETAS_POR_HOJA))
  return hojas
}
