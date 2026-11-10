import { useId, useState } from 'react'

type TextFieldProps = {
  label: string
  type: 'email' | 'password' | 'text'
  value: string
  onChange: (value: string) => void
  /** What a password manager fills: `email`, `current-password` or `new-password`. */
  autoComplete: string
  /** A short line under the field, such as the password's minimum length. */
  hint?: string
  /** For a password: the show/hide toggle's labels, in the current language. */
  reveal?: { show: string; hide: string }
  autoFocus?: boolean
}

/**
 * A labelled input for the Account forms. A password field gets a show/hide toggle
 * instead of a second "repeat it" field. Paper tokens only, never the accent.
 */
export function TextField({ label, type, value, onChange, autoComplete, hint, reveal, autoFocus }: TextFieldProps) {
  const id = useId()
  const hintId = useId()
  const [shown, setShown] = useState(false)
  const toggles = type === 'password' && reveal

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={toggles && shown ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          autoCapitalize={type === 'text' ? undefined : 'none'}
          spellCheck={false}
          aria-describedby={hint ? hintId : undefined}
          className={`h-11 w-full rounded-xl border border-rule bg-paper px-3 text-[15px] text-ink outline-none focus:border-ink ${toggles ? 'pr-24' : ''}`}
        />
        {toggles && (
          <button
            type="button"
            aria-pressed={shown}
            onClick={() => setShown((value) => !value)}
            className="absolute right-1.5 h-8 cursor-pointer rounded-[9px] px-2.5 text-[13px] font-semibold text-ink-2 hover:bg-hover"
          >
            {shown ? reveal.hide : reveal.show}
          </button>
        )}
      </div>
      {hint && (
        <span id={hintId} className="text-[12.5px] text-pencil">
          {hint}
        </span>
      )}
    </div>
  )
}
