type SelectedJob = {
  title: string;
  company: string;
  description: string;
  url: string;
};

const KEY = "job-alert-app:selected-job";

export function saveSelectedJob(job: SelectedJob): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(job));
  } catch {
    // sessionStorage may be unavailable; the CV page just starts empty.
  }
}

export function loadSelectedJob(): SelectedJob | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SelectedJob>;
    if (typeof parsed.title !== "string") return null;
    return {
      title: parsed.title,
      company: typeof parsed.company === "string" ? parsed.company : "",
      description: typeof parsed.description === "string" ? parsed.description : "",
      url: typeof parsed.url === "string" ? parsed.url : "",
    };
  } catch {
    return null;
  }
}
