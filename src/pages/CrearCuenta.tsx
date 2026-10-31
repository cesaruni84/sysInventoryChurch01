import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { AuthShell } from '@/components/AuthShell'
import { Cargando } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SelectSede } from '@/components/SelectSede'
import { Field, Input } from '@/components/ui/form'
import { useAuth } from '@/lib/auth-context'
import { mensajeError } from '@/lib/bienes'
import { supabaseConfigurado } from '@/lib/supabase'

const schema = z
  .object({
    nombre: z.string().trim().min(1, 'Ingresa tu nombre').max(80, 'Máximo 80 caracteres'),
    apellido: z.string().trim().min(1, 'Ingresa tu apellido').max(80, 'Máximo 80 caracteres'),
    email: z.string().trim().pipe(z.email('Correo no válido')),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
    sedeId: z.string().min(1, 'Selecciona tu sede'),
  })
  .refine((v) => v.password === v.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden' })

type FormValues = z.infer<typeof schema>

export default function CrearCuenta() {
  const { session, registrarse } = useAuth()
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', apellido: '', email: '', password: '', confirmar: '', sedeId: '' },
  })

  if (session === undefined) return <Cargando />
  if (session) return <Navigate to="/" replace />

  async function onSubmit(v: FormValues) {
    setError('')
    try {
      await registrarse({
        email: v.email,
        password: v.password,
        nombre: v.nombre,
        apellido: v.apellido,
        sedeId: Number(v.sedeId),
      })
      setEnviadoA(v.email)
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  if (enviadoA) {
    return (
      <AuthShell>
        <Card className="text-center">
          <MailCheck className="mx-auto size-10 text-bueno" />
          <h2 className="mt-3 font-serif text-lg font-semibold">Revisa tu correo</h2>
          <p className="mt-2 text-sm text-muted">
            Enviamos un enlace de confirmación a <strong className="text-foreground">{enviadoA}</strong>. Ábrelo para
            activar tu cuenta y luego inicia sesión.
          </p>
          <p className="mt-3 text-xs text-muted">¿No llegó? Revisa la carpeta de spam o correo no deseado.</p>
          <Link to="/login" className="mt-5 inline-block text-sm font-medium text-primary underline">
            Ir a iniciar sesión
          </Link>
        </Card>
      </AuthShell>
    )
  }

  const err = (k: keyof FormValues) => errors[k]?.message

  return (
    <AuthShell>
      <Card>
        <h2 className="mb-4 font-serif text-lg font-semibold">Crear cuenta</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" htmlFor="nombre" error={err('nombre')}>
              <Input id="nombre" autoComplete="given-name" autoFocus aria-invalid={!!errors.nombre} {...register('nombre')} />
            </Field>
            <Field label="Apellido" htmlFor="apellido" error={err('apellido')}>
              <Input id="apellido" autoComplete="family-name" aria-invalid={!!errors.apellido} {...register('apellido')} />
            </Field>
          </div>
          <Field label="Correo" htmlFor="email" error={err('email')}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Contraseña" htmlFor="password" error={err('password')}>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
          </Field>
          <Field label="Confirmar contraseña" htmlFor="confirmar" error={err('confirmar')}>
            <Input id="confirmar" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmar} {...register('confirmar')} />
          </Field>
          <SelectSede id="sedeId" error={err('sedeId')} {...register('sedeId')} />
          {error && (
            <p className="text-sm text-malo" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting || !supabaseConfigurado}>
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-primary underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  )
}
