const ERRORES: Record<string, string> = {
  invalid_credentials: 'Correo o contraseña incorrectos.',
  email_not_confirmed: 'Tu correo aún no está confirmado. Abre el enlace que te enviamos por email.',
  user_already_exists: 'Ya existe una cuenta con ese correo.',
  weak_password: 'La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.',
  signup_disabled: 'El registro de nuevas cuentas está desactivado.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  email_address_invalid: 'El correo no es válido.',
  otp_expired: 'El enlace de confirmación venció o ya fue usado. Pide uno nuevo.',
}

/** Traduce los códigos de error de Supabase Auth; si no hay traducción, deja el mensaje original. */
export function traducirError(code: string | undefined, mensaje: string) {
  return (code && ERRORES[code]) || mensaje
}

/**
 * Página a la que apunta el enlace del correo de confirmación (local o Vercel). La plantilla
 * "Confirm signup" de Supabase arma el enlace con {{ .RedirectTo }}?token_hash=…&type=email.
 */
export function urlConfirmacion() {
  return `${window.location.origin}/confirmar-correo`
}
