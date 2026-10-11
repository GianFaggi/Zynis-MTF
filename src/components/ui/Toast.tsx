export interface ToastMessage {
  /** A new id replays the entrance, even when the text is the same. */
  id: number
  title: string
  detail?: string
}

type ToastProps = {
  message: ToastMessage | null
}

/**
 * A short message above the Dock: ink fill, never the accent. The status region is
 * always mounted, so screen readers announce each new message; the message itself
 * ignores the pointer, so it never blocks the Desk under it.
 */
export function Toast({ message }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom,0px))] z-30 flex justify-center"
    >
      {message && (
        <p
          key={message.id}
          className="flex w-max max-w-full animate-rise flex-col items-center gap-px rounded-2xl bg-ink px-[18px] py-3 text-center text-paper shadow-paper"
        >
          <b className="font-display text-base leading-[1.3] font-semibold">{message.title}</b>
          {message.detail && <span className="text-[13px] opacity-80">{message.detail}</span>}
        </p>
      )}
    </div>
  )
}
