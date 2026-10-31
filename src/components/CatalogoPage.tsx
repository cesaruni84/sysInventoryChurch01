import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, Input } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast-context'
import { mensajeError } from '@/lib/bienes'
import { useCatalogo, useEliminarItem, useGuardarItem, type ConfigCatalogo, type DatosItem, type ItemCatalogo } from '@/lib/catalogos'
import { cn } from '@/lib/utils'

interface Props {
  config: ConfigCatalogo
  titulo: string
  subtitulo: string
  /** Nombre en singular, p. ej. "sede" o "ubicación". */
  singular: string
  /** Etiqueta de la columna del nombre, p. ej. "Sede" o "Descripción". */
  etiquetaNombre: string
  /** Se llama tras guardar (p. ej. para refrescar la sede activa si se renombró). */
  onGuardado?: (item: { id: number; nombre: string }) => void
  /** Sede cuyos registros se listan y en la que se crean (catálogos con `porSede`). */
  sedeId?: number
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Listado con alta, edición, activación y eliminación de un catálogo simple. */
export function CatalogoPage({ config, titulo, subtitulo, singular, etiquetaNombre, onGuardado, sedeId }: Props) {
  const { data: items, isPending, isError, error } = useCatalogo(config, sedeId)
  const eliminar = useEliminarItem(config)
  const notificar = useToast()
  // null: diálogo cerrado; 'nuevo': alta; item: edición.
  const [editando, setEditando] = useState<ItemCatalogo | 'nuevo' | null>(null)
  const [aEliminar, setAEliminar] = useState<ItemCatalogo | null>(null)

  async function confirmarEliminar() {
    if (!aEliminar) return
    try {
      await eliminar.mutateAsync(aEliminar.id)
      notificar(`"${aEliminar.nombre}" eliminado.`)
    } catch (e) {
      notificar(mensajeError(e), 'error')
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <>
      <PageHeader
        title={titulo}
        subtitle={subtitulo}
        actions={
          <Button onClick={() => setEditando('nuevo')}>
            <Plus className="size-4" /> Agregar {singular}
          </Button>
        }
      />

      <Card className="max-w-4xl p-0">
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <div className="p-4">
            <ErrorCarga error={error} />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Aún no hay registros. Usa “Agregar {singular}”.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-14">N°</Th>
                <Th>{etiquetaNombre}</Th>
                <Th className="w-20 text-center">Orden</Th>
                <Th className="w-28">Estado</Th>
                <Th className="w-32">Fecha registro</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} className={cn('hover:bg-background', !it.activo && 'text-muted')}>
                  <Td className="text-muted">{i + 1}</Td>
                  <Td className="font-medium">{it.nombre}</Td>
                  <Td className="text-center">{it.orden}</Td>
                  <Td>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        it.activo ? 'bg-bueno/10 text-bueno' : 'bg-border text-muted',
                      )}
                    >
                      {it.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{formatFechaHora(it.fecha_registro)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(it)} aria-label={`Editar ${it.nombre}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setAEliminar(it)} aria-label={`Eliminar ${it.nombre}`}>
                        <Trash2 className="size-4 text-malo" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {editando !== null && (
        <ItemDialog
          config={config}
          sedeId={sedeId}
          item={editando === 'nuevo' ? null : editando}
          titulo={editando === 'nuevo' ? `Agregar ${singular}` : `Editar ${singular}`}
          etiquetaNombre={etiquetaNombre}
          ordenSugerido={(items?.reduce((m, it) => Math.max(m, it.orden), 0) ?? 0) + 1}
          onCerrar={() => setEditando(null)}
          onGuardado={(guardado) => {
            notificar(editando === 'nuevo' ? `"${guardado.nombre}" agregado.` : 'Cambios guardados.')
            onGuardado?.(guardado)
            setEditando(null)
          }}
        />
      )}

      <ConfirmDialog
        open={aEliminar !== null}
        title={`Eliminar ${singular}`}
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      >
        ¿Eliminar <strong>{aEliminar?.nombre}</strong>? Si está en uso por bienes o usuarios no se podrá eliminar; en ese caso
        edita el registro y desmarca “Activo” para ocultarlo de los combos.
      </ConfirmDialog>
    </>
  )
}

interface ItemDialogProps {
  config: ConfigCatalogo
  sedeId?: number
  item: ItemCatalogo | null
  titulo: string
  etiquetaNombre: string
  ordenSugerido: number
  onCerrar: () => void
  onGuardado: (item: { id: number; nombre: string }) => void
}

function ItemDialog({ config, sedeId, item, titulo, etiquetaNombre, ordenSugerido, onCerrar, onGuardado }: ItemDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const guardar = useGuardarItem(config, sedeId)
  const [datos, setDatos] = useState<DatosItem>({
    nombre: item?.nombre ?? '',
    orden: item?.orden ?? ordenSugerido,
    activo: item?.activo ?? true,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const nombre = datos.nombre.trim()
    if (!nombre) return setError(`Ingresa ${etiquetaNombre.toLowerCase()}.`)
    if (!Number.isInteger(datos.orden) || datos.orden < 0) return setError('El orden debe ser un número entero, 0 o mayor.')
    setError('')
    try {
      await guardar.mutateAsync({ id: item?.id, datos: { ...datos, nombre } })
      onGuardado({ id: item?.id ?? -1, nombre })
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-border bg-surface p-6 text-foreground backdrop:bg-black/40"
    >
      <h2 className="font-serif text-lg font-semibold">{titulo}</h2>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4" noValidate>
        <Field label={etiquetaNombre} htmlFor="cat-nombre" required>
          <Input id="cat-nombre" autoFocus maxLength={100} value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
        </Field>
        <Field label="Orden en los combos" htmlFor="cat-orden">
          <Input
            id="cat-orden"
            type="number"
            min={0}
            step={1}
            value={Number.isNaN(datos.orden) ? '' : datos.orden}
            onChange={(e) => setDatos({ ...datos, orden: e.target.valueAsNumber })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-boton" checked={datos.activo} onChange={(e) => setDatos({ ...datos, activo: e.target.checked })} />
          Activo <span className="text-muted">(los inactivos no aparecen en los combos)</span>
        </label>
        {error && (
          <p className="text-sm text-malo" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCerrar} disabled={guardar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
