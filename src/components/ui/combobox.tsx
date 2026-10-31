import { useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn, normalizarTexto } from '@/lib/utils'

export interface OpcionCombo {
  value: string
  label: string
  /** Título del grupo; las opciones de un mismo grupo deben ir seguidas. */
  grupo?: string
  title?: string
}

interface ComboboxProps {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  opciones: OpcionCombo[]
  placeholder?: string
  /** Si se indica, agrega al inicio una opción de valor '' (p. ej. "Sin categoría"). */
  vacioLabel?: string
  'aria-invalid'?: boolean
}

/** Combo con buscador: se escribe para filtrar (sin distinguir mayúsculas ni tildes). */
export function Combobox({ id, value, onChange, onBlur, opciones, placeholder, vacioLabel, ...props }: ComboboxProps) {
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [activo, setActivo] = useState(0)

  const seleccionada = opciones.find((o) => o.value === value)
  const textoCerrado = seleccionada?.label ?? (value === '' ? (vacioLabel ?? '') : value)

  const q = normalizarTexto(consulta.trim())
  const filtradas: OpcionCombo[] = [
    ...(vacioLabel !== undefined && q === '' ? [{ value: '', label: vacioLabel }] : []),
    ...opciones.filter((o) => normalizarTexto(`${o.label} ${o.value}`).includes(q)),
  ]

  function abrir() {
    if (abierto) return
    setConsulta('')
    setActivo(Math.max(0, filtradas.findIndex((o) => o.value === value)))
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    setConsulta('')
  }

  function elegir(o: OpcionCombo) {
    onChange(o.value)
    cerrar()
  }

  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!abierto) return abrir()
      const paso = e.key === 'ArrowDown' ? 1 : -1
      setActivo((a) => Math.min(Math.max(a + paso, 0), filtradas.length - 1))
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault()
      if (filtradas[activo]) elegir(filtradas[activo])
    } else if (e.key === 'Escape' && abierto) {
      e.preventDefault()
      cerrar()
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={abierto && filtradas[activo] ? `${id}-op-${activo}` : undefined}
        aria-invalid={props['aria-invalid']}
        autoComplete="off"
        placeholder={abierto ? 'Escribe para buscar…' : placeholder}
        value={abierto ? consulta : textoCerrado}
        onFocus={abrir}
        onClick={abrir}
        onChange={(e) => {
          setConsulta(e.target.value)
          setActivo(0)
          setAbierto(true)
        }}
        onKeyDown={alTeclear}
        onBlur={() => {
          cerrar()
          onBlur?.()
        }}
        className={cn(
          'h-10 w-full rounded-md border border-border bg-surface pl-3 pr-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-malo',
          !abierto && !seleccionada && 'text-muted',
        )}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted" aria-hidden />
      {abierto && (
        // onMouseDown evita que el input pierda el foco antes de registrar el clic.
        <ul
          id={`${id}-lista`}
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface py-1 text-sm shadow-lg"
        >
          {filtradas.length === 0 && <li className="px-3 py-2 text-muted">Sin resultados</li>}
          {filtradas.map((o, i) => (
            <li key={`${o.grupo ?? ''}|${o.value}`} role="presentation">
              {o.grupo && o.grupo !== filtradas[i - 1]?.grupo && (
                <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase text-muted">{o.grupo}</div>
              )}
              <div
                id={`${id}-op-${i}`}
                role="option"
                aria-selected={o.value === value}
                title={o.title}
                ref={(el) => {
                  if (i === activo) el?.scrollIntoView({ block: 'nearest' })
                }}
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(o)}
                className={cn(
                  'cursor-pointer px-3 py-2',
                  i === activo && 'bg-primary/10',
                  o.value === value && 'font-medium text-primary',
                )}
              >
                {o.label}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
