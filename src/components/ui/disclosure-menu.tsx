'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

type DisclosureMenuProps = {
  trigger: ReactNode
  children: ReactNode
  ariaLabel: string
  className?: string
  buttonClassName?: string
  panelClassName?: string
}

export function DisclosureMenu({ trigger, children, ariaLabel, className = '', buttonClassName = '', panelClassName = '' }: DisclosureMenuProps) {
  const pathname = usePathname()
  const [menuState, setMenuState] = useState({ open: false, pathname })
  const open = menuState.open && menuState.pathname === pathname
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((restoreFocus = false) => {
    setMenuState({ open: false, pathname })
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close(true)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, open])

  function handlePanelClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.closest('a, button')) close()
  }

  return (
    <div ref={rootRef} className={className}>
      <button ref={triggerRef} type="button" aria-label={ariaLabel} aria-expanded={open} aria-controls={panelId} className={buttonClassName} onClick={() => setMenuState({ open: !open, pathname })}>
        {trigger}
      </button>
      <div id={panelId} hidden={!open} className={panelClassName} onClickCapture={handlePanelClick}>
        {children}
      </div>
    </div>
  )
}
