import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import s from './ui.module.css';
export function Modal({
  title,
  children,
  onClose,
  className,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.showModal();
    const node = ref.current;
    const cancel = (event: Event) => {
      event.preventDefault();
      close.current();
    };
    node?.addEventListener('cancel', cancel);
    return () => {
      node?.removeEventListener('cancel', cancel);
      node?.close();
      queueMicrotask(() => {
        if (trigger?.isConnected && document.activeElement === document.body)
          trigger.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog ref={ref} className={[s.modal, className].filter(Boolean).join(' ')} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <button type="button" className={s.iconButton} aria-label="Close" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Notice({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'error';
}) {
  return <p className={s[tone]}>{children}</p>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export const number = (value: number | null, decimals = 0) =>
  value === null
    ? '—'
    : new Intl.NumberFormat(navigator.language, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
