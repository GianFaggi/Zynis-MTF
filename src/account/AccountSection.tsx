import { ChevronRight } from 'lucide-react'
import { useT } from '../i18n'
import { useAccountStore } from './accountStore'

type AccountSectionProps = {
  /** Settings closes first, then the Account sheet opens: two sheets are never open at once. */
  onOpen: () => void
}

/**
 * The Account group of the Settings sheet: who is signed in, read from the device, so it
 * shows with no connection. Opening Settings makes no request; only the Account sheet does.
 */
export function AccountSection({ onOpen }: AccountSectionProps) {
  const t = useT()
  const email = useAccountStore((state) => state.email)

  return (
    <div className="flex flex-col gap-2 py-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-pencil uppercase">{t('account')}</span>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] bg-hover px-3.5 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <strong className="block truncate font-semibold">{email ?? t('accountSignInRow')}</strong>
          <span className="block text-[13.5px] text-pencil">{email ? t('accountSignedInRow') : t('accountLocalNote')}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="flex-none text-pencil" />
      </button>
    </div>
  )
}
