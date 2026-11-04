import { z, ZodError } from "zod";
import { ApiError } from "../api";

export type ActionState = {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string[] | undefined>;
};

/**
 * Turns an expected failure into something a form can show. Unexpected errors are logged
 * and reported generically, so internal details never reach the browser.
 */
export function actionError(error: unknown): ActionState {
  if (error instanceof ApiError) return { error: error.message };
  if (error instanceof ZodError) {
    const { fieldErrors, formErrors } = z.flattenError(error);
    return { error: formErrors[0] ?? "Please check the details you entered.", fields: fieldErrors as Record<string, string[]> };
  }
  console.error(error);
  return { error: "Something went wrong on our side. Please try again." };
}
