"use client";

import Input from "@/components/ui/Input";

type JobInputProps = {
  title: string;
  company: string;
  description: string;
  fromJob: boolean;
  onTitleChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export default function JobInput({
  title,
  company,
  description,
  fromJob,
  onTitleChange,
  onCompanyChange,
  onDescriptionChange,
}: JobInputProps) {
  const missingDescription = fromJob && description.trim() === "";

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-900">2. Job description</h2>
      <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          placeholder="Job title (optional)"
          value={title}
          maxLength={200}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <Input
          placeholder="Company (optional)"
          value={company}
          maxLength={200}
          onChange={(e) => onCompanyChange(e.target.value)}
        />
      </div>
      {missingDescription && (
        <p className="mb-2 text-xs text-amber-700">
          This job came without a description. Please paste the job text below.
        </p>
      )}
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={8}
        maxLength={20000}
        placeholder="Paste the job description here..."
        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </section>
  );
}
