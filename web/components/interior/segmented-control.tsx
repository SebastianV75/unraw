"use client";

// Adapted from Interior (MIT): https://github.com/ddoemonn/interior
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.45 } as const;
const SEGMENT = "px-3 py-[7px] text-center text-[13px] font-medium leading-[18px] tracking-[-0.01em] whitespace-nowrap";

export type SegmentedOption = { value: string; label: string; disabled?: boolean };
export type SegmentedControlProps = {
  options: SegmentedOption[];
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
};

export function SegmentedControl({ options, label, value, defaultValue, onValueChange, className = "" }: SegmentedControlProps) {
  const count = Math.max(1, options.length);
  const template = `repeat(${count}, minmax(0, 1fr))`;
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const [hovered, setHovered] = useState(-1);
  const controlled = value !== undefined;
  const current = controlled ? value : internal;
  const found = options.findIndex((option) => option.value === current);
  const index = found < 0 ? 0 : found;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const emit = useRef(onValueChange);
  emit.current = onValueChange;
  const reduced = useReducedMotion();
  const position = useMotionValue(index);
  const thumbX = useTransform(position, (v) => `${v * 100}%`);
  const maskX = useTransform(position, (v) => `${v * -100}%`);

  useEffect(() => {
    if (reduced) {
      position.set(index);
      return;
    }
    const controls = animate(position, index, SPRING);
    return () => controls.stop();
  }, [index, position, reduced]);

  const select = useCallback((next: string) => {
    if (!controlled) setInternal(next);
    if (next !== current) emit.current?.(next);
  }, [controlled, current]);

  const seek = useCallback((from: number, direction: number) => {
    let next = from;
    for (let i = 0; i < count; i += 1) {
      next = (next + direction + count) % count;
      if (!options[next]?.disabled) return next;
    }
    return from;
  }, [count, options]);

  const go = useCallback((nextIndex: number) => {
    const option = options[nextIndex];
    if (!option || option.disabled) return;
    buttons.current[nextIndex]?.focus();
    select(option.value);
  }, [options, select]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, buttonIndex: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      go(seek(buttonIndex, 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      go(seek(buttonIndex, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      go(seek(count - 1, 1));
    } else if (event.key === "End") {
      event.preventDefault();
      go(seek(0, -1));
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className={`relative inline-block select-none rounded-[6px] border border-[var(--border)] bg-[var(--bg-hover)] p-[3px] shadow-[inset_0_1px_2px_color-mix(in_srgb,var(--text-primary)_7%,transparent)] ${className}`}>
      <div className="relative grid" style={{ gridTemplateColumns: template, touchAction: "manipulation" }}>
        {options.map((option, optionIndex) => <span key={option.value} aria-hidden className={`${SEGMENT} pointer-events-none ${option.disabled ? "text-[var(--text-disabled)]" : hovered === optionIndex && optionIndex !== index ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{option.label}</span>)}
        <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden rounded-[4px] bg-[var(--accent)]" style={{ width: `${100 / count}%`, x: thumbX }} initial={false}>
          <motion.div className="absolute inset-0" style={{ x: maskX }} initial={false}>
            <div className="absolute inset-y-0 left-0 grid" style={{ width: `${count * 100}%`, gridTemplateColumns: template }}>
              {options.map((option) => <span key={option.value} className={`${SEGMENT} text-[var(--accent-fg)]`}>{option.label}</span>)}
            </div>
          </motion.div>
        </motion.div>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: template }} onPointerLeave={() => setHovered(-1)}>
          {options.map((option, optionIndex) => <button key={option.value} ref={(node) => { buttons.current[optionIndex] = node; }} type="button" role="radio" aria-checked={optionIndex === index} aria-disabled={option.disabled || undefined} tabIndex={optionIndex === index ? 0 : -1} onClick={() => !option.disabled && select(option.value)} onKeyDown={(event) => onKeyDown(event, optionIndex)} onPointerEnter={() => !option.disabled && setHovered(optionIndex)} className="cursor-default rounded-[4px] outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent)]"><span className="sr-only">{option.label}</span></button>)}
        </div>
      </div>
    </div>
  );
}
