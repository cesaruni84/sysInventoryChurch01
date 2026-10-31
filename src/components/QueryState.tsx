import { mensajeError } from '@/lib/bienes'

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="py-10 text-center text-sm text-muted">{texto}</p>
}

export function ErrorCarga({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-malo/40 bg-malo/5 p-4 text-sm">
      <strong>No se pudieron cargar los datos.</strong> {mensajeError(error)}
    </div>
  )
}
