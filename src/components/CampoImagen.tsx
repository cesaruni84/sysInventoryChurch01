import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUrlImagen, validarImagen, TIPOS_PERMITIDOS, type Bucket } from '@/lib/imagenes'

/** Imagen elegida en el formulario: archivo nuevo, quitar la actual, o sin cambios. */
export type CambioImagen = { tipo: 'nueva'; archivo: File } | { tipo: 'quitar' } | { tipo: 'sin-cambios' }

interface Props {
  /** Ruta de la imagen ya guardada (al editar). */
  actual: string | null
  cambio: CambioImagen
  onCambio: (cambio: CambioImagen) => void
  /** Bucket de Storage donde está la imagen guardada (por defecto, el de bienes). */
  bucket?: Bucket
  /** Título del campo ("Imagen" o "Foto"). */
  etiqueta?: string
}

export function CampoImagen({ actual, cambio, onCambio, bucket = 'bienes', etiqueta = 'Imagen' }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const { data: urlActual, isPending: cargandoActual } = useUrlImagen(cambio.tipo === 'sin-cambios' ? actual : null, bucket)
  const nombre = etiqueta.toLowerCase()
  // URL local para previsualizar el archivo elegido; se libera al cambiarlo o al salir.
  const archivo = cambio.tipo === 'nueva' ? cambio.archivo : null
  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => () => void (vistaPrevia && URL.revokeObjectURL(vistaPrevia)), [vistaPrevia])

  const src = cambio.tipo === 'nueva' ? vistaPrevia : cambio.tipo === 'sin-cambios' ? urlActual : null
  const tieneImagen = cambio.tipo === 'nueva' || (cambio.tipo === 'sin-cambios' && actual)

  function elegir(lista: FileList | null) {
    const f = lista?.[0]
    if (input.current) input.current.value = ''
    if (!f) return
    const problema = validarImagen(f)
    setError(problema ?? '')
    if (!problema) onCambio({ tipo: 'nueva', archivo: f })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{etiqueta}</span>
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid size-36 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-background">
          {src ? (
            <img src={src} alt={bucket === 'usuarios' ? 'Foto del usuario' : 'Imagen del bien'} className="size-full object-cover" />
          ) : tieneImagen && cargandoActual ? (
            <span className="text-xs text-muted">Cargando…</span>
          ) : (
            <ImagePlus className="size-8 text-muted" />
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <input
            ref={input}
            type="file"
            accept={TIPOS_PERMITIDOS.join(',')}
            className="hidden"
            onChange={(e) => elegir(e.target.files)}
          />
          <Button variant="outline" size="sm" onClick={() => input.current?.click()}>
            <ImagePlus className="size-4" /> {tieneImagen ? `Cambiar ${nombre}` : `Subir ${nombre}`}
          </Button>
          {tieneImagen && (
            <Button variant="ghost" size="sm" onClick={() => onCambio(actual ? { tipo: 'quitar' } : { tipo: 'sin-cambios' })}>
              <Trash2 className="size-4 text-malo" /> Quitar {nombre}
            </Button>
          )}
          {cambio.tipo === 'quitar' && (
            <button type="button" className="text-left text-xs text-muted underline" onClick={() => onCambio({ tipo: 'sin-cambios' })}>
              Deshacer
            </button>
          )}
          <p className="text-xs text-muted">JPG, PNG, WEBP o GIF · máximo 5 MB. Opcional.</p>
          {error && <p className="text-xs text-malo">{error}</p>}
        </div>
      </div>
    </div>
  )
}
