import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

// Imágenes en Supabase Storage: buckets privados `bienes` (0008) y `usuarios` (fotos, 0011).
// En la tabla se guarda solo la ruta; para mostrarla se pide una URL firmada temporal.

export type Bucket = 'bienes' | 'usuarios'
export const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB, igual que el límite del bucket
export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function storage(bucket: Bucket) {
  if (!supabase) throw new Error('Supabase no está configurado. Revisa el archivo .env.')
  return supabase.storage.from(bucket)
}

/** Devuelve un mensaje si el archivo no se puede subir, o null si es válido. */
export function validarImagen(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) return 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.'
  if (archivo.size > TAMANO_MAXIMO) return 'La imagen pesa más de 5 MB.'
  return null
}

/**
 * Sube la imagen dentro de `carpeta` (la sede para bienes, el id del usuario para fotos)
 * y devuelve su ruta en el bucket.
 */
export async function subirImagen(archivo: File, carpeta: number | string, bucket: Bucket = 'bienes'): Promise<string> {
  const ext = archivo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const ruta = `${carpeta}/${crypto.randomUUID()}.${ext}`
  const { error } = await storage(bucket).upload(ruta, archivo, { contentType: archivo.type, upsert: false })
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`)
  return ruta
}

/** Borra una imagen; si falla no interrumpe (solo queda un archivo huérfano). */
export async function borrarImagen(ruta: string | null | undefined, bucket: Bucket = 'bienes') {
  if (!ruta) return
  try {
    await storage(bucket).remove([ruta])
  } catch {
    // Ignorado a propósito.
  }
}

export function useUrlImagen(ruta: string | null | undefined, bucket: Bucket = 'bienes') {
  return useQuery({
    queryKey: ['imagen', bucket, ruta],
    queryFn: async () => {
      const { data, error } = await storage(bucket).createSignedUrl(ruta!, 60 * 60)
      if (error) throw error
      return data.signedUrl
    },
    enabled: Boolean(ruta),
    staleTime: 50 * 60_000, // menos que la hora de validez de la URL
  })
}
