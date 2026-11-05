import { DAY_NAMES, dayRanges, hoursFieldName, WEEK_ORDER } from "@/lib/admin/hours";
import type { OpeningHours } from "@/lib/hours";
import { Field, inputClass } from "../ui/Form";
import { FieldErrors } from "./FormResult";

type Fields = Record<string, string[] | undefined> | undefined;

export type BranchOperations = {
  openingHours: OpeningHours;
  deliveryRadiusKm: number;
  deliveryPolygon: unknown;
  tableCapacityPerSlot: number;
};

/** Hours, delivery zone and table capacity: the part of a branch admins and managers share. */
export function BranchOperationsFields({ branch, fields }: { branch: BranchOperations; fields: Fields }) {
  return (
    <>
      <fieldset>
        <legend className="font-heading text-xl">Opening hours</legend>
        <p className="mt-1 text-xs text-stone">24-hour times, in the branch&apos;s own timezone. Leave both times empty if it is closed that day.</p>
        <FieldErrors id="hours-errors" messages={fields?.openingHours} />
        <div className="mt-3 divide-y divide-line">
          {WEEK_ORDER.map((day) => {
            const ranges = dayRanges(branch.openingHours, day);
            return (
              <div key={day} className="py-3" data-testid={`hours-${day}`}>
                <div className="grid max-w-sm grid-cols-2 gap-3">
                  <Field id={hoursFieldName(day, "open", 0)} name={hoursFieldName(day, "open", 0)} label={`${DAY_NAMES[day]} opens`} type="time" defaultValue={ranges[0]?.open ?? ""} />
                  <Field id={hoursFieldName(day, "close", 0)} name={hoursFieldName(day, "close", 0)} label={`${DAY_NAMES[day]} closes`} type="time" defaultValue={ranges[0]?.close ?? ""} />
                </div>
                <details open={ranges.length > 1} className="mt-2">
                  <summary className="cursor-pointer text-xs text-forest">Second opening that day</summary>
                  <div className="mt-2 grid max-w-sm grid-cols-2 gap-3">
                    <Field id={hoursFieldName(day, "open", 1)} name={hoursFieldName(day, "open", 1)} label={`${DAY_NAMES[day]} opens again`} type="time" defaultValue={ranges[1]?.open ?? ""} />
                    <Field id={hoursFieldName(day, "close", 1)} name={hoursFieldName(day, "close", 1)} label={`${DAY_NAMES[day]} closes again`} type="time" defaultValue={ranges[1]?.close ?? ""} />
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-heading text-xl">Delivery zone</legend>
        <div className="max-w-xs">
          <Field name="deliveryRadiusKm" label="Radius around the branch (km)" type="number" step="0.1" min="0" defaultValue={branch.deliveryRadiusKm} required error={fields?.deliveryRadiusKm?.[0]} />
        </div>
        <div>
          <label htmlFor="deliveryPolygon" className="mb-1 block text-sm font-medium">
            Drawn zone (optional)
          </label>
          <textarea
            id="deliveryPolygon"
            name="deliveryPolygon"
            rows={3}
            defaultValue={branch.deliveryPolygon ? JSON.stringify(branch.deliveryPolygon) : ""}
            placeholder="[[30.26, -97.74], [30.27, -97.73], [30.25, -97.72]]"
            aria-invalid={Boolean(fields?.deliveryPolygon)}
            aria-describedby={fields?.deliveryPolygon ? "polygon-error" : "polygon-hint"}
            className={`${inputClass} font-mono text-sm`}
          />
          {fields?.deliveryPolygon ? (
            <p id="polygon-error" className="mt-1 text-sm text-danger">
              {fields.deliveryPolygon[0]}
            </p>
          ) : (
            <p id="polygon-hint" className="mt-1 text-xs text-stone">
              Points as [latitude, longitude]. When set, it replaces the radius. Leave it empty to use the radius.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-heading text-xl">Tables</legend>
        <div className="mt-2 max-w-xs">
          <Field name="tableCapacityPerSlot" label="Seats per booking slot" type="number" step="1" min="1" defaultValue={branch.tableCapacityPerSlot} required error={fields?.tableCapacityPerSlot?.[0]} />
        </div>
      </fieldset>
    </>
  );
}
