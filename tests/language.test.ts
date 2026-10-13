import { describe, expect, it } from "vitest";
import { isEnglishJob } from "@/lib/language";

describe("isEnglishJob", () => {
  it("accepts an English posting", () => {
    expect(
      isEnglishJob({ title: "Frontend Developer", description: "You will build web apps with React." })
    ).toBe(true);
  });

  it("rejects Arabic text", () => {
    expect(isEnglishJob({ title: "مطور", description: "نبحث عن مطور برمجيات" })).toBe(false);
  });

  it("rejects German text", () => {
    expect(
      isEnglishJob({
        title: "Entwickler",
        description: "Wir suchen einen Entwickler und Sie arbeiten mit der Gruppe und das Team ist ein Gewinn.",
      })
    ).toBe(false);
  });

  it("accepts empty text", () => {
    expect(isEnglishJob({ title: "", description: "" })).toBe(true);
  });
});
