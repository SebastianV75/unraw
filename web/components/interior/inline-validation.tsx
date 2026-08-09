"use client";

// Adapted from Interior (MIT): https://github.com/ddoemonn/interior
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, InputHTMLAttributes } from "react";
import { motion, useReducedMotion } from "motion/react";
import Alert from "reicon-react/icons/Alert";
import Check3 from "reicon-react/icons/Check3";

const INSTANT = { duration: 0 } as const;
const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8 } as const;
const LINE = 16;

export type ValidationStatus = "idle" | "pending" | "valid" | "invalid";
export type Validator = (value: string) => string | null;
export type UseInlineValidationOptions = { value: string; validate: Validator; debounce?: number };
export type UseInlineValidationReturn = { status: ValidationStatus; error: string | null; message: string; touched: boolean; commit: () => void; reset: () => void; fieldProps: { onBlur: () => void; "aria-invalid": boolean } };

const CLEAN = { status: "idle" as ValidationStatus, error: null, message: "" };

export function useInlineValidation({ value, validate, debounce = 400 }: UseInlineValidationOptions): UseInlineValidationReturn {
  const [touched, setTouched] = useState(false);
  const [settled, setSettled] = useState(CLEAN);
  const check = useRef(validate);
  const latest = useRef(value);

  useEffect(() => {
    check.current = validate;
    latest.current = value;
  });

  useEffect(() => {
    if (!touched) return;
    const next = check.current(value);
    const resolved: ValidationStatus = value.length > 0 ? "valid" : "idle";
    if (next === null) {
      setSettled((previous) => previous.status === resolved && previous.error === null ? previous : { status: resolved, error: null, message: previous.message });
      return;
    }
    setSettled((previous) => previous.status === "invalid" ? previous : { status: "pending", error: null, message: previous.message });
    const timer = setTimeout(() => setSettled((previous) => previous.error === next ? previous : { status: "invalid", error: next, message: next }), debounce);
    return () => clearTimeout(timer);
  }, [debounce, touched, value]);

  const commit = useCallback(() => {
    setTouched(true);
    const next = check.current(latest.current);
    setSettled(next === null ? { status: latest.current.length > 0 ? "valid" : "idle", error: null, message: "" } : { status: "invalid", error: next, message: next });
  }, []);
  const reset = useCallback(() => { setTouched(false); setSettled(CLEAN); }, []);
  return { status: settled.status, error: settled.error, message: settled.message, touched, commit, reset, fieldProps: { onBlur: commit, "aria-invalid": settled.status === "invalid" } };
}

export type InlineValidationProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id" | "name" | "type"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validate: Validator;
  hint?: string;
  id?: string;
  name?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search";
  debounce?: number;
  reserveLines?: number;
  className?: string;
};

export function InlineValidation({ label, value, onChange, validate, hint, id, name, type = "text", debounce = 400, reserveLines = 1, className = "", ...inputProps }: InlineValidationProps) {
  const reduced = useReducedMotion();
  const auto = useId();
  const fieldId = id ?? `${auto}-field`;
  const hintId = `${auto}-hint`;
  const errorId = `${auto}-error`;
  const { status, error, message, fieldProps } = useInlineValidation({ value, validate, debounce });
  const invalid = status === "invalid";
  const valid = status === "valid";
  const described = [hint ? hintId : null, invalid ? errorId : null].filter(Boolean).join(" ");
  const clamp: ComponentProps<"p">["style"] = { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: reserveLines, overflow: "hidden" };

  return (
    <div className={`w-full ${className}`}>
      <label htmlFor={fieldId} className="block text-[13px] font-medium text-[var(--text-primary)]">{label}</label>
      <div className="relative mt-1.5">
        <input {...inputProps} id={fieldId} name={name} type={type} value={value} aria-describedby={described || undefined} onChange={(event) => onChange(event.target.value)} {...fieldProps} className={`h-10 w-full rounded-[6px] border bg-[var(--bg-surface)] px-3 pr-9 text-[13px] text-[var(--text-primary)] outline-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent)] ${invalid ? "border-[var(--danger)]" : "border-[var(--border)]"}`} />
        <span className="pointer-events-none absolute right-3 top-1/2 grid size-3.5 -translate-y-1/2 place-items-center" aria-hidden>
          <motion.span initial={false} animate={{ opacity: valid ? 1 : 0, scale: valid ? 1 : 0.7 }} transition={reduced ? INSTANT : CROSSFADE} className="col-start-1 row-start-1 inline-flex text-[var(--success)]"><Check3 size={14} color="currentColor" weight="Outline" strokeWidth={1.7} /></motion.span>
          <motion.span initial={false} animate={{ opacity: invalid ? 1 : 0, scale: invalid ? 1 : 0.7 }} transition={reduced ? INSTANT : CROSSFADE} className="col-start-1 row-start-1 inline-flex text-[var(--danger)]"><Alert size={14} color="currentColor" weight="Outline" strokeWidth={1.7} /></motion.span>
        </span>
      </div>
      <div className="relative mt-1.5 grid" style={{ height: reserveLines * LINE }}>
        {hint ? <motion.p aria-hidden style={clamp} className="col-start-1 row-start-1 text-[11.5px] leading-4 text-[var(--text-secondary)]" initial={false} animate={{ opacity: invalid ? 0 : 1, y: invalid ? 3 : 0 }} transition={reduced ? INSTANT : CROSSFADE}>{hint}</motion.p> : null}
        <motion.p aria-hidden style={clamp} className="col-start-1 row-start-1 text-[11.5px] leading-4 text-[var(--danger)]" initial={false} animate={{ opacity: invalid ? 1 : 0, y: invalid ? 0 : -3 }} transition={reduced ? INSTANT : CROSSFADE}>{error ?? message}</motion.p>
        {hint ? <span id={hintId} className="sr-only">{hint}</span> : null}
        <span id={errorId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">{error ?? ""}</span>
      </div>
    </div>
  );
}
