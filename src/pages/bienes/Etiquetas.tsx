import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { EtiquetaBien } from '@/components/EtiquetaBien'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useSedeActiva } from '@/lib/auth-context'
import { ubicacionesDe, useBienes, type Bien } from '@/lib/bienes'
import { enHojas, ETIQUETAS_POR_HOJA, expandirCopias } from '@/lib/etiquetas'

const MAX_COPIAS = 500

/** `?ids=1,2,3` → ids válidos y sin repetir. */
function idsDeParametro(valor: string | null) {
  return [...new Set((valor ?? '').split(',').map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))]
}

export default function Etiquetas() {
  const sede = useSedeActiva()
  const { data: bienes, isPending, isError, error } = useBienes()
  if (isPending) return <Cargando />
  if (isError) return <ErrorCarga error={error} />
  // Se remonta al cambiar de sede: la selección de otra sede no tiene sentido.
  return <EtiquetasSede key={sede.id} bienes={bienes} />
}

function EtiquetasSede({ bienes }: { bienes: Bien[] }) {
  const [params] = useSearchParams()
  // Copias por bien seleccionado; por defecto, una etiqueta por unidad (`cantidad`).
  const [copias, setCopias] = useState<Record<number, number>>(() => {
    const inicial: Record<number, number> = {}
    for (const id of idsDeParametro(params.get('ids'))) {
      const bien = bienes.find((b) => b.id === id)
      if (bien) inicial[id] = bien.cantidad
    }
    return inicial
  })
  const [busqueda, setBusqueda] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return bienes.filter(
      (b) =>
        (!ubicacion || b.ubicacion === ubicacion) &&
        (!q || [b.descripcion, b.codigo_clasificacion, b.serie, b.marca].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [bienes, busqueda, ubicacion])

  const seleccionados = useMemo(
    () => bienes.filter((b) => copias[b.id] !== undefined).map((bien) => ({ bien, copias: copias[bien.id] })),
    [bienes, copias],
  )
  const etiquetas = useMemo(() => expandirCopias(seleccionados), [seleccionados])
  const hojas = useMemo(() => enHojas(etiquetas), [etiquetas])

  function alternar(b: Bien) {
    setCopias((c) => {
      if (!(b.id in c)) return { ...c, [b.id]: b.cantidad }
      const resto = { ...c }
      delete resto[b.id]
      return resto
    })
  }

  function seleccionarVisibles() {
    setCopias((c) => {
      const nuevo = { ...c }
      for (const b of visibles) nuevo[b.id] ??= b.cantidad
      return nuevo
    })
  }

  function fijarCopias(id: number, valor: number) {
    const n = Number.isFinite(valor) ? Math.min(MAX_COPIAS, Math.max(1, Math.trunc(valor))) : 1
    setCopias((c) => ({ ...c, [id]: n }))
  }

  const todosVisiblesMarcados = visibles.length > 0 && visibles.every((b) => copias[b.id] !== undefined)

  return (
    <>
      {/* Las etiquetas salen en A4 vertical; el resto de la app imprime en horizontal (src/index.css). */}
      <style>{'@media print { @page { size: A4 portrait; margin: 10mm; } }'}</style>

      <PageHeader
        title="Etiquetas QR"
        subtitle="Elige los bienes, ajusta las copias (una por unidad) e imprime en hojas A4 de 10 etiquetas grandes (2 × 5)."
        actions={
          <Button onClick={() => window.print()} disabled={etiquetas.length === 0}>
            <Printer className="size-4" /> Imprimir {etiquetas.length > 0 && `(${etiquetas.length})`}
          </Button>
        }
      />

      <Card className="no-print p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Input
            className="min-w-56 flex-1"
            placeholder="Buscar por descripción, código, serie o marca"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar"
          />
          <Select className="w-auto min-w-48" value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} aria-label="Ubicación">
            <option value="">Todas las ubicaciones</option>
            {ubicacionesDe(bienes).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={seleccionarVisibles} disabled={todosVisiblesMarcados}>
            Seleccionar los {visibles.length} visibles
          </Button>
          <Button variant="outline" onClick={() => setCopias({})} disabled={seleccionados.length === 0}>
            Quitar selección
          </Button>
        </div>

        {visibles.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No hay bienes que coincidan.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <span className="sr-only">Seleccionar</span>
                </Th>
                <Th>Código</Th>
                <Th>Descripción</Th>
                <Th>Ubicación</Th>
                <Th className="text-right">Cantidad</Th>
                <Th className="w-28 text-right">Copias</Th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((b) => (
                <tr key={b.id} className="hover:bg-background">
                  <Td>
                    <input
                      type="checkbox"
                      className="size-4 accent-boton"
                      checked={copias[b.id] !== undefined}
                      onChange={() => alternar(b)}
                      aria-label={`Seleccionar ${b.descripcion}`}
                    />
                  </Td>
                  <Td>{b.codigo_clasificacion}</Td>
                  <Td className="font-medium">{b.descripcion}</Td>
                  <Td>{b.ubicacion}</Td>
                  <Td className="text-right">{b.cantidad}</Td>
                  <Td className="text-right">
                    {copias[b.id] !== undefined && (
                      <Input
                        type="number"
                        min={1}
                        max={MAX_COPIAS}
                        className="h-8 w-20 text-right"
                        value={copias[b.id]}
                        onChange={(e) => fijarCopias(b.id, e.target.valueAsNumber)}
                        aria-label={`Copias de ${b.descripcion}`}
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {hojas.length > 0 && (
        <div className="mt-6 print:mt-0">
          <p className="no-print mb-2 text-sm text-muted">
            Vista previa: {etiquetas.length} {etiquetas.length === 1 ? 'etiqueta' : 'etiquetas'} en {hojas.length}{' '}
            {hojas.length === 1 ? 'hoja' : 'hojas'} (de {ETIQUETAS_POR_HOJA}).
          </p>
          <div className="flex flex-col items-start gap-4 overflow-x-auto print:gap-0 print:overflow-visible">
            {hojas.map((hoja, i) => (
              <div
                key={i}
                className="grid w-[190mm] shrink-0 grid-cols-2 bg-white shadow-sm print:break-after-page print:shadow-none"
                style={{ gridAutoRows: '54mm' }}
              >
                {hoja.map((bien, j) => (
                  <EtiquetaBien key={j} bien={bien} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
