import { Pin, Plus, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import type { Card } from '../types'
import { useWinFeedback } from '../wins/feedback'
import { JarIcon } from '../wins/JarIcon'
import { jarVerdict } from '../wins/rules'
import { areaName } from './areas'
import { isEmptyCard } from './cardText'
import { useDeskStore } from './deskStore'
import { ItemCheck } from './ItemCheck'

const BODY_MAX_HEIGHT = 360

/**
 * The Card editor sheet. Every change is saved as it is typed; closing it in any way
 * (Esc, scrim, close, Guardar) runs `closeCard`, which drops blank Items, discards
 * a Card left empty and counts a kept new Card as a note.
 */
export function CardEditor() {
  const t = useT()
  const editingId = useDeskStore((state) => state.editingId)
  const card = useAppStore((state) => state.data.cards.find((candidate) => candidate.id === editingId))
  const areas = useAppStore((state) => state.data.areas)
  const togglePin = useAppStore((state) => state.togglePin)
  const isNew = useDeskStore((state) => state.newCardId !== null && state.newCardId === state.editingId)
  const area = areas.find((candidate) => candidate.id === card?.areaId)
  const titleRef = useRef<HTMLInputElement>(null)
  const feedback = useWinFeedback()

  // Effects run children first: this one runs after the Sheet has moved focus into
  // its panel, so a new Card's title can take it.
  useEffect(() => {
    if (isNew) titleRef.current?.focus()
  }, [editingId, isNew])

  const close = () => {
    if (editingId) useAppStore.getState().closeCard(editingId, { isNew })
    useDeskStore.getState().closeEditor()
  }

  // The non-drag way to the Jar, with the same rules as a drop. The editor closes first,
  // so a new Card counts its note before it goes in.
  const putInJar = (card: Card) => {
    const verdict = jarVerdict(card)
    if (!verdict.ok) return feedback.refused(verdict.pending)
    close()
    if (useAppStore.getState().jarCard(card.id).ok) feedback.jarred()
  }

  return (
    <Sheet
      open={card !== undefined}
      onClose={close}
      title={t('card')}
      hideTitle
      closeLabel={t('close')}
      tint={area?.color}
      actions={
        card && (
          <Button pressed={card.pinned} onClick={() => togglePin(card.id)}>
            <Pin size={14} aria-hidden="true" className="fill-current" />
            {card.pinned ? t('pinned') : t('pin')}
          </Button>
        )
      }
    >
      {/* Keyed by Card, so the Delete confirmation never carries over to another Card. */}
      {card && <EditorBody key={card.id} card={card} titleRef={titleRef} onClose={close} onPutInJar={() => putInJar(card)} />}
    </Sheet>
  )
}

type EditorBodyProps = {
  card: Card
  titleRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  onPutInJar: () => void
}

function EditorBody({ card, titleRef, onClose, onPutInJar }: EditorBodyProps) {
  const t = useT()
  const areas = useAppStore((state) => state.data.areas)
  const { updateCard, addItem, updateItem, toggleItem, removeItem, placeCard, deleteCard } = useAppStore.getState()
  const feedback = useWinFeedback()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const itemInputs = useRef(new Map<string, HTMLInputElement>())

  useLayoutEffect(() => {
    const body = bodyRef.current
    if (!body) return
    body.style.height = 'auto'
    body.style.height = `${Math.min(body.scrollHeight, BODY_MAX_HEIGHT)}px`
  }, [card.body])

  const field = 'w-full border-b border-transparent bg-transparent outline-none placeholder:text-pencil focus-visible:border-rule'

  return (
    <>
      <input
        ref={titleRef}
        value={card.title}
        onChange={(event) => updateCard(card.id, { title: event.target.value })}
        placeholder={t('title')}
        aria-label={t('title')}
        autoComplete="off"
        className={`${field} py-0.5 font-display text-[23px] leading-[1.25] font-semibold`}
      />
      <textarea
        ref={bodyRef}
        value={card.body}
        onChange={(event) => updateCard(card.id, { body: event.target.value })}
        placeholder={t('body')}
        aria-label={t('body')}
        rows={3}
        className={`${field} min-h-[72px] resize-none py-0.5 text-[15.5px] leading-[1.6] text-ink-2`}
      />

      <ul className="flex flex-col gap-1">
        {card.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <ItemCheck
              done={item.done}
              label={item.text || t('itemText')}
              onToggle={(box) => feedback.itemToggled(toggleItem(card.id, item.id), card.id, box)}
            />
            {/* A form, not an Enter key handler: phone keyboards always submit a form with their
                confirm key, but while composing a word they often report Enter as "Unidentified". */}
            <form
              className="min-w-0 flex-1"
              onSubmit={(event) => {
                event.preventDefault()
                // The Item is already saved as typed: confirming just puts the keyboard away.
                itemInputs.current.get(item.id)?.blur()
              }}
            >
              <input
                ref={(input) => {
                  if (input) itemInputs.current.set(item.id, input)
                  return () => {
                    itemInputs.current.delete(item.id)
                  }
                }}
                value={item.text}
                onChange={(event) => updateItem(card.id, item.id, event.target.value)}
                // An Item opened and left without text goes away, so no empty row waits around.
                onBlur={(event) => {
                  if (!event.target.value.trim()) removeItem(card.id, item.id)
                }}
                aria-label={t('itemText')}
                autoComplete="off"
                enterKeyHint="done"
                className={`${field} py-1.5 text-[15px] ${item.done ? 'text-pencil line-through' : ''}`}
              />
            </form>
            <button
              type="button"
              aria-label={t('removeItem')}
              onClick={() => removeItem(card.id, item.id)}
              className="grid size-[30px] flex-none cursor-pointer place-items-center rounded-full text-pencil hover:bg-hover hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          // The new row must exist before the tap ends: iOS only opens the keyboard for a
          // focus() made during the tap itself, so the store update is flushed right away.
          let id: string | undefined
          flushSync(() => {
            id = addItem(card.id)
          })
          if (id) itemInputs.current.get(id)?.focus()
        }}
        className="flex cursor-pointer items-center gap-2.5 self-start rounded-lg py-1.5 pr-2 text-[15px] text-pencil hover:text-ink"
      >
        <span aria-hidden="true" className="grid size-[19px] flex-none place-items-center rounded-md border-[1.5px] border-dashed border-[color:color-mix(in_oklab,var(--color-pencil)_60%,transparent)]">
          <Plus size={12} strokeWidth={2.5} />
        </span>
        {t('addItem')}
      </button>

      <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
        <label className="mr-auto flex items-center gap-2 text-[13px] text-pencil">
          {t('place')}
          <select
            value={card.areaId}
            onChange={(event) => placeCard(card.id, event.target.value)}
            className="h-9 cursor-pointer rounded-[10px] border border-rule bg-sheet px-2.5 text-sm text-ink"
          >
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {areaName(area, t)}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={onPutInJar} disabled={isEmptyCard(card)}>
          <JarIcon size={15} strokeWidth={2} aria-hidden="true" />
          {t('putInJar')}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true)
            deleteCard(card.id)
            useDeskStore.getState().closeEditor()
          }}
        >
          {confirmDelete ? t('deleteConfirm') : t('delete')}
        </Button>
        <Button variant="primary" onClick={onClose}>
          {t('save')}
        </Button>
      </div>
    </>
  )
}
