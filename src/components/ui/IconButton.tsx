import type { LucideIcon } from 'lucide-react'

type IconButtonProps = {
  /** Accessible name; required because the button shows no text. */
  label: string
  icon: LucideIcon
  onClick?: () => void
  /** Set for toggle buttons; rendered as `aria-pressed`. */
  pressed?: boolean
}

export function IconButton({ label, icon: Icon, onClick, pressed }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="grid size-[38px] flex-none cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-hover aria-pressed:bg-hover aria-pressed:text-ink"
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
