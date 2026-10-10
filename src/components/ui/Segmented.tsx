type SegmentedProps<T extends string> = {
  /** Accessible name of the group. */
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** A small set of mutually exclusive options; the active one has `aria-pressed="true"`. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-max gap-1 rounded-xl bg-hover p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="h-8 cursor-pointer rounded-[9px] px-4 text-sm font-semibold text-pencil aria-pressed:bg-sheet aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_rgb(0_0_0/0.08)]"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
