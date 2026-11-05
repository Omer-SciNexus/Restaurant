import { FormError } from "../ui/Form";

/** The outcome of a save. The status line is always in the page, so screen readers hear it change. */
export function FormResult({ error, saved, pending }: { error?: string; saved?: string | false; pending?: boolean }) {
  return (
    <div className="space-y-2">
      <FormError message={pending ? null : error} />
      <p role="status" className="text-sm font-medium text-forest empty:hidden">
        {!pending && saved ? saved : ""}
      </p>
    </div>
  );
}

/** Lists every message for a field that can have several, such as the days of the week. */
export function FieldErrors({ id, messages }: { id?: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <ul id={id} className="mt-1 space-y-1 text-sm text-danger">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}
