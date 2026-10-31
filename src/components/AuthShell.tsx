import type { ReactNode } from 'react'
import { FOTO_TEMPLO, IGLESIA_TITULO, LOGO, MOSTRAR_FONDO_LOGIN } from '@/lib/marca'
import { supabaseConfigurado } from '@/lib/supabase'

function AvisoSupabase() {
  if (supabaseConfigurado) return null
  return (
    <p className="mb-4 rounded-md border border-malo/40 bg-malo/5 p-3 text-sm">
      Supabase no está configurado. Completa <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
    </p>
  )
}

/**
 * Marco común de las pantallas públicas (login, crear cuenta, elegir sede):
 * panel blanco centrado sobre la foto del templo a pantalla completa.
 * Con `dividido` (login) el panel se parte en dos: mensaje de bienvenida a la izquierda y formulario a la derecha.
 */
export function AuthShell({ children, dividido = false }: { children: ReactNode; dividido?: boolean }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4">
      {/* Foto del templo con una capa oscura para que el panel resalte (se activa en marca.ts). */}
      {MOSTRAR_FONDO_LOGIN ? (
        <>
          <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${FOTO_TEMPLO}')` }} />
          <div aria-hidden className="absolute inset-0 bg-black/40" />
        </>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-primary-soft" />
      )}

      {dividido ? (
        <div className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl bg-surface shadow-2xl lg:grid-cols-2">
          {/* Panel de bienvenida: solo en pantallas anchas; en las chicas el logo va sobre el formulario. */}
          <div className="relative hidden overflow-hidden text-white lg:block">
            <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${FOTO_TEMPLO}')` }} />
            <div aria-hidden className="absolute inset-0 bg-primary/85" />
            <div className="relative flex h-full flex-col items-center justify-center gap-6 p-12 text-center">
              <img src={LOGO} alt="" className="size-28 rounded-2xl ring-2 ring-white/40" />
              <div className="leading-tight">
                <p className="text-lg text-white/80">{IGLESIA_TITULO.linea1}</p>
                <p className="mt-1 font-serif text-4xl font-bold">{IGLESIA_TITULO.linea2}</p>
              </div>
              <div className="h-px w-16 bg-white/40" />
              <p className="text-base text-white/85">Módulo de Inventario de Bienes y Enseres</p>
            </div>
          </div>

          <div className="px-6 py-10 sm:px-12">
            <div className="mx-auto w-full max-w-[26rem]">
              <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
                <img src={LOGO} alt="" className="size-14 shrink-0 rounded-xl ring-1 ring-border" />
                <div className="leading-tight">
                  <p className="text-sm text-muted">{IGLESIA_TITULO.linea1}</p>
                  <p className="font-serif text-lg font-bold text-primary">{IGLESIA_TITULO.linea2}</p>
                </div>
              </div>
              <AvisoSupabase />
              {children}
            </div>
          </div>
        </div>
      ) : (
        /* Panel: ancho y título un 20% mayores que los tamaños estándar (24rem → 28.8rem; text-xl → text-2xl). */
        <div className="relative w-full max-w-[32rem] rounded-2xl bg-surface px-6 py-8 shadow-2xl sm:px-8">
          <div className="mx-auto w-full max-w-[28.8rem]">
            <div className="mb-7 flex items-center justify-center gap-3.5">
              <img src={LOGO} alt="" className="size-[4.2rem] shrink-0 rounded-xl ring-1 ring-border" />
              <div className="leading-tight">
                <p className="text-[1.05rem] text-muted">{IGLESIA_TITULO.linea1}</p>
                <h1 className="font-serif text-2xl font-bold text-primary">{IGLESIA_TITULO.linea2}</h1>
                <p className="text-[0.9rem] text-muted">Módulo de Inventario de Bienes y Enseres</p>
              </div>
            </div>
            <AvisoSupabase />
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
