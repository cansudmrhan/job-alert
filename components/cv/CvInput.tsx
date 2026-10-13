"use client";

import { useRef } from "react";
import Button from "@/components/ui/Button";

export const MAX_PDF_BYTES = 5 * 1024 * 1024;

type CvInputProps = {
  file: File | null;
  text: string;
  error: string | null;
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  onError: (message: string | null) => void;
};

export default function CvInput({
  file,
  text,
  error,
  onFileChange,
  onTextChange,
  onError,
}: CvInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(selected: File | undefined) {
    if (!selected) return;
    const isPdf = selected.type === "application/pdf" || /\.pdf$/i.test(selected.name);
    if (!isPdf) {
      onError("Only PDF files are supported.");
      return;
    }
    if (selected.size > MAX_PDF_BYTES) {
      onError("The PDF is larger than 5 MB.");
      return;
    }
    onError(null);
    onFileChange(selected);
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">1. Your CV</h2>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          Upload PDF (max 5 MB)
        </Button>
        {file && (
          <span className="flex items-center gap-2 text-sm text-gray-700">
            {file.name}
            <button
              type="button"
              className="text-xs text-gray-500 underline"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove
            </button>
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <p className="my-3 text-xs text-gray-500">or paste your CV text</p>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={file !== null}
        rows={7}
        maxLength={30000}
        placeholder="Paste your CV here..."
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <p className="mt-1 text-xs text-gray-500">Your CV is processed in memory and never stored.</p>
    </section>
  );
}
