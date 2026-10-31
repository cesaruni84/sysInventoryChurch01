import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthShell } from '@/components/AuthShell'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { SelectSede } from '@/components/SelectSede'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { usePerfilActual } from '@/lib/permisos'
import { useSedeDelUsuario, useSedes } from '@/lib/sedes'

/**
 * Rutas privadas: sin sesión redirige a /login y recuerda la página pedida.
 * Según el rol del perfil (0017):
 * - sin rol (o sin sede, si no es Administrador): pantalla de espera;
 * - Administrador: puede trabajar con cualquier sede, y si no hay una activa (p. ej. sesión restaurada
 *   en otro navegador) pide elegirla;
 * - cualquier otro rol: la sede activa es siempre la de su perfil, sin importar la que se eligió al ingresar.
 */
export function RequireAuth() {
  const { session } = useAuth()
  const location = useLocation()

  if (session === undefined) return <Cargando />
  if (!session) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  return <ConPerfil userId={session.user.id} email={session.user.email} />
}

function ConPerfil({ userId, email }: { userId: string; email?: string }) {
  const { sedeActiva, elegirSede } = useAuth()
  const perfil = usePerfilActual()
  const rol = perfil.data?.rol ?? null
  const sedePropia = rol && rol !== 'admin' ? (perfil.data?.sede ?? null) : null

  useEffect(() => {
    if (sedePropia && sedeActiva?.id !== sedePropia.id) elegirSede(sedePropia)
  }, [sedePropia, sedeActiva, elegirSede])

  if (perfil.isPending) return <Cargando />
  if (perfil.isError) {
    return (
      <EsperaShell titulo="No se pudo cargar tu perfil" onReintentar={() => perfil.refetch()}>
        <ErrorCarga error={perfil.error} />
      </EsperaShell>
    )
  }
  if (!rol) {
    return (
      <EsperaShell titulo="Tu cuenta está pendiente de aprobación" email={email} onReintentar={() => perfil.refetch()}>
        Un administrador debe asignarte un rol antes de que puedas usar el inventario. Cuando lo haga, pulsa «Actualizar».
      </EsperaShell>
    )
  }
  if (rol !== 'admin') {
    if (!sedePropia) {
      return (
        <EsperaShell titulo="Tu cuenta no tiene sede" email={email} onReintentar={() => perfil.refetch()}>
          Un administrador debe asignarte una sede antes de que puedas usar el inventario. Cuando lo haga, pulsa «Actualizar».
        </EsperaShell>
      )
    }
    // Hasta que la sede activa coincida con la del perfil no se muestra nada del inventario.
    if (sedeActiva?.id !== sedePropia.id) return <Cargando />
  } else if (!sedeActiva) {
    return <ElegirSede userId={userId} email={email} />
  }
  return <Outlet />
}

function EsperaShell({
  titulo,
  email,
  onReintentar,
  children,
}: {
  titulo: string
  email?: string
  onReintentar: () => void
  children: ReactNode
}) {
  const { cerrarSesion } = useAuth()
  return (
    <AuthShell>
      <Card>
        <h2 className="font-serif text-lg font-semibold">{titulo}</h2>
        <div className="mt-2 mb-4 text-sm text-muted">
          {email && (
            <p className="mb-2">
              Sesión iniciada como <strong className="text-foreground">{email}</strong>.
            </p>
          )}
          {children}
        </div>
        <Button onClick={onReintentar}>Actualizar</Button>
      </Card>
      <p className="mt-4 text-center text-sm">
        <button onClick={cerrarSesion} className="text-muted underline hover:text-foreground">
          Cerrar sesión
        </button>
      </p>
    </AuthShell>
  )
}

function ElegirSede({ userId, email }: { userId: string; email?: string }) {
  const { elegirSede, cerrarSesion } = useAuth()
  const sedes = useSedes()
  const { data: sedePerfil } = useSedeDelUsuario(userId)
  const [elegida, setElegida] = useState<string | null>(null)

  // Se preselecciona la sede del perfil hasta que el usuario elija otra.
  const sedeId = elegida ?? (sedePerfil ? String(sedePerfil.id) : '')
  const sede = sedes.data?.find((s) => String(s.id) === sedeId)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (sede) elegirSede(sede)
  }

  return (
    <AuthShell>
      <Card>
        <h2 className="font-serif text-lg font-semibold">Elige la sede</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Sesión iniciada como <strong className="text-foreground">{email}</strong>. Elige con qué sede vas a trabajar.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <SelectSede id="sede" value={sede ? sedeId : ''} onChange={(e) => setElegida(e.target.value)} />
          <Button type="submit" disabled={!sede}>
            Continuar
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm">
        ¿No eres tú?{' '}
        <button onClick={cerrarSesion} className="text-muted underline hover:text-foreground">
          Cerrar sesión e ingresar con otra cuenta
        </button>
      </p>
    </AuthShell>
  )
}
