import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast-context'
import { mensajeError } from '@/lib/bienes'
import {
  PATRON_CODIGO,
  TIPOS_UNIDAD,
  useEliminarUnidad,
  useGuardarUnidad,
  useUnidades,
  type DatosUnidad,
  type Unidad,
} from '@/lib/unidades'
import { cn } from '@/lib/utils'

function formatFechaRegistro(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Configuración → Unidades de medida: catálogo común a todas las sedes. */
export default function UnidadesMedida() {
  const { data: unidades, isPending, isError, error } = useUnidades()
  const eliminar = useEliminarUnidad()
  const notificar = useToast()
  // null: diálogo cerrado; 'nueva': alta; unidad: edición.
  const [editando, setEditando] = useState<Unidad | 'nueva' | null>(null)
  const [aEliminar, setAEliminar] = useState<Unidad | null>(null)

  async function confirmarEliminar() {
    if (!aEliminar) return
    try {
      await eliminar.mutateAsync(aEliminar)
      notificar(`"${aEliminar.nombre}" eliminada.`)
    } catch (e) {
      notificar(mensajeError(e), 'error')
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Unidades de medida"
        subtitle="Unidades que se eligen al registrar un bien. El código es el que se guarda en el bien y sale en el reporte."
        actions={
          <Button onClick={() => setEditando('nueva')}>
            <Plus className="size-4" /> Agregar unidad
          </Button>
        }
      />

      <Card className="max-w-6xl p-0">
        {isPending ? (
          <Cargando />
        ) : isError ? (
          <div className="p-4">
            <ErrorCarga error={error} />
          </div>
        ) : unidades.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Aún no hay unidades. Usa “Agregar unidad”.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-14">N°</Th>
                <Th className="w-24">Código</Th>
                <Th>Unidad</Th>
                <Th>Tipo</Th>
                <Th className="w-28">Estado</Th>
                <Th className="w-32">Fecha registro</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((u, i) => (
                <tr key={u.id} className={cn('hover:bg-background', !u.activo && 'text-muted')}>
                  <Td className="text-muted">{i + 1}</Td>
                  <Td className="font-mono text-xs font-semibold">{u.codigo}</Td>
                  <Td>
                    <p className="font-medium">{u.nombre}</p>
                    {u.descripcion && <p className="text-xs text-muted">{u.descripcion}</p>}
                  </Td>
                  <Td>{u.tipo}</Td>
                  <Td>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        u.activo ? 'bg-bueno/10 text-bueno' : 'bg-border text-muted',
                      )}
                    >
                      {u.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{formatFechaRegistro(u.fecha_registro)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(u)} aria-label={`Editar ${u.nombre}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setAEliminar(u)} aria-label={`Eliminar ${u.nombre}`}>
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
        <UnidadDialog
          unidad={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={(nombre) => {
            notificar(editando === 'nueva' ? `"${nombre}" agregada.` : 'Cambios guardados.')
            setEditando(null)
          }}
        />
      )}

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar unidad"
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      >
        ¿Eliminar <strong>{aEliminar?.nombre}</strong> ({aEliminar?.codigo})? Si hay bienes con esta unidad no se podrá eliminar; en
        ese caso edítala y desmarca “Activa” para ocultarla de los combos.
      </ConfirmDialog>
    </>
  )
}

const schema = z.object({
  codigo: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => PATRON_CODIGO.test(v), 'De 2 a 5 letras o números, sin espacios (p. ej. UND)'),
  nombre: z.string().trim().min(1, 'Ingresa el nombre de la unidad').max(60, 'Máximo 60 caracteres'),
  tipo: z.enum(TIPOS_UNIDAD, 'Selecciona el tipo'),
  descripcion: z.string().trim().max(300, 'Máximo 300 caracteres'),
  activo: z.boolean(),
})

type FormEntrada = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function aFormulario(u: Unidad | null): FormEntrada {
  return {
    codigo: u?.codigo ?? '',
    nombre: u?.nombre ?? '',
    // Vacío al agregar: obliga a elegir el tipo.
    tipo: (u?.tipo ?? '') as FormEntrada['tipo'],
    descripcion: u?.descripcion ?? '',
    activo: u?.activo ?? true,
  }
}

/** La descripción vacía se guarda como NULL. */
function aDatos(v: FormValues): DatosUnidad {
  return { codigo: v.codigo, nombre: v.nombre, tipo: v.tipo, descripcion: v.descripcion || null, activo: v.activo }
}

interface UnidadDialogProps {
  unidad: Unidad | null
  onCerrar: () => void
  onGuardada: (nombre: string) => void
}

function UnidadDialog({ unidad, onCerrar, onGuardada }: UnidadDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const guardar = useGuardarUnidad()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormEntrada, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: aFormulario(unidad) })

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function onSubmit(v: FormValues) {
    setError('')
    try {
      await guardar.mutateAsync({ id: unidad?.id, datos: aDatos(v) })
      onGuardada(v.nombre)
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  const err = (k: keyof FormEntrada) => errors[k]?.message

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-xl border border-border bg-surface p-6 text-foreground backdrop:bg-black/40"
    >
      <h2 className="font-serif text-lg font-semibold">{unidad ? 'Editar unidad' : 'Agregar unidad'}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
        <Field label="Código" htmlFor="uni-codigo" required error={err('codigo')}>
          <Input
            id="uni-codigo"
            autoFocus={!unidad}
            maxLength={5}
            placeholder="Ej. UND"
            className="uppercase read-only:bg-background read-only:text-muted"
            // El código es el que guardan los bienes: no se cambia al editar. `readOnly` (no `disabled`)
            // para que react-hook-form siga incluyendo el valor.
            readOnly={unidad !== null}
            title={unidad ? 'El código no se puede cambiar porque los bienes lo guardan' : undefined}
            aria-invalid={!!errors.codigo}
            {...register('codigo')}
          />
        </Field>
        <Field label="Unidad" htmlFor="uni-nombre" required error={err('nombre')}>
          <Input id="uni-nombre" autoFocus={unidad !== null} maxLength={60} aria-invalid={!!errors.nombre} {...register('nombre')} />
        </Field>
        <Field label="Tipo" htmlFor="uni-tipo" required error={err('tipo')} className="md:col-span-2">
          <Select id="uni-tipo" aria-invalid={!!errors.tipo} {...register('tipo')}>
            <option value="">Selecciona el tipo</option>
            {TIPOS_UNIDAD.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción" htmlFor="uni-descripcion" error={err('descripcion')} className="md:col-span-2">
          <Textarea id="uni-descripcion" rows={3} maxLength={300} placeholder="Para qué bienes se usa" {...register('descripcion')} />
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" className="size-4 accent-boton" {...register('activo')} />
          Activa <span className="text-muted">(las inactivas no aparecen en el combo de bienes)</span>
        </label>

        {error && (
          <p className="text-sm text-malo md:col-span-2" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button variant="outline" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
