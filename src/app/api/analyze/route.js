import { NextResponse } from "next/server";
import { buildInsight, BRISTOL_TYPES, COLOR_OPTIONS } from "../../../lib/analysis";
import { analyzePhotoWithVision, isVisionEnabled } from "../../../lib/vision";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function parseFlags(flagsValue) {
  if (!flagsValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(flagsValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function shouldAllowVisionOverride({ photoAnalysis, flags }) {
  if (!photoAnalysis?.enabled) {
    return {
      allowOverride: false,
      reason: "vision-not-enabled",
    };
  }

  if (flags.includes("blood") || flags.includes("fever")) {
    return {
      allowOverride: false,
      reason: "strong-user-flags-present",
    };
  }

  if (photoAnalysis.imageQuality === "unclear") {
    return {
      allowOverride: false,
      reason: "image-quality-too-low",
    };
  }

  if (photoAnalysis.confidence !== "high") {
    return {
      allowOverride: false,
      reason: "confidence-below-high-threshold",
    };
  }

  if (photoAnalysis.cautionSignals?.length) {
    return {
      allowOverride: false,
      reason: "vision-caution-signals-present",
    };
  }

  return {
    allowOverride: true,
    reason: "high-confidence-clear-read",
  };
}

function mergeVisionHints({ mode, bristolTypeId, colorValue, notes, flags, photoAnalysis }) {
  if (!photoAnalysis?.enabled || mode !== "photo") {
    return {
      bristolTypeId,
      colorValue,
      notes,
      flags,
      visionSummary: "",
      visionCautionSignals: [],
      visionAdjustedInputs: false,
      visionOverridePolicy: {
        allowOverride: false,
        reason: "vision-not-run",
      },
    };
  }

  const visionOverridePolicy = shouldAllowVisionOverride({ photoAnalysis, flags });
  const resolvedBristolTypeId = visionOverridePolicy.allowOverride
    ? photoAnalysis.stoolTypeGuess ?? bristolTypeId
    : bristolTypeId;
  const resolvedColorValue = visionOverridePolicy.allowOverride
    ? photoAnalysis.colorGuess ?? colorValue
    : colorValue;

  const visionSummary = photoAnalysis.summary?.trim() || "";
  const visionCautionSignals = photoAnalysis.cautionSignals ?? [];
  const cautionNote = visionCautionSignals.length
    ? ` Vision cautions: ${visionCautionSignals.join("; ")}.`
    : "";
  const confidenceNote = photoAnalysis.confidence
    ? ` Vision confidence: ${photoAnalysis.confidence}.`
    : "";
  const overrideNote = ` Vision override policy: ${visionOverridePolicy.allowOverride ? "allowed" : "blocked"} (${visionOverridePolicy.reason}).`;
  const photoNote = visionSummary
    ? ` Vision prototype read: ${visionSummary}.${confidenceNote}${cautionNote}${overrideNote}`
    : ` Vision ran.${confidenceNote}${cautionNote}${overrideNote}`;

  return {
    bristolTypeId: resolvedBristolTypeId,
    colorValue: resolvedColorValue,
    notes: `${notes.trim()}${photoNote}`.trim(),
    flags,
    visionSummary,
    visionCautionSignals,
    visionAdjustedInputs:
      resolvedBristolTypeId !== bristolTypeId || resolvedColorValue !== colorValue,
    visionOverridePolicy,
  };
}

function getStoolTypeLabel(id) {
  return BRISTOL_TYPES.find((type) => type.id === id)?.label ?? null;
}

function getColorLabel(value) {
  return COLOR_OPTIONS.find((color) => color.value === value)?.label ?? null;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const mode = formData.get("mode");
    const bristolTypeId = formData.get("bristolTypeId");
    const colorValue = formData.get("colorValue");
    const notes = formData.get("notes");
    const flags = parseFlags(formData.get("flags"));
    const photo = formData.get("photo");
    const hasPhotoUpload = photo instanceof File && photo.size > 0;

    if (
      typeof mode !== "string" ||
      typeof bristolTypeId !== "string" ||
      typeof colorValue !== "string" ||
      typeof notes !== "string" ||
      !Array.isArray(flags)
    ) {
      return NextResponse.json(
        {
          error: "Missing or invalid analysis fields.",
        },
        { status: 400 },
      );
    }

    if (hasPhotoUpload) {
      if (!ACCEPTED_FILE_TYPES.includes(photo.type)) {
        return NextResponse.json(
          {
            error: "Unsupported image type. Please upload a JPG, PNG, or WebP image.",
          },
          { status: 400 },
        );
      }

      if (photo.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: "Image is too large. Please keep uploads under 8 MB.",
          },
          { status: 400 },
        );
      }
    }

    let photoAnalysis = null;

    if (hasPhotoUpload && mode === "photo" && isVisionEnabled()) {
      try {
        photoAnalysis = await analyzePhotoWithVision(photo);
      } catch (error) {
        photoAnalysis = {
          enabled: false,
          provider: "openai",
          reason: "vision-request-failed",
          error: error.message,
        };
      }
    }

    const mergedInputs = mergeVisionHints({
      mode,
      bristolTypeId: Number(bristolTypeId),
      colorValue,
      notes,
      flags,
      photoAnalysis,
    });

    const result = buildInsight({
      mode,
      bristolTypeId: mergedInputs.bristolTypeId,
      colorValue: mergedInputs.colorValue,
      flags: mergedInputs.flags,
      notes: mergedInputs.notes,
      hasPhoto: hasPhotoUpload,
    });

    return NextResponse.json({
      result,
      analysisMeta: {
        engine: photoAnalysis?.enabled ? "vision-assisted-prototype" : "rule-based-prototype",
        route: "/api/analyze",
        readyForVisionPlugIn: true,
        visionStatus: photoAnalysis?.enabled
          ? {
              provider: photoAnalysis.provider,
              model: photoAnalysis.model,
              imageQuality: photoAnalysis.imageQuality,
              confidence: photoAnalysis.confidence,
              summary: photoAnalysis.summary,
              cautionSignals: photoAnalysis.cautionSignals,
              adjustedStructuredInputs: mergedInputs.visionAdjustedInputs,
              overridePolicy: mergedInputs.visionOverridePolicy,
              resolvedBristolType: getStoolTypeLabel(mergedInputs.bristolTypeId),
              resolvedColor: getColorLabel(mergedInputs.colorValue),
            }
          : hasPhotoUpload && mode === "photo"
            ? {
                provider: photoAnalysis?.provider ?? "none",
                enabled: false,
                reason: photoAnalysis?.reason ?? (isVisionEnabled() ? "not-run" : "missing-api-key"),
                error: photoAnalysis?.error ?? null,
              }
            : null,
        photoInput: hasPhotoUpload
          ? {
              fileName: photo.name,
              mimeType: photo.type,
              sizeBytes: photo.size,
              status: photoAnalysis?.enabled ? "validated-upload-and-vision-processed" : "validated-upload",
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to analyze this check-in right now.",
      },
      { status: 500 },
    );
  }
}
