import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QrCode } from 'lucide-react'
import { CampoImagen, type CambioImagen } from '@/components/CampoImagen'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { buttonClass } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { Combobox, type OpcionCombo } from '@/components/ui/combobox'
import { Field, Input, Select } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast-context'
import { ESTADOS, mensajeError, useBien, useBienes, useGuardarBien, type Bien, type BienInput } from '@/lib/bienes'
import { siguienteCodigo, useCategorias, type Categoria } from '@/lib/categorias'
import { agruparPorTipo, useUnidades, type Unidad } from '@/lib/unidades'
import { useSedeActiva } from '@/lib/auth-context'
import type { Sede } from '@/lib/sedes'
import { useUbicaciones, type Ubicacion } from '@/lib/ubicaciones'
import { borrarImagen, subirImagen } from '@/lib/imagenes'
import { formatMoneda } from '@/lib/utils'

const texto = z.string().trim().max(200, 'Máximo 200 caracteres')

const schema = z.object({
  categoria_id: z.string(),
  codigo_clasificacion: texto,
  descripcion: texto.min(1, 'La descripción es obligatoria'),
  marca: texto,
  modelo: texto,
  serie: texto,
  color: texto,
  ubicacion_id: z.string().min(1, 'Selecciona la ubicación'),
  unidad_medida: texto.min(1, 'Indica la unidad de medida'),
  fecha_adquisicion: z.string(),
  documento: texto,
  estado: z.enum(['B', 'R', 'M']),
  cantidad: z
    .number({ error: 'Ingresa una cantidad' })
    .int('Debe ser un número entero')
    .min(1, 'Debe ser al menos 1'),
  valor_unitario: z.number({ error: 'Ingresa un valor' }).min(0, 'No puede ser negativo'),
})

type FormValues = z.infer<typeof schema>

const vacio: FormValues = {
  categoria_id: '',
  codigo_clasificacion: '',
  descripcion: '',
  marca: '',
  modelo: '',
  serie: '',
  color: '',
  ubicacion_id: '',
  unidad_medida: 'UND',
  fecha_adquisicion: '',
  documento: '',
  estado: 'B',
  cantidad: 1,
  valor_unitario: 0,
}

function aFormulario(b: Bien): FormValues {
  return {
    categoria_id: b.categoria_id === null ? '' : String(b.categoria_id),
    codigo_clasificacion: b.codigo_clasificacion ?? '',
    descripcion: b.descripcion,
    marca: b.marca ?? '',
    modelo: b.modelo ?? '',
    serie: b.serie ?? '',
    color: b.color ?? '',
    // Bienes antiguos sin enlazar al catálogo quedan vacíos y piden elegir una ubicación.
    ubicacion_id: b.ubicacion_id === null ? '' : String(b.ubicacion_id),
    unidad_medida: b.unidad_medida,
    fecha_adquisicion: b.fecha_adquisicion ?? '',
    documento: b.documento ?? '',
    estado: b.estado,
    cantidad: b.cantidad,
    valor_unitario: b.valor_unitario,
  }
}

/** Campos opcionales vacíos se guardan como NULL. */
function aInput(v: FormValues, sede: Sede, ubicacion: Ubicacion, imagen: string | null): BienInput {
  const nulo = (s: string) => (s === '' ? null : s)
  return {
    ...v,
    imagen,
    lugar_id: sede.id,
    lugar: sede.nombre,
    ubicacion_id: ubicacion.id,
    ubicacion: ubicacion.descripcion,
    categoria_id: v.categoria_id ? Number(v.categoria_id) : null,
    codigo_clasificacion: nulo(v.codigo_clasificacion),
    marca: nulo(v.marca),
    modelo: nulo(v.modelo),
    serie: nulo(v.serie),
    color: nulo(v.color),
    fecha_adquisicion: nulo(v.fecha_adquisicion),
    documento: nulo(v.documento),
  }
}

export default function Registro() {
  const params = useParams()
  const id = params.id ? Number(params.id) : undefined
  const editando = id !== undefined
  const bien = useBien(id)
  const sedeActiva = useSedeActiva()
  // Un bien nuevo se registra en la sede activa; uno existente conserva la suya.
  // Las ubicaciones son por sede: se piden las de esa sede (al editar, cuando ya cargó el bien).
  const sedeId = editando ? bien.data?.lugar_id : sedeActiva.id
  const ubicaciones = useUbicaciones(sedeId)
  const categorias = useCategorias()
  const unidades = useUnidades()

  if (editando && Number.isNaN(id)) return <ErrorCarga error={new Error('Identificador inválido.')} />
  if (editando && bien.isPending) return <Cargando />
  if (editando && bien.isError) return <ErrorCarga error={bien.error} />
  // El combo debe tener sus opciones al montarse para que muestre la ubicación guardada.
  if (ubicaciones.isPending || categorias.isPending || unidades.isPending) return <Cargando />
  if (ubicaciones.isError) return <ErrorCarga error={ubicaciones.error} />
  if (categorias.isError) return <ErrorCarga error={categorias.error} />
  if (unidades.isError) return <ErrorCarga error={unidades.error} />

  const sede: Sede = bien.data ? { id: bien.data.lugar_id, nombre: bien.data.lugar } : sedeActiva

  // `key` remonta el formulario al pasar de editar a nuevo (o entre bienes),
  // así los valores iniciales se toman una sola vez.
  return (
    <Formulario
      key={id ?? 'nuevo'}
      id={id}
      sede={sede}
      ubicaciones={ubicaciones.data}
      categorias={categorias.data}
      unidades={unidades.data}
      inicial={bien.data ? aFormulario(bien.data) : vacio}
      imagenActual={bien.data?.imagen ?? null}
    />
  )
}

interface FormularioProps {
  id?: number
  sede: Sede
  ubicaciones: Ubicacion[]
  /** Todas las categorías; el combo muestra las activas y la guardada aunque esté inactiva. */
  categorias: Categoria[]
  /** Todas las unidades; el combo muestra las activas y la guardada aunque esté inactiva o fuera del catálogo. */
  unidades: Unidad[]
  inicial: FormValues
  /** Ruta de la imagen guardada del bien (al editar). */
  imagenActual: string | null
}

function Formulario({ id, sede, ubicaciones, categorias, unidades, inicial, imagenActual }: FormularioProps) {
  const editando = id !== undefined
  const navigate = useNavigate()
  const notificar = useToast()
  const guardar = useGuardarBien()
  // Bienes de la sede activa, para sugerir el siguiente código de la categoría.
  const { data: bienesSede = [] } = useBienes()
  const [cambioImagen, setCambioImagen] = useState<CambioImagen>({ tipo: 'sin-cambios' })
  const [imprimirEtiqueta, setImprimirEtiqueta] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: inicial })

  const [cantidad, valorUnitario] = useWatch({ control, name: ['cantidad', 'valor_unitario'] })
  const total = (Number.isFinite(cantidad) ? cantidad : 0) * (Number.isFinite(valorUnitario) ? valorUnitario : 0)

  const categoriasCombo = categorias.filter((c) => c.activo || String(c.id) === inicial.categoria_id)
  // La unidad inactiva del bien que se edita sigue en el combo (con su grupo).
  const unidadesCombo = unidades.filter((u) => u.activo || u.codigo === inicial.unidad_medida)

  // Un bien antiguo con una unidad inactiva o fuera del catálogo la conserva como opción extra.
  const opcionesUnidad: OpcionCombo[] = [
    ...(inicial.unidad_medida && !unidadesCombo.some((u) => u.codigo === inicial.unidad_medida)
      ? [{ value: inicial.unidad_medida, label: inicial.unidad_medida }]
      : []),
    ...agruparPorTipo(unidadesCombo).flatMap((g) =>
      g.unidades.map((u) => ({
        value: u.codigo,
        label: `${u.codigo} · ${u.nombre}`,
        grupo: g.tipo,
        title: u.descripcion ?? undefined,
      })),
    ),
  ]

  /** Al elegir categoría, sugiere el código de clasificación si está vacío. */
  function alElegirCategoria(categoriaId: string) {
    const categoria = categorias.find((c) => String(c.id) === categoriaId)
    if (categoria?.prefijo && !getValues('codigo_clasificacion').trim()) {
      setValue('codigo_clasificacion', siguienteCodigo(categoria.prefijo, bienesSede))
    }
  }

  async function onSubmit(values: FormValues, seguir: boolean) {
    const ubicacion = ubicaciones.find((u) => String(u.id) === values.ubicacion_id)
    if (!ubicacion) {
      notificar('Selecciona una ubicación válida.', 'error')
      return
    }
    // La imagen nueva se sube antes de guardar el bien; si el guardado falla, se borra.
    let rutaNueva: string | null = null
    try {
      if (cambioImagen.tipo === 'nueva') rutaNueva = await subirImagen(cambioImagen.archivo, sede.id)
      const imagen = cambioImagen.tipo === 'nueva' ? rutaNueva : cambioImagen.tipo === 'quitar' ? null : imagenActual
      const guardado = await guardar.mutateAsync({ id, input: aInput(values, sede, ubicacion, imagen) })
      // La imagen anterior ya no se usa si se reemplazó o se quitó.
      if (cambioImagen.tipo !== 'sin-cambios') await borrarImagen(imagenActual)
      notificar(editando ? 'Bien actualizado.' : `Bien registrado en ${sede.nombre}.`)
      if (seguir) {
        // Mantiene categoría, ubicación y fecha para registrar varios bienes seguidos.
        reset({
          ...vacio,
          categoria_id: values.categoria_id,
          ubicacion_id: values.ubicacion_id,
          fecha_adquisicion: values.fecha_adquisicion,
        })
        setCambioImagen({ tipo: 'sin-cambios' })
      } else {
        // Con la casilla marcada, se pasa directo a imprimir la etiqueta del bien recién guardado.
        navigate(imprimirEtiqueta ? `/bienes/etiquetas?ids=${guardado.id}` : '/bienes')
      }
    } catch (e) {
      await borrarImagen(rutaNueva)
      notificar(mensajeError(e), 'error')
    }
  }

  const err = (k: keyof FormValues) => errors[k]?.message

  return (
    <>
      <PageHeader
        title={editando ? `Editar bien N° ${id}` : 'Registrar bien'}
        subtitle={
          <>
            Sede <strong className="text-foreground">{sede.nombre}</strong> · Datos según el formato de Inventario Físico de
            Bienes y Enseres.
          </>
        }
      />
      <form onSubmit={handleSubmit((v) => onSubmit(v, false))} noValidate>
        <Card className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Descripción del bien (características)" htmlFor="descripcion" required error={err('descripcion')} className="md:col-span-2">
            <Input id="descripcion" aria-invalid={!!errors.descripcion} autoFocus {...register('descripcion')} />
          </Field>
          <Field label="Categoría" htmlFor="categoria_id" error={err('categoria_id')}>
            <Controller
              control={control}
              name="categoria_id"
              render={({ field }) => (
                <Combobox
                  id="categoria_id"
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v)
                    alElegirCategoria(v)
                  }}
                  onBlur={field.onBlur}
                  vacioLabel="Sin categoría"
                  opciones={categoriasCombo.map((c) => ({ value: String(c.id), label: c.nombre }))}
                />
              )}
            />
          </Field>
          <Field label="Código clasificación" htmlFor="codigo_clasificacion" error={err('codigo_clasificacion')}>
            <Input id="codigo_clasificacion" {...register('codigo_clasificacion')} />
          </Field>

          <Field label="Marca" htmlFor="marca" error={err('marca')}>
            <Input id="marca" {...register('marca')} />
          </Field>
          <Field label="Modelo" htmlFor="modelo" error={err('modelo')}>
            <Input id="modelo" {...register('modelo')} />
          </Field>
          <Field label="Serie" htmlFor="serie" error={err('serie')}>
            <Input id="serie" {...register('serie')} />
          </Field>
          <Field label="Color" htmlFor="color" error={err('color')}>
            <Input id="color" {...register('color')} />
          </Field>

          <Field label="Ubicación del bien" htmlFor="ubicacion_id" required error={err('ubicacion_id')} className="md:col-span-2 lg:col-span-3">
            <Controller
              control={control}
              name="ubicacion_id"
              render={({ field }) => (
                <Combobox
                  id="ubicacion_id"
                  aria-invalid={!!errors.ubicacion_id}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Selecciona la ubicación"
                  opciones={ubicaciones.map((u) => ({ value: String(u.id), label: u.descripcion }))}
                />
              )}
            />
          </Field>
          <Field label="Unidad de medida" htmlFor="unidad_medida" required error={err('unidad_medida')}>
            <Controller
              control={control}
              name="unidad_medida"
              render={({ field }) => (
                <Combobox
                  id="unidad_medida"
                  aria-invalid={!!errors.unidad_medida}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Selecciona la unidad"
                  opciones={opcionesUnidad}
                />
              )}
            />
          </Field>

          <Field label="Fecha de adquisición" htmlFor="fecha_adquisicion" error={err('fecha_adquisicion')}>
            <Input id="fecha_adquisicion" type="date" {...register('fecha_adquisicion')} />
          </Field>
          <Field label="Documento" htmlFor="documento" error={err('documento')}>
            <Input id="documento" placeholder="Factura, boleta, donación…" {...register('documento')} />
          </Field>
          {/* La imagen solo se ve en este formulario; no sale en el listado ni en los reportes. */}
          <div className="md:col-span-2">
            <CampoImagen actual={imagenActual} cambio={cambioImagen} onCambio={setCambioImagen} />
          </div>

          <Field label="Estado" htmlFor="estado" required error={err('estado')}>
            <Select id="estado" {...register('estado')}>
              {Object.entries(ESTADOS).map(([k, v]) => (
                <option key={k} value={k}>
                  {k} · {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cantidad" htmlFor="cantidad" required error={err('cantidad')}>
            <Input id="cantidad" type="number" min={1} step={1} aria-invalid={!!errors.cantidad} {...register('cantidad', { valueAsNumber: true })} />
          </Field>
          <Field label="Valor unitario (S/)" htmlFor="valor_unitario" required error={err('valor_unitario')}>
            <Input id="valor_unitario" type="number" min={0} step="0.01" aria-invalid={!!errors.valor_unitario} {...register('valor_unitario', { valueAsNumber: true })} />
          </Field>
          <div className="flex flex-col justify-end">
            <p className="text-sm text-muted">Valor total</p>
            <p className="font-serif text-2xl font-semibold">{formatMoneda(total)}</p>
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {editando ? (
            <Link to={`/bienes/etiquetas?ids=${id}`} className={buttonClass('outline', 'md', 'mr-auto')}>
              <QrCode className="size-4" /> Imprimir etiqueta
            </Link>
          ) : (
            <label className="mr-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-boton"
                checked={imprimirEtiqueta}
                onChange={(e) => setImprimirEtiqueta(e.target.checked)}
              />
              Imprimir etiqueta al guardar
            </label>
          )}
          <Link to="/bienes" className={buttonClass('outline')}>
            Cancelar
          </Link>
          {!editando && (
            <Button variant="outline" disabled={isSubmitting} onClick={handleSubmit((v) => onSubmit(v, true))}>
              Guardar y registrar otro
            </Button>
          )}
          {/* isSubmitting cubre también la subida de la imagen, no solo el guardado. */}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar bien'}
          </Button>
        </div>
      </form>
    </>
  )
}
