import { Check } from 'lucide-react'

type ItemCheckProps = {
  done: boolean
  /** Accessible name, usually the Item's text. */
  label: string
  onToggle: () => void
}

/** An Item's box, on the Desk and in the editor. Checked boxes use the accent: a check is a win. */
export function ItemCheck({ done, label, onToggle }: ItemCheckProps) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={label}
      onClick={onToggle}
      // `before:` widens the touch target past the 19 px box.
      className="relative grid size-[19px] flex-none cursor-pointer place-items-center rounded-md border-[1.5px] border-[color:color-mix(in_oklab,var(--color-pencil)_70%,transparent)] text-transparent transition-colors before:absolute before:-inset-[7px] aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent"
    >
      <Check size={12} strokeWidth={3} aria-hidden="true" />
    </button>
  )
}
