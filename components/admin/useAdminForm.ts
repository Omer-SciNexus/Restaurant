"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionState } from "@/lib/actions/helpers";

/**
 * Runs a server action from a form and keeps what was typed when the server refuses it. A
 * plain form action resets the fields afterwards, which would throw away a long form over
 * one mistake. Before the page is interactive the form still posts normally.
 */
export function useAdminForm<State extends ActionState>(action: (state: State, form: FormData) => Promise<State>) {
  const [state, dispatch, pending] = useActionState(action, {} as Awaited<State>);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(() => dispatch(form));
  }

  return { state, pending, formProps: { action: dispatch, onSubmit } };
}
