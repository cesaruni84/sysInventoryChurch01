import { cn } from '@/lib/utils'

export type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
export type Size = 'sm' | 'md' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-boton text-white hover:bg-boton-hover',
  outline: 'border border-border bg-surface hover:bg-primary-soft',
  ghost: 'hover:bg-primary-soft',
  danger: 'bg-malo text-white hover:opacity-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  icon: 'h-8 w-8',
}

/** Clases de botón, también para `<Link>` con aspecto de botón. */
export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-boton',
    variants[variant],
    sizes[size],
    className,
  )
}
