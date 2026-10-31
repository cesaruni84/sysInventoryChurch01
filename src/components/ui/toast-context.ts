import { createContext, useContext } from 'react'

export type TipoToast = 'ok' | 'error'

export const ToastContext = createContext<(mensaje: string, tipo?: TipoToast) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}
