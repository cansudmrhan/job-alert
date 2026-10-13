"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useCvAnalysis } from "@/hooks/useCvAnalysis";
import { loadSelectedJob } from "@/lib/selected-job";
import CvInput from "./CvInput";
import CvResults from "./CvResults";
import JobInput from "./JobInput";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export default function CvMatch() {
  const [file, setFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [fromJob, setFromJob] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { result, loading, error, analyze, showSample, reset } = useCvAnalysis();

  useEffect(() => {
    const job = loadSelectedJob();
    if (!job) return;
    setTitle(job.title);
    setCompany(job.company);
    setDescription(job.description);
    setFromJob(true);
  }, []);

  async function handleAnalyze() {
    setFormError(null);
    if (!file && cvText.trim().length < 50) {
      setFormError("Upload a PDF or paste at least a few lines of your CV.");
      return;
    }
    if (description.trim().length < 20) {
      setFormError("Please add a job description (at least 20 characters).");
      return;
    }
    try {
      const cvPdfBase64 = file ? await fileToBase64(file) : undefined;
      await analyze({
        cvPdfBase64,
        cvText: file ? undefined : cvText,
        job: { title, company, description },
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 pb-20">
      <h1 className="text-2xl font-bold">CV Match</h1>
      <p className="mb-6 text-gray-500">
        See how well your CV fits a job, which keywords are missing, and get a tailored version.
      </p>

      {result ? (
        <div className="space-y-6">
          <CvResults analysis={result.analysis} source={result.source} notice={result.notice} />
          <Button variant="secondary" onClick={reset}>
            Start over
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <CvInput
            file={file}
            text={cvText}
            error={fileError}
            onFileChange={setFile}
            onTextChange={setCvText}
            onError={setFileError}
          />
          <JobInput
            title={title}
            company={company}
            description={description}
            fromJob={fromJob}
            onTitleChange={setTitle}
            onCompanyChange={setCompany}
            onDescriptionChange={setDescription}
          />

          {(formError || error) && (
            <p role="alert" className="text-sm text-red-600">
              {formError || error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analysing..." : "Analyse my CV"}
            </Button>
            <Button variant="secondary" onClick={showSample} disabled={loading}>
              Try with sample
            </Button>
            {loading && <span className="text-sm text-gray-500">This can take up to a minute.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
