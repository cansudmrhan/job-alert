// Best-effort filter for Arabic (script) and German (stopword ratio) postings.

const ARABIC_RE = /[؀-ۿݐ-ݿ]/;

const GERMAN_STOPWORDS = new Set([
  "der", "die", "das", "und", "mit", "für", "wir", "sie", "ein", "eine", "nicht", "auf", "ist",
]);

const GERMAN_STOPWORD_RATIO = 0.04;

export function isEnglishJob(job: { title: string; description: string }): boolean {
  const text = `${job.title} ${job.description}`;
  if (ARABIC_RE.test(text)) return false;

  const words = text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
  if (words.length === 0) return true;

  const germanCount = words.filter((w) => GERMAN_STOPWORDS.has(w)).length;
  return germanCount / words.length <= GERMAN_STOPWORD_RATIO;
}
