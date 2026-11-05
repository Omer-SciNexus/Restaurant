// A supplier's public claims. The plan is firm on this: only claim what a supplier can show,
// so a certification cannot be saved without the certificate that proves it.

import { z } from "zod";
import { checkboxField } from "./money";
import { isPhotoPath } from "./menu";

/** Only http and https, because this is shown to guests as a link. z.url() alone allows javascript:. */
export function isCertificateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** One claim per line or comma, each listed once. */
export function parseCertifications(text: string): string[] {
  const seen = new Set<string>();
  const claims: string[] = [];
  for (const part of text.split(/[\n,]/)) {
    const claim = part.trim();
    if (claim && !seen.has(claim.toLowerCase())) {
      seen.add(claim.toLowerCase());
      claims.push(claim);
    }
  }
  return claims;
}

export const supplierSchema = z
  .object({
    name: z.string("Enter a name.").trim().min(2, "Enter a name.").max(120, "That name is too long."),
    region: z.string().trim().max(120, "That region is too long.").default(""),
    story: z.string().trim().max(4000, "Keep the story under 4000 characters.").default(""),
    photoUrl: z
      .string()
      .optional()
      .transform((value) => value?.trim() || null)
      .refine((value) => value === null || isPhotoPath(value), { message: "Use a path under /images, like /images/farms/farm-orchard.png, or leave it empty." }),
    certifications: z
      .string()
      .optional()
      .transform((value) => parseCertifications(value ?? "")),
    certificateUrl: z
      .string()
      .optional()
      .transform((value) => value?.trim() || null)
      .refine((value) => value === null || isCertificateUrl(value), { message: "Use a full web address starting with https://." }),
    isPublished: checkboxField,
  })
  .superRefine((value, ctx) => {
    if (value.certifications.length > 0 && !value.certificateUrl) {
      ctx.addIssue({ code: "custom", message: "A certification needs its certificate. Add the certificate's web address, or remove the claim.", path: ["certificateUrl"] });
    }
    if (value.isPublished && !value.region) ctx.addIssue({ code: "custom", message: "A published supplier needs a region.", path: ["region"] });
    if (value.isPublished && !value.story) ctx.addIssue({ code: "custom", message: "A published supplier needs a story.", path: ["story"] });
  });
