"use client";

import { formatTimer, type StepTimer } from "@/lib/recipe-rules";
import { Button } from "../ui/Button";

type Props = {
  label: string;
  timer: StepTimer;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  large?: boolean;
};

export function TimerControl({ label, timer, onStart, onPause, onReset, large }: Props) {
  const done = timer.status === "done";
  const size = large ? "md" : "sm";
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-brand p-2 ${done ? "bg-honey/30" : "bg-sage/60"}`} data-testid="step-timer">
      <span className="sr-only">{label}: </span>
      <span role="timer" className={`min-w-16 font-semibold tabular-nums ${large ? "text-2xl" : "text-lg"}`}>
        {formatTimer(timer.remainingSec)}
      </span>
      {/* Only the end is announced, so a screen reader is not read every second of a countdown. */}
      <span role="status" className="text-sm font-medium">
        {done ? `Time's up` : ""}
      </span>
      <span className="ml-auto flex gap-2">
        {timer.status === "running" ? (
          <Button type="button" variant="secondary" size={size} onClick={onPause} aria-label={`Pause timer, ${label}`}>
            Pause
          </Button>
        ) : (
          <Button type="button" size={size} onClick={onStart} aria-label={`${timer.status === "paused" ? "Resume" : done ? "Restart" : "Start"} timer, ${label}`}>
            {timer.status === "paused" ? "Resume" : done ? "Restart" : "Start timer"}
          </Button>
        )}
        {timer.status === "paused" || done ? (
          <Button type="button" variant="ghost" size={size} onClick={onReset} aria-label={`Reset timer, ${label}`}>
            Reset
          </Button>
        ) : null}
      </span>
    </div>
  );
}
