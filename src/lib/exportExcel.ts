import type { Borders, Cell, Worksheet } from 'exceljs'
import type { Bien } from './bienes'
import {
  COL_ESTADO_INICIO,
  COLUMNAS,
  COLUMNAS_CENTRADAS,
  FIRMAS,
  IGLESIA,
  distritoEncabezado,
  etiquetaTotales,
  filaReporte,
  nombreArchivo,
  totalesReporte,
  type ParametrosReporte,
} from './reporte'
import { formatFecha } from './utils'

const FUENTE = 'Calibri'
const NUM_COLS = COLUMNAS.length // 16 → columnas A..P
const COL_CANT = 15
const COL_VALOR = 16
const FORMATO_SOLES = '"S/" #,##0.00'

const thin = { style: 'thin' as const }
const bordes: Partial<Borders> = { top: thin, left: thin, bottom: thin, right: thin }

function estilo(cell: Cell, opts: { bold?: boolean; size?: number; h?: 'left' | 'center' | 'right'; borde?: boolean; wrap?: boolean; v?: 'top' | 'middle' }) {
  cell.font = { name: FUENTE, size: opts.size ?? 10, bold: opts.bold }
  cell.alignment = { horizontal: opts.h ?? 'left', vertical: opts.v ?? 'middle', wrapText: opts.wrap }
  if (opts.borde) cell.border = bordes
}

/** Pone borde exterior a un rango (para los recuadros del encabezado). */
function recuadro(ws: Worksheet, f1: number, c1: number, f2: number, c2: number) {
  for (let f = f1; f <= f2; f++) {
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getCell(f, c)
      cell.border = {
        ...cell.border,
        ...(f === f1 && { top: thin }),
        ...(f === f2 && { bottom: thin }),
        ...(c === c1 && { left: thin }),
        ...(c === c2 && { right: thin }),
      }
    }
  }
}

/** Texto con etiqueta en negrita, p. ej. "Sede: ANEXO CERES". */
function etiqueta(cell: Cell, label: string, valor: string) {
  cell.value = {
    richText: [
      { text: `${label} `, font: { name: FUENTE, size: 10, bold: true } },
      { text: valor, font: { name: FUENTE, size: 10 } },
    ],
  }
  cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
}

/** Genera y descarga el .xlsx del reporte. */
export async function exportarExcel(bienes: Bien[], p: ParametrosReporte) {
  const buffer = await construirExcel(bienes, p)
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo(p)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Arma el .xlsx con el mismo formato que la vista de Reporte: encabezado en tres
 * recuadros, columnas A–P con estado B/R/M, fila de totales y firmas.
 */
export async function construirExcel(bienes: Bien[], p: ParametrosReporte) {
  // Carga diferida: exceljs pesa ~1 MB y solo se usa aquí.
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = IGLESIA.nombre
  const ws = wb.addWorksheet('Inventario Físico', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '5:6',
    },
    headerFooter: { oddFooter: '&R&8Página &P de &N' },
  })

  ws.columns = COLUMNAS.map((c) => ({ width: c.ancho }))

  // --- Encabezado (filas 1-3): iglesia | título | sede, fecha, página ---
  ws.mergeCells('A1:C1')
  ws.getCell('A1').value = IGLESIA.ministerio
  estilo(ws.getCell('A1'), { bold: true, h: 'center', size: 13 })
  ws.mergeCells('A2:C2')
  ws.getCell('A2').value = IGLESIA.nombre
  estilo(ws.getCell('A2'), { h: 'center', size: 9 })
  ws.mergeCells('A3:C3')
  ws.getCell('A3').value = distritoEncabezado(p)
  estilo(ws.getCell('A3'), { h: 'center', size: 9 })
  recuadro(ws, 1, 1, 3, 3)

  ws.mergeCells('D1:K3')
  ws.getCell('D1').value = IGLESIA.titulo
  estilo(ws.getCell('D1'), { bold: true, h: 'center', size: 14 })
  recuadro(ws, 1, 4, 3, 11)

  ws.mergeCells('L1:P1')
  etiqueta(ws.getCell('L1'), 'Sede:', p.sede.toUpperCase())
  ws.mergeCells('L2:P2')
  etiqueta(ws.getCell('L2'), 'Fecha:', formatFecha(p.fecha))
  ws.mergeCells('L3:P3')
  etiqueta(ws.getCell('L3'), 'PAG.:', '1')
  recuadro(ws, 1, 12, 3, 16)

  for (const f of [1, 2, 3]) ws.getRow(f).height = 20

  // --- Cabecera de tabla (filas 5-6) ---
  const H1 = 5
  const H2 = 6
  COLUMNAS.forEach((c, i) => {
    const col = i + 1
    if (i >= COL_ESTADO_INICIO && i < COL_ESTADO_INICIO + 3) {
      const cell = ws.getCell(H2, col)
      cell.value = c.titulo
      estilo(cell, { bold: true, h: 'center', borde: true, size: 8 })
    } else {
      ws.mergeCells(H1, col, H2, col)
      const cell = ws.getCell(H1, col)
      cell.value = c.titulo
      estilo(cell, { bold: true, h: 'center', v: 'top', borde: true, wrap: true, size: 8 })
    }
  })
  ws.mergeCells(H1, COL_ESTADO_INICIO + 1, H1, COL_ESTADO_INICIO + 3)
  const estadoCell = ws.getCell(H1, COL_ESTADO_INICIO + 1)
  estadoCell.value = 'ESTADO'
  estilo(estadoCell, { bold: true, h: 'center', borde: true, size: 8 })
  ws.getRow(H1).height = 22
  ws.getRow(H2).height = 16

  // --- Filas de datos ---
  bienes.forEach((b, i) => {
    const r = H2 + 1 + i
    const valores = filaReporte(b, i + 1)
    for (let c = 1; c <= NUM_COLS; c++) {
      const cell = ws.getCell(r, c)
      const v = valores[c - 1]
      if (v !== '') cell.value = v
      estilo(cell, { borde: true, h: c === COL_VALOR ? 'right' : COLUMNAS_CENTRADAS.has(c - 1) ? 'center' : 'left', wrap: c === 3, size: 9 })
      if (c === COL_VALOR) cell.numFmt = FORMATO_SOLES
    }
  })

  // --- Totales ---
  const filaTotal = H2 + bienes.length + 1
  const t = totalesReporte(bienes)
  ws.mergeCells(filaTotal, 1, filaTotal, COL_ESTADO_INICIO)
  ws.getCell(filaTotal, 1).value = etiquetaTotales(bienes.length)
  estilo(ws.getCell(filaTotal, 1), { bold: true, h: 'right', borde: true })
  for (let c = COL_ESTADO_INICIO + 1; c <= COL_ESTADO_INICIO + 3; c++) estilo(ws.getCell(filaTotal, c), { borde: true })
  ws.getCell(filaTotal, COL_CANT).value = t.cantidad
  estilo(ws.getCell(filaTotal, COL_CANT), { bold: true, h: 'center', borde: true })
  ws.getCell(filaTotal, COL_VALOR).value = t.valor
  ws.getCell(filaTotal, COL_VALOR).numFmt = FORMATO_SOLES
  estilo(ws.getCell(filaTotal, COL_VALOR), { bold: true, h: 'right', borde: true })

  // --- Firmas: línea, cargo y "Nombre y firma" en tres bloques ---
  const filaLinea = filaTotal + 5
  const bloques: [number, number][] = [
    [1, 4],
    [6, 10],
    [12, 16],
  ]
  bloques.forEach(([c1, c2], i) => {
    for (let c = c1; c <= c2; c++) ws.getCell(filaLinea, c).border = { top: thin }
    ws.mergeCells(filaLinea, c1, filaLinea, c2)
    ws.getCell(filaLinea, c1).value = FIRMAS[i]
    estilo(ws.getCell(filaLinea, c1), { bold: true, h: 'center' })
    ws.getCell(filaLinea, c1).border = { top: thin }
    ws.mergeCells(filaLinea + 1, c1, filaLinea + 1, c2)
    ws.getCell(filaLinea + 1, c1).value = 'Nombre y firma'
    estilo(ws.getCell(filaLinea + 1, c1), { h: 'center', size: 9 })
    ws.getCell(filaLinea + 1, c1).font = { name: FUENTE, size: 9, color: { argb: 'FF6B716D' } }
  })

  return wb.xlsx.writeBuffer()
}
