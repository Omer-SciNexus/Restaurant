"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type MuxPlayerElement from "@mux/mux-player";
import { chaptersFromSteps, clampServings, formatIngredient, MAX_SERVINGS, MIN_SERVINGS, scaleFactor, type UnitSystem } from "@/lib/recipe-rules";
import { buttonClass } from "../ui/Button";
import { TimerControl } from "./TimerControl";
import { useStepTimers } from "./useStepTimers";

// The Mux player is heavy and browser-only, so it loads only for a recipe that has a video.
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

export type KitchenStep = { stepNo: number; text: string; imageUrl: string | null; videoStartSec: number | null; timerSec: number | null };
export type KitchenIngredient = { ingredientId: string; name: string; grams: number; displayText: string };

type KitchenState = {
  baseServings: number;
  servings: number;
  setServings: (value: number) => void;
  units: UnitSystem;
  setUnits: (value: UnitSystem) => void;
  hasVideo: boolean;
  setPlayer: (player: MuxPlayerElement | null) => void;
  seekTo: (seconds: number) => void;
};

const KitchenContext = createContext<KitchenState | null>(null);

function useKitchen(): KitchenState {
  const state = useContext(KitchenContext);
  if (!state) throw new Error("Recipe panels must be inside RecipeKitchen");
  return state;
}

/** Holds what the panels share: servings and units, and the player the step list jumps. */
export function RecipeKitchen({ baseServings, hasVideo, children }: { baseServings: number; hasVideo: boolean; children: ReactNode }) {
  const [servings, setServingsState] = useState(clampServings(baseServings));
  const [units, setUnits] = useState<UnitSystem>("us");
  const player = useRef<MuxPlayerElement | null>(null);

  const setPlayer = useCallback((element: MuxPlayerElement | null) => {
    player.current = element;
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const element = player.current;
    if (!element) return;
    element.currentTime = seconds;
    element.scrollIntoView({ block: "center" });
    element.play()?.catch(() => {
      // A browser may refuse to start playback; the video is still at the right place.
    });
  }, []);

  const state = useMemo(
    () => ({ baseServings, servings, setServings: (value: number) => setServingsState(clampServings(value)), units, setUnits, hasVideo, setPlayer, seekTo }),
    [baseServings, servings, units, hasVideo, setPlayer, seekTo],
  );
  return <KitchenContext.Provider value={state}>{children}</KitchenContext.Provider>;
}

// ---- Video

/** A calm stand-in until the chef has filmed this one. A video is never faked. */
export function VideoComingSoon({ title, thumbnailUrl }: { title: string; thumbnailUrl: string | null }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-brand bg-oat-deep" data-testid="video-coming-soon">
      {thumbnailUrl ? <Image src={thumbnailUrl} alt={title} fill priority sizes="(min-width: 1024px) 896px, 100vw" quality={80} className="object-cover" /> : null}
      <div className="absolute inset-x-3 bottom-3 rounded-brand bg-paper/95 p-3 shadow-soft sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-sm">
        <p className="font-medium">Video coming soon</p>
        <p className="text-sm text-stone">We are still filming this one. The written steps below work on their own.</p>
      </div>
    </div>
  );
}

export function RecipeVideo({
  title,
  thumbnailUrl,
  playbackId,
  captionsUrl,
  durationSec,
  steps,
}: {
  title: string;
  thumbnailUrl: string | null;
  playbackId: string;
  captionsUrl: string | null;
  durationSec: number | null;
  steps: readonly KitchenStep[];
}) {
  const { setPlayer } = useKitchen();
  const chapters = useMemo(() => chaptersFromSteps(steps, durationSec), [steps, durationSec]);
  return (
    <div className="aspect-video overflow-hidden rounded-brand bg-bark" data-testid="recipe-video">
      <MuxPlayer
        ref={setPlayer}
        playbackId={playbackId}
        streamType="on-demand"
        title={title}
        poster={thumbnailUrl ?? undefined}
        accentColor="#2f5d3a"
        playsInline
        defaultHiddenCaptions={false}
        metadata={{ video_title: title }}
        style={{ width: "100%", height: "100%" }}
        onLoadedMetadata={(event) => {
          if (chapters.length > 0) void (event.target as MuxPlayerElement).addChapters(chapters);
        }}
      >
        {captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="English" default /> : null}
      </MuxPlayer>
    </div>
  );
}

// ---- Ingredients

export function IngredientPanel({ ingredients }: { ingredients: readonly KitchenIngredient[] }) {
  const { baseServings, servings, setServings, units, setUnits } = useKitchen();
  const factor = scaleFactor(baseServings, servings);
  return (
    <section aria-labelledby="ingredients-heading" className="rounded-brand bg-paper p-4 shadow-soft sm:p-5">
      <h2 id="ingredients-heading" className="text-2xl">
        Ingredients
      </h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <button type="button" className={buttonClass("secondary", "sm", "h-11 w-11 !px-0 text-xl")} aria-label="Fewer servings" disabled={servings <= MIN_SERVINGS} onClick={() => setServings(servings - 1)}>
            -
          </button>
          <p role="status" className="min-w-24 text-center text-sm font-medium" data-testid="servings">
            Serves {servings}
          </p>
          <button type="button" className={buttonClass("secondary", "sm", "h-11 w-11 !px-0 text-xl")} aria-label="More servings" disabled={servings >= MAX_SERVINGS} onClick={() => setServings(servings + 1)}>
            +
          </button>
        </div>
        <fieldset className="flex overflow-hidden rounded-brand border border-forest/40 text-sm">
          <legend className="sr-only">Units</legend>
          {(
            [
              ["us", "US"],
              ["metric", "Metric"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`flex min-h-11 cursor-pointer items-center px-4 font-medium has-focus-visible:outline-3 has-focus-visible:-outline-offset-3 has-focus-visible:outline-forest ${units === value ? "bg-forest text-white" : "text-forest hover:bg-sage/60"}`}>
              <input type="radio" name="units" value={value} checked={units === value} onChange={() => setUnits(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {ingredients.map((line) => (
          <li key={line.ingredientId} className="py-2 text-[15px]" data-testid="ingredient-line">
            {formatIngredient(line, factor, units)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Starts cooking mode with the servings and units chosen on this page. */
export function StartCookingLink({ slug }: { slug: string }) {
  const { servings, units } = useKitchen();
  return (
    <Link href={`/cook/${slug}/cooking?servings=${servings}&units=${units}`} className={buttonClass("primary", "md")}>
      Start cooking mode
    </Link>
  );
}

// ---- Steps

export function StepList({ steps }: { steps: readonly KitchenStep[] }) {
  const { hasVideo, seekTo } = useKitchen();
  const { timers, start, pause, reset } = useStepTimers(steps);
  return (
    <section aria-labelledby="steps-heading">
      <h2 id="steps-heading" className="text-2xl">
        Steps
      </h2>
      <ol className="mt-4 space-y-5">
        {steps.map((step) => {
          const timer = timers[step.stepNo];
          return (
            <li key={step.stepNo} className="flex gap-3" data-testid="recipe-step">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage font-semibold">
                {step.stepNo}
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="pt-1.5">{step.text}</p>
                {step.imageUrl ? (
                  <div className="relative aspect-video max-w-md overflow-hidden rounded-brand bg-oat-deep">
                    <Image src={step.imageUrl} alt="" fill sizes="(min-width: 768px) 448px, 90vw" className="object-cover" />
                  </div>
                ) : null}
                {hasVideo && step.videoStartSec !== null ? (
                  <button type="button" onClick={() => seekTo(step.videoStartSec!)} className={buttonClass("ghost", "sm", "-ml-3")}>
                    Watch this step
                  </button>
                ) : null}
                {timer ? <TimerControl label={`step ${step.stepNo}`} timer={timer} onStart={() => start(step.stepNo)} onPause={() => pause(step.stepNo)} onReset={() => reset(step.stepNo)} /> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
