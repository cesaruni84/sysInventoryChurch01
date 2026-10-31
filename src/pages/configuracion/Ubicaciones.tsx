import { CatalogoPage } from '@/components/CatalogoPage'
import { useSedeActiva } from '@/lib/auth-context'
import { CATALOGO_UBICACIONES } from '@/lib/catalogos'

export default function Ubicaciones() {
  const sede = useSedeActiva()
  return (
    // Las ubicaciones son por sede: se remonta al cambiar de sede en la barra superior.
    <CatalogoPage
      key={sede.id}
      config={CATALOGO_UBICACIONES}
      sedeId={sede.id}
      titulo="Ubicaciones"
      subtitulo={`Ubicaciones de la sede ${sede.nombre}. Para ver las de otra sede, cámbiala desde la barra superior.`}
      singular="ubicación"
      etiquetaNombre="Descripción"
    />
  )
}
