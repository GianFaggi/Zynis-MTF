import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  onClick?: () => void
  /** `primary` = ink fill for the main action; `quiet` = soft fill. */
  variant?: 'primary' | 'quiet'
  type?: 'button' | 'submit'
  disabled?: boolean
}

const variants = {
  primary: 'bg-ink text-paper',
  quiet: 'bg-hover text-ink',
}

export function Button({ children, onClick, variant = 'quiet', type = 'button', disabled }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold whitespace-nowrap disabled:cursor-default disabled:opacity-50 ${variants[variant]}`}
    >
      {children}
    </button>
  )
}
