import { ESTADOS, type Estado } from '@/lib/bienes'
import { cn } from '@/lib/utils'

const estilos: Record<Estado, string> = {
  B: 'bg-bueno text-white',
  R: 'bg-regular text-regular-fg',
  M: 'bg-malo text-white',
}

export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span
      className={cn('inline-block rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap', estilos[estado], className)}
    >
      {estado} · {ESTADOS[estado]}
    </span>
  )
}
