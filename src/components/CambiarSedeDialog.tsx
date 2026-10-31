import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SelectSede } from '@/components/SelectSede'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useSedes } from '@/lib/sedes'

interface Props {
  open: boolean
  onClose: () => void
  onCambiada: () => void
}

export function CambiarSedeDialog({ open, onClose, onCambiada }: Props) {
  const { sedeActiva, elegirSede } = useAuth()
  const sedes = useSedes()
  const ref = useRef<HTMLDialogElement>(null)
  const [sedeId, setSedeId] = useState(sedeActiva ? String(sedeActiva.id) : '')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const sede = sedes.data?.find((s) => String(s.id) === sedeId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sede) return
    if (sede.id !== sedeActiva?.id) {
      elegirSede(sede)
      onCambiada()
    }
    onClose()
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-xl border border-border bg-surface p-6 text-foreground backdrop:bg-black/40"
    >
      <h2 className="font-serif text-lg font-semibold">Cambiar sede</h2>
      <p className="mt-1 text-sm text-muted">El inventario mostrará solo los bienes de la sede elegida.</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
        <SelectSede id="cambiar-sede" value={sede ? sedeId : ''} onChange={(e) => setSedeId(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!sede}>
            Cambiar
          </Button>
        </div>
      </form>
    </dialog>
  )
}
