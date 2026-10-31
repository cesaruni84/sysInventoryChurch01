import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })

export function formatMoneda(valor: number) {
  return moneda.format(valor)
}

/** Fecha ISO (yyyy-mm-dd) → dd/mm/yyyy, sin desfase de zona horaria. */
export function formatFecha(iso: string | null | undefined) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/**
 * Opciones de un combo, agregando el valor guardado si no está en la lista (p. ej. un dato
 * escrito a mano antes de que hubiera combos), para no perderlo al editar.
 */
export function opcionesCon(lista: string[], valor: string | null | undefined) {
  return valor && !lista.includes(valor) ? [valor, ...lista] : lista
}

/** Minúsculas y sin tildes, para buscar texto sin distinguir acentos. */
export function normalizarTexto(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function hoyISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
