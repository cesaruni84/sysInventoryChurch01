import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { urlConfirmacion } from './auth-errores'
import { borrarImagen } from './imagenes'
import type { CodigoRol } from './permisos'
import { clienteSinSesion, supabase } from './supabase'

export type Sexo = 'M' | 'F'
export const SEXOS: { valor: Sexo; nombre: string }[] = [
  { valor: 'M', nombre: 'Masculino' },
  { valor: 'F', nombre: 'Femenino' },
]

/** Función en la iglesia (valores fijos, con check en la columna `perfiles.funcion`). */
export const FUNCIONES = ['Pastor', 'Siervo', 'Diácono'] as const
export type Funcion = (typeof FUNCIONES)[number]

/** Usuario del sistema: perfil (tabla `perfiles`) de una cuenta de Supabase Auth. */
export interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  telefono: string | null
  rol_id: number | null
  /** Sede (FK a `lugares`). */
  lugar_id: number | null
  sexo: Sexo | null
  funcion: Funcion | null
  /** Ruta de la foto en el bucket `usuarios` de Storage. */
  foto: string | null
  created_at: string
  roles: { nombre: string; codigo: CodigoRol | null } | null
  lugares: { nombre: string } | null
}

export interface DatosUsuario {
  nombre: string
  apellido: string
  telefono: string | null
  rol_id: number | null
  lugar_id: number | null
  sexo: Sexo | null
  funcion: Funcion | null
  foto: string | null
}

const KEY = ['usuarios'] as const
// lugares y perfiles se relacionan dos veces (perfiles.lugar_id y lugares.responsable_id, 0013):
// se indica la FK para que PostgREST sepa cuál usar.
const SELECT =
  'id, email, nombre, apellido, telefono, rol_id, lugar_id, sexo, funcion, foto, created_at, roles(nombre, codigo), lugares!perfiles_lugar_id_fkey(nombre)'

function db() {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase
}

export function nombreCompleto(u: Pick<Usuario, 'nombre' | 'apellido'>) {
  return [u.nombre, u.apellido].filter(Boolean).join(' ')
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data, error } = await db().from('perfiles').select(SELECT).order('nombre').order('apellido')
  if (error) throw error
  return data as unknown as Usuario[]
}

export async function obtenerUsuario(id: string): Promise<Usuario> {
  const { data, error } = await db().from('perfiles').select(SELECT).eq('id', id).single()
  if (error) throw error
  return data as unknown as Usuario
}

export function useUsuarios() {
  return useQuery({ queryKey: KEY, queryFn: listarUsuarios })
}

export function useUsuario(id: string | undefined) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => obtenerUsuario(id!), enabled: id !== undefined })
}

/** Edita los datos del perfil. El correo no se cambia aquí (pertenece a la cuenta de acceso). */
export function useActualizarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id: string; datos: DatosUsuario }) => {
      const { error } = await db().from('perfiles').update(datos).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/**
 * Crea la cuenta de otra persona con signUp desde un cliente sin sesión, así no se cierra
 * la sesión actual. Supabase le envía el correo de confirmación; el trigger crear_perfil()
 * guarda nombre, teléfono, rol, sede, sexo y función en `perfiles`. Devuelve el id de la
 * cuenta nueva (para subir su foto después).
 */
export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, datos }: { email: string; password: string; datos: DatosUsuario }) => {
      const { data, error } = await clienteSinSesion().auth.signUp({
        email,
        password,
        options: { data: datos, emailRedirectTo: urlConfirmacion() },
      })
      if (error) {
        if (error.code === 'over_email_send_rate_limit') {
          throw new Error('Se enviaron demasiados correos de confirmación. Espera unos minutos e inténtalo de nuevo.')
        }
        if (error.code === 'weak_password') throw new Error('La contraseña es muy débil. Usa al menos 8 caracteres.')
        throw error
      }
      // Correo ya registrado: Supabase responde sin error pero sin identidades (para no revelar cuentas).
      if (data.user && data.user.identities?.length === 0) throw new Error('Ya existe una cuenta con ese correo.')
      if (!data.user) throw new Error('No se pudo crear el usuario.')
      return data.user.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/**
 * Elimina la cuenta de acceso y su perfil con la función eliminar_usuario() (0011), que
 * corre con privilegios de administrador en la base. Después borra la foto de Storage.
 */
export function useEliminarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (usuario: Pick<Usuario, 'id' | 'foto'>) => {
      const { error } = await db().rpc('eliminar_usuario', { p_id: usuario.id })
      if (error) throw error
      await borrarImagen(usuario.foto, 'usuarios')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
