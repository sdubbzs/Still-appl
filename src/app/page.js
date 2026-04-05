"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { ALERT_FLAGS, BRISTOL_TYPES, COLOR_OPTIONS } from "../lib/analysis";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const INPUT_METHODS = [
  {
    id: "upload",
    mode: "photo",
    title: "Add photo",
    description: "Upload an existing photo from your phone.",
  },
  {
    id: "camera",
    mode: "photo",
    title: "Take photo",
    description: "Use your camera and keep the flow mobile-first.",
  },
  {
    id: "describe",
    mode: "describe",
    title: "Or describe",
    description: "Skip the image and answer a few symptom questions.",
  },
];

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 MB";
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HomePage() {
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const [formState, setFormState] = useState({
    bristolTypeId: 4,
    colorValue: "brown",
    flags: [],
    notes: "",
  });

  const selectedMethodConfig = useMemo(
    () => INPUT_METHODS.find((method) => method.id === selectedMethod) ?? null,
    [selectedMethod],
  );

  function resetAnalysis() {
    setAnalysisResult(null);
    setSubmitError("");
  }

  function setPhotoSelection(file) {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl("");
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setFileError("Please use a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("Please keep uploads under 8 MB.");
      return;
    }

    setFileError("");
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function handleChooseMethod(methodId) {
    resetAnalysis();
    setSelectedMethod(methodId);

    if (methodId === "describe") {
      setPhotoFile(null);
      setPhotoPreviewUrl("");
      setFileError("");
      setStep(2);
      return;
    }

    if (methodId === "upload") {
      uploadInputRef.current?.click();
    }

    if (methodId === "camera") {
      cameraInputRef.current?.click();
    }
  }

  function handleFileChange(event, methodId) {
    const file = event.target.files?.[0] ?? null;
    setSelectedMethod(methodId);
    resetAnalysis();

    if (!file) {
      return;
    }

    setPhotoSelection(file);
    setStep(2);
    event.target.value = "";
  }

  function handleFlagToggle(flagValue) {
    setFormState((current) => ({
      ...current,
      flags: current.flags.includes(flagValue)
        ? current.flags.filter((value) => value !== flagValue)
        : [...current.flags, flagValue],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetAnalysis();

    if (selectedMethodConfig?.mode === "photo" && !photoFile) {
      setSubmitError("Add a photo before continuing.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("mode", selectedMethodConfig?.mode ?? "describe");
      payload.append("bristolTypeId", String(formState.bristolTypeId));
      payload.append("colorValue", formState.colorValue);
      payload.append("flags", JSON.stringify(formState.flags));
      payload.append("notes", formState.notes);

      if (photoFile) {
        payload.append("photo", photoFile);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to analyze this check-in right now.");
      }

      setAnalysisResult(data.result);
      setStep(3);
    } catch (error) {
      setSubmitError(error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartOver() {
    setStep(1);
    setSelectedMethod(null);
    setPhotoFile(null);
    setPhotoPreviewUrl("");
    setFileError("");
    setSubmitError("");
    setAnalysisResult(null);
    setFormState({
      bristolTypeId: 4,
      colorValue: "brown",
      flags: [],
      notes: "",
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Stool Scout</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Simple gut check-ins.</h1>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              Step {step} / 3
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { id: 1, label: "Choose" },
              { id: 2, label: "Symptoms" },
              { id: 3, label: "Result" },
            ].map((item) => (
              <div
                key={item.id}
                className={`rounded-full px-3 py-2 ${
                  step >= item.id ? "bg-sky-400 text-slate-950" : "bg-white/5 text-slate-400"
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold">Start with one thing.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Pick how you want to check in. Then we’ll ask a few quick symptom questions before showing the result.
                </p>
              </div>

              <div className="space-y-3">
                {INPUT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => handleChooseMethod(method.id)}
                    className="w-full rounded-3xl border border-white/10 bg-white px-5 py-5 text-left text-slate-950 transition hover:scale-[1.01] hover:bg-slate-100"
                  >
                    <div className="text-lg font-semibold">{method.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{method.description}</div>
                  </button>
                ))}
              </div>

              <p className="text-xs leading-5 text-slate-400">
                This is a wellness-style tracking tool, not a diagnosis.
              </p>

              <input
                ref={uploadInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => handleFileChange(event, "upload")}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(event) => handleFileChange(event, "camera")}
              />
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Symptoms + context</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Keep it simple. Answer the basics and we’ll generate the check-in result.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  Start over
                </button>
              </div>

              {selectedMethodConfig?.mode === "photo" ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">Photo added</div>
                      <div className="text-xs text-slate-400">
                        {photoFile ? `${photoFile.name} · ${formatFileSize(photoFile.size)}` : "No file yet"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChooseMethod(selectedMethodConfig.id)}
                      className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300"
                    >
                      Replace
                    </button>
                  </div>

                  {photoPreviewUrl ? (
                    <div className="relative h-52 w-full overflow-hidden rounded-2xl">
                      <Image src={photoPreviewUrl} alt="Preview" fill className="object-cover" unoptimized />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {fileError ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {fileError}
                </div>
              ) : null}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Stool type</span>
                  <select
                    value={formState.bristolTypeId}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        bristolTypeId: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-50 outline-none"
                  >
                    {BRISTOL_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label} — {type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Color</span>
                  <select
                    value={formState.colorValue}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        colorValue: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-50 outline-none"
                  >
                    {COLOR_OPTIONS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-3">
                  <span className="text-sm font-medium text-slate-200">Symptoms</span>
                  <div className="grid grid-cols-1 gap-2">
                    {ALERT_FLAGS.map((flag) => {
                      const selected = formState.flags.includes(flag.value);

                      return (
                        <button
                          key={flag.value}
                          type="button"
                          onClick={() => handleFlagToggle(flag.value)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-sky-300 bg-sky-300 text-slate-950"
                              : "border-white/10 bg-white/5 text-slate-200"
                          }`}
                        >
                          {flag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-200">Anything else?</span>
                  <textarea
                    rows={5}
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="How long has this been happening? Any food change, pain, travel, stress, fever, etc.?"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-slate-50 outline-none placeholder:text-slate-500"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-sky-300 px-4 py-4 text-base font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Generating result..." : "See result"}
                </button>
              </form>
            </section>
          ) : null}

          {step === 3 && analysisResult ? (
            <section className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Your result</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Simple guidance based on the check-in you just submitted.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300"
                >
                  New check-in
                </button>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  {analysisResult.urgency?.label || "Check-in"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{analysisResult.headline}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700">{analysisResult.summary}</p>
              </div>

              {analysisResult.todayPlan?.length ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold">What to do today</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {analysisResult.todayPlan.map((item) => (
                      <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysisResult.followUpPlan?.length ? (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold">What to watch</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                    {analysisResult.followUpPlan.map((item) => (
                      <li key={item} className="rounded-2xl bg-white/5 px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysisResult.escalationTriggers?.length ? (
                <div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-5">
                  <h3 className="text-lg font-semibold text-amber-100">Get medical help if...</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50">
                    {analysisResult.escalationTriggers.map((item) => (
                      <li key={item} className="rounded-2xl bg-black/10 px-4 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
