import { useState } from 'react'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-context'
import { mensajeError, useBienes, type Bien } from '@/lib/bienes'
import { exportarExcel } from '@/lib/exportExcel'
import {
  COL_ESTADO_INICIO,
  COLUMNAS,
  COLUMNAS_CENTRADAS,
  FIRMAS,
  IGLESIA,
  distritoEncabezado,
  etiquetaTotales,
  filaReporte,
  totalesReporte,
} from '@/lib/reporte'
import { useSedeActiva } from '@/lib/auth-context'
import { useSede } from '@/lib/sedes'
import { formatFecha, formatMoneda, hoyISO } from '@/lib/utils'

export default function Reporte() {
  const { data: bienes, isPending, isError, error } = useBienes()
  const sede = useSedeActiva()
  // Datos completos de la sede: el distrito va en el encabezado.
  const detalle = useSede(sede.id)
  const notificar = useToast()
  const [fecha, setFecha] = useState(hoyISO)
  const [exportando, setExportando] = useState(false)
  const distrito = detalle.data?.distrito ?? null

  async function exportar() {
    if (!bienes) return
    setExportando(true)
    try {
      await exportarExcel(bienes, { sede: sede.nombre, distrito, fecha })
    } catch (e) {
      notificar(mensajeError(e), 'error')
    } finally {
      setExportando(false)
    }
  }

  if (isPending || detalle.isPending) return <Cargando />
  if (isError) return <ErrorCarga error={error} />
  if (detalle.isError) return <ErrorCarga error={detalle.error} />

  return (
    <>
      <PageHeader
        title="Reporte de inventario físico"
        subtitle="Formato idéntico al archivo Excel. Use el botón para imprimir o guardar como PDF (se recomienda orientación horizontal)."
        actions={
          <>
            <Button variant="outline" onClick={exportar} disabled={exportando}>
              <FileSpreadsheet className="size-4" /> {exportando ? 'Generando…' : 'Exportar Excel'}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" /> Imprimir reporte
            </Button>
          </>
        }
      />

      <div className="print-area overflow-x-auto rounded-xl border border-border bg-white p-6 shadow-sm md:p-8">
        <HojaInventario bienes={bienes} sede={sede.nombre} distrito={distrito} fecha={fecha} onFecha={setFecha} />
      </div>
    </>
  )
}

const celda = 'border border-black px-1.5 py-1'

interface HojaProps {
  bienes: Bien[]
  sede: string
  distrito: string | null
  fecha: string
  onFecha: (fecha: string) => void
}

/** Réplica de la hoja "Inventario Físico" (la misma estructura que el Excel exportado). */
function HojaInventario({ bienes, sede, distrito, fecha, onFecha }: HojaProps) {
  const t = totalesReporte(bienes)
  const ultima = COLUMNAS.length - 1

  return (
    <div className="min-w-250 font-sans text-[10px] leading-tight text-black">
      {/* Encabezado en tres recuadros */}
      <div className="grid grid-cols-[3fr_4fr_3fr] border border-black">
        <div className="flex flex-col items-center justify-center gap-0.5 border-r border-black p-3 text-center">
          <p className="font-serif text-base font-bold">{IGLESIA.ministerio}</p>
          <p className="text-[10px]">{IGLESIA.nombre}</p>
          <p className="text-[10px]">{distritoEncabezado({ distrito })}</p>
        </div>
        <div className="flex items-center justify-center border-r border-black p-3 text-center">
          <p className="font-serif text-base font-bold">{IGLESIA.titulo}</p>
        </div>
        <div className="flex flex-col justify-center gap-1.5 p-3 text-[11px]">
          <p>
            <b>Sede:</b> {sede.toUpperCase()}
          </p>
          <p className="flex items-center gap-1">
            <b>Fecha:</b>
            {/* En pantalla se puede cambiar; al imprimir sale como texto. */}
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && onFecha(e.target.value)}
              className="rounded border border-transparent px-1 hover:border-border focus:border-boton focus:outline-none print:hidden"
              aria-label="Fecha del reporte"
            />
            <span className="hidden print:inline">{formatFecha(fecha)}</span>
          </p>
          <p>
            <b>PAG.:</b> 1
          </p>
        </div>
      </div>

      <table className="mt-3 w-full border-collapse">
        <colgroup>
          {COLUMNAS.map((c, i) => (
            <col key={i} style={{ width: `${c.ancho}ch` }} />
          ))}
        </colgroup>
        <thead className="text-[9px] font-bold">
          <tr>
            {COLUMNAS.slice(0, COL_ESTADO_INICIO).map((c) => (
              <th key={c.titulo} rowSpan={2} className={`${celda} text-center align-top whitespace-pre-line`}>
                {c.titulo}
              </th>
            ))}
            <th colSpan={3} className={`${celda} text-center`}>
              ESTADO
            </th>
            {COLUMNAS.slice(COL_ESTADO_INICIO + 3).map((c) => (
              <th key={c.titulo} rowSpan={2} className={`${celda} text-center align-top whitespace-pre-line`}>
                {c.titulo}
              </th>
            ))}
          </tr>
          <tr>
            {COLUMNAS.slice(COL_ESTADO_INICIO, COL_ESTADO_INICIO + 3).map((c) => (
              <th key={c.titulo} className={`${celda} text-center`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bienes.length === 0 && (
            <tr>
              <td colSpan={COLUMNAS.length} className={`${celda} py-4 text-center text-muted`}>
                No hay bienes registrados en esta sede.
              </td>
            </tr>
          )}
          {bienes.map((b, i) => (
            <tr key={b.id}>
              {filaReporte(b, i + 1).map((v, c) => (
                <td
                  key={c}
                  className={`${celda} ${c === ultima ? 'text-right whitespace-nowrap' : COLUMNAS_CENTRADAS.has(c) ? 'text-center' : ''}`}
                >
                  {c === ultima ? formatMoneda(v as number) : v}
                </td>
              ))}
            </tr>
          ))}
          <tr className="font-bold">
            <td colSpan={COL_ESTADO_INICIO} className={`${celda} text-right`}>
              {etiquetaTotales(bienes.length)}
            </td>
            <td className={celda} />
            <td className={celda} />
            <td className={celda} />
            <td className={`${celda} text-center`}>{t.cantidad}</td>
            <td className={`${celda} text-right whitespace-nowrap`}>{formatMoneda(t.valor)}</td>
          </tr>
        </tbody>
      </table>

      {/* Firmas */}
      <div className="mt-20 grid grid-cols-3 gap-10 break-inside-avoid text-center text-[11px]">
        {FIRMAS.map((f) => (
          <div key={f} className="border-t border-black pt-2">
            <p className="font-bold">{f}</p>
            <p className="text-muted">Nombre y firma</p>
          </div>
        ))}
      </div>
    </div>
  )
}
