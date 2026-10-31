import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'
import { Cargando } from '@/components/QueryState'
import { SelectSede } from '@/components/SelectSede'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form'
import { useAuth } from '@/lib/auth-context'
import { mensajeError } from '@/lib/bienes'
import { useSedes } from '@/lib/sedes'
import { supabaseConfigurado } from '@/lib/supabase'

/** Etiquetas del login en semibold, para que se lean mejor junto al asterisco de obligatorio. */
const ETIQUETA_FUERTE = '[&>label]:font-semibold'

export default function Login() {
  const { session, sedeActiva, iniciarSesion } = useAuth()
  const location = useLocation()
  const sedes = useSedes()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  // Se preselecciona la última sede usada en este navegador.
  const [sedeId, setSedeId] = useState(sedeActiva ? String(sedeActiva.id) : '')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const destino = (location.state as { desde?: string } | null)?.desde ?? '/'

  if (session === undefined) return <Cargando />
  if (session) return <Navigate to={destino} replace />

  // Si la sede guardada ya no está activa, no se preselecciona.
  const sede = sedes.data?.find((s) => String(s.id) === sedeId)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!sede) {
      setError('Selecciona la sede.')
      return
    }
    setError('')
    setEnviando(true)
    try {
      await iniciarSesion(email.trim(), password, sede)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell dividido>
      <div className="mb-6 text-center lg:text-left">
        <h2 className="font-serif text-3xl font-bold text-primary">Bienvenido</h2>
        <p className="mt-1 text-sm text-muted">Inicia sesión para continuar.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Correo" htmlFor="email" required className={ETIQUETA_FUERTE}>
          <div className="relative">
            <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              className="pl-10"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Contraseña" htmlFor="password" required className={ETIQUETA_FUERTE}>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="password"
              type={verPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className="px-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-foreground"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={verPassword}
            >
              {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <SelectSede
          id="sede"
          required
          className={ETIQUETA_FUERTE}
          value={sede ? sedeId : ''}
          onChange={(e) => setSedeId(e.target.value)}
        />
        {error && (
          <p className="rounded-md border border-malo/40 bg-malo/5 px-3 py-2 text-sm text-malo" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="h-11 w-full text-base" disabled={enviando || !sede || !email || !password || !supabaseConfigurado}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{' '}
        <Link to="/crear-cuenta" className="font-semibold text-primary underline">
          Regístrate
        </Link>
      </p>
    </AuthShell>
  )
}
