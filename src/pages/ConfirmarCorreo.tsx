import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck, MailWarning } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/form'
import { traducirError, urlConfirmacion } from '@/lib/auth-errores'
import { mensajeError } from '@/lib/bienes'
import { supabase } from '@/lib/supabase'

type Estado = { tipo: 'pendiente' } | { tipo: 'validado' } | { tipo: 'error'; mensaje: string }

/**
 * Lee el enlace del correo: ?token_hash=…&type=email (plantilla propia) o, en enlaces del
 * formato anterior, el error que Supabase deja en el hash (#error_code=otp_expired…).
 */
function leerEnlace() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const codigoError = query.get('error_code') ?? hash.get('error_code')
  const descripcion = query.get('error_description') ?? hash.get('error_description')
  const tokenHash = query.get('token_hash')
  let estado: Estado = { tipo: 'pendiente' }
  if (codigoError || descripcion) {
    estado = { tipo: 'error', mensaje: traducirError(codigoError ?? undefined, descripcion ?? 'El enlace no es válido.') }
  } else if (!tokenHash) {
    estado = { tipo: 'error', mensaje: 'El enlace de confirmación está incompleto. Pide uno nuevo.' }
  }
  return { tokenHash, estado }
}

export default function ConfirmarCorreo() {
  const [{ tokenHash, estado: inicial }] = useState(leerEnlace)
  const [estado, setEstado] = useState<Estado>(inicial)
  const [validando, setValidando] = useState(false)

  // La validación espera al clic: los escáneres de enlaces del correo (p. ej. Outlook)
  // abren la página antes que la persona y gastarían el token de un solo uso.
  async function confirmar() {
    if (!supabase || !tokenHash) return
    setValidando(true)
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
    if (error) {
      setEstado({ tipo: 'error', mensaje: traducirError(error.code, error.message) })
    } else {
      // verifyOtp abre sesión; se cierra para que entre por el login, donde elige la sede.
      await supabase.auth.signOut()
      setEstado({ tipo: 'validado' })
    }
    setValidando(false)
  }

  return (
    <AuthShell>
      <Card className="text-center">
        {estado.tipo === 'pendiente' && (
          <>
            <MailCheck className="mx-auto size-10 text-primary" />
            <h2 className="mt-3 font-serif text-lg font-semibold">Confirma tu correo</h2>
            <p className="mt-2 text-sm text-muted">Pulsa el botón para activar tu cuenta.</p>
            <Button className="mt-5 w-full" onClick={confirmar} disabled={validando || !supabase}>
              {validando ? 'Validando…' : 'Confirmar mi correo'}
            </Button>
          </>
        )}
        {estado.tipo === 'validado' && (
          <>
            <MailCheck className="mx-auto size-10 text-bueno" />
            <h2 className="mt-3 font-serif text-lg font-semibold">¡Correo validado!</h2>
            <p className="mt-2 text-sm text-muted">
              Tu correo fue validado correctamente. Ya puedes iniciar sesión en el sistema.
            </p>
            <Link to="/login" className="mt-5 inline-block text-sm font-medium text-primary underline">
              Iniciar sesión
            </Link>
          </>
        )}
        {estado.tipo === 'error' && (
          <>
            <MailWarning className="mx-auto size-10 text-malo" />
            <h2 className="mt-3 font-serif text-lg font-semibold">No se pudo validar el correo</h2>
            <p className="mt-2 text-sm text-muted">{estado.mensaje}</p>
            <ReenviarEnlace />
            <Link to="/login" className="mt-5 inline-block text-sm font-medium text-primary underline">
              Ir a iniciar sesión
            </Link>
          </>
        )}
      </Card>
    </AuthShell>
  )
}

/** Pide a Supabase un nuevo correo de confirmación para la cuenta indicada. */
function ReenviarEnlace() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setAviso('')
    setEnviando(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: urlConfirmacion() },
      })
      if (error) throw new Error(traducirError(error.code, error.message))
      setAviso('Te enviamos un nuevo enlace. Revisa tu correo (y la carpeta de spam).')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 text-left">
      <Field label="Correo de tu cuenta" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {aviso && <p className="text-sm text-bueno">{aviso}</p>}
      {error && (
        <p className="text-sm text-malo" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={enviando || !supabase || !email.trim()}>
        {enviando ? 'Enviando…' : 'Reenviar enlace de confirmación'}
      </Button>
    </form>
  )
}
