import type { ComponentProps } from 'react'
import { Field, Select } from '@/components/ui/form'
import { useSedes } from '@/lib/sedes'

interface Props extends Omit<ComponentProps<'select'>, 'id' | 'children'> {
  id: string
  error?: string
}

/** Combo de sedes (datos de la tabla `lugares`), usado en login, registro y cambio de sede. */
export function SelectSede({ id, error, disabled, className, ...props }: Props) {
  const sedes = useSedes()
  return (
    <Field
      label="Sede"
      htmlFor={id}
      required={props.required}
      className={className}
      error={error ?? (sedes.isError ? 'No se pudieron cargar las sedes.' : undefined)}
    >
      <Select id={id} aria-invalid={!!error} disabled={disabled || !sedes.data} {...props}>
        <option value="">{sedes.isPending ? 'Cargando…' : 'Selecciona la sede'}</option>
        {sedes.data?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </Select>
    </Field>
  )
}
