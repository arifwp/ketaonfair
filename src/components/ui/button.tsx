import { cn } from '#/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary'
          ? 'border-primary bg-primary text-primary-foreground hover:opacity-90'
          : 'border-input bg-background text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
