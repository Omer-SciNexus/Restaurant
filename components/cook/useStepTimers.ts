"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { newTimer, pauseTimer, resetTimer, startTimer, tickTimer, type StepTimer } from "@/lib/recipe-rules";

export type TimerStep = { stepNo: number; timerSec: number | null };
type TimerMap = Record<number, StepTimer>;

/** A short tone and a buzz when a timer ends, for cooks who have walked away from the screen. */
function signalDone() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration is optional.
  }
  try {
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    volume.gain.value = 0.15;
    tone.frequency.value = 660;
    tone.connect(volume).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + 0.5);
    tone.onended = () => void audio.close();
  } catch {
    // Sound is optional too: the screen still says the time is up.
  }
}

/** Every timer in a recipe, held above the steps so it keeps running as the cook moves on. */
export function useStepTimers(steps: readonly TimerStep[]) {
  const [timers, setTimers] = useState<TimerMap>(() => Object.fromEntries(steps.flatMap((step) => (step.timerSec ? [[step.stepNo, newTimer(step.timerSec)]] : []))));
  const anyRunning = Object.values(timers).some((timer) => timer.status === "running");

  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => {
      const now = Date.now();
      setTimers((current) => {
        let changed = false;
        const next: TimerMap = {};
        for (const [stepNo, timer] of Object.entries(current)) {
          const ticked = tickTimer(timer, now);
          changed ||= ticked !== timer;
          next[Number(stepNo)] = ticked;
        }
        return changed ? next : current;
      });
    }, 500);
    return () => clearInterval(id);
  }, [anyRunning]);

  const signalled = useRef(new Set<number>());
  useEffect(() => {
    for (const [stepNo, timer] of Object.entries(timers)) {
      const key = Number(stepNo);
      if (timer.status === "done" && !signalled.current.has(key)) {
        signalled.current.add(key);
        signalDone();
      } else if (timer.status !== "done") {
        signalled.current.delete(key);
      }
    }
  }, [timers]);

  const update = useCallback((stepNo: number, change: (timer: StepTimer) => StepTimer) => {
    setTimers((current) => (current[stepNo] ? { ...current, [stepNo]: change(current[stepNo]) } : current));
  }, []);

  return {
    timers,
    start: useCallback((stepNo: number) => update(stepNo, (timer) => startTimer(timer, Date.now())), [update]),
    pause: useCallback((stepNo: number) => update(stepNo, (timer) => pauseTimer(timer, Date.now())), [update]),
    reset: useCallback((stepNo: number) => update(stepNo, resetTimer), [update]),
  };
}
