import { describe, expect, it } from "vitest";
import { isCertificateUrl, parseCertifications, supplierSchema } from "@/lib/admin/suppliers";

const draft = { name: "Hill Farm", region: "", story: "" };
const complete = { name: "Hill Farm", region: "North Valley", story: "A family farm growing greens." };

describe("isCertificateUrl", () => {
  it("accepts web addresses only", () => {
    expect(isCertificateUrl("https://example.com/cert.pdf")).toBe(true);
    expect(isCertificateUrl("http://example.com/cert.pdf")).toBe(true);
    for (const url of ["javascript:alert(1)", "data:text/html,x", "ftp://example.com/a", "cert.pdf", ""]) expect(isCertificateUrl(url)).toBe(false);
  });
});

describe("parseCertifications", () => {
  it("splits on lines and commas, trims, and drops repeats", () => {
    expect(parseCertifications("USDA Organic\n organic , Fair Trade\n\n")).toEqual(["USDA Organic", "organic", "Fair Trade"]);
    expect(parseCertifications("Organic, organic")).toEqual(["Organic"]);
    expect(parseCertifications("")).toEqual([]);
  });
});

describe("supplierSchema", () => {
  it("refuses a certification with no certificate", () => {
    const result = supplierSchema.safeParse({ ...complete, certifications: "USDA Organic", certificateUrl: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["certificateUrl"]);
  });

  it("refuses a certificate address that is not a web address", () => {
    expect(supplierSchema.safeParse({ ...complete, certifications: "USDA Organic", certificateUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("accepts a certification with its certificate", () => {
    const parsed = supplierSchema.parse({ ...complete, certifications: "USDA Organic", certificateUrl: "https://example.com/cert.pdf" });
    expect(parsed.certifications).toEqual(["USDA Organic"]);
    expect(parsed.certificateUrl).toBe("https://example.com/cert.pdf");
  });

  it("is not published unless the box is ticked", () => {
    expect(supplierSchema.parse(complete).isPublished).toBe(false);
    expect(supplierSchema.parse({ ...complete, isPublished: "on" }).isPublished).toBe(true);
  });

  it("lets a draft be incomplete, but not a published supplier", () => {
    expect(supplierSchema.safeParse(draft).success).toBe(true);
    expect(supplierSchema.safeParse({ ...draft, isPublished: "on" }).success).toBe(false);
  });

  it("refuses a photo that is not under /images, which next/image could not show", () => {
    expect(supplierSchema.safeParse({ ...complete, photoUrl: "https://example.com/a.png" }).success).toBe(false);
    expect(supplierSchema.parse({ ...complete, photoUrl: "/images/farms/farm-orchard.png" }).photoUrl).toBe("/images/farms/farm-orchard.png");
    expect(supplierSchema.parse({ ...complete, photoUrl: "" }).photoUrl).toBeNull();
  });

  it("has no way to set a slug", () => {
    expect(supplierSchema.parse({ ...complete, slug: "new-address" })).not.toHaveProperty("slug");
  });
});
