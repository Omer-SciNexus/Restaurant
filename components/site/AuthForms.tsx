"use client";

import { useActionState } from "react";
import { loginAction, requestResetAction, resetPasswordAction, signupAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "../ui/Button";
import { Field, FormError } from "../ui/Form";

const INITIAL: AuthFormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signupAction, INITIAL);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Name" name="name" autoComplete="name" required error={state.fields?.name?.[0]} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fields?.email?.[0]} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters." error={state.fields?.password?.[0]} />
      <FormError message={state.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Creating your account..." : "Create account"}
      </Button>
    </form>
  );
}

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestResetAction, INITIAL);
  if (state.done) {
    return <p role="status" className="rounded-brand bg-sage p-4 text-sm">If that email has an account, a reset link is on its way. It works for one hour.</p>;
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required error={state.fields?.email?.[0]} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required hint="At least 10 characters." error={state.fields?.password?.[0]} />
      <FormError message={state.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        Save new password
      </Button>
    </form>
  );
}
