import type { AreaColor } from '../../types'

type SegmentedProps<T extends string> = {
  /** Accessible name of the group. */
  label: string
  /** `dot` shows a small Area color dot before the label, as in the Dock. */
  options: readonly { value: T; label: string; dot?: AreaColor }[]
  value: T
  onChange: (value: T) => void
}

/**
 * A small set of mutually exclusive options; the active one has `aria-pressed="true"`.
 * As wide as its options, wrapping onto more lines when they do not fit (12 Areas on a phone).
 */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-hover p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-4 text-sm font-semibold text-pencil aria-pressed:bg-sheet aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_rgb(0_0_0/0.08)]"
        >
          {option.dot && (
            <i aria-hidden="true" data-dot="" className="size-[7px] flex-none rounded-full" style={{ background: `var(--color-${option.dot})` }} />
          )}
          {option.label}
        </button>
      ))}
    </div>
  )
}
