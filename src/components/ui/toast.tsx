import { useCallback, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastContext, type TipoToast } from './toast-context'

interface Toast {
  id: number
  tipo: TipoToast
  mensaje: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notificar = useCallback((mensaje: string, tipo: TipoToast = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tipo, mensaje }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={notificar}>
      {children}
      <div className="no-print fixed right-4 bottom-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex max-w-sm items-start gap-2 rounded-lg border bg-surface px-4 py-3 text-sm shadow-lg',
              t.tipo === 'ok' ? 'border-bueno/30' : 'border-malo/40',
            )}
          >
            {t.tipo === 'ok' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-bueno" />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-malo" />
            )}
            <span>{t.mensaje}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
