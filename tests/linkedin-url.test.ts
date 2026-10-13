import { describe, expect, it } from "vitest";
import { normalizeJobUrl } from "@/lib/linkedin-url";

const EN = "https://www.linkedin.com/jobs/view/3912345678/?_l=en";

describe("normalizeJobUrl", () => {
  it("handles country subdomains and strips tracking params", () => {
    expect(normalizeJobUrl("https://ae.linkedin.com/jobs/view/3912345678?trk=public_jobs&refId=abc")).toBe(EN);
    expect(normalizeJobUrl("https://de.linkedin.com/jobs/view/3912345678/?position=1&pageNum=0")).toBe(EN);
    expect(normalizeJobUrl("https://tr.linkedin.com/jobs/view/3912345678")).toBe(EN);
  });

  it("extracts the id from slug forms", () => {
    expect(
      normalizeJobUrl("https://www.linkedin.com/jobs/view/frontend-developer-at-acme-3912345678?trackingId=x")
    ).toBe(EN);
    expect(normalizeJobUrl("https://linkedin.com/jobs/view/slug-123456")).toBe(
      "https://www.linkedin.com/jobs/view/123456/?_l=en"
    );
  });

  it("handles currentJobId and existing locale params", () => {
    expect(normalizeJobUrl("https://www.linkedin.com/jobs/search/?currentJobId=3912345678&keywords=x")).toBe(EN);
    expect(normalizeJobUrl("https://de.linkedin.com/jobs/view/3912345678/?_l=de_DE")).toBe(EN);
  });

  it("leaves non-LinkedIn and non-job URLs untouched", () => {
    expect(normalizeJobUrl("https://example.com/jobs/view/123456")).toBe("https://example.com/jobs/view/123456");
    expect(normalizeJobUrl("https://notlinkedin.com/jobs/view/123456")).toBe("https://notlinkedin.com/jobs/view/123456");
    expect(normalizeJobUrl("https://www.linkedin.com/company/acme")).toBe("https://www.linkedin.com/company/acme");
    expect(normalizeJobUrl("not a url")).toBe("not a url");
  });
});
