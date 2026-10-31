import { useState, type ComponentType } from 'react'
import { NavLink, matchPath, useLocation } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, Package, Settings, Users } from 'lucide-react'
import { usePermisos, type Permisos } from '@/lib/permisos'
import { cn } from '@/lib/utils'

interface Opcion {
  to: string
  label: string
  /** Solo resalta con la ruta exacta (p. ej. /bienes no debe activarse en /bienes/nuevo). */
  end?: boolean
  /** Permiso necesario para ver la opción; sin él, la opción es para todos los roles. */
  permiso?: Exclude<keyof Permisos, 'rol'>
}

interface Grupo {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  opciones: Opcion[]
}

const MENU: Grupo[] = [
  {
    id: 'panel',
    label: 'Panel',
    icon: LayoutDashboard,
    opciones: [{ to: '/', label: 'Principal', end: true }],
  },
  {
    id: 'bienes',
    label: 'Bienes / Enseres',
    icon: Package,
    opciones: [
      { to: '/bienes', label: 'Listado', end: true },
      { to: '/bienes/nuevo', label: 'Registrar bien', permiso: 'editarBienes' },
      { to: '/bienes/etiquetas', label: 'Etiquetas QR', permiso: 'editarBienes' },
      { to: '/escanear', label: 'Escanear' },
      { to: '/reporte', label: 'Reporte físico' },
    ],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: Users,
    opciones: [
      { to: '/usuarios', label: 'Listado', end: true, permiso: 'gestionarUsuarios' },
      { to: '/usuarios/registro', label: 'Registro', permiso: 'gestionarUsuarios' },
      { to: '/usuarios/roles', label: 'Roles', permiso: 'gestionarConfiguracion' },
    ],
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: Settings,
    opciones: [
      { to: '/configuracion/categorias', label: 'Categorías', permiso: 'gestionarConfiguracion' },
      { to: '/configuracion/unidades-medida', label: 'Unidades de medida', permiso: 'gestionarConfiguracion' },
      { to: '/configuracion/ubicaciones', label: 'Ubicaciones', permiso: 'gestionarUbicaciones' },
      { to: '/configuracion/sedes', label: 'Sedes', permiso: 'gestionarConfiguracion' },
    ],
  },
]

/** Menú lateral con grupos desplegables; el grupo de la página actual se abre solo. */
export function SidebarNav() {
  const { pathname } = useLocation()
  const permisos = usePermisos()
  // Cada rol ve solo las opciones que puede usar; un grupo sin opciones visibles se oculta.
  const menu = MENU.map((g) => ({ ...g, opciones: g.opciones.filter((o) => !o.permiso || permisos[o.permiso]) })).filter(
    (g) => g.opciones.length > 0,
  )
  // Solo se guardan los grupos que el usuario abrió o cerró a mano.
  const [manual, setManual] = useState<Record<string, boolean>>({})

  // Un grupo está activo si la ruta actual es una de sus opciones o cuelga de ellas
  // (p. ej. /bienes/5 o /usuarios/<id>, que son pantallas de edición).
  const grupoActivo = (g: Grupo) =>
    g.opciones.some((o) => matchPath({ path: o.to, end: o.end ?? false }, pathname) || (o.to !== '/' && pathname.startsWith(`${o.to}/`)))

  return (
    <nav className="flex flex-col gap-1 overflow-y-auto p-3">
      {menu.map((g) => {
        const activo = grupoActivo(g)
        const abierto = manual[g.id] ?? activo
        const Icon = g.icon
        return (
          <div key={g.id}>
            <button
              onClick={() => setManual((m) => ({ ...m, [g.id]: !abierto }))}
              aria-expanded={abierto}
              aria-controls={`menu-${g.id}`}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-primary-soft/60',
                activo && 'font-semibold text-primary',
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{g.label}</span>
              <ChevronDown className={cn('size-4 shrink-0 text-muted transition-transform', abierto && 'rotate-180')} />
            </button>
            {abierto && (
              <div id={`menu-${g.id}`} className="mt-0.5 mb-1 ml-5 flex flex-col gap-0.5 border-l border-border pl-3">
                {g.opciones.map((o) => (
                  <NavLink
                    key={o.to}
                    to={o.to}
                    end={o.end}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-1.5 text-sm transition-colors',
                        isActive ? 'bg-primary-soft font-medium text-primary' : 'text-muted hover:bg-primary-soft/60 hover:text-foreground',
                      )
                    }
                  >
                    {o.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
