import { describe, expect, it } from "vitest";
import { buildAlertEmail, unsubscribeUrl } from "@/lib/email";
import type { Job } from "@/lib/types";

const job: Job = {
  id: "1",
  title: "Frontend <Developer>",
  company: "Acme",
  location: "Berlin",
  employmentType: null,
  applyUrl: "https://linkedin.com/jobs/view/1",
  description: "",
  postedAt: "2026-10-13",
  postedAtTimestamp: null,
  postedAtPrecision: null,
  ageBucket: null,
  source: "LinkedIn",
};

describe("alert email", () => {
  const alertId = "3f2b8c1e-8d2a-4b7e-9a51-0c6d7e8f9a10";

  it("ends with a Stop this alert link to the unsubscribe endpoint", () => {
    const { html } = buildAlertEmail({
      keyword: "react",
      countryLabels: ["Germany"],
      jobs: [job],
      alertId,
      appUrl: "https://demo.example.com/",
    });
    expect(html).toContain(`https://demo.example.com/api/alerts/unsubscribe?id=${alertId}`);
    expect(html).toContain("Stop this alert");
    expect(html.lastIndexOf("Stop this alert")).toBeGreaterThan(html.lastIndexOf("Frontend"));
  });

  it("escapes job content", () => {
    const { html } = buildAlertEmail({
      keyword: "react",
      countryLabels: ["Germany"],
      jobs: [job],
      alertId,
      appUrl: "https://x.test",
    });
    expect(html).not.toContain("<Developer>");
    expect(html).toContain("&lt;Developer&gt;");
  });

  it("links to the English LinkedIn job page", () => {
    const { html } = buildAlertEmail({
      keyword: "react",
      countryLabels: ["Germany"],
      jobs: [{ ...job, applyUrl: "https://ae.linkedin.com/jobs/view/slug-3912345678?trk=x" }],
      alertId: "id",
      appUrl: "https://x.test",
    });
    expect(html).toContain("https://www.linkedin.com/jobs/view/3912345678/?_l=en");
  });

  it("builds the unsubscribe url without double slashes", () => {
    expect(unsubscribeUrl("https://x.test///", "abc")).toBe("https://x.test/api/alerts/unsubscribe?id=abc");
  });
});
