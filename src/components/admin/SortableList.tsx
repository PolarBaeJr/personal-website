"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

// Drag to reorder, hand-rolled. Three ways to move a row:
// - drag the grip handle (mouse, pen or finger; the handle has
//   touch-action: none so a drag doesn't scroll the page instead),
// - keyboard on the handle: Space picks up, the up and down arrow keys move,
//   Space or Enter drops, Escape puts it back,
// - the "Move up" / "Move down" buttons.
// Every move is announced to screen readers.

// pitch: how far a neighbouring row slides to make room (the dragged row's
// height plus the gap between rows).
type Drag = { from: number; to: number; dy: number; pitch: number };

type Measured = {
  tops: number[];
  heights: number[];
  startY: number;
  pointerId: number;
};

const EDGE = 72;
const MAX_SCROLL_STEP = 18;

export type SortableRowParts = {
  grip: ReactNode;
  moveButtons: ReactNode;
};

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {[4, 8, 12].map((y) => (
        <g key={y}>
          <circle cx="6" cy={y} r="1.25" fill="currentColor" />
          <circle cx="10" cy={y} r="1.25" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

export function SortableList({
  keys,
  labels,
  onMove,
  renderRow,
  rowClassName,
}: {
  keys: (string | number)[];
  // Plain names for the announcements, e.g. "SFU Badminton Club".
  labels: string[];
  onMove: (from: number, to: number) => void;
  renderRow: (index: number, parts: SortableRowParts) => ReactNode;
  rowClassName?: (index: number) => string | undefined;
}) {
  const [drag, setDragState] = useState<Drag | null>(null);
  // The same value, readable straight away by events that fire before the
  // next render (pointerup, then lostpointercapture).
  const dragRef = useRef<Drag | null>(null);
  const helpId = useId();
  const [picked, setPicked] = useState<{ index: number; origin: number } | null>(null);
  const [message, setMessage] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const measured = useRef<Measured | null>(null);
  const lastClientY = useRef(0);
  const scrollFrame = useRef<number | null>(null);
  // True while a move re-renders the list: the focused grip blurs as its row
  // moves, and that blur must not drop a keyboard pick-up.
  const refocusing = useRef(false);
  const count = keys.length;

  function setDrag(next: Drag | null) {
    dragRef.current = next;
    setDragState(next);
  }

  function position(index: number) {
    return `position ${index + 1} of ${count}`;
  }

  // Focuses a control in the row with this key after React has moved it.
  function refocus(key: string | number, selector: string) {
    const row = listRef.current?.querySelector(`[data-sort-key="${key}"]`);
    const target =
      row?.querySelector<HTMLElement>(`${selector}:not(:disabled)`) ??
      row?.querySelector<HTMLElement>("[data-grip]");
    target?.focus();
  }

  function moveNow(from: number, to: number, selector: string) {
    const key = keys[from];
    refocusing.current = true;
    flushSync(() => onMove(from, to));
    refocus(key, selector);
    refocusing.current = false;
  }

  function targetFor(m: Measured, from: number, dy: number) {
    const center = m.tops[from] + m.heights[from] / 2 + dy;
    let to = 0;
    for (let i = 0; i < m.tops.length; i++) {
      if (i !== from && m.tops[i] + m.heights[i] / 2 < center) to++;
    }
    return to;
  }

  function update(clientY: number) {
    const m = measured.current;
    const current = dragRef.current;
    if (!m || !current) return;
    const dy = clientY + window.scrollY - m.startY;
    setDrag({ ...current, to: targetFor(m, current.from, dy), dy });
  }

  function stopScrolling() {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
  }

  // Keeps scrolling while the finger rests near the top or bottom edge.
  function autoScroll() {
    const y = lastClientY.current;
    const step =
      y < EDGE
        ? -Math.ceil(((EDGE - y) / EDGE) * MAX_SCROLL_STEP)
        : y > window.innerHeight - EDGE
          ? Math.ceil(((y - (window.innerHeight - EDGE)) / EDGE) * MAX_SCROLL_STEP)
          : 0;
    if (step === 0 || !measured.current || !dragRef.current) {
      scrollFrame.current = null;
      return;
    }
    window.scrollBy(0, step);
    update(y);
    scrollFrame.current = requestAnimationFrame(autoScroll);
  }

  function onPointerDown(index: number, event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || count < 2) return;
    event.preventDefault();
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>(":scope > [data-sort-key]") ?? [],
    );
    const rects = rows.map((row) => row.getBoundingClientRect());
    const tops = rects.map((rect) => rect.top + window.scrollY);
    const heights = rects.map((rect) => rect.height);
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
    event.currentTarget.setPointerCapture(event.pointerId);
    measured.current = {
      tops,
      heights,
      startY: event.clientY + window.scrollY,
      pointerId: event.pointerId,
    };
    lastClientY.current = event.clientY;
    setPicked(null);
    setDrag({ from: index, to: index, dy: 0, pitch: heights[index] + gap });
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current || measured.current?.pointerId !== event.pointerId) return;
    lastClientY.current = event.clientY;
    update(event.clientY);
    if (scrollFrame.current === null) autoScroll();
  }

  function finishDrag() {
    stopScrolling();
    const current = dragRef.current;
    measured.current = null;
    setDrag(null);
    if (!current) return;
    if (current.to !== current.from) {
      onMove(current.from, current.to);
      setMessage(`Moved ${labels[current.from]} to ${position(current.to)}.`);
    }
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLButtonElement>) {
    const label = labels[index];
    if (picked?.index !== index) {
      if (event.key === " ") {
        event.preventDefault();
        setPicked({ index, origin: index });
        setMessage(
          `Picked up ${label}, ${position(index)}. Use the up and down arrow keys to move it, Space to drop it, Escape to cancel.`,
        );
      }
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const to = event.key === "ArrowUp" ? index - 1 : index + 1;
      if (to < 0 || to >= count) return;
      setPicked({ index: to, origin: picked.origin });
      moveNow(index, to, "[data-grip]");
      setMessage(`Moved ${label} to ${position(to)}.`);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setPicked(null);
      setMessage(`Dropped ${label} at ${position(index)}.`);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setPicked(null);
      if (picked.origin !== index) moveNow(index, picked.origin, "[data-grip]");
      setMessage(`Cancelled. ${label} is back at ${position(picked.origin)}.`);
    }
  }

  function onButtonMove(index: number, to: number, selector: string) {
    moveNow(index, to, selector);
    setPicked(null);
    setMessage(`Moved ${labels[index]} to ${position(to)}.`);
  }

  function shift(index: number): number {
    if (!drag) return 0;
    if (index === drag.from) return drag.dy;
    const { pitch } = drag;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -pitch;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return pitch;
    return 0;
  }

  return (
    <>
      <ul ref={listRef} className="admin-list" data-dragging={drag ? "" : undefined}>
        {keys.map((key, index) => {
          const label = labels[index];
          const dy = shift(index);
          const classes = [
            "admin-row",
            rowClassName?.(index),
            drag?.from === index ? "admin-row--dragging" : undefined,
            picked?.index === index ? "admin-row--picked" : undefined,
          ].filter(Boolean);
          const grip = (
            <button
              type="button"
              className="admin-grip"
              data-grip=""
              aria-label={`Reorder ${label}`}
              aria-pressed={picked?.index === index}
              aria-describedby={helpId}
              onPointerDown={(e) => onPointerDown(index, e)}
              onPointerMove={onPointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onLostPointerCapture={finishDrag}
              onKeyDown={(e) => onKeyDown(index, e)}
              onBlur={() => {
                if (!refocusing.current && picked?.index === index) setPicked(null);
              }}
            >
              <GripIcon />
            </button>
          );
          const moveButtons = (
            <>
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                data-move="up"
                disabled={index === 0}
                onClick={() => onButtonMove(index, index - 1, '[data-move="up"]')}
              >
                Move up
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--quiet"
                data-move="down"
                disabled={index === count - 1}
                onClick={() => onButtonMove(index, index + 1, '[data-move="down"]')}
              >
                Move down
              </button>
            </>
          );
          return (
            <li
              key={key}
              data-sort-key={key}
              className={classes.join(" ")}
              style={dy ? { transform: `translateY(${dy}px)` } : undefined}
            >
              {renderRow(index, { grip, moveButtons })}
            </li>
          );
        })}
      </ul>
      <p id={helpId} className="sr-only">
        Drag to reorder. Or press Space to pick it up, the up and down arrow
        keys to move it, and Space again to drop it.
      </p>
      <p className="sr-only" aria-live="assertive">
        {message}
      </p>
    </>
  );
}
