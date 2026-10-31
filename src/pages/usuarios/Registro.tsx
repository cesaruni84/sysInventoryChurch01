import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck, Trash2 } from 'lucide-react'
import { CampoImagen, type CambioImagen } from '@/components/CampoImagen'
import { PageHeader } from '@/components/layout/AppLayout'
import { Cargando, ErrorCarga } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { buttonClass } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Field, Input, Select } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast-context'
import { useAuth } from '@/lib/auth-context'
import { mensajeError } from '@/lib/bienes'
import { borrarImagen, subirImagen } from '@/lib/imagenes'
import { usePerfilActual, usePermisos } from '@/lib/permisos'
import { useRoles, type Rol } from '@/lib/roles'
import { useSedes, type Sede } from '@/lib/sedes'
import {
  FUNCIONES,
  nombreCompleto,
  SEXOS,
  useActualizarUsuario,
  useCrearUsuario,
  useEliminarUsuario,
  useUsuario,
  type DatosUsuario,
  type Funcion,
  type Sexo,
  type Usuario,
} from '@/lib/usuarios'

const telefono = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\+?[\d\s-]{6,20}$/.test(v), 'Teléfono no válido (solo números, espacios, guiones y +)')

const base = {
  nombre: z.string().trim().min(1, 'Ingresa los nombres').max(80, 'Máximo 80 caracteres'),
  apellido: z.string().trim().min(1, 'Ingresa los apellidos').max(80, 'Máximo 80 caracteres'),
  telefono,
  rol_id: z.string(),
  lugar_id: z.string(),
  sexo: z.string(),
  funcion: z.string(),
}

const schemaNuevo = z
  .object({
    ...base,
    email: z.string().trim().pipe(z.email('Correo no válido')),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((v) => v.password === v.confirmar, { path: ['confirmar'], message: 'Las contraseñas no coinciden' })

const schemaEdicion = z.object({ ...base, email: z.string(), password: z.string(), confirmar: z.string() })

type FormValues = z.infer<typeof schemaNuevo>

function aDatos(v: FormValues, foto: string | null): DatosUsuario {
  return {
    nombre: v.nombre,
    apellido: v.apellido,
    telefono: v.telefono || null,
    rol_id: v.rol_id ? Number(v.rol_id) : null,
    lugar_id: v.lugar_id ? Number(v.lugar_id) : null,
    sexo: (v.sexo || null) as Sexo | null,
    funcion: (v.funcion || null) as Funcion | null,
    foto,
  }
}

function aFormulario(u: Usuario): FormValues {
  return {
    nombre: u.nombre,
    apellido: u.apellido,
    telefono: u.telefono ?? '',
    rol_id: u.rol_id === null ? '' : String(u.rol_id),
    lugar_id: u.lugar_id === null ? '' : String(u.lugar_id),
    sexo: u.sexo ?? '',
    funcion: u.funcion ?? '',
    email: u.email,
    password: '',
    confirmar: '',
  }
}

const vacio: FormValues = {
  nombre: '',
  apellido: '',
  telefono: '',
  rol_id: '',
  lugar_id: '',
  sexo: '',
  funcion: '',
  email: '',
  password: '',
  confirmar: '',
}

/** Registro de usuario (/usuarios/registro) y edición (/usuarios/:id). */
export default function RegistroUsuario() {
  const { id } = useParams()
  const usuario = useUsuario(id)
  const roles = useRoles()
  const sedes = useSedes()
  const { esAdmin } = usePermisos()
  const { data: perfil } = usePerfilActual()

  if (id && usuario.isPending) return <Cargando />
  if (id && usuario.isError) return <ErrorCarga error={usuario.error} />
  // Los combos deben tener sus opciones al montarse para mostrar el valor guardado.
  if (roles.isPending || sedes.isPending) return <Cargando />
  if (roles.isError) return <ErrorCarga error={roles.error} />
  if (sedes.isError) return <ErrorCarga error={sedes.error} />

  // Solo un Administrador edita a otro Administrador (la base de datos también lo impide).
  if (!esAdmin && usuario.data?.roles?.codigo === 'admin') {
    return <ErrorCarga error={new Error('No tienes permiso para editar a un Administrador.')} />
  }

  // Un Encargado trabaja solo con su sede y no puede asignar el rol Administrador.
  const sedeFija = esAdmin ? null : (perfil?.sede ?? null)
  return (
    <Formulario
      key={id ?? 'nuevo'}
      usuario={usuario.data}
      roles={esAdmin ? roles.data : roles.data.filter((r) => r.codigo !== 'admin')}
      sedes={sedeFija ? [sedeFija] : esAdmin ? sedes.data : []}
      sedeFija={sedeFija}
    />
  )
}

function Formulario({ usuario, roles, sedes, sedeFija }: { usuario?: Usuario; roles: Rol[]; sedes: Sede[]; sedeFija: Sede | null }) {
  const editando = usuario !== undefined
  const { eliminarUsuarios } = usePermisos()
  const vacioInicial: FormValues = { ...vacio, lugar_id: sedeFija ? String(sedeFija.id) : '' }
  const navigate = useNavigate()
  const notificar = useToast()
  const crear = useCrearUsuario()
  const actualizar = useActualizarUsuario()
  const eliminar = useEliminarUsuario()
  const { session } = useAuth()
  const [creadoPara, setCreadoPara] = useState<string | null>(null)
  const [cambioFoto, setCambioFoto] = useState<CambioImagen>({ tipo: 'sin-cambios' })
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const fotoActual = usuario?.foto ?? null
  const esUnoMismo = usuario !== undefined && usuario.id === session?.user.id

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(editando ? schemaEdicion : schemaNuevo),
    defaultValues: usuario ? aFormulario(usuario) : vacioInicial,
  })

  async function onSubmit(enviado: FormValues) {
    const v = sedeFija ? { ...enviado, lugar_id: String(sedeFija.id) } : enviado
    if (usuario) await guardarEdicion(usuario, v)
    else await registrar(v)
  }

  // Igual que en bienes: la foto nueva se sube antes de guardar y se borra si el guardado falla.
  async function guardarEdicion(u: Usuario, v: FormValues) {
    let rutaNueva: string | null = null
    try {
      if (cambioFoto.tipo === 'nueva') rutaNueva = await subirImagen(cambioFoto.archivo, u.id, 'usuarios')
      const foto = cambioFoto.tipo === 'nueva' ? rutaNueva : cambioFoto.tipo === 'quitar' ? null : fotoActual
      await actualizar.mutateAsync({ id: u.id, datos: aDatos(v, foto) })
      if (cambioFoto.tipo !== 'sin-cambios') await borrarImagen(fotoActual, 'usuarios')
      notificar('Usuario actualizado.')
      navigate('/usuarios')
    } catch (e) {
      await borrarImagen(rutaNueva, 'usuarios')
      notificar(mensajeError(e), 'error')
    }
  }

  // El rol y la foto se guardan después de crear la cuenta: crear_perfil() no copia el rol de
  // los metadatos (0012), y la carpeta de la foto es el id del usuario nuevo.
  async function registrar(v: FormValues) {
    let id: string
    try {
      id = await crear.mutateAsync({ email: v.email, password: v.password, datos: aDatos(v, null) })
    } catch (e) {
      notificar(mensajeError(e), 'error')
      return
    }
    if (v.rol_id || cambioFoto.tipo === 'nueva') {
      let ruta: string | null = null
      try {
        if (cambioFoto.tipo === 'nueva') ruta = await subirImagen(cambioFoto.archivo, id, 'usuarios')
        await actualizar.mutateAsync({ id, datos: aDatos(v, ruta) })
      } catch (e) {
        await borrarImagen(ruta, 'usuarios')
        notificar(`El usuario se creó, pero no se pudo guardar el rol o la foto: ${mensajeError(e)}`, 'error')
      }
    }
    setCreadoPara(v.email)
  }

  async function confirmarEliminar() {
    if (!usuario) return
    try {
      await eliminar.mutateAsync(usuario)
      notificar('Usuario eliminado.')
      navigate('/usuarios')
    } catch (e) {
      notificar(mensajeError(e), 'error')
      setConfirmandoEliminar(false)
    }
  }

  if (creadoPara) {
    return (
      <>
        <PageHeader title="Registro de usuario" />
        <Card className="max-w-xl text-center">
          <MailCheck className="mx-auto size-10 text-bueno" />
          <h2 className="mt-3 font-serif text-lg font-semibold">Usuario registrado</h2>
          <p className="mt-2 text-sm text-muted">
            Enviamos un correo de confirmación a <strong className="text-foreground">{creadoPara}</strong>. La persona podrá
            ingresar con la contraseña que definiste después de confirmar su correo.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                reset(vacioInicial)
                setCambioFoto({ tipo: 'sin-cambios' })
                setCreadoPara(null)
              }}
            >
              Registrar otro
            </Button>
            <Link to="/usuarios" className={buttonClass()}>
              Ir al listado
            </Link>
          </div>
        </Card>
      </>
    )
  }

  const err = (k: keyof FormValues) => errors[k]?.message

  return (
    <>
      <PageHeader
        title={editando ? 'Editar usuario' : 'Registro de usuario'}
        subtitle={
          editando
            ? usuario.email
            : 'La persona recibirá un correo para confirmar su cuenta antes de poder ingresar.'
        }
      />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="grid max-w-3xl gap-5 md:grid-cols-2">
          <Field label="Nombres" htmlFor="nombre" required error={err('nombre')}>
            <Input id="nombre" autoFocus aria-invalid={!!errors.nombre} {...register('nombre')} />
          </Field>
          <Field label="Apellidos" htmlFor="apellido" required error={err('apellido')}>
            <Input id="apellido" aria-invalid={!!errors.apellido} {...register('apellido')} />
          </Field>

          <Field label="Email" htmlFor="email" required={!editando} error={err('email')}>
            <Input
              id="email"
              type="email"
              aria-invalid={!!errors.email}
              disabled={editando}
              title={editando ? 'El correo de la cuenta no se puede cambiar' : undefined}
              {...register('email')}
            />
          </Field>
          <Field label="Teléfono" htmlFor="telefono" error={err('telefono')}>
            <Input id="telefono" type="tel" placeholder="Ej. 987 654 321" aria-invalid={!!errors.telefono} {...register('telefono')} />
          </Field>

          <Field label="Rol" htmlFor="rol_id" error={err('rol_id')}>
            <Select id="rol_id" {...register('rol_id')}>
              <option value="">Sin rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sede" htmlFor="lugar_id" error={err('lugar_id')}>
            {sedeFija ? (
              // Un campo deshabilitado no se envía con el formulario: la sede se fija en onSubmit.
              <Input id="lugar_id" value={sedeFija.nombre} readOnly title="Solo puedes registrar usuarios de tu sede" />
            ) : (
              <Select id="lugar_id" {...register('lugar_id')}>
                <option value="">Sin sede</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Sexo" htmlFor="sexo" error={err('sexo')}>
            <Select id="sexo" {...register('sexo')}>
              <option value="">Sin especificar</option>
              {SEXOS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Función" htmlFor="funcion" error={err('funcion')}>
            <Select id="funcion" {...register('funcion')}>
              <option value="">Sin función</option>
              {FUNCIONES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </Field>

          {!editando && (
            <>
              <Field label="Contraseña inicial" htmlFor="password" required error={err('password')}>
                <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />
              </Field>
              <Field label="Confirmar contraseña" htmlFor="confirmar" required error={err('confirmar')}>
                <Input id="confirmar" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmar} {...register('confirmar')} />
              </Field>
            </>
          )}

          <div className="md:col-span-2">
            <CampoImagen actual={fotoActual} cambio={cambioFoto} onCambio={setCambioFoto} bucket="usuarios" etiqueta="Foto" />
          </div>
        </Card>

        <div className="mt-6 flex max-w-3xl flex-wrap justify-end gap-2">
          {editando && eliminarUsuarios && (
            <Button
              variant="outline"
              className="mr-auto text-malo"
              onClick={() => setConfirmandoEliminar(true)}
              disabled={esUnoMismo || isSubmitting}
              title={esUnoMismo ? 'No puedes eliminar tu propio usuario' : undefined}
            >
              <Trash2 className="size-4" /> Eliminar usuario
            </Button>
          )}
          <Link to="/usuarios" className={buttonClass('outline')}>
            Cancelar
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Registrar usuario'}
          </Button>
        </div>
      </form>

      {usuario && (
        <ConfirmDialog
          open={confirmandoEliminar}
          title="Eliminar usuario"
          loading={eliminar.isPending}
          onConfirm={confirmarEliminar}
          onCancel={() => setConfirmandoEliminar(false)}
        >
          ¿Seguro que deseas eliminar a <strong>{nombreCompleto(usuario)}</strong> ({usuario.email})? Se borrará su cuenta de
          acceso y ya no podrá ingresar. Esta acción no se puede deshacer.
        </ConfirmDialog>
      )}
    </>
  )
}
