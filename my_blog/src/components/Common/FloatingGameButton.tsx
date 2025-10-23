import React, { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import { navigate } from 'gatsby'

type Props = {
  to?: string
  label?: string
}

const SIZE = 60 // px (touch target >= 44px)
const RADIUS = 16
const MARGIN = 16
const STORAGE_KEY = 'floating_game_btn_pos'
const MOVE_THRESHOLD = 6 // px: treat below as click, above as drag

type Pos = { x: number; y: number }

const ButtonWrap = styled.button<{
  x: number
  y: number
  dragging: boolean
}>`
  position: fixed;
  left: ${({ x }) => `${x}px`};
  top: ${({ y }) => `${y}px`};
  width: ${SIZE}px;
  height: ${SIZE}px;
  border: none;
  border-radius: ${RADIUS}px;
  background: #ffe471; /* subtle yellow */
  color: #111;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  z-index: 2000;
  user-select: none;
  touch-action: none; /* allow free dragging */
  transition: ${({ dragging }) => (dragging ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease')};

  &:active {
    transform: scale(0.98);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
  }
`

const Text = styled.span`
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  line-height: 1;
`

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function getInitialPos(): Pos {
  if (typeof window === 'undefined') return { x: 0, y: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Pos
      return parsed
    }
  } catch {}
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    x: w - SIZE - MARGIN,
    y: h - SIZE - (MARGIN + 8),
  }
}

const FloatingGameButton: React.FC<Props> = ({ to = '/reaction', label = '게임' }) => {
  const [pos, setPos] = useState<Pos>(() => getInitialPos())
  const posRef = useRef<Pos>(pos)
  useEffect(() => { posRef.current = pos }, [pos])
  const [dragging, setDragging] = useState(false)
  const startRef = useRef<{ offX: number; offY: number; moved: boolean; startX: number; startY: number }>({
    offX: 0,
    offY: 0,
    moved: false,
    startX: 0,
    startY: 0,
  })
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const draggingRef = useRef(false)

  // Re-clamp on resize to keep the button on-screen
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const x = clamp(pos.x, MARGIN, Math.max(MARGIN, w - SIZE - MARGIN))
      const y = clamp(pos.y, MARGIN, Math.max(MARGIN, h - SIZE - MARGIN))
      setPos({ x, y })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos.x, pos.y])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
    } catch {}
  }, [pos])

  // drag handlers using Pointer Events
  useEffect(() => {
    const el = btnRef.current
    if (!el) return

    function onPointerDown(e: PointerEvent) {
      el!.setPointerCapture?.(e.pointerId)
      draggingRef.current = true
      setDragging(true)
      const rect = el!.getBoundingClientRect()
      startRef.current.offX = e.clientX - rect.left
      startRef.current.offY = e.clientY - rect.top
      startRef.current.moved = false
      startRef.current.startX = e.clientX
      startRef.current.startY = e.clientY
    }

    function onPointerMove(e: PointerEvent) {
      if (!draggingRef.current) return
      const w = window.innerWidth
      const h = window.innerHeight
      const nextX = clamp(e.clientX - startRef.current.offX, MARGIN, w - SIZE - MARGIN)
      const nextY = clamp(e.clientY - startRef.current.offY, MARGIN, h - SIZE - MARGIN)
      setPos({ x: nextX, y: nextY })
      const dx = e.clientX - startRef.current.startX
      const dy = e.clientY - startRef.current.startY
      if (!startRef.current.moved && Math.hypot(dx, dy) > MOVE_THRESHOLD) {
        startRef.current.moved = true
      }
    }

    function onPointerUp(e: PointerEvent) {
      if (!draggingRef.current) return
      draggingRef.current = false
      setDragging(false)

      const w = window.innerWidth
      const snapLeft = MARGIN
      const snapRight = w - SIZE - MARGIN
      const current = posRef.current
      const snappedX = current.x < w / 2 ? snapLeft : snapRight
      const snapped = { x: snappedX, y: current.y }
      setPos(snapped)

      const moved = startRef.current.moved
      if (!moved) {
        e.preventDefault()
        if (to) navigate(to)
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [to])

  // Ensure initial position is set after mount to avoid SSR mismatch
  useEffect(() => {
    if (typeof window === 'undefined') return
    setPos(p => ({ ...getInitialPos(), ...p }))
  }, [])

  return (
    <ButtonWrap ref={btnRef} x={pos.x} y={pos.y} dragging={dragging} aria-label={label} title={label} type="button">
      <Text>GAME</Text>
    </ButtonWrap>
  )
}

export default FloatingGameButton
