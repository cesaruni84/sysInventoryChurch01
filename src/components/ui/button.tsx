import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type Size, type Variant } from './button-variants'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant, size, className, type = 'button', ...props }: Props) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}
