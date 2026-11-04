import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-brand border border-stone/50 bg-paper px-3 py-2 text-[15px] text-bark placeholder:text-stone focus:border-forest";

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
} & ComponentProps<"input">;

export function Field({ label, error, hint, children, id, name, ...props }: FieldProps) {
  const fieldId = id ?? name;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children ?? <input id={fieldId} name={name} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={inputClass} {...props} />}
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className="mt-1 text-xs text-stone">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-brand bg-danger-soft p-3 text-sm text-danger">
      {message}
    </p>
  );
}
