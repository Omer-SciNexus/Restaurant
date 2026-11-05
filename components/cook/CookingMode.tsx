"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clampServings, formatIngredient, scaleFactor, type UnitSystem } from "@/lib/recipe-rules";
import { Button, LinkButton } from "../ui/Button";
import { TimerControl } from "./TimerControl";
import { useStepTimers } from "./useStepTimers";

type Props = {
  slug: string;
  title: string;
  baseServings: number;
  servings: number;
  units: UnitSystem;
  ingredients: readonly { ingredientId: string; displayText: string; grams: number }[];
  steps: readonly { stepNo: number; text: string; timerSec: number | null }[];
};

/**
 * Keeps the screen on while cooking. Support varies and a browser can refuse, for example on
 * low battery. A refusal is not an error worth showing mid-recipe, so cooking mode simply
 * carries on. The lock also ends when the tab is hidden, so it is taken again on return.
 */
function useWakeLock(active: boolean): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setHeld(true);
        lock.addEventListener("release", () => setHeld(false));
      } catch {
        // Refused: stay quiet and keep cooking.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
  return held;
}

/** Large text and a big button for messy hands. Screen 0 lists the ingredients, then one step at a time. */
export function CookingMode({ slug, title, baseServings, servings, units, ingredients, steps }: Props) {
  // 0 is "get everything ready"; steps follow; the one after the last step is the finish screen.
  const [screen, setScreen] = useState(0);
  const finishScreen = steps.length + 1;
  const finished = screen === finishScreen;
  const step = screen >= 1 && !finished ? steps[screen - 1] : null;

  const screenAwake = useWakeLock(!finished);
  const { timers, start, pause, reset } = useStepTimers(steps);
  const currentTimer = step ? timers[step.stepNo] : undefined;
  // Timers from other steps stay on screen, so they keep working as the cook moves on.
  const others = steps.flatMap((entry) => {
    const timer = timers[entry.stepNo];
    return timer && entry.stepNo !== step?.stepNo && timer.status !== "idle" ? [{ stepNo: entry.stepNo, timer }] : [];
  });

  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Moves a screen reader and keyboard to the new step, and back to the top of the page.
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") setScreen((current) => Math.min(finishScreen, current + 1));
      if (event.key === "ArrowLeft") setScreen((current) => Math.max(0, current - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishScreen]);

  const factor = scaleFactor(baseServings, clampServings(servings));
  const headingClass = "font-heading text-3xl leading-tight outline-none sm:text-4xl";

  return (
    <main id="main" className="flex min-h-dvh flex-col bg-oat">
      <header className="border-b border-line bg-paper px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium">{title}</p>
          <Link href={`/cook/${slug}`} className="inline-flex min-h-11 shrink-0 items-center rounded-brand px-3 text-sm font-medium text-forest hover:bg-sage/60">
            Leave cooking mode
          </Link>
        </div>
        <div className="mx-auto mt-2 max-w-3xl" aria-hidden="true">
          <div className="h-1.5 overflow-hidden rounded-full bg-oat-deep">
            <div className="h-full rounded-full bg-forest transition-[width]" style={{ width: `${(screen / finishScreen) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {screen === 0 ? (
          <>
            <p className="text-lg font-medium text-stone">Get everything ready. Serves {clampServings(servings)}.</p>
            <h1 ref={heading} tabIndex={-1} className={headingClass}>
              Ingredients
            </h1>
            <ul className="mt-4 divide-y divide-line text-xl sm:text-2xl">
              {ingredients.map((line) => (
                <li key={line.ingredientId} className="py-3" data-testid="cooking-ingredient">
                  {formatIngredient(line, factor, units)}
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {step ? (
          <>
            <h1 ref={heading} tabIndex={-1} className={`${headingClass} text-stone`} data-testid="cooking-step-number">
              Step {step.stepNo} of {steps.length}
            </h1>
            <p className="mt-4 text-2xl leading-snug sm:text-4xl sm:leading-snug" data-testid="cooking-step-text">
              {step.text}
            </p>
            {currentTimer ? (
              <div className="mt-6">
                <TimerControl large label={`step ${step.stepNo}`} timer={currentTimer} onStart={() => start(step.stepNo)} onPause={() => pause(step.stepNo)} onReset={() => reset(step.stepNo)} />
              </div>
            ) : null}
          </>
        ) : null}

        {finished ? (
          <div className="flex flex-col items-center text-center">
            <Image src="/images/illustrations/recipe-complete.png" alt="" width={240} height={240} className="h-52 w-52" />
            <h1 ref={heading} tabIndex={-1} className={`${headingClass} mt-4`}>
              All done. Enjoy your {title}.
            </h1>
            <p className="mt-3 text-lg text-stone">Add a note in your cookbook so you remember what you would change next time.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <LinkButton href={`/cook/${slug}`} size="lg">
                Back to the recipe
              </LinkButton>
              <LinkButton href="/account/cookbook" size="lg" variant="secondary">
                My cookbook
              </LinkButton>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-3">
          {others.length > 0 ? (
            <ul className="space-y-2" aria-label="Other timers" data-testid="running-timers">
              {others.map(({ stepNo, timer }) => (
                <li key={stepNo} className="flex items-center gap-2">
                  <span className="shrink-0 text-sm font-medium">Step {stepNo}</span>
                  <div className="min-w-0 flex-1">
                    <TimerControl label={`step ${stepNo}`} timer={timer} onStart={() => start(stepNo)} onPause={() => pause(stepNo)} onReset={() => reset(stepNo)} />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {finished ? null : (
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="min-h-20 px-4 text-lg" disabled={screen === 0} onClick={() => setScreen(screen - 1)}>
                Back
              </Button>
              <Button type="button" className="min-h-20 flex-1 text-2xl" onClick={() => setScreen(screen + 1)}>
                {screen === steps.length ? "Finish" : "Next step"}
              </Button>
            </div>
          )}
          {screenAwake ? <p className="text-center text-xs text-stone">Your screen stays on while you cook.</p> : null}
        </div>
      </div>
    </main>
  );
}
