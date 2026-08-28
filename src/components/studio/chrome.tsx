"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BarMenu({
  label,
  open,
  onToggle,
  onClose,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        {label}
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full left-0 z-50 mt-1 min-w-52 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function BarItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-100 hover:bg-zinc-800"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function BarSep() {
  return <div className="my-1 h-px bg-zinc-800" />;
}

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  wide,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-modal-title"
        className={cn(
          "w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-zinc-100 shadow-2xl",
          wide ? "max-w-3xl" : "max-w-md",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="studio-modal-title" className="text-base font-medium">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? (
          <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
