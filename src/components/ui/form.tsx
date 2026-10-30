import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 text-sm text-ink placeholder:text-slate-500 transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:bg-surface aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(field, "min-h-11", className)} {...p} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, "min-h-28 py-3 leading-relaxed", className)} {...p} />,
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref} className={cn(field, "min-h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10", className)} {...p}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...p} />;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

export function Field({ label, error, hint, children, className, htmlFor }: {
  label: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
  /** Only needed when the input is wrapped in another element: set the same id on the input. */
  htmlFor?: string;
}) {
  const autoId = React.useId();
  let id = htmlFor ?? autoId;

  // Link the label to the input (clicking the label focuses it; screen readers announce it).
  let control = children;
  let linked = !!htmlFor;
  if (!htmlFor && React.isValidElement<{ id?: string }>(children) && [Input, Select, Textarea].includes(children.type as never)) {
    id = children.props.id ?? autoId;
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    control = React.cloneElement(children, { id, "aria-describedby": describedBy } as React.Attributes);
    linked = true;
  }

  return (
    <div className={className}>
      <Label htmlFor={linked ? id : undefined}>{label}</Label>
      {control}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-body">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, checked, onChange, count }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; count?: number;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-sm text-body hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] shrink-0 cursor-pointer rounded-md border-line accent-primary"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-slate-500">{count}</span>}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-slate-300",
      )}
    >
      <span className={cn("inline-block h-5 w-5 rounded-full bg-card shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
