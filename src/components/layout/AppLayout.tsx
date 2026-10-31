import { useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, LogOut, MapPin, Menu, X } from 'lucide-react'
import { CambiarSedeDialog } from '@/components/CambiarSedeDialog'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { IGLESIA_TITULO, LOGO } from '@/lib/marca'
import { buttonClass } from '@/components/ui/button-variants'
import { nombreUsuario, useAuth, useSedeActiva } from '@/lib/auth-context'
import { usePermisos } from '@/lib/permisos'
import { supabaseConfigurado } from '@/lib/supabase'
import { nombreCompleto, useUsuario } from '@/lib/usuarios'
import { cn } from '@/lib/utils'

function Sidebar() {
  const sede = useSedeActiva()
  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-3 border-b border-border px-4 py-4">
        <img src={LOGO} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
        <span className="min-w-0 leading-tight">
          <span className="block text-[11px] text-muted">{IGLESIA_TITULO.linea1}</span>
          <span className="block font-serif text-sm font-bold">{IGLESIA_TITULO.linea2}</span>
          <span className="mt-0.5 block truncate text-xs text-muted">Inventario · {sede.nombre}</span>
        </span>
      </Link>
      <SidebarNav />
      <UsuarioActual />
    </div>
  )
}

function UsuarioActual() {
  const { session, cerrarSesion } = useAuth()
  // El perfil tiene el nombre vigente (se edita en Usuarios); los metadatos del registro
  // solo sirven mientras carga o si no hay perfil.
  const perfil = useUsuario(session?.user.id)
  const nombre = (perfil.data && nombreCompleto(perfil.data)) || nombreUsuario(session)
  return (
    <div className="mt-auto border-t border-border px-5 py-4">
      {nombre && <p className="text-sm font-medium wrap-break-word">{nombre}</p>}
      <p className={cn('break-all', nombre ? 'text-xs text-muted' : 'text-sm font-medium')}>
        {session?.user.email}
      </p>
      <button onClick={cerrarSesion} className="mt-2 flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <LogOut className="size-4" /> Cerrar sesión
      </button>
    </div>
  )
}

/** Sede activa, siempre visible en la barra superior, con botón para cambiarla. */
function SedeActual() {
  const sede = useSedeActiva()
  const { cambiarSede } = usePermisos()
  const [cambiando, setCambiando] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <>
      {/* Mismo color de fondo que los botones principales. */}
      <div className="flex min-w-0 items-center gap-2 rounded-lg bg-boton py-1 pr-1 pl-3 text-white">
        <MapPin className="size-4 shrink-0" />
        <span className="min-w-0 truncate text-sm">
          <span className="hidden text-white/75 sm:inline">Sede: </span>
          <strong className="font-semibold">{sede.nombre}</strong>
        </span>
        {cambiarSede ? (
          <button
            onClick={() => setCambiando(true)}
            className={buttonClass('ghost', 'sm', 'h-7 shrink-0 bg-white/15 px-2 text-xs text-white hover:bg-white/25')}
            aria-label="Cambiar sede"
          >
            <ArrowLeftRight className="size-3.5" /> <span className="hidden sm:inline">Cambiar</span>
          </button>
        ) : (
          <span className="pr-2" />
        )}
      </div>
      {/* Se monta solo al abrir, así el combo arranca con la sede actual. */}
      {cambiando && (
        <CambiarSedeDialog
          open
          onClose={() => setCambiando(false)}
          // Un bien abierto para editar puede no pertenecer a la nueva sede.
          onCambiada={() => /^\/bienes\/\d+/.test(pathname) && navigate('/bienes')}
        />
      )}
    </>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()
  // El menú móvil guarda la ruta donde se abrió; al navegar deja de coincidir y se cierra.
  const [menuEn, setMenuEn] = useState<string | null>(null)
  const menuAbierto = menuEn === pathname
  const setMenuAbierto = (abrir: boolean) => setMenuEn(abrir ? pathname : null)

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr] print:block">
      <aside className="no-print sticky top-0 hidden h-screen border-r border-border bg-surface md:block">
        <Sidebar />
      </aside>

      {menuAbierto && (
        <div className="no-print fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur">
          <button
            className={buttonClass('ghost', 'icon', 'shrink-0 md:hidden')}
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
          >
            {menuAbierto ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <SedeActual />
        </header>

        <main className="flex-1 p-4 md:p-8 print:p-0">
          {!supabaseConfigurado && (
            <div className="no-print mb-6 rounded-lg border border-malo/40 bg-malo/5 p-4 text-sm">
              <strong>Supabase no está configurado.</strong> Copia <code>.env.example</code> a <code>.env</code>, completa{' '}
              <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, y reinicia <code>npm run dev</code>.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
