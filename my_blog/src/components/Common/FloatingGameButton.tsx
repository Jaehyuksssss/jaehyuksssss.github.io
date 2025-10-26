import React, { useEffect, useRef, useState } from "react"
import styled from "@emotion/styled"
import { navigate } from "gatsby"

type Props = {
  to?: string
  label?: string
  // CSS selector for a bounding element. When provided, the button can move
  // only within that element's client rect. Falls back to viewport otherwise.
  boundToSelector?: string
}

const SIZE = 60 // px (touch target >= 44px)
const RADIUS = 16
const MARGIN = 16
const STORAGE_KEY = "floating_game_btn_pos"
const MOVE_THRESHOLD = 6 // px: treat below as click, above as drag

type Pos = { x: number; y: number }
type Bounds = { minX: number; maxX: number; minY: number; maxY: number }

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
  transition: ${({ dragging }) =>
    dragging ? "none" : "transform 0.2s ease, box-shadow 0.2s ease"};

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

// Get bounding rect (viewport coords) of the bound element or viewport itself
function getRect(selector?: string): DOMRect {
  if (selector && typeof document !== "undefined") {
    const el = document.querySelector(selector)
    if (el) return el.getBoundingClientRect()
  }
  const w = typeof window !== "undefined" ? window.innerWidth : 0
  const h = typeof window !== "undefined" ? window.innerHeight : 0
  return {
    left: 0,
    top: 0,
    right: w,
    bottom: h,
    width: w,
    height: h,
    x: 0,
    y: 0,
    toJSON() {
      return {}
    },
  } as DOMRect
}

// Bounds expressed in relative coordinates within the rect
function getRelBounds(selector?: string): Bounds {
  const rect = getRect(selector)
  const margin = MARGIN
  return {
    minX: margin,
    maxX: Math.max(margin, rect.width - SIZE - margin),
    minY: margin,
    maxY: Math.max(margin, rect.height - SIZE - margin),
  }
}

function getStorageKey(selector?: string) {
  return selector ? `${STORAGE_KEY}:${selector}` : STORAGE_KEY
}

// Relative position inside the bound element
function getInitialRel(selector?: string): Pos {
  if (typeof window === "undefined") return { x: MARGIN, y: MARGIN }
  try {
    const raw = localStorage.getItem(getStorageKey(selector))
    if (raw) {
      const parsed = JSON.parse(raw) as Pos
      const b = getRelBounds(selector)
      return {
        x: clamp(parsed.x, b.minX, b.maxX),
        y: clamp(parsed.y, b.minY, b.maxY),
      }
    }
  } catch {}
  const b = getRelBounds(selector)
  return { x: b.maxX, y: b.maxY }
}

// (Legacy helpers removed: getBounds/getInitialPos)

const FloatingGameButton: React.FC<Props> = ({
  to = "/reaction",
  label = "게임",
  boundToSelector,
}) => {
  const [mounted, setMounted] = useState(false)
  const [rel, setRel] = useState<Pos>(() => getInitialRel(boundToSelector))
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 })
  const relRef = useRef<Pos>(rel)
  useEffect(() => {
    relRef.current = rel
  }, [rel])
  const [dragging, setDragging] = useState(false)
  const startRef = useRef<{
    offX: number
    offY: number
    moved: boolean
    startX: number
    startY: number
  }>({
    offX: 0,
    offY: 0,
    moved: false,
    startX: 0,
    startY: 0,
  })
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const draggingRef = useRef(false)

  // Follow the bound element on resize/scroll and keep position inside it
  useEffect(() => {
    const sync = () => {
      const rect = getRect(boundToSelector)
      const b = getRelBounds(boundToSelector)
      const r = relRef.current
      const rx = clamp(r.x, b.minX, b.maxX)
      const ry = clamp(r.y, b.minY, b.maxY)
      if (rx !== r.x || ry !== r.y) {
        setRel({ x: rx, y: ry })
        relRef.current = { x: rx, y: ry }
      }
      setPos({ x: rect.left + rx, y: rect.top + ry })
    }
    window.addEventListener("resize", sync)
    window.addEventListener("scroll", sync, {
      passive: true,
    } as AddEventListenerOptions)
    // sync once on mount
    sync()
    return () => {
      window.removeEventListener("resize", sync)
      window.removeEventListener("scroll", sync)
    }
  }, [boundToSelector])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(getStorageKey(boundToSelector), JSON.stringify(rel))
    } catch {}
  }, [rel, boundToSelector])

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
      const rect = getRect(boundToSelector)
      const b = getRelBounds(boundToSelector)
      const nextRelX = clamp(
        e.clientX - rect.left - startRef.current.offX,
        b.minX,
        b.maxX
      )
      const nextRelY = clamp(
        e.clientY - rect.top - startRef.current.offY,
        b.minY,
        b.maxY
      )
      setRel({ x: nextRelX, y: nextRelY })
      setPos({ x: rect.left + nextRelX, y: rect.top + nextRelY })
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

      const rect = getRect(boundToSelector)
      const b = getRelBounds(boundToSelector)
      const current = relRef.current
      // Always snap to the right edge as requested
      const snappedRelX = b.maxX
      setRel({ x: snappedRelX, y: current.y })
      setPos({ x: rect.left + snappedRelX, y: rect.top + current.y })

      const moved = startRef.current.moved
      if (!moved) {
        e.preventDefault()
        if (to) navigate(to)
      }
    }

    el.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)

    return () => {
      el.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [to, boundToSelector])

  // Fallback for browsers without PointerEvent (older Safari etc.)
  useEffect(() => {
    if (typeof window === "undefined") return
    // If PointerEvent is supported, primary handler above is enough
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).PointerEvent) return
    const el = btnRef.current
    if (!el) return

    const begin = (clientX: number, clientY: number) => {
      draggingRef.current = true
      setDragging(true)
      const rect = el!.getBoundingClientRect()
      startRef.current.offX = clientX - rect.left
      startRef.current.offY = clientY - rect.top
      startRef.current.moved = false
      startRef.current.startX = clientX
      startRef.current.startY = clientY
    }

    const move = (clientX: number, clientY: number) => {
      if (!draggingRef.current) return
      const rect = getRect(boundToSelector)
      const b = getRelBounds(boundToSelector)
      const nextRelX = clamp(
        clientX - rect.left - startRef.current.offX,
        b.minX,
        b.maxX
      )
      const nextRelY = clamp(
        clientY - rect.top - startRef.current.offY,
        b.minY,
        b.maxY
      )
      setRel({ x: nextRelX, y: nextRelY })
      setPos({ x: rect.left + nextRelX, y: rect.top + nextRelY })
      const dx = clientX - startRef.current.startX
      const dy = clientY - startRef.current.startY
      if (!startRef.current.moved && Math.hypot(dx, dy) > MOVE_THRESHOLD) {
        startRef.current.moved = true
      }
    }

    const end = (clientX?: number, clientY?: number) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      setDragging(false)
      const rect = getRect(boundToSelector)
      const b = getRelBounds(boundToSelector)
      const cur = relRef.current
      const snappedRelX = b.maxX // stick to right edge
      setRel({ x: snappedRelX, y: cur.y })
      setPos({ x: rect.left + snappedRelX, y: rect.top + cur.y })
      // click navigation if not moved
      if (!startRef.current.moved && to) navigate(to)
    }

    const onMouseDown = (e: MouseEvent) => begin(e.clientX, e.clientY)
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY)
    const onMouseUp = (e: MouseEvent) => end(e.clientX, e.clientY)
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) begin(t.clientX, t.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) move(t.clientX, t.clientY)
    }
    const onTouchEnd = () => end()

    el.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)

    return () => {
      el.removeEventListener("mousedown", onMouseDown)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      el.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [to, boundToSelector])

  // Mount flag to avoid initial SSR flash at (0,0)
  useEffect(() => {
    setMounted(true)
    const rect = getRect(boundToSelector)
    const b = getRelBounds(boundToSelector)
    // Force initial stick to bottom-right as requested
    const rx = b.maxX
    const ry = b.maxY
    setRel({ x: rx, y: ry })
    setPos({ x: rect.left + rx, y: rect.top + ry })
  }, [boundToSelector])

  if (!mounted) return null

  return (
    <ButtonWrap
      ref={btnRef}
      x={pos.x}
      y={pos.y}
      dragging={dragging}
      aria-label={label}
      title={label}
      type="button"
      // Let pointer handlers decide navigation vs drag; keep keyboard access
      onClick={() => navigate("/games")}
    >
      <Text>GAME</Text>
    </ButtonWrap>
  )
}

export default FloatingGameButton
