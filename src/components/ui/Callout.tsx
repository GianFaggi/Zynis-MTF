type CalloutProps = {
  message: string
  /** Small buttons after the message, in order. */
  actions: readonly { label: string; onClick: () => void }[]
}

/**
 * A short ink note above the Dock with its own buttons: the install nudge.
 * `role="note"`; never the accent.
 */
export function Callout({ message, actions }: CalloutProps) {
  return (
    <div
      role="note"
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-1/2 z-10 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-3 rounded-[14px] bg-ink py-2.5 pr-2.5 pl-4 text-sm text-paper shadow-paper"
    >
      <span>{message}</span>
      <div className="flex flex-none gap-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="h-[30px] cursor-pointer rounded-[9px] bg-[color-mix(in_oklab,var(--color-paper)_16%,transparent)] px-3 text-[13px] font-semibold"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
