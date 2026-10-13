type Country = {
  code: string;
  label: string;
  query: string;
  isRegion?: boolean;
};

export const EU_LOCATION_CODE = "eu";

export const COUNTRIES: Country[] = [
  { code: EU_LOCATION_CODE, label: "All EU + UK", query: "European Union", isRegion: true },
  { code: "de", label: "Germany", query: "Germany" },
  { code: "nl", label: "Netherlands", query: "Netherlands" },
  { code: "fr", label: "France", query: "France" },
  { code: "es", label: "Spain", query: "Spain" },
  { code: "it", label: "Italy", query: "Italy" },
  { code: "ie", label: "Ireland", query: "Ireland" },
  { code: "be", label: "Belgium", query: "Belgium" },
  { code: "at", label: "Austria", query: "Austria" },
  { code: "pl", label: "Poland", query: "Poland" },
  { code: "se", label: "Sweden", query: "Sweden" },
  { code: "dk", label: "Denmark", query: "Denmark" },
  { code: "fi", label: "Finland", query: "Finland" },
  { code: "pt", label: "Portugal", query: "Portugal" },
  { code: "cz", label: "Czech Republic", query: "Czech Republic" },
  { code: "lu", label: "Luxembourg", query: "Luxembourg" },
  { code: "gb", label: "United Kingdom", query: "United Kingdom" },
  { code: "tr", label: "Turkey", query: "Turkey" },
  { code: "ae", label: "Dubai (UAE)", query: "Dubai" },
];

// LinkedIn location queries to fall back to, as separate search URLs in the
// same actor run, if a single "European Union" location query returns no
// results for the "All EU + UK" option.
export const EU_FALLBACK_QUERIES = [
  "Germany",
  "Netherlands",
  "Ireland",
  "France",
  "Spain",
  "Poland",
  "Sweden",
  "United Kingdom",
];

export const MAX_COUNTRIES = 3;

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function parseCountryCodes(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(",");
  const codes: string[] = [];
  for (const item of raw) {
    const code = item.trim().toLowerCase();
    if (code && getCountry(code) && !codes.includes(code)) {
      codes.push(code);
    }
    if (codes.length >= MAX_COUNTRIES) break;
  }
  return codes;
}
