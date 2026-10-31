import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, CameraOff, Pencil, ScanLine } from 'lucide-react'
import { EstadoBadge } from '@/components/EstadoBadge'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { buttonClass } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { useSedeActiva } from '@/lib/auth-context'
import { useBienes, valorTotal, type Bien } from '@/lib/bienes'
import { idDesdeTexto } from '@/lib/etiquetas'
import { usePermisos } from '@/lib/permisos'
import { formatMoneda } from '@/lib/utils'

/** Resultado de la última lectura: un bien de la sede o un aviso. */
type Lectura = { tipo: 'bien'; bien: Bien } | { tipo: 'no-encontrado'; texto: string }

export default function Escanear() {
  const sede = useSedeActiva()
  const { data: bienes, isPending, isError, error } = useBienes()
  if (isPending) return <Cargando />
  if (isError) return <ErrorCarga error={error} />
  // Se remonta al cambiar de sede para no dejar a la vista un bien de la sede anterior.
  return <EscanearSede key={sede.id} bienes={bienes} sedeNombre={sede.nombre} />
}

function EscanearSede({ bienes, sedeNombre }: { bienes: Bien[]; sedeNombre: string }) {
  const { editarBienes } = usePermisos()
  const [params] = useSearchParams()
  // useBienes() trae solo los bienes de la sede activa: un bien de otra sede "no se encuentra".
  function leer(texto: string): Lectura {
    const id = idDesdeTexto(texto)
    const bien = id === null ? undefined : bienes.find((b) => b.id === id)
    return bien ? { tipo: 'bien', bien } : { tipo: 'no-encontrado', texto: texto.trim() }
  }

  // Un QR escaneado con la cámara normal abre /bienes/<id>; quien no puede editar llega aquí con ?bien=<id>.
  const [lectura, setLectura] = useState<Lectura | null>(() => {
    const desdeUrl = params.get('bien')
    return desdeUrl ? leer(desdeUrl) : null
  })
  const [codigo, setCodigo] = useState('')
  const campo = useRef<HTMLInputElement>(null)
  const procesar = (texto: string) => setLectura(leer(texto))

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    procesar(codigo)
    setCodigo('')
    campo.current?.focus()
  }

  return (
    <>
      <PageHeader
        title="Escanear etiqueta"
        subtitle={
          <>
            Lee el QR de un bien de la sede <strong className="text-foreground">{sedeNombre}</strong> con la cámara o con un lector.
          </>
        }
      />

      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Camara onLeer={procesar} />

          <Card>
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <label htmlFor="codigo" className="text-sm font-medium">
                Lector USB / Bluetooth o código escrito
              </label>
              <div className="flex gap-2">
                <Input
                  id="codigo"
                  ref={campo}
                  autoFocus
                  autoComplete="off"
                  placeholder="Haz clic aquí y escanea"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
                <Button type="submit" variant="outline" className="shrink-0">
                  Buscar
                </Button>
              </div>
              <p className="text-xs text-muted">El lector escribe el código y pulsa Enter; el campo queda listo para el siguiente.</p>
            </form>
          </Card>
        </div>

        <Resultado lectura={lectura} sedeNombre={sedeNombre} editarBienes={editarBienes} />
      </div>
    </>
  )
}

function Resultado({ lectura, sedeNombre, editarBienes }: { lectura: Lectura | null; sedeNombre: string; editarBienes: boolean }) {
  if (!lectura) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted">
        <ScanLine className="size-10" />
        <p className="text-sm">Aquí aparecerá el bien leído.</p>
      </Card>
    )
  }
  if (lectura.tipo === 'no-encontrado') {
    return (
      <Card className="border-malo/40 bg-malo/5" role="alert">
        <h2 className="font-serif text-lg font-semibold text-malo">Bien no encontrado</h2>
        <p className="mt-2 text-sm">
          No hay un bien con ese código en la sede <strong>{sedeNombre}</strong>. Puede ser de otra sede, haber sido eliminado o no ser
          una etiqueta de este sistema.
        </p>
        {lectura.texto && <p className="mt-2 text-xs break-all text-muted">Leído: {lectura.texto}</p>}
      </Card>
    )
  }
  const b = lectura.bien
  const filas: [string, string | number | null][] = [
    ['Código', b.codigo_clasificacion],
    ['Marca / modelo', [b.marca, b.modelo].filter(Boolean).join(' / ') || null],
    ['Serie', b.serie],
    ['Color', b.color],
    ['Ubicación', b.ubicacion],
    ['Cantidad', `${b.cantidad} ${b.unidad_medida}`],
    ['Valor total', formatMoneda(valorTotal(b))],
  ]
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Bien N° {b.id}</p>
          <h2 className="font-serif text-xl font-semibold">{b.descripcion}</h2>
        </div>
        <EstadoBadge estado={b.estado} />
      </div>
      <table className="mt-4 w-full border-collapse text-sm">
        <tbody>
          {filas
            .filter(([, v]) => v !== null && v !== '')
            .map(([k, v]) => (
              <tr key={k}>
                <th scope="row" className="w-2/5 border border-border bg-background px-3 py-2.5 text-left font-medium text-muted">
                  {k}
                </th>
                <td className="border border-border px-3 py-2.5 font-medium">{v}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {editarBienes && (
        <Link to={`/bienes/${b.id}`} className={buttonClass('outline', 'md', 'mt-5')}>
          <Pencil className="size-4" /> Ver / editar
        </Link>
      )}
    </Card>
  )
}

/** Lectura con la cámara. `@zxing/browser` se carga solo al activarla. */
function Camara({ onLeer }: { onLeer: (texto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const detener = useRef<(() => void) | null>(null)
  const ultima = useRef({ texto: '', en: 0 })
  const alLeer = useRef(onLeer)
  const [activa, setActiva] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    alLeer.current = onLeer
  })

  function parar() {
    detener.current?.()
    detener.current = null
    setActiva(false)
  }

  // Al salir de la pantalla se apaga la cámara.
  useEffect(() => () => detener.current?.(), [])

  async function activar() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite usar la cámara aquí. La página debe abrirse con HTTPS.')
      return
    }
    setActiva(true)
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const lector = new BrowserQRCodeReader()
      const controles = await lector.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (resultado) => {
        if (!resultado) return
        const texto = resultado.getText()
        const ahora = Date.now()
        // La cámara lee el mismo QR muchas veces por segundo: se ignora la repetición inmediata.
        if (texto === ultima.current.texto && ahora - ultima.current.en < 2500) return
        ultima.current = { texto, en: ahora }
        alLeer.current(texto)
      })
      detener.current = () => controles.stop()
    } catch (e) {
      setActiva(false)
      const negada = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setError(negada ? 'Permiso de cámara denegado. Habilítalo en el navegador y vuelve a intentar.' : 'No se pudo abrir la cámara.')
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Cámara del teléfono</h2>
        {activa ? (
          <Button variant="outline" size="sm" onClick={parar}>
            <CameraOff className="size-4" /> Apagar
          </Button>
        ) : (
          <Button size="sm" onClick={activar}>
            <Camera className="size-4" /> Activar cámara
          </Button>
        )}
      </div>
      <video
        ref={video}
        muted
        playsInline
        className={activa ? 'aspect-video w-full rounded-md bg-black object-cover' : 'hidden'}
      />
      {!activa && !error && <p className="text-sm text-muted">Pulsa «Activar cámara» y apunta al QR de la etiqueta.</p>}
      {error && (
        <p className="text-sm text-malo" role="alert">
          {error}
        </p>
      )}
    </Card>
  )
}
