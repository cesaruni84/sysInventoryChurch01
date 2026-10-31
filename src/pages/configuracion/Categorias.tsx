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
  PATRON_PREFIJO,
  TIPOS_CONTABLES,
  useCategorias,
  useEliminarCategoria,
  useGuardarCategoria,
  type Categoria,
  type DatosCategoria,
} from '@/lib/categorias'
import { cn } from '@/lib/utils'

function formatFechaRegistro(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Configuración → Categorías: categorías de bienes, comunes a todas las sedes. */
export default function Categorias() {
  const { data: categorias, isPending, isError, error } = useCategorias()
  const eliminar = useEliminarCategoria()
  const notificar = useToast()
  // null: diálogo cerrado; 'nueva': alta; categoría: edición.
  const [editando, setEditando] = useState<Categoria | 'nueva' | null>(null)
  const [aEliminar, setAEliminar] = useState<Categoria | null>(null)

  async function confirmarEliminar() {
    if (!aEliminar) return
    try {
      await eliminar.mutateAsync(aEliminar.id)
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
        title="Categorías"
        subtitle="Agrupan los bienes del inventario. El prefijo sugiere el código de clasificación al registrar un bien."
        actions={
          <Button onClick={() => setEditando('nueva')}>
            <Plus className="size-4" /> Agregar categoría
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
        ) : categorias.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Aún no hay categorías. Usa “Agregar categoría”.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-14">N°</Th>
                <Th>Categoría</Th>
                <Th className="w-24">Prefijo</Th>
                <Th>Tipo contable</Th>
                <Th className="w-28">Estado</Th>
                <Th className="w-32">Fecha registro</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c, i) => (
                <tr key={c.id} className={cn('hover:bg-background', !c.activo && 'text-muted')}>
                  <Td className="text-muted">{i + 1}</Td>
                  <Td>
                    <p className="font-medium">{c.nombre}</p>
                    {c.descripcion && <p className="text-xs text-muted">{c.descripcion}</p>}
                  </Td>
                  <Td className="font-mono text-xs">{c.prefijo ?? '—'}</Td>
                  <Td>{c.tipo ?? '—'}</Td>
                  <Td>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        c.activo ? 'bg-bueno/10 text-bueno' : 'bg-border text-muted',
                      )}
                    >
                      {c.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{formatFechaRegistro(c.fecha_registro)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(c)} aria-label={`Editar ${c.nombre}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setAEliminar(c)} aria-label={`Eliminar ${c.nombre}`}>
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
        <CategoriaDialog
          categoria={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={(nombre) => {
            notificar(editando === 'nueva' ? `"${nombre}" agregada.` : 'Cambios guardados.')
            setEditando(null)
          }}
        />
      )}

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar categoría"
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      >
        ¿Eliminar <strong>{aEliminar?.nombre}</strong>? Si hay bienes en esta categoría no se podrá eliminar; en ese caso
        edítala y desmarca “Activa” para ocultarla de los combos.
      </ConfirmDialog>
    </>
  )
}

const texto = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)

const schema = z.object({
  nombre: z.string().trim().min(1, 'Ingresa el nombre de la categoría').max(80, 'Máximo 80 caracteres'),
  prefijo: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === '' || PATRON_PREFIJO.test(v), 'De 2 a 5 letras, sin números ni espacios (p. ej. COC)'),
  // '' = sin especificar.
  tipo: z.union([z.enum(TIPOS_CONTABLES), z.literal('')]),
  descripcion: texto(300),
  activo: z.boolean(),
})

type FormEntrada = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function aFormulario(c: Categoria | null): FormEntrada {
  return {
    nombre: c?.nombre ?? '',
    prefijo: c?.prefijo ?? '',
    tipo: c?.tipo ?? '',
    descripcion: c?.descripcion ?? '',
    activo: c?.activo ?? true,
  }
}

/** Los textos vacíos se guardan como NULL. */
function aDatos(v: FormValues): DatosCategoria {
  return {
    nombre: v.nombre,
    prefijo: v.prefijo || null,
    tipo: v.tipo || null,
    descripcion: v.descripcion || null,
    activo: v.activo,
  }
}

interface CategoriaDialogProps {
  categoria: Categoria | null
  onCerrar: () => void
  onGuardada: (nombre: string) => void
}

function CategoriaDialog({ categoria, onCerrar, onGuardada }: CategoriaDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const guardar = useGuardarCategoria()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormEntrada, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: aFormulario(categoria) })

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  async function onSubmit(v: FormValues) {
    setError('')
    try {
      await guardar.mutateAsync({ id: categoria?.id, datos: aDatos(v) })
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
      <h2 className="font-serif text-lg font-semibold">{categoria ? 'Editar categoría' : 'Agregar categoría'}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
        <Field label="Categoría" htmlFor="cat-nombre" required error={err('nombre')} className="md:col-span-2">
          <Input id="cat-nombre" autoFocus maxLength={80} aria-invalid={!!errors.nombre} {...register('nombre')} />
        </Field>
        <Field label="Prefijo de código" htmlFor="cat-prefijo" error={err('prefijo')}>
          <Input id="cat-prefijo" maxLength={5} placeholder="Ej. COC" className="uppercase" aria-invalid={!!errors.prefijo} {...register('prefijo')} />
        </Field>
        <Field label="Tipo contable" htmlFor="cat-tipo" error={err('tipo')}>
          <Select id="cat-tipo" aria-invalid={!!errors.tipo} {...register('tipo')}>
            <option value="">Sin especificar</option>
            {TIPOS_CONTABLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción" htmlFor="cat-descripcion" error={err('descripcion')} className="md:col-span-2">
          <Textarea id="cat-descripcion" rows={3} maxLength={300} placeholder="Qué bienes entran en esta categoría" {...register('descripcion')} />
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" className="size-4 accent-boton" {...register('activo')} />
          Activa <span className="text-muted">(las inactivas no aparecen en los combos)</span>
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
