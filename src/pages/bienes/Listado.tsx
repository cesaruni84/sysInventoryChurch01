import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, QrCode, Search, Trash2 } from 'lucide-react'
import { EstadoBadge } from '@/components/EstadoBadge'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { buttonClass } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input, Select } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast-context'
import { usePermisos } from '@/lib/permisos'
import { ESTADOS, mensajeError, ubicacionesDe, useBienes, useEliminarBien, valorTotal, type Bien, type Estado } from '@/lib/bienes'
import { useCategorias } from '@/lib/categorias'
import { useSedeActiva } from '@/lib/auth-context'
import type { Sede } from '@/lib/sedes'
import { formatFecha, formatMoneda } from '@/lib/utils'

const POR_PAGINA = 10
/** Valor del filtro de categoría para los bienes que no tienen una. */
const SIN_CATEGORIA = 'sin-categoria'

export default function Listado() {
  const sede = useSedeActiva()
  // Al cambiar de sede se remonta: búsqueda, filtros y página vuelven a empezar.
  return <ListadoSede key={sede.id} sede={sede} />
}

function ListadoSede({ sede }: { sede: Sede }) {
  const { data: bienes, isPending, isError, error } = useBienes()
  const eliminar = useEliminarBien()
  const notificar = useToast()
  const { editarBienes } = usePermisos()

  const [busqueda, setBusqueda] = useState('')
  const { data: categorias = [] } = useCategorias()
  const [ubicacion, setUbicacion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estado, setEstado] = useState<Estado | ''>('')
  const [pagina, setPagina] = useState(1)
  const [aEliminar, setAEliminar] = useState<Bien | null>(null)

  // En el filtro van las categorías activas y las inactivas que aún tienen bienes en esta sede.
  const categoriasFiltro = categorias.filter((c) => c.activo || bienes?.some((b) => b.categoria_id === c.id))

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (bienes ?? []).filter(
      (b) =>
        (!ubicacion || b.ubicacion === ubicacion) &&
        (!categoria || (categoria === SIN_CATEGORIA ? b.categoria_id === null : String(b.categoria_id) === categoria)) &&
        (!estado || b.estado === estado) &&
        (!q || [b.descripcion, b.codigo_clasificacion, b.serie, b.marca].some((v) => v?.toLowerCase().includes(q))),
    )
  }, [bienes, busqueda, ubicacion, categoria, estado])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  // Cada cambio de filtro vuelve a la primera página.
  const filtro = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPagina(1)
  }

  async function confirmarEliminar() {
    if (!aEliminar) return
    try {
      await eliminar.mutateAsync(aEliminar.id)
      notificar('Bien eliminado.')
    } catch (e) {
      notificar(mensajeError(e), 'error')
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Listado de bienes"
        subtitle={
          <>
            Bienes y enseres registrados en la sede <strong className="text-foreground">{sede.nombre}</strong>.
          </>
        }
        actions={
          editarBienes && (
            <>
              {filtrados.length > 0 && (
                <Link to={`/bienes/etiquetas?ids=${filtrados.map((b) => b.id).join(',')}`} className={buttonClass('outline')}>
                  <QrCode className="size-4" /> Imprimir etiquetas ({filtrados.length})
                </Link>
              )}
              <Link to="/bienes/nuevo" className={buttonClass()}>
                <Plus className="size-4" /> Registrar bien
              </Link>
            </>
          )
        }
      />

      <Card className="p-0">
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder="Buscar por descripción, código, serie o marca"
              value={busqueda}
              onChange={(e) => filtro(setBusqueda)(e.target.value)}
              aria-label="Buscar"
            />
          </div>
          <Select className="w-auto min-w-44" value={ubicacion} onChange={(e) => filtro(setUbicacion)(e.target.value)} aria-label="Ubicación">
            <option value="">Todas las ubicaciones</option>
            {ubicacionesDe(bienes ?? []).map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
          <Select className="w-auto min-w-44" value={categoria} onChange={(e) => filtro(setCategoria)(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categoriasFiltro.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
            <option value={SIN_CATEGORIA}>Sin categoría</option>
          </Select>
          <Select className="w-auto min-w-36" value={estado} onChange={(e) => filtro(setEstado)(e.target.value as Estado | '')} aria-label="Estado">
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([k, v]) => (
              <option key={k} value={k}>
                {k} · {v}
              </option>
            ))}
          </Select>
        </div>

        {isPending ? (
          <Cargando />
        ) : isError ? (
          <div className="p-4">
            <ErrorCarga error={error} />
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            {bienes.length === 0 ? 'Aún no hay bienes registrados.' : 'Ningún bien coincide con los filtros.'}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>N°</Th>
                <Th>Código</Th>
                <Th>Descripción</Th>
                <Th>Marca / Modelo</Th>
                <Th>Ubicación</Th>
                <Th>Fecha adq.</Th>
                <Th>Estado</Th>
                <Th className="text-right">Cant.</Th>
                <Th className="text-right">Valor unit.</Th>
                <Th className="text-right">Total</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((b) => (
                <tr key={b.id} className="hover:bg-background">
                  <Td className="text-muted">{b.id}</Td>
                  <Td>{b.codigo_clasificacion}</Td>
                  <Td className="max-w-72">
                    <span className="font-medium">{b.descripcion}</span>
                    {b.serie && <span className="block text-xs text-muted">Serie: {b.serie}</span>}
                  </Td>
                  <Td>{[b.marca, b.modelo].filter(Boolean).join(' / ')}</Td>
                  <Td>{b.ubicacion}</Td>
                  <Td className="whitespace-nowrap">{formatFecha(b.fecha_adquisicion)}</Td>
                  <Td>
                    <EstadoBadge estado={b.estado} />
                  </Td>
                  <Td className="text-right">{b.cantidad}</Td>
                  <Td className="text-right whitespace-nowrap">{formatMoneda(b.valor_unitario)}</Td>
                  <Td className="text-right whitespace-nowrap">{formatMoneda(valorTotal(b))}</Td>
                  <Td>
                    {editarBienes && (
                      <div className="flex justify-end gap-1">
                        <Link to={`/bienes/etiquetas?ids=${b.id}`} className={buttonClass('ghost', 'icon')} title="Imprimir etiqueta" aria-label={`Imprimir etiqueta de ${b.descripcion}`}>
                          <QrCode className="size-4" />
                        </Link>
                        <Link to={`/bienes/${b.id}`} className={buttonClass('ghost', 'icon')} aria-label={`Editar ${b.descripcion}`}>
                          <Pencil className="size-4" />
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => setAEliminar(b)} aria-label={`Eliminar ${b.descripcion}`}>
                          <Trash2 className="size-4 text-malo" />
                        </Button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {filtrados.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
            <span>
              {filtrados.length} {filtrados.length === 1 ? 'bien' : 'bienes'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={paginaActual <= 1} onClick={() => setPagina(paginaActual - 1)} aria-label="Página anterior">
                <ChevronLeft className="size-4" />
              </Button>
              <span>
                Página {paginaActual} de {totalPaginas}
              </span>
              <Button variant="outline" size="icon" disabled={paginaActual >= totalPaginas} onClick={() => setPagina(paginaActual + 1)} aria-label="Página siguiente">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar bien"
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      >
        ¿Seguro que deseas eliminar <strong>{aEliminar?.descripcion}</strong>? Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
