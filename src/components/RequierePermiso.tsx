import { Navigate, Outlet } from 'react-router-dom'
import { usePermisos, type Permisos } from '@/lib/permisos'

/** Deja pasar a las rutas hijas solo si el rol tiene el permiso; si no, vuelve al panel. */
export function RequierePermiso({ permiso }: { permiso: Exclude<keyof Permisos, 'rol'> }) {
  const permisos = usePermisos()
  return permisos[permiso] ? <Outlet /> : <Navigate to="/" replace />
}
