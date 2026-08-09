"use client";

// Adapted from Interior (MIT): https://github.com/ddoemonn/interior
import { useCallback, useId, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { motion, useIsomorphicLayoutEffect, useReducedMotion } from "motion/react";
import ChevronDown from "reicon-react/icons/ChevronDown";

const DISCLOSE = { type: "spring", stiffness: 190, damping: 30, mass: 1 } as const;
const INSTANT = { duration: 0 } as const;
type Metrics = { line: number; full: number };

export type UseShowMoreOptions = { lines?: number; maxHeight?: number; defaultExpanded?: boolean; expanded?: boolean; onExpandedChange?: (expanded: boolean) => void };
export type UseShowMoreResult = { contentRef: RefObject<HTMLDivElement | null>; expanded: boolean; open: boolean; toggle: () => void; setExpanded: (next: boolean) => void; height: number | null; collapsedHeight: number | null; fullHeight: number | null; expandable: boolean; capped: boolean; scrollable: boolean };

export function useShowMore({ lines = 3, maxHeight = 320, defaultExpanded = false, expanded: expandedProp, onExpandedChange }: UseShowMoreOptions = {}): UseShowMoreResult {
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const expanded = expandedProp ?? uncontrolled;
  const notify = useRef(onExpandedChange);
  notify.current = onExpandedChange;

  const setExpanded = useCallback((next: boolean) => {
    if (expandedProp === undefined) setUncontrolled(next);
    notify.current?.(next);
  }, [expandedProp]);
  const toggle = useCallback(() => setExpanded(!expanded), [expanded, setExpanded]);

  useIsomorphicLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const read = () => {
      const styles = getComputedStyle(element);
      const fontSize = Number.parseFloat(styles.fontSize);
      const line = Number.parseFloat(styles.lineHeight) || fontSize * 1.5;
      const full = element.scrollHeight;
      setMetrics((previous) => previous && previous.line === line && previous.full === full ? previous : { line, full });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const collapsedHeight = metrics ? Math.min(metrics.line * lines, metrics.full) : null;
  const fullHeight = metrics ? Math.min(metrics.full, maxHeight) : null;
  const expandable = metrics ? metrics.full - (metrics.line * lines) > 1 : true;
  const capped = metrics ? metrics.full > maxHeight : false;
  const open = expanded && expandable;

  return { contentRef, expanded, open, toggle, setExpanded, height: open ? fullHeight : collapsedHeight, collapsedHeight, fullHeight, expandable, capped, scrollable: open && capped };
}

export type ShowMoreProps = UseShowMoreOptions & { children: ReactNode; moreLabel?: string; lessLabel?: string; label?: string; className?: string };

export function ShowMore({ children, moreLabel = "Show more", lessLabel = "Show less", label = "Details", lines = 3, maxHeight = 320, defaultExpanded, expanded, onExpandedChange, className = "" }: ShowMoreProps) {
  const reduced = useReducedMotion();
  const regionId = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const { contentRef, open, toggle, height, expandable, capped, scrollable } = useShowMore({ lines, maxHeight, defaultExpanded, expanded, onExpandedChange });
  const veiled = expandable && (!open || scrollable);

  function press() {
    if (open) regionRef.current?.scrollTo({ top: 0 });
    toggle();
  }

  return (
    <div className={`text-[13.5px] leading-relaxed text-[var(--text-primary)] ${className}`}>
      <div className="relative">
        <motion.div ref={regionRef} id={regionId} role={scrollable ? "region" : undefined} aria-label={scrollable ? label : undefined} tabIndex={scrollable ? 0 : undefined} initial={false} animate={height === null ? {} : { height }} transition={reduced ? INSTANT : DISCLOSE} style={{ maxHeight: height === null ? `${lines}lh` : undefined, overflowY: scrollable ? "auto" : "hidden", scrollbarGutter: capped ? "stable" : undefined }} className="overflow-hidden overscroll-contain rounded-[4px] outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent)]">
          <div ref={contentRef}>{children}</div>
        </motion.div>
        <motion.div aria-hidden initial={false} animate={{ opacity: veiled ? 0.92 : 0 }} transition={reduced ? INSTANT : { duration: 0.2 }} className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-[var(--bg-page)]" />
      </div>
      <div className="mt-2 flex h-8 items-center">
        <button type="button" onClick={press} aria-expanded={open} aria-controls={regionId} className={`inline-flex h-8 select-none items-center gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] font-medium text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 hover:border-[var(--border-strong)] focus-visible:border-[var(--accent)] ${expandable ? "" : "pointer-events-none invisible"}`}>
          <span>{open ? lessLabel : moreLabel}</span>
          <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={reduced ? INSTANT : { duration: 0.2 }} className="inline-flex text-[var(--text-secondary)]"><ChevronDown size={12} color="currentColor" weight="Outline" strokeWidth={1.7} /></motion.span>
        </button>
      </div>
    </div>
  );
}
