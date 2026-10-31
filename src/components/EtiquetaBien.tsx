import { useEffect, useState } from 'react'
import type { Bien } from '@/lib/bienes'
import { qrSvg, textoQr } from '@/lib/etiquetas'

/** Etiqueta de un bien para pegar: QR, código de clasificación, descripción, ubicación y sede. */
export function EtiquetaBien({ bien }: { bien: Bien }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let vigente = true
    qrSvg(textoQr(bien.id)).then((s) => {
      if (vigente) setSvg(s)
    })
    return () => {
      vigente = false
    }
  }, [bien.id])

  return (
    <div className="flex items-center gap-3 overflow-hidden border border-dashed border-neutral-400 bg-white p-[4mm] text-black">
      {/* El SVG lo genera la librería qrcode a partir de nuestra propia URL. */}
      <div
        className="size-[44mm] shrink-0 [&>svg]:size-full"
        role="img"
        aria-label={`Código QR del bien ${bien.id}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="min-w-0 flex-1 text-[11px] leading-tight">
        <p className="text-[14px] font-bold">{bien.codigo_clasificacion || `N° ${bien.id}`}</p>
        <p className="line-clamp-4 font-medium">{bien.descripcion}</p>
        <p className="mt-1 truncate">{bien.ubicacion}</p>
        <p className="truncate text-[10px] text-neutral-600">{bien.lugar}</p>
      </div>
    </div>
  )
}
