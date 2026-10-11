import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  /** `primary` = ink fill for the main action; `quiet` = soft fill; `danger` = destructive, text only. */
  variant?: 'primary' | 'quiet' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
  /** Set for toggle buttons; rendered as `aria-pressed`. */
  pressed?: boolean
}

const variants = {
  primary: 'bg-ink text-paper',
  quiet: 'bg-hover text-ink aria-pressed:bg-ink aria-pressed:text-paper',
  danger: 'text-danger hover:bg-hover',
}

export function Button({ children, onClick, variant = 'quiet', type = 'button', disabled, pressed }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold whitespace-nowrap disabled:cursor-default disabled:opacity-50 ${variants[variant]}`}
    >
      {children}
    </button>
  )
}
