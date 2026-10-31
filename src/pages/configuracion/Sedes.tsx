import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, Input, Select } from '@/components/ui/form'
import { Table, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast-context'
import { useAuth } from '@/lib/auth-context'
import { mensajeError } from '@/lib/bienes'
import {
  TIPOS_SEDE,
  useEliminarSede,
  useGuardarSede,
  useSedesDetalle,
  type DatosSede,
  type SedeDetalle,
} from '@/lib/sedes'
import { useUbigeo, type Ubigeo } from '@/lib/ubigeo'
import { nombreCompleto, useUsuarios, type Usuario } from '@/lib/usuarios'
import { cn, opcionesCon } from '@/lib/utils'

function formatFechaRegistro(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Configuración → Sedes: templo central y anexos, con su ubicación, tipo y responsable. */
export default function Sedes() {
  const { data: sedes, isPending, isError, error } = useSedesDetalle()
  const { sedeActiva, elegirSede } = useAuth()
  const eliminar = useEliminarSede()
  const notificar = useToast()
  // null: diálogo cerrado; 'nueva': alta; sede: edición.
  const [editando, setEditando] = useState<SedeDetalle | 'nueva' | null>(null)
  const [aEliminar, setAEliminar] = useState<SedeDetalle | null>(null)

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
        title="Sedes"
        subtitle="Templo central y anexos. Aparecen en el login, el registro de cuentas y el cambio de sede."
        actions={
          <Button onClick={() => setEditando('nueva')}>
            <Plus className="size-4" /> Agregar sede
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
        ) : sedes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">Aún no hay sedes. Usa “Agregar sede”.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-14">N°</Th>
                <Th>Sede</Th>
                <Th className="w-32">Tipo</Th>
                <Th>Distrito</Th>
                <Th>Responsable</Th>
                <Th className="w-28">Estado</Th>
                <Th className="w-32">Fecha registro</Th>
                <Th className="sr-only">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {sedes.map((s, i) => (
                <tr key={s.id} className={cn('hover:bg-background', !s.activo && 'text-muted')}>
                  <Td className="text-muted">{i + 1}</Td>
                  <Td className="font-medium">{s.nombre}</Td>
                  <Td>{s.tipo}</Td>
                  <Td>{s.distrito ?? '—'}</Td>
                  <Td>{s.responsable ? nombreCompleto(s.responsable) : '—'}</Td>
                  <Td>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        s.activo ? 'bg-bueno/10 text-bueno' : 'bg-border text-muted',
                      )}
                    >
                      {s.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap">{formatFechaRegistro(s.fecha_registro)}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditando(s)} aria-label={`Editar ${s.nombre}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setAEliminar(s)} aria-label={`Eliminar ${s.nombre}`}>
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
        <SedeDialog
          sede={editando === 'nueva' ? null : editando}
          ordenSugerido={(sedes?.reduce((m, s) => Math.max(m, s.orden), 0) ?? 0) + 1}
          onCerrar={() => setEditando(null)}
          onGuardada={({ id, nombre }) => {
            notificar(editando === 'nueva' ? `"${nombre}" agregada.` : 'Cambios guardados.')
            // Si se renombra la sede con la que se trabaja, se actualiza la barra superior.
            if (sedeActiva?.id === id) elegirSede({ id, nombre })
            setEditando(null)
          }}
        />
      )}

      <ConfirmDialog
        open={aEliminar !== null}
        title="Eliminar sede"
        loading={eliminar.isPending}
        onConfirm={confirmarEliminar}
        onCancel={() => setAEliminar(null)}
      >
        ¿Eliminar <strong>{aEliminar?.nombre}</strong>? Si está en uso por bienes o usuarios no se podrá eliminar; en ese caso
        edítala y desmarca “Activa” para ocultarla de los combos.
      </ConfirmDialog>
    </>
  )
}

const texto = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`)

const schema = z.object({
  nombre: z.string().trim().min(1, 'Ingresa el nombre de la sede').max(100, 'Máximo 100 caracteres'),
  tipo: z.enum(TIPOS_SEDE, 'Elige el tipo de sede'),
  direccion: texto(200),
  // Departamento, provincia y distrito se eligen de los combos del ubigeo.
  departamento: z.string(),
  provincia: z.string(),
  distrito: z.string(),
  responsable_id: z.string(),
  activo: z.boolean(),
})

type FormEntrada = z.input<typeof schema>
type FormValues = z.output<typeof schema>

function aFormulario(s: SedeDetalle | null): FormEntrada {
  return {
    nombre: s?.nombre ?? '',
    tipo: s?.tipo ?? 'Anexo',
    direccion: s?.direccion ?? '',
    distrito: s?.distrito ?? '',
    provincia: s?.provincia ?? '',
    departamento: s?.departamento ?? '',
    responsable_id: s?.responsable_id ?? '',
    activo: s?.activo ?? true,
  }
}

/** Los textos vacíos se guardan como NULL. */
function aDatos(v: FormValues): DatosSede {
  return {
    nombre: v.nombre,
    tipo: v.tipo,
    direccion: v.direccion || null,
    distrito: v.distrito || null,
    provincia: v.provincia || null,
    departamento: v.departamento || null,
    responsable_id: v.responsable_id || null,
    activo: v.activo,
  }
}

interface SedeDialogProps {
  sede: SedeDetalle | null
  ordenSugerido: number
  onCerrar: () => void
  onGuardada: (sede: { id: number; nombre: string }) => void
}

function SedeDialog({ sede, ordenSugerido, onCerrar, onGuardada }: SedeDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const usuarios = useUsuarios()
  const ubigeo = useUbigeo()

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      className="m-auto w-[min(44rem,calc(100%-2rem))] rounded-xl border border-border bg-surface p-6 text-foreground backdrop:bg-black/40"
    >
      <h2 className="font-serif text-lg font-semibold">{sede ? 'Editar sede' : 'Agregar sede'}</h2>
      {/* Los combos deben tener sus opciones al montarse para mostrar el valor guardado. */}
      {usuarios.isPending || ubigeo.isPending ? (
        <Cargando />
      ) : usuarios.isError ? (
        <ErrorCarga error={usuarios.error} />
      ) : ubigeo.isError ? (
        <ErrorCarga error={ubigeo.error} />
      ) : (
        <FormularioSede
          sede={sede}
          ordenSugerido={ordenSugerido}
          usuarios={usuarios.data}
          ubigeo={ubigeo.data}
          onCerrar={onCerrar}
          onGuardada={onGuardada}
        />
      )}
    </dialog>
  )
}

function FormularioSede({
  sede,
  ordenSugerido,
  usuarios,
  ubigeo,
  onCerrar,
  onGuardada,
}: SedeDialogProps & { usuarios: Usuario[]; ubigeo: Ubigeo }) {
  const guardar = useGuardarSede()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormEntrada, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: aFormulario(sede) })

  // Combos en cascada: cada uno depende del anterior.
  const [departamento, provincia] = useWatch({ control, name: ['departamento', 'provincia'] })
  const departamentos = opcionesCon(Object.keys(ubigeo), sede?.departamento)
  const provincias = opcionesCon(Object.keys(ubigeo[departamento] ?? {}), departamento === sede?.departamento ? sede?.provincia : null)
  const distritos = opcionesCon(
    ubigeo[departamento]?.[provincia] ?? [],
    departamento === sede?.departamento && provincia === sede?.provincia ? sede?.distrito : null,
  )

  async function onSubmit(v: FormValues) {
    setError('')
    try {
      // Al crear se asigna el orden siguiente; al editar, el orden y el código no cambian.
      await guardar.mutateAsync({ id: sede?.id, datos: aDatos(v), orden: sede ? undefined : ordenSugerido })
      onGuardada({ id: sede?.id ?? -1, nombre: v.nombre })
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  const err = (k: keyof FormEntrada) => errors[k]?.message

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-4 md:grid-cols-2" noValidate>
      <Field label="Sede" htmlFor="sede-nombre" required error={err('nombre')} className="md:col-span-2">
        <Input id="sede-nombre" autoFocus maxLength={100} aria-invalid={!!errors.nombre} {...register('nombre')} />
      </Field>
      <Field label="Tipo" htmlFor="sede-tipo" required error={err('tipo')}>
        <Select id="sede-tipo" aria-invalid={!!errors.tipo} {...register('tipo')}>
          {TIPOS_SEDE.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Dirección" htmlFor="sede-direccion" error={err('direccion')} className="md:col-span-2">
        <Input id="sede-direccion" maxLength={200} aria-invalid={!!errors.direccion} {...register('direccion')} />
      </Field>
      <Field label="Departamento" htmlFor="sede-departamento" error={err('departamento')}>
        <Select
          id="sede-departamento"
          {...register('departamento', {
            onChange: () => {
              setValue('provincia', '')
              setValue('distrito', '')
            },
          })}
        >
          <option value="">Selecciona…</option>
          {departamentos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Provincia" htmlFor="sede-provincia" error={err('provincia')}>
        <Select
          id="sede-provincia"
          disabled={!departamento}
          {...register('provincia', { onChange: () => setValue('distrito', '') })}
        >
          <option value="">{departamento ? 'Selecciona…' : 'Elige el departamento'}</option>
          {provincias.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Distrito" htmlFor="sede-distrito" error={err('distrito')}>
        <Select id="sede-distrito" disabled={!provincia} {...register('distrito')}>
          <option value="">{provincia ? 'Selecciona…' : 'Elige la provincia'}</option>
          {distritos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Responsable" htmlFor="sede-responsable" error={err('responsable_id')}>
        <Select id="sede-responsable" {...register('responsable_id')}>
          <option value="">Sin responsable</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {nombreCompleto(u) || u.email}
            </option>
          ))}
        </Select>
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
  )
}
