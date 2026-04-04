"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ALERT_FLAGS,
  BRISTOL_TYPES,
  COLOR_OPTIONS,
  buildInsight,
} from "../lib/analysis";

const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const HISTORY_STORAGE_KEY = "stool-scout-history-v1";
const MAX_HISTORY_ITEMS = 8;
const HISTORY_DRIVER_PATTERNS = [
  {
    id: "hydration-routine",
    label: "Hydration / routine disruption",
    terms: ["water", "hydr", "dehyd", "routine", "schedule", "sleep", "movement", "backed up"],
    body: "Recent notes keep pointing at hydration, routine, or schedule changes as part of the stool story.",
  },
  {
    id: "travel",
    label: "Travel / off-routine week",
    terms: ["travel", "trip", "hotel", "flight", "airport"],
    body: "Multiple entries mention travel or being out of the usual environment, which can make the tracker story feel more explainable.",
  },
  {
    id: "food-trigger",
    label: "Food trigger / meal change",
    terms: ["food", "meal", "ate", "takeout", "greasy", "spicy", "alcohol", "coffee", "caffeine"],
    body: "Recent notes keep tying the pattern to food, meal timing, or common gut-trigger categories.",
  },
  {
    id: "stress",
    label: "Stress / pressure pattern",
    terms: ["stress", "anx", "nerv", "pressure", "busy"],
    body: "Stress-style language is repeating across saved notes, which suggests the tracker should keep asking for context instead of acting like this is random.",
  },
  {
    id: "illness",
    label: "Feeling sick / possible bug",
    terms: ["sick", "ill", "fever", "vomit", "bug", "food poisoning", "nausea"],
    body: "Recent entries sound more like a short-term illness or bug pattern than a generic digestion wobble.",
  },
];

const ANALYSIS_STYLES = {
  photo: {
    badge: "AI photo analysis mode",
    headline: "Photo-first mobile flow",
    body: "This prototype starts with a photo capture/upload experience and then combines that with a few guided inputs so the result feels useful now while staying honest.",
  },
  describe: {
    badge: "Describe-it mode",
    headline: "No photo? Describe it instead",
    body: "If someone does not want to upload an image, they can still get a useful wellness-style read from descriptive inputs and symptom context.",
  },
};

const QUICK_DEMO_NOTES = [
  "Phone-first flow works with camera, upload, or no-photo fallback.",
  "Results explain what likely happened, what to do today, and when to re-check.",
  "Saved history makes the product feel like a tracker instead of a one-off checker.",
  "The analysis call already runs through a real server route, so the app has a clean seam for future vision work.",
];

const PRODUCT_PRINCIPLES = [
  {
    title: "Track the pattern, not one weird day",
    body: "Single check-ins can be noisy. The product is strongest when it helps someone notice whether things are settling, repeating, or getting worse.",
  },
  {
    title: "Stay useful without pretending to diagnose",
    body: "The app should give practical next steps and caution language, while staying honest that this is a wellness tracker, not a medical device.",
  },
  {
    title: "Make follow-up dead simple on phone",
    body: "A real habit product needs quick repeat logging, not a giant form every time. The history and reuse flow are part of the product, not an extra.",
  },
];

const DEMO_SCENARIOS = [
  {
    id: "steady-routine",
    name: "Steady routine",
    blurb: "Balanced check-in for a clean, reassuring demo result.",
    form: {
      mode: "photo",
      bristolTypeId: 4,
      colorValue: "brown",
      flags: [],
      notes: "Routine feels normal. Ate pretty well, slept decently, no major symptoms.",
    },
  },
  {
    id: "travel-constipation",
    name: "Travel constipation",
    blurb: "Shows a firmer stool pattern with practical hydration/fiber guidance.",
    form: {
      mode: "describe",
      bristolTypeId: 2,
      colorValue: "light-brown",
      flags: ["pain", "persistent"],
      notes: "Travel week, lower water intake, off normal eating schedule, a bit backed up.",
    },
  },
  {
    id: "food-poisoning-loose",
    name: "Loose / caution example",
    blurb: "Useful for demoing stronger caution language and follow-up prompts.",
    form: {
      mode: "describe",
      bristolTypeId: 6,
      colorValue: "yellow",
      flags: ["urgent", "fever"],
      notes: "Loose stool started after takeout last night. Feeling off and going more often than usual.",
    },
  },
];

const DEMO_IMAGE_FIXTURES = [
  {
    id: "balanced-brown",
    name: "Balanced brown sample",
    blurb: "Loads a built-in PNG fixture so the photo-first flow can be demoed without finding a file.",
    path: "/demo-images/fixture-balanced-brown.png",
    fileName: "fixture-balanced-brown.png",
    mimeType: "image/png",
  },
  {
    id: "loose-yellow",
    name: "Loose yellow sample",
    blurb: "Useful for a quicker caution-style photo demo with a second built-in fixture.",
    path: "/demo-images/fixture-loose-yellow.png",
    fileName: "fixture-loose-yellow.png",
    mimeType: "image/png",
  },
];

const DEMO_HISTORY_PRESETS = [
  {
    id: "steady-week",
    name: "Seed stable week",
    blurb: "Creates a believable run of mostly balanced check-ins for the tracker story.",
    items: [
      {
        savedAt: "2026-03-20T08:10:00.000Z",
        mode: "photo",
        bristolTypeId: 4,
        colorValue: "brown",
        flags: [],
        notes: "Good sleep, normal meals, nothing unusual.",
        hasPhoto: true,
      },
      {
        savedAt: "2026-03-21T08:20:00.000Z",
        mode: "describe",
        bristolTypeId: 4,
        colorValue: "brown",
        flags: [],
        notes: "Routine check-in before work. Feels pretty normal.",
        hasPhoto: false,
      },
      {
        savedAt: "2026-03-23T08:35:00.000Z",
        mode: "photo",
        bristolTypeId: 3,
        colorValue: "light-brown",
        flags: [],
        notes: "Slightly drier than usual after a lighter water day.",
        hasPhoto: true,
      },
      {
        savedAt: "2026-03-25T08:12:00.000Z",
        mode: "photo",
        bristolTypeId: 4,
        colorValue: "brown",
        flags: [],
        notes: "Back to baseline after better hydration.",
        hasPhoto: true,
      },
    ],
  },
  {
    id: "rough-patch",
    name: "Seed rough patch",
    blurb: "Creates a higher-caution trend so the timeline and tracker signals feel real in a tougher demo.",
    items: [
      {
        savedAt: "2026-03-21T13:05:00.000Z",
        mode: "describe",
        bristolTypeId: 5,
        colorValue: "brown",
        flags: ["urgent"],
        notes: "A bit off after travel food, but manageable.",
        hasPhoto: false,
      },
      {
        savedAt: "2026-03-22T11:40:00.000Z",
        mode: "describe",
        bristolTypeId: 6,
        colorValue: "yellow",
        flags: ["urgent", "persistent"],
        notes: "Still loose the next day and eating carefully.",
        hasPhoto: false,
      },
      {
        savedAt: "2026-03-24T10:15:00.000Z",
        mode: "photo",
        bristolTypeId: 6,
        colorValue: "yellow",
        flags: ["urgent", "fever"],
        notes: "Woke up feeling rough and going more often than usual.",
        hasPhoto: true,
      },
      {
        savedAt: "2026-03-25T09:10:00.000Z",
        mode: "photo",
        bristolTypeId: 7,
        colorValue: "yellow",
        flags: ["urgent", "fever"],
        notes: "Still watery and not really settling yet.",
        hasPhoto: true,
      },
    ],
  },
];


const DEMO_PACKS = [
  {
    id: "founder-happy-path",
    name: "Founder happy path",
    blurb: "Loads a reassuring photo-first check-in plus a stable saved-history trend so the product feels polished immediately.",
    fixtureId: "balanced-brown",
    scenarioId: "steady-routine",
    historyPresetId: "steady-week",
    presenterMode: {
      opener: "This is the fast founder walkthrough: photo-first intake, a calm result, and a believable tracker trend already in place.",
      proofPoints: [
        "A bundled sample photo loads into the same capture surface a real user would hit.",
        "The app reaches a real analysis route instead of faking a static result card.",
        "Saved history already shows a stable recent baseline, so the product feels like an ongoing tracker.",
      ],
      nextStepLabels: {
        1: "Load the sample photo and point out that the first screen is still camera-first.",
        2: "Call analysis and explain that the guided inputs stay conservative and wellness-positioned.",
        3: "Show the calm result, then land on history as proof this is more than a one-shot gimmick.",
      },
    },
  },
  {
    id: "caution-walkthrough",
    name: "Caution walkthrough",
    blurb: "Loads a higher-caution photo flow plus a rough recent trend so the escalation story feels coherent in one tap.",
    fixtureId: "loose-yellow",
    scenarioId: "food-poisoning-loose",
    historyPresetId: "rough-patch",
    presenterMode: {
      opener: "This is the higher-caution story: same product flow, but the language gets sharper without pretending to diagnose anything.",
      proofPoints: [
        "The photo fixture still goes through the same upload path, so the demo stays honest.",
        "The result escalates because the structured inputs and caution flags justify it, not because the UI is hard-coded to sound scary.",
        "The recent history trend shows this is part of a rough patch, which makes the follow-up guidance feel more credible.",
      ],
      nextStepLabels: {
        1: "Show that the pack still starts with a real photo surface rather than a mocked result.",
        2: "Run analysis and tee up the idea that the app is escalating follow-up, not diagnosing disease.",
        3: "Walk through the caution framing, escalation triggers, and recent trend so the story feels coherent.",
      },
    },
  },
];

function getDemoFixtureById(fixtureId) {
  return DEMO_IMAGE_FIXTURES.find((fixture) => fixture.id === fixtureId) ?? null;
}

function getDemoScenarioById(scenarioId) {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? null;
}

function getDemoHistoryPresetById(presetId) {
  return DEMO_HISTORY_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

function formatSavedAt(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatSavedAtCompact(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

function formatRelativeGap(fromTimestamp, toTimestamp) {
  const diffMs = Math.abs(new Date(fromTimestamp).getTime() - new Date(toTimestamp).getTime());
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    return `${Math.max(1, diffHours)}h gap`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${Math.max(1, diffDays)}d gap`;
}

function formatDemoElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getHistoryDriverSignals(history) {
  if (!history.length) {
    return [];
  }

  const aggregatedText = history
    .flatMap((item) => [item.notes, item.flags.join(" "), item.colorLabel, item.stoolTypeName])
    .join(" ")
    .toLowerCase();

  const matchedSignals = HISTORY_DRIVER_PATTERNS.map((pattern) => {
    const matchCount = pattern.terms.reduce((count, term) => {
      if (!term) {
        return count;
      }

      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedTerm}`, "gi");
      const matches = aggregatedText.match(regex);
      return count + (matches?.length ?? 0);
    }, 0);

    return {
      id: pattern.id,
      label: pattern.label,
      body: pattern.body,
      matchCount,
    };
  })
    .filter((signal) => signal.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  const cautionCount = history.filter((item) => item.shouldTalkToDoctor).length;

  if (cautionCount >= 2) {
    matchedSignals.unshift({
      id: "repeat-caution",
      label: "Repeated caution streak",
      body: `${cautionCount} recent saved entr${cautionCount === 1 ? "y" : "ies"} include stronger caution language, so the tracker should stop sounding casual about follow-up.`,
      matchCount: cautionCount,
    });
  }

  return matchedSignals
    .filter((signal, index, collection) => collection.findIndex((candidate) => candidate.id === signal.id) === index)
    .slice(0, 3);
}

function buildPresenterTimeline({ elapsedMs, analysisResult }) {
  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const segments = [
    {
      id: "capture",
      label: "Frame capture",
      window: "0-10s",
      target: "Show the photo-first surface and note the privacy fallback.",
      done: elapsedSeconds >= 10 || elapsedSeconds > 0,
      active: elapsedSeconds < 10,
    },
    {
      id: "analyze",
      label: "Run analysis",
      window: "10-20s",
      target: "Trigger the real analysis route before the walkthrough drifts.",
      done: Boolean(analysisResult),
      active: elapsedSeconds >= 10 && !analysisResult,
    },
    {
      id: "land",
      label: "Land takeaway",
      window: "20-30s",
      target: "Use the result, next step, and tracker story to close cleanly.",
      done: Boolean(analysisResult) && elapsedSeconds >= 20,
      active: Boolean(analysisResult),
    },
  ];

  let pace = {
    badge: "On pace",
    body: "The walkthrough is still inside the intended 30-second founder-demo window.",
    tone: "bg-emerald-50 text-emerald-950 ring-emerald-200",
  };

  if (!analysisResult && elapsedSeconds >= 20) {
    pace = {
      badge: "Behind pace",
      body: "Analysis still has not been triggered, so the walkthrough is drifting past the sharpest demo beat.",
      tone: "bg-amber-50 text-amber-950 ring-amber-200",
    };
  } else if (analysisResult && elapsedSeconds > 35) {
    pace = {
      badge: "Wrap it up",
      body: "The result is already live. Shift to tracker proof and close instead of adding extra commentary.",
      tone: "bg-violet-50 text-violet-950 ring-violet-200",
    };
  }

  return { segments, pace };
}

function getImageValidationError(file) {
  if (!file) {
    return "";
  }

  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "Image is too large. Please keep uploads under 8 MB.";
  }

  return "";
}

function formatFileSize(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 KB";
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildHistoryItem(form, result, hasPhoto, options = {}) {
  return {
    id: options.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: options.savedAt ?? new Date().toISOString(),
    mode: form.mode,
    bristolTypeId: form.bristolTypeId,
    colorValue: form.colorValue,
    flags: form.flags,
    notes: form.notes.trim(),
    hasPhoto,
    stoolTypeLabel: result.stoolType?.label ?? "Unknown",
    stoolTypeName: result.stoolType?.name ?? "Unknown",
    colorLabel: result.color?.label ?? "Unknown",
    cautionCount: result.cautionReasons.length,
    shouldTalkToDoctor: result.shouldTalkToDoctor,
  };
}

function buildSeededHistoryFromPreset(preset) {
  return [...preset.items]
    .map((item, index) => {
      const result = buildInsight({
        mode: item.mode,
        bristolTypeId: item.bristolTypeId,
        colorValue: item.colorValue,
        flags: item.flags,
        notes: item.notes,
        hasPhoto: item.hasPhoto,
      });

      return buildHistoryItem(
        {
          mode: item.mode,
          bristolTypeId: item.bristolTypeId,
          colorValue: item.colorValue,
          flags: item.flags,
          notes: item.notes,
        },
        result,
        item.hasPhoto,
        {
          id: `seed-${preset.id}-${index + 1}`,
          savedAt: item.savedAt,
        },
      );
    })
    .sort((left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime());
}

function buildHistorySummary(history) {
  if (!history.length) {
    return {
      headline: "No saved trend yet",
      body: "Save a few check-ins and Stool Scout will start showing the recent pattern here.",
    };
  }

  const latest = history[0];
  const averageType = Math.round(
    history.reduce((sum, item) => sum + Number(item.bristolTypeId || 0), 0) / history.length,
  );
  const warningCount = history.filter((item) => item.shouldTalkToDoctor).length;

  let headline = `Recent average: Bristol ${averageType}`;
  let body = `Last saved ${formatSavedAt(latest.savedAt)}. `;

  if (warningCount === 0) {
    body += "Recent check-ins look relatively stable based on the saved entries.";
  } else if (warningCount === 1) {
    body += "One recent check-in had stronger caution signals worth keeping an eye on.";
  } else {
    body += `${warningCount} recent check-ins had stronger caution signals, so trend-following matters more than a single result.`;
  }

  return { headline, body };
}

function getTrendDirection(history) {
  if (history.length < 2) {
    return {
      label: "Need more check-ins",
      body: "Save at least two entries to show whether stool form is moving toward a steadier pattern or getting more extreme.",
    };
  }

  const newest = Number(history[0].bristolTypeId || 0);
  const oldest = Number(history[history.length - 1].bristolTypeId || 0);
  const delta = newest - oldest;

  if (delta === 0) {
    return {
      label: "Mostly steady",
      body: `The latest saved check-in matches the oldest recent entry at Bristol ${newest}.`,
    };
  }

  if (Math.abs(delta) === 1) {
    return {
      label: delta > 0 ? "Slightly looser lately" : "Slightly firmer lately",
      body: `The recent saved pattern shifted by ${Math.abs(delta)} Bristol step from oldest to newest entry.`,
    };
  }

  return {
    label: delta > 0 ? "Meaningfully looser lately" : "Meaningfully firmer lately",
    body: `The recent saved pattern shifted by ${Math.abs(delta)} Bristol steps, so the trend matters more than any single check-in.`,
  };
}

function getMostCommonLabel(items, emptyLabel) {
  if (!items.length) {
    return emptyLabel;
  }

  const counts = items.reduce((map, item) => {
    map.set(item, (map.get(item) ?? 0) + 1);
    return map;
  }, new Map());

  const [topLabel, topCount] = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return `${topLabel} (${topCount}/${items.length})`;
}

function buildHistoryCoach(history, result) {
  if (!result?.stoolType) {
    return null;
  }

  if (!history.length) {
    return {
      title: "No baseline yet",
      tone: "bg-stone-50 text-stone-900",
      body: "Save this and a few follow-up check-ins so Stool Scout can tell whether this is a one-off or a real pattern.",
      bullets: [
        "A single result is useful, but trends are more honest than snapshots.",
        "Try to log the next check-in under similar conditions so the comparison is cleaner.",
      ],
    };
  }

  const recentAverage =
    history.reduce((sum, item) => sum + Number(item.bristolTypeId || 0), 0) / history.length;
  const averageDelta = Number(result.stoolType.id) - recentAverage;
  const recentCautionCount = history.filter((item) => item.shouldTalkToDoctor).length;
  const cautionShare = recentCautionCount / history.length;
  const latest = history[0];
  const latestDelta = Number(result.stoolType.id) - Number(latest.bristolTypeId || 0);
  const sameColorAsRecent = latest.colorLabel === (result.color?.label ?? "");

  let title = "Near your recent baseline";
  let tone = "bg-emerald-50 text-emerald-950";
  let body = "This check-in sits close to your recent saved pattern, so the app should frame it more as routine monitoring than a sudden change.";

  if (Math.abs(averageDelta) >= 1.5) {
    title = averageDelta > 0 ? "Looser than your recent baseline" : "Firmer than your recent baseline";
    tone = "bg-amber-50 text-amber-950";
    body = averageDelta > 0
      ? "Compared with recent saved entries, this check-in is meaningfully looser. That makes short-term hydration and follow-up more important than treating it like business as usual."
      : "Compared with recent saved entries, this check-in is meaningfully firmer. That points more toward constipation-style correction than a steady routine read.";
  }

  if (result.shouldTalkToDoctor && cautionShare >= 0.5) {
    title = "Part of a higher-caution recent pattern";
    tone = "bg-rose-50 text-rose-950";
    body = "This is not just a one-off caution result — several recent saved entries were also higher-caution, so escalation matters more than repeated self-checking.";
  }

  const bullets = [
    `Recent saved average: Bristol ${recentAverage.toFixed(1)} across ${history.length} check-in${history.length === 1 ? '' : 's'}.`,
    latestDelta === 0
      ? `It matches your most recent saved stool form from ${formatSavedAt(latest.savedAt)}.`
      : `It is ${Math.abs(latestDelta)} Bristol step${Math.abs(latestDelta) === 1 ? '' : 's'} ${latestDelta > 0 ? 'looser' : 'firmer'} than your most recent saved entry from ${formatSavedAt(latest.savedAt)}.`,
    sameColorAsRecent
      ? `The color read matches your latest saved check-in (${latest.colorLabel}).`
      : `The color read changed from your latest saved check-in (${latest.colorLabel} → ${result.color?.label ?? 'Unknown'}).`,
  ];

  if (!result.shouldTalkToDoctor && cautionShare > 0) {
    bullets.push(`This result is lower-caution than ${recentCautionCount} of your ${history.length} recent saved entries.`);
  }

  if (result.shouldTalkToDoctor && cautionShare === 0) {
    bullets.push("This stands out more because your recent saved history was lower-caution before now.");
  }

  return { title, tone, body, bullets };
}

function buildHistoryInsights(history) {
  if (!history.length) {
    return [
      {
        title: "Pattern",
        value: "No entries yet",
        body: "Saved check-ins will surface the most common stool pattern here.",
      },
      {
        title: "Color trend",
        value: "No entries yet",
        body: "The app will highlight the most common saved color read.",
      },
      {
        title: "Caution rate",
        value: "No entries yet",
        body: "Stronger caution signals will show up as a recent rate, not just a one-off flag.",
      },
      {
        title: "Direction",
        value: "No entries yet",
        body: "The app will summarize whether recent stool form looks steadier, firmer, or looser.",
      },
    ];
  }

  const cautionCount = history.filter((item) => item.shouldTalkToDoctor).length;
  const cautionRate = Math.round((cautionCount / history.length) * 100);
  const trend = getTrendDirection(history);

  return [
    {
      title: "Pattern",
      value: getMostCommonLabel(
        history.map((item) => `${item.stoolTypeLabel}: ${item.stoolTypeName}`),
        "No pattern yet",
      ),
      body: "The most common saved stool form gives the demo a more tracker-like feel.",
    },
    {
      title: "Color trend",
      value: getMostCommonLabel(
        history.map((item) => item.colorLabel),
        "No color trend yet",
      ),
      body: "Color consistency is often more useful over several check-ins than from a single day.",
    },
    {
      title: "Caution rate",
      value: `${cautionRate}% recent caution`,
      body:
        cautionCount === 0
          ? "None of the recent saved entries crossed the higher-caution threshold."
          : `${cautionCount} of ${history.length} recent saved entries triggered stronger caution language.`,
    },
    {
      title: "Direction",
      value: trend.label,
      body: trend.body,
    },
  ];
}

function buildTimelineMessage(item, previousItem) {
  if (!previousItem) {
    return "Baseline entry for the current saved trend window.";
  }

  const stoolDelta = Number(item.bristolTypeId || 0) - Number(previousItem.bristolTypeId || 0);
  const changedColor = item.colorLabel !== previousItem.colorLabel;

  if (stoolDelta === 0 && !changedColor) {
    return "Stable versus the previous saved check-in.";
  }

  const stoolMessage =
    stoolDelta === 0
      ? "Same stool form"
      : `${Math.abs(stoolDelta)} Bristol step${Math.abs(stoolDelta) === 1 ? "" : "s"} ${stoolDelta > 0 ? "looser" : "firmer"}`;

  if (!changedColor) {
    return `${stoolMessage} than the previous saved check-in.`;
  }

  return `${stoolMessage}, with color shifting from ${previousItem.colorLabel} to ${item.colorLabel}.`;
}

function buildTrackerSignals(history) {
  if (!history.length) {
    return [
      {
        title: "Current streak",
        value: "No streak yet",
        body: "Save at least two check-ins to show whether the current pattern is repeating or resolving.",
        tone: "bg-stone-50 text-stone-900",
      },
      {
        title: "Caution watch",
        value: "No pattern yet",
        body: "Repeated caution entries will surface here so the tracker feels more like ongoing monitoring.",
        tone: "bg-stone-50 text-stone-900",
      },
      {
        title: "Form range",
        value: "No baseline yet",
        body: "The app will show whether saved entries are clustered tightly or swinging across several Bristol types.",
        tone: "bg-stone-50 text-stone-900",
      },
    ];
  }

  const latest = history[0];
  let sameFormStreak = 1;

  for (let index = 1; index < history.length; index += 1) {
    if (history[index].stoolTypeLabel === latest.stoolTypeLabel) {
      sameFormStreak += 1;
    } else {
      break;
    }
  }

  let cautionStreak = 0;
  for (const item of history) {
    if (item.shouldTalkToDoctor) {
      cautionStreak += 1;
    } else {
      break;
    }
  }

  const bristolValues = history.map((item) => Number(item.bristolTypeId || 0));
  const minType = Math.min(...bristolValues);
  const maxType = Math.max(...bristolValues);
  const range = maxType - minType;

  return [
    {
      title: "Current streak",
      value:
        sameFormStreak > 1
          ? `${sameFormStreak} straight ${latest.stoolTypeLabel.toLowerCase()} entries`
          : `${latest.stoolTypeLabel} right now`,
      body:
        sameFormStreak > 1
          ? `The most recent saved entries are repeating the same stool form, which makes the tracker feel more like a real pattern than a one-off check-in.`
          : `The latest check-in stands alone so far, so one more similar save would make the pattern more believable in the demo.`,
      tone: sameFormStreak >= 3 ? "bg-emerald-50 text-emerald-950" : "bg-stone-50 text-stone-900",
    },
    {
      title: "Caution watch",
      value:
        cautionStreak >= 2
          ? `${cautionStreak} higher-caution check-ins in a row`
          : latest.shouldTalkToDoctor
            ? "Latest entry is higher-caution"
            : "Latest entry is lower-caution",
      body:
        cautionStreak >= 2
          ? "Several recent entries are stacking caution signals, so the app can frame this as a repeated issue instead of a single rough day."
          : latest.shouldTalkToDoctor
            ? "The latest entry raised caution, but the pattern is not repeated yet in the most recent saves."
            : "Recent history is not currently showing a repeated caution streak.",
      tone:
        cautionStreak >= 2
          ? "bg-rose-50 text-rose-950"
          : latest.shouldTalkToDoctor
            ? "bg-amber-50 text-amber-950"
            : "bg-emerald-50 text-emerald-950",
    },
    {
      title: "Form range",
      value: range === 0 ? `Holding at Bristol ${latest.bristolTypeId}` : `Bristol ${minType} to ${maxType}`,
      body:
        range === 0
          ? "Saved entries are tightly clustered, which supports a stable-pattern story in the tracker."
          : range <= 2
            ? "Saved stool form has moved, but within a fairly tight recent band."
            : "Saved stool form is swinging across a wide range, which makes follow-up and context more important.",
      tone: range >= 3 ? "bg-violet-50 text-violet-950" : "bg-stone-50 text-stone-900",
    },
  ];
}

function buildHistoryRecommendation(history) {
  if (!history.length) {
    return {
      title: "No tracker recommendation yet",
      tone: "bg-stone-50 text-stone-900",
      body: "Save a few check-ins and Stool Scout can turn the history area into an actual follow-up recommendation instead of a passive log.",
      bullets: [
        "Aim for at least two or three entries under similar conditions so the pattern is easier to compare.",
        "Use the saved history cards to turn one entry into a follow-up draft instead of retyping everything on mobile.",
      ],
    };
  }

  const latest = history[0];
  const cautionStreak = history.findIndex((item) => !item.shouldTalkToDoctor);
  const consecutiveCaution = cautionStreak === -1 ? history.length : cautionStreak;
  const latestThree = history.slice(0, 3);
  const averageRecentType =
    latestThree.reduce((sum, item) => sum + Number(item.bristolTypeId || 0), 0) / latestThree.length;
  const hasWideSwing =
    Math.max(...latestThree.map((item) => Number(item.bristolTypeId || 0))) -
      Math.min(...latestThree.map((item) => Number(item.bristolTypeId || 0))) >=
    3;

  if (consecutiveCaution >= 2) {
    return {
      title: "Escalation pattern forming",
      tone: "bg-rose-50 text-rose-950",
      body: `The most recent ${consecutiveCaution} saved check-in${consecutiveCaution === 1 ? "" : "s"} all triggered higher-caution language, so the tracker should stop sounding casual and push faster follow-up instead.`,
      bullets: [
        "Treat this as a repeated issue, not a single weird day in the log.",
        "If the next entry adds pain, blood, black stool, fever, or persistent symptoms, escalate beyond tracker-only monitoring.",
      ],
    };
  }

  if (hasWideSwing) {
    return {
      title: "Recent pattern is swinging",
      tone: "bg-violet-50 text-violet-950",
      body: "The last few saved entries jump across a wide Bristol range, which makes context and follow-up timing more important than any one result card.",
      bullets: [
        "Use notes to capture likely drivers like travel, hydration, food changes, or stress so the swing has context.",
        "The next best product move is another check-in soon so the app can tell whether this is resolving or still bouncing around.",
      ],
    };
  }

  if (averageRecentType >= 5.5) {
    return {
      title: "Watch for continued loose trend",
      tone: "bg-amber-50 text-amber-950",
      body: "Recent saved entries are clustering on the looser side, so the tracker should frame the next step as close follow-up rather than assuming this is already back to normal.",
      bullets: [
        "Re-check after hydration, simpler food, and a little time so the next entry tests whether the trend is actually calming down.",
        "If the loose pattern persists or feels worse, escalate faster than you would for a single isolated save.",
      ],
    };
  }

  if (averageRecentType <= 2.5) {
    return {
      title: "Watch for continued firmness",
      tone: "bg-amber-50 text-amber-950",
      body: "Recent saved entries are clustering on the firmer side, so the tracker should tee up hydration, routine, and another follow-up instead of treating the story as fully resolved.",
      bullets: [
        "A cleaner next entry helps prove whether this was a short-term travel / routine blip or a pattern that is sticking around.",
        "Notes about water, meal timing, and schedule changes make the trend more believable in the demo and more useful in the product.",
      ],
    };
  }

  return {
    title: latest.shouldTalkToDoctor ? "Keep this one under watch" : "Stable tracker story",
    tone: latest.shouldTalkToDoctor ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950",
    body: latest.shouldTalkToDoctor
      ? "The latest save stands out more than the recent baseline, so the right story is close monitoring with a lower bar for escalation if the next check-in is still concerning."
      : "Recent saves look fairly steady, so the history section now reads more like an ongoing wellness tracker than a one-shot checker.",
    bullets: latest.shouldTalkToDoctor
      ? [
          "The next saved check-in matters a lot because it will show whether this caution signal was isolated or repeated.",
          "If a stronger symptom appears, stop leaning on tracker language alone and push the user toward real follow-up.",
        ]
      : [
          "Keep using follow-up drafts from saved history so repeat entries stay fast on mobile.",
          "A stable history baseline makes later outliers easier to explain honestly.",
        ],
  };
}

function buildTrendScore(history) {
  if (!history.length) {
    return {
      score: null,
      headline: "Trend score unavailable",
      tone: "bg-stone-50 text-stone-900",
      body: "Save a few check-ins and Stool Scout will turn the latest streak, caution rate, and baseline distance into a quick trend read.",
      bullets: [
        "The score is meant to summarize the recent pattern, not replace the full cards below.",
        "More comparable entries make the trend story more believable.",
      ],
    };
  }

  const latestThree = history.slice(0, 3);
  const latest = latestThree[0];
  const cautionCount = latestThree.filter((item) => item.shouldTalkToDoctor).length;
  const averageDistanceFromBaseline =
    latestThree.reduce((sum, item) => sum + Math.abs(4 - Number(item.bristolTypeId || 0)), 0) /
    latestThree.length;
  const repeatedLatestFormCount = latestThree.filter(
    (item) => item.stoolTypeLabel === latest.stoolTypeLabel,
  ).length;

  let score = 100;
  score -= Math.round(averageDistanceFromBaseline * 18);
  score -= cautionCount * 18;

  if (latest.shouldTalkToDoctor) {
    score -= 10;
  }

  if (repeatedLatestFormCount >= 2 && !latest.shouldTalkToDoctor) {
    score += 6;
  }

  score = Math.max(0, Math.min(100, score));

  let headline = `Trend score: ${score}/100`;
  let tone = "bg-emerald-50 text-emerald-950";
  let body = "Recent saved check-ins look fairly steady, so the tracker can frame this as a stable monitoring story rather than a wobbling one-off.";

  if (score < 45) {
    tone = "bg-rose-50 text-rose-950";
    body = "Recent saved check-ins are clustering far enough from baseline or stacking enough caution that the tracker should sound more urgent and less casual.";
  } else if (score < 70) {
    tone = "bg-amber-50 text-amber-950";
    body = "Recent saved check-ins are mixed: not a crisis by score alone, but not steady enough for the tracker to sound fully settled either.";
  } else if (score < 85) {
    tone = "bg-blue-50 text-blue-950";
    body = "Recent saved check-ins are reasonably steady, but there is still enough movement that one more follow-up would sharpen the story.";
  }

  return {
    score,
    headline,
    tone,
    body,
    bullets: [
      `Based on the latest ${latestThree.length} saved check-in${latestThree.length === 1 ? "" : "s"}, not the entire history log.`,
      `${cautionCount} of the latest ${latestThree.length} entr${latestThree.length === 1 ? "y" : "ies"} triggered higher-caution language.`,
      `Average distance from a Bristol 4-style baseline: ${averageDistanceFromBaseline.toFixed(1)} step${averageDistanceFromBaseline.toFixed(1) === "1.0" ? "" : "s"}.`,
    ],
  };
}

function buildRecoveryOutlook(history) {
  if (!history.length) {
    return {
      title: "Recovery outlook unavailable",
      tone: "bg-stone-50 text-stone-900",
      body: "Save a few check-ins and Stool Scout can start saying whether the recent story looks like recovery, wobble, or deterioration.",
      bullets: [
        "At least two or three entries make the trend language more believable.",
        "Recovery framing should come from patterns, not from a single reassuring result card.",
      ],
    };
  }

  if (history.length === 1) {
    return {
      title: "Only one data point so far",
      tone: "bg-stone-50 text-stone-900",
      body: "The tracker has a current state, but not enough movement yet to call this recovery or deterioration.",
      bullets: [
        "Save the next check-in under similar conditions so the comparison is cleaner.",
        "If symptoms intensify before then, escalate based on symptoms rather than waiting for a prettier trend line.",
      ],
    };
  }

  const latest = history[0];
  const previous = history[1];
  const latestType = Number(latest.bristolTypeId || 0);
  const previousType = Number(previous.bristolTypeId || 0);
  const latestDistanceFromBaseline = Math.abs(4 - latestType);
  const previousDistanceFromBaseline = Math.abs(4 - previousType);
  const cautionDelta = Number(latest.shouldTalkToDoctor) - Number(previous.shouldTalkToDoctor);
  const typeDelta = latestType - previousType;
  const movingTowardBaseline = latestDistanceFromBaseline < previousDistanceFromBaseline;
  const movingAwayFromBaseline = latestDistanceFromBaseline > previousDistanceFromBaseline;

  if (!latest.shouldTalkToDoctor && previous.shouldTalkToDoctor && movingTowardBaseline) {
    return {
      title: "Looks like early recovery",
      tone: "bg-emerald-50 text-emerald-950",
      body: "The latest saved check-in is less extreme and lower-caution than the one before it, so the tracker can credibly frame this as things settling rather than just sounding optimistic.",
      bullets: [
        `Recent movement: Bristol ${previousType} → ${latestType} from ${formatSavedAt(previous.savedAt)} to ${formatSavedAt(latest.savedAt)}.`,
        "One calmer entry is encouraging, but the next save should confirm the pattern before the app declares victory.",
      ],
    };
  }

  if (cautionDelta > 0 || (latest.shouldTalkToDoctor && movingAwayFromBaseline)) {
    return {
      title: "Looks like deterioration",
      tone: "bg-rose-50 text-rose-950",
      body: "The newest saved entry is more concerning than the one before it, so the tracker should tighten its language and lower the bar for escalation.",
      bullets: [
        latest.shouldTalkToDoctor && !previous.shouldTalkToDoctor
          ? "The trend moved from lower-caution into higher-caution territory."
          : `The stool-form trend moved farther away from a Bristol 4-style baseline (${previousType} → ${latestType}).`,
        "If the next entry stays rough or adds stronger symptoms, stop treating this as routine monitoring.",
      ],
    };
  }

  if (!latest.shouldTalkToDoctor && !previous.shouldTalkToDoctor && movingTowardBaseline) {
    return {
      title: "Settling toward baseline",
      tone: "bg-blue-50 text-blue-950",
      body: "Recent saved entries are moving closer to a middle Bristol range without adding caution language, which supports a calmer follow-up story.",
      bullets: [
        `Recent movement: Bristol ${previousType} → ${latestType}.`,
        "Keep the next check-in quick and comparable so the app can confirm whether the calmer pattern is holding.",
      ],
    };
  }

  if (!latest.shouldTalkToDoctor && !previous.shouldTalkToDoctor && movingAwayFromBaseline) {
    return {
      title: "Drifting away from baseline",
      tone: "bg-amber-50 text-amber-950",
      body: "The newest saved entry is still lower-caution, but it is moving farther from a middle-range baseline, so the tracker should encourage another follow-up instead of sounding fully resolved.",
      bullets: [
        `Recent movement: Bristol ${previousType} → ${latestType}.`,
        "This is not a panic signal, but it is enough movement that the next entry matters more than a one-off reassuring read.",
      ],
    };
  }

  return {
    title: typeDelta === 0 ? "Holding the same pattern" : "Mixed recovery signal",
    tone: typeDelta === 0 ? "bg-stone-50 text-stone-900" : "bg-violet-50 text-violet-950",
    body:
      typeDelta === 0
        ? "The last two saved entries look very similar, so the tracker should frame this as an ongoing pattern that still needs one more confirming save."
        : "The recent story is mixed: not clearly improving, but not sharply worsening either, so the right next step is another comparable check-in soon.",
    bullets: [
      `Latest two entries: Bristol ${previousType} → ${latestType} · ${previous.shouldTalkToDoctor ? "higher" : "lower"}-caution to ${latest.shouldTalkToDoctor ? "higher" : "lower"}-caution.`,
      "Use notes to capture likely drivers so the next trend read has more context.",
    ],
  };
}

function buildFollowUpWindow(history) {
  if (!history.length) {
    return {
      title: "No follow-up window yet",
      tone: "bg-stone-50 text-stone-900",
      body: "Save a couple of check-ins and Stool Scout can turn the recent trend into a concrete suggestion for when to log again.",
      badges: ["Need history", "No cadence yet"],
      bullets: [
        "The best follow-up timing depends on both the current trend and how often entries have been logged recently.",
        "Comparable follow-up timing makes the tracker story feel more product-like and less random.",
      ],
    };
  }

  const latest = history[0];

  if (history.length === 1) {
    return {
      title: "Log one more comparable check-in soon",
      tone: latest.shouldTalkToDoctor ? "bg-amber-50 text-amber-950" : "bg-blue-50 text-blue-950",
      body: latest.shouldTalkToDoctor
        ? "There is only one saved entry so far, and it is higher-caution. The tracker should recommend another check-in soon rather than waiting too long for a second data point."
        : "There is only one saved entry so far, so the app should encourage a second comparable log soon to establish a believable baseline.",
      badges: [latest.shouldTalkToDoctor ? "Sooner follow-up" : "Build baseline", "1 saved entry"],
      bullets: [
        latest.shouldTalkToDoctor
          ? "A second nearby entry helps show whether this was a one-off spike or the start of a repeated rough patch."
          : "One more nearby entry is enough to start turning the tracker into a pattern instead of a single snapshot.",
        `Latest save: ${formatSavedAt(latest.savedAt)} · ${latest.shouldTalkToDoctor ? "higher" : "lower"}-caution.`,
      ],
    };
  }

  const recentWindow = history.slice(0, 4);
  const intervalsHours = [];

  for (let index = 0; index < recentWindow.length - 1; index += 1) {
    const newer = new Date(recentWindow[index].savedAt).getTime();
    const older = new Date(recentWindow[index + 1].savedAt).getTime();
    intervalsHours.push(Math.max(1, Math.round((newer - older) / (1000 * 60 * 60))));
  }

  const averageIntervalHours =
    intervalsHours.reduce((sum, value) => sum + value, 0) / intervalsHours.length;
  const cautionCount = recentWindow.filter((item) => item.shouldTalkToDoctor).length;
  const latestType = Number(latest.bristolTypeId || 0);
  const latestDistance = Math.abs(4 - latestType);
  const previousType = Number(history[1]?.bristolTypeId || latestType);
  const previousDistance = Math.abs(4 - previousType);
  const movingTowardBaseline = latestDistance < previousDistance;
  const movingAwayFromBaseline = latestDistance > previousDistance;

  let recommendedHours = Math.round(averageIntervalHours);
  let title = "Keep roughly the current logging cadence";
  let tone = "bg-emerald-50 text-emerald-950";
  let body = "Recent saves look steady enough that the tracker can recommend following up on about the same cadence instead of tightening or stretching the interval.";

  if (cautionCount >= 2 || latest.shouldTalkToDoctor) {
    recommendedHours = Math.max(6, Math.min(recommendedHours, 18));
    title = "Tighten the next follow-up window";
    tone = "bg-rose-50 text-rose-950";
    body = "Recent saves are carrying enough caution that the tracker should recommend a sooner follow-up rather than assuming this can sit for days.";
  } else if (movingAwayFromBaseline || latestDistance >= 2) {
    recommendedHours = Math.max(12, Math.min(recommendedHours, 24));
    title = "Check back within the next day";
    tone = "bg-amber-50 text-amber-950";
    body = "The recent pattern is drifting away from a middle-range baseline, so the right next move is another nearby check-in instead of a long gap.";
  } else if (movingTowardBaseline && cautionCount === 0) {
    recommendedHours = Math.max(24, Math.min(Math.round(averageIntervalHours * 1.25), 48));
    title = "Recovery trend can breathe a bit";
    tone = "bg-blue-50 text-blue-950";
    body = "The recent pattern looks like it is settling, so the tracker can afford a slightly looser follow-up window while still keeping the recovery story honest.";
  }

  return {
    title,
    tone,
    body,
    badges: [`Next check-in ~${recommendedHours}h`, `Avg recent cadence ${Math.round(averageIntervalHours)}h`],
    bullets: [
      `${cautionCount} of the latest ${recentWindow.length} saved entr${recentWindow.length === 1 ? "y" : "ies"} were higher-caution.`,
      movingTowardBaseline
        ? `Recent stool form is moving toward a Bristol 4-style baseline (${previousType} → ${latestType}).`
        : movingAwayFromBaseline
          ? `Recent stool form is moving away from a Bristol 4-style baseline (${previousType} → ${latestType}).`
          : `Recent stool form held at Bristol ${latestType} across the latest two saves.`,
      `Latest save was ${formatSavedAt(latest.savedAt)}, so the tracker has enough timing context to suggest a realistic next follow-up window.`,
    ],
  };
}

function buildDriverAwareNextStep(history) {
  if (!history.length) {
    return {
      title: "No next-step recommendation yet",
      tone: "bg-stone-50 text-stone-900",
      body: "Save a few check-ins and Stool Scout can turn repeated context into a clearer follow-up recommendation.",
      bullets: [
        "Repeated notes about travel, hydration, food, or stress become more useful once there is a short pattern to compare.",
        "The goal is follow-up guidance, not fake diagnosis.",
      ],
    };
  }

  const latest = history[0];
  const driverSignals = getHistoryDriverSignals(history);
  const primaryDriver = driverSignals[0] ?? null;
  const cautionCount = history.filter((item) => item.shouldTalkToDoctor).length;
  const latestType = Number(latest.bristolTypeId || 0);

  if (cautionCount >= 2) {
    return {
      title: "Escalate beyond casual tracking",
      tone: "bg-rose-50 text-rose-950",
      body: "Recent saved history is carrying repeated caution signals, so the next step should sound firmer than routine self-monitoring.",
      bullets: [
        "Use the next check-in to confirm whether the rough patch is still active, not to keep reinterpreting the same concern forever.",
        primaryDriver
          ? `Context signal to mention: ${primaryDriver.label.toLowerCase()}.`
          : "If symptoms keep stacking, lower the bar for real follow-up.",
      ],
    };
  }

  if (primaryDriver?.id === "hydration-routine") {
    return {
      title: "Test the routine-reset hypothesis",
      tone: "bg-blue-50 text-blue-950",
      body: "The strongest repeated context signal is hydration or routine disruption, so the cleanest next step is a comparable re-check after water, food timing, and schedule stabilize.",
      bullets: [
        "Make the next entry under a more normal routine if possible so the trend is easier to trust.",
        latestType <= 3
          ? "Because the recent pattern is on the firmer side, hydration and routine notes matter even more in the next save."
          : "Even if this looks calmer, confirm that the routine reset actually changed the pattern.",
      ],
    };
  }

  if (primaryDriver?.id === "travel") {
    return {
      title: "See if the pattern settles after travel",
      tone: "bg-violet-50 text-violet-950",
      body: "Travel keeps showing up in saved notes, so the tracker should frame the next check-in as a post-travel comparison rather than treating the recent pattern as random.",
      bullets: [
        "A check-in after getting back to normal meals, sleep, and bathroom routine will make the story more believable.",
        "If the pattern does not settle once the travel context is gone, escalate faster than you would for a one-off travel wobble.",
      ],
    };
  }

  if (primaryDriver?.id === "food-trigger") {
    return {
      title: "Pressure-test the likely food trigger",
      tone: "bg-amber-50 text-amber-950",
      body: "Saved notes keep pointing at meal changes or common gut triggers, so the next product move is a cleaner follow-up after simpler food rather than vague trend-watching.",
      bullets: [
        "Use the next save to compare against a calmer meal window if possible.",
        latest.shouldTalkToDoctor
          ? "Because the latest result is already higher-caution, do not let 'maybe food' become an excuse to ignore worsening symptoms."
          : "If the next check-in still looks off after a cleaner food window, the tracker story gets stronger.",
      ],
    };
  }

  if (primaryDriver?.id === "stress") {
    return {
      title: "Keep context attached to the next save",
      tone: "bg-indigo-50 text-indigo-950",
      body: "Stress-style language is repeating in the notes, so the app should keep asking for context instead of pretending the pattern can be understood from stool form alone.",
      bullets: [
        "The next entry is most useful if it captures whether the stress context eased, stayed high, or got worse.",
        "That makes the tracker feel more honest and more product-like than a bare Bristol trend line.",
      ],
    };
  }

  if (primaryDriver?.id === "illness") {
    return {
      title: "Track whether the bug-style pattern resolves quickly",
      tone: latest.shouldTalkToDoctor ? "bg-rose-50 text-rose-950" : "bg-amber-50 text-amber-950",
      body: "Recent notes sound illness-like, so the right follow-up is a near-term check on whether the pattern resolves rather than a long-gap wellness check.",
      bullets: [
        "Short-term bug patterns should calm down; if they do not, the tracker should stop sounding casual.",
        "If stronger symptoms keep showing up, escalate beyond tracker-only guidance.",
      ],
    };
  }

  return {
    title: latest.shouldTalkToDoctor ? "Close follow-up matters most" : "Keep building a clean baseline",
    tone: latest.shouldTalkToDoctor ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-950",
    body: latest.shouldTalkToDoctor
      ? "The latest save is still caution-leaning, so the next recommendation should focus on confirming or escalating the pattern instead of treating it like a harmless blip."
      : "The tracker has enough signal to suggest another comparable check-in and keep building a believable baseline.",
    bullets: latest.shouldTalkToDoctor
      ? [
          "Use the next save to test whether this was isolated or part of a repeated rough patch.",
          "If new red-flag symptoms show up, shift from tracker language to real follow-up.",
        ]
      : [
          "A nearby comparable save makes future outliers easier to explain honestly.",
          "Add one line of context in notes so the trend stays useful outside the UI.",
        ],
  };
}

function buildSavedHandoffSummary(highlightedEntry, previousEntry) {
  if (!highlightedEntry) {
    return null;
  }

  const savedCountBadge = `Saved ${formatSavedAt(highlightedEntry.savedAt)}`;

  if (!previousEntry) {
    return {
      title: "Baseline captured — now the tracker is real",
      body: "This first saved check-in turns Stool Scout from a single result into a tracker with an actual baseline to compare against next time.",
      badges: [savedCountBadge, "Baseline started"],
      bullets: [
        `Newest save: ${highlightedEntry.stoolTypeLabel}: ${highlightedEntry.stoolTypeName} with ${highlightedEntry.colorLabel.toLowerCase()} color framing.`,
        "The fastest next move is to reuse this save as a follow-up draft so the second check-in feels continuous on mobile.",
      ],
    };
  }

  const latestType = Number(highlightedEntry.bristolTypeId || 0);
  const previousType = Number(previousEntry.bristolTypeId || 0);
  const typeDelta = latestType - previousType;
  const cautionShift =
    highlightedEntry.shouldTalkToDoctor === previousEntry.shouldTalkToDoctor
      ? highlightedEntry.shouldTalkToDoctor
        ? "Caution stayed elevated versus the prior save."
        : "Caution stayed calmer than the higher-alert threshold."
      : highlightedEntry.shouldTalkToDoctor
        ? "This newest save raised the caution level versus the prior entry."
        : "This newest save lowered the caution level versus the prior entry.";

  const stoolShift =
    typeDelta === 0
      ? `Stool form held steady at ${highlightedEntry.stoolTypeLabel}.`
      : `Stool form moved ${Math.abs(typeDelta)} Bristol step${Math.abs(typeDelta) === 1 ? "" : "s"} ${typeDelta > 0 ? "looser" : "firmer"} versus the prior save.`;

  const colorShift =
    highlightedEntry.colorLabel === previousEntry.colorLabel
      ? `Color read held at ${highlightedEntry.colorLabel}.`
      : `Color read changed ${previousEntry.colorLabel} → ${highlightedEntry.colorLabel}.`;

  return {
    title: "Newest save changed the tracker story",
    body: "The latest check-in is now doing real work: it updates the baseline, changes the comparison story, and gives the next follow-up draft something concrete to anchor to.",
    badges: [savedCountBadge, previousEntry.shouldTalkToDoctor || highlightedEntry.shouldTalkToDoctor ? "Caution compared" : "Baseline compared"],
    bullets: [stoolShift, colorShift, cautionShift],
  };
}

function buildReuseHistoryBridge(item, history) {
  if (!item) {
    return null;
  }

  const itemIndex = history.findIndex((candidate) => candidate.id === item.id);
  const previousEntry = itemIndex >= 0 ? history[itemIndex + 1] ?? null : null;
  const savedHandoffSummary = buildSavedHandoffSummary(item, previousEntry);

  if (!savedHandoffSummary) {
    return null;
  }

  return {
    title: previousEntry ? "Carrying the saved comparison into this draft" : "Carrying the saved baseline into this draft",
    body: previousEntry
      ? `This follow-up draft is anchored to the exact tracker comparison created when ${formatSavedAt(item.savedAt)} was saved, so the describe step keeps the same story alive before you run analysis again.`
      : `This follow-up draft is anchored to the first saved baseline from ${formatSavedAt(item.savedAt)}, so the describe step keeps the tracker story intact instead of resetting to a blank form.`,
    badges: [...savedHandoffSummary.badges, "Reuse bridge"].slice(0, 3),
    bullets: previousEntry
      ? [
          ...savedHandoffSummary.bullets,
          "Update only what changed so the next result can directly prove whether that saved comparison story is still true.",
        ].slice(0, 4)
      : [
          ...savedHandoffSummary.bullets,
          "The next result should either confirm the new baseline or show the first real deviation from it.",
        ].slice(0, 4),
  };
}

function buildResultSnapshot(result) {
  if (!result?.stoolType || !result?.color) {
    return null;
  }

  const ifThenLine = result.shouldTalkToDoctor
    ? "Because this check-in has stronger caution signals, the right move is faster follow-up instead of casually trend-watching it for days."
    : "Because this check-in looks more routine, the right move is simple tracking and light course-correction instead of panic.";

  return {
    headline: `${result.urgencyLabel} — ${result.stoolType.label}`,
    plainEnglish: `${result.stoolType.name} with a ${result.color.label.toLowerCase()} color read. ${result.stoolType.summary}`,
    ifThenLine,
  };
}

function buildWhyThisResult(result) {
  if (!result?.stoolType || !result?.color) {
    return null;
  }

  const topReasons = result.reasoningBullets?.length
    ? result.reasoningBullets.slice(0, 4)
    : [
        `The app landed on ${result.stoolType.label} based on the selected stool form and ${result.color.label.toLowerCase()} color read.`,
      ];

  const cautionSummary = result.cautionReasons?.length
    ? `Main caution drivers: ${result.cautionReasons.join(" · ")}.`
    : "No extra caution drivers were triggered beyond the stool form and color pattern in this check-in.";

  return {
    headline: result.shouldTalkToDoctor
      ? "Why the app is staying more cautious"
      : "Why the app is not overreacting",
    body: cautionSummary,
    bullets: topReasons,
    notesLine: result.notesSummary,
  };
}

function buildActionLadder(result) {
  if (!result) {
    return [];
  }

  const firstStep = result.todayPlan[0] ?? "Log this check-in and note anything unusual about food, stress, travel, or timing.";
  const secondStep = result.monitorPlan[0] ?? "Watch the next bowel movement or two so the app can compare a pattern instead of a single snapshot.";
  const thirdStep = result.followUpPlan[0] ?? "If the same pattern keeps showing up, escalate from one-off checking to actual follow-up.";

  return [
    {
      title: "Do now",
      body: firstStep,
      tone: "bg-stone-50 text-stone-900",
    },
    {
      title: "Watch next",
      body: secondStep,
      tone: "bg-blue-50 text-blue-950",
    },
    {
      title: result.shouldTalkToDoctor ? "Escalate if needed" : "If it repeats",
      body: thirdStep,
      tone: result.shouldTalkToDoctor ? "bg-rose-50 text-rose-950" : "bg-emerald-50 text-emerald-950",
    },
  ];
}

function buildFollowUpComparison(previousEntry, result, sourceLabel = "last saved check-in") {
  if (!previousEntry || !result?.stoolType || !result?.color) {
    return null;
  }

  const previousType = Number(previousEntry.bristolTypeId || 0);
  const currentType = Number(result.stoolType.id || 0);
  const stoolDelta = currentType - previousType;
  const cautionChanged = Boolean(result.shouldTalkToDoctor) !== Boolean(previousEntry.shouldTalkToDoctor);
  const colorChanged = previousEntry.colorLabel !== result.color.label;
  const gapLabel = formatRelativeGap(previousEntry.savedAt, new Date().toISOString());

  let headline = `Very similar to the ${sourceLabel}`;
  let tone = "bg-emerald-50 text-emerald-950";
  let body = `Compared with the ${sourceLabel} from ${formatSavedAt(previousEntry.savedAt)}, this result is landing in roughly the same zone.`;

  if (stoolDelta >= 2) {
    headline = `Noticeably looser than the ${sourceLabel}`;
    tone = "bg-amber-50 text-amber-950";
    body = `This result is ${stoolDelta} Bristol steps looser than the ${sourceLabel} from ${formatSavedAt(previousEntry.savedAt)}, so the app should frame it as a meaningful shift instead of business as usual.`;
  } else if (stoolDelta <= -2) {
    headline = `Noticeably firmer than the ${sourceLabel}`;
    tone = "bg-amber-50 text-amber-950";
    body = `This result is ${Math.abs(stoolDelta)} Bristol steps firmer than the ${sourceLabel} from ${formatSavedAt(previousEntry.savedAt)}, which points more toward constipation-style follow-up than a steady repeat.`;
  } else if (cautionChanged && result.shouldTalkToDoctor) {
    headline = `Escalated versus the ${sourceLabel}`;
    tone = "bg-rose-50 text-rose-950";
    body = `The ${sourceLabel} was lower-caution, but this check-in crossed into stronger caution language, so the tracker should encourage faster follow-up.`;
  } else if (cautionChanged && previousEntry.shouldTalkToDoctor) {
    headline = `Less concerning than the ${sourceLabel}`;
    tone = "bg-emerald-50 text-emerald-950";
    body = `This check-in looks lower-caution than the ${sourceLabel}, which supports a recovery-style follow-up story instead of an escalation story.`;
  } else if (stoolDelta === 1) {
    headline = `Slightly looser than the ${sourceLabel}`;
    tone = "bg-blue-50 text-blue-950";
    body = `This result moved one Bristol step looser than the ${sourceLabel}, so it is worth watching without overreacting.`;
  } else if (stoolDelta === -1) {
    headline = `Slightly firmer than the ${sourceLabel}`;
    tone = "bg-blue-50 text-blue-950";
    body = `This result moved one Bristol step firmer than the ${sourceLabel}, which can still fit a mild day-to-day shift.`;
  }

  const bullets = [
    `${sourceLabel.charAt(0).toUpperCase() + sourceLabel.slice(1)}: ${previousEntry.stoolTypeLabel} · ${previousEntry.colorLabel} · ${previousEntry.shouldTalkToDoctor ? "higher caution" : "lower caution"}.`,
    `Current: ${result.stoolType.label} · ${result.color.label} · ${result.shouldTalkToDoctor ? "higher caution" : "lower caution"}.`,
    colorChanged
      ? `Color changed from ${previousEntry.colorLabel} to ${result.color.label}.`
      : `Color stayed the same at ${result.color.label}.`,
  ];

  const metrics = [
    {
      label: "Time since baseline",
      value: gapLabel,
    },
    {
      label: "Stool-form shift",
      value:
        stoolDelta === 0
          ? "No change"
          : `${Math.abs(stoolDelta)} step${Math.abs(stoolDelta) === 1 ? "" : "s"} ${stoolDelta > 0 ? "looser" : "firmer"}`,
    },
    {
      label: "Caution shift",
      value: cautionChanged
        ? `${previousEntry.shouldTalkToDoctor ? "Higher → lower" : "Lower → higher"}`
        : `${result.shouldTalkToDoctor ? "Still higher" : "Still lower"}`,
    },
  ];

  return { headline, tone, body, bullets, metrics, sourceLabel };
}

function buildSavedFollowUpPrompt(result, followUpComparison, followUpWindow, driverAwareNextStep) {
  if (!result?.stoolType || !result?.color) {
    return null;
  }

  let title = "Next draft should test whether this holds";
  let body = "Now that this result is saved, the fastest honest follow-up is a nearby repeat check-in that confirms whether this was a one-off or the start of a real pattern.";
  let badges = [result.shouldTalkToDoctor ? "Soon follow-up" : "Tracker repeat", result.stoolType.label];
  let bullets = [
    `Try to log the next comparable check-in while the current context is still fresh (${result.recheckWindow.toLowerCase()}).`,
    `Keep watching ${result.stoolType.name.toLowerCase()} with ${result.color.label.toLowerCase()} color framing so the tracker can confirm whether this same pattern repeats.`,
    result.shouldTalkToDoctor
      ? "If symptoms stack or the next entry still looks rough, lower the bar for real follow-up instead of repeated self-checks."
      : "If the next entry moves back toward a middle-range Bristol pattern, the recovery story gets more believable.",
  ];

  if (followUpComparison) {
    const stoolShift = followUpComparison.metrics?.find((metric) => metric.label === "Stool-form shift")?.value;
    const cautionShift = followUpComparison.metrics?.find((metric) => metric.label === "Caution shift")?.value;
    const timeSinceBaseline = followUpComparison.metrics?.find((metric) => metric.label === "Time since baseline")?.value;

    if (followUpComparison.headline.includes("Escalated")) {
      title = "Next draft should test whether the escalation is repeating";
      body = "This save pushed the story into a higher-caution lane, so the next draft should quickly confirm whether that sharper result was a blip or a real trend.";
      badges = ["Escalation check", timeSinceBaseline ?? "Recent baseline"];
      bullets = [
        `Baseline shift to re-test: ${cautionShift ?? "Lower → higher"}.`,
        `Form change worth checking again: ${stoolShift ?? "Meaningful shift from baseline"}.`,
        "If the next check-in is still higher-caution, the app should sound firmer and less like casual monitoring.",
      ];
    } else if (followUpComparison.headline.includes("Less concerning")) {
      title = "Next draft should test whether recovery is real";
      body = "This save looks calmer than the earlier baseline, but the next draft should prove that the improvement is holding instead of declaring victory off one better check-in.";
      badges = ["Recovery check", timeSinceBaseline ?? "Recent baseline"];
      bullets = [
        `Baseline shift to re-test: ${cautionShift ?? "Higher → lower"}.`,
        `Form change worth confirming: ${stoolShift ?? "Movement back toward baseline"}.`,
        "If the next check-in stays calmer, the tracker earns a stronger recovery-style story.",
      ];
    } else if (followUpComparison.headline.includes("looser") || followUpComparison.headline.includes("firmer")) {
      title = `Next draft should test whether the ${followUpComparison.headline.toLowerCase()} shift sticks`;
      body = "This save changed the baseline enough that the next draft should focus on whether the form shift keeps moving in the same direction or starts settling back.";
      badges = [stoolShift ?? "Form shift", timeSinceBaseline ?? "Recent baseline"];
      bullets = [
        `Specific shift to test: ${stoolShift ?? "Changed from the prior baseline"}.`,
        `Color context to watch: ${result.color.label}.`,
        result.shouldTalkToDoctor
          ? "If the next save is still off-baseline with caution language, the tracker should push a sooner follow-up window."
          : "If the next save drifts back toward baseline, the result story can sound steadier without overpromising.",
      ];
    } else if (followUpComparison.headline.includes("Very similar")) {
      title = "Next draft should test whether this stable pattern is real";
      body = "This save lines up closely with the baseline, so the next draft should simply confirm whether the app is seeing a genuinely steady pattern instead of one lucky repeat.";
      badges = ["Stability check", timeSinceBaseline ?? "Recent baseline"];
      bullets = [
        `Baseline comparison: ${stoolShift ?? "No major stool-form change"}.`,
        `Caution state: ${cautionShift ?? "Still similar to baseline"}.`,
        "Another nearby repeat turns this from a one-off save into a believable trend line.",
      ];
    }
  }

  if (followUpWindow?.title) {
    badges = [...badges, ...(followUpWindow.badges?.slice(0, 1) ?? [])].slice(0, 3);
    bullets = [
      ...bullets,
      `Timing target: ${followUpWindow.title.toLowerCase()}.`,
    ].slice(0, 4);
  }

  if (driverAwareNextStep?.title) {
    bullets = [
      ...bullets,
      `Primary follow-up angle: ${driverAwareNextStep.title.toLowerCase()}.`,
    ].slice(0, 4);
  }

  return { title, body, badges, bullets };
}

function buildFollowUpDraftReadiness(reusedHistoryItem, form, selectedFile, followUpMission) {
  if (!reusedHistoryItem) {
    return null;
  }

  const currentColorLabel = COLOR_OPTIONS.find((color) => color.value === form.colorValue)?.label ?? "";
  const changeCount = [
    Number(reusedHistoryItem.bristolTypeId || 0) !== Number(form.bristolTypeId || 0),
    reusedHistoryItem.colorLabel !== currentColorLabel,
    JSON.stringify([...(reusedHistoryItem.flags ?? [])].sort()) !== JSON.stringify([...(form.flags ?? [])].sort()),
    (reusedHistoryItem.notes ?? "").trim() !== form.notes.trim(),
  ].filter(Boolean).length;
  const needsFreshPhoto = reusedHistoryItem.hasPhoto;
  const hasFreshPhoto = Boolean(selectedFile);
  const draftChanged = changeCount > 0;
  const missionLoaded = Boolean(followUpMission);
  const readyToAnalyze = draftChanged && (!needsFreshPhoto || hasFreshPhoto);

  const checklist = [
    {
      label: "Baseline loaded from saved history",
      detail: `Reusing ${reusedHistoryItem.stoolTypeLabel}: ${reusedHistoryItem.stoolTypeName} from ${formatSavedAt(reusedHistoryItem.savedAt)}.`,
      done: true,
    },
    {
      label: needsFreshPhoto ? "Attach a fresh photo" : "Photo step optional for this draft",
      detail: needsFreshPhoto
        ? hasFreshPhoto
          ? `Fresh photo attached: ${selectedFile?.name ?? "Ready for photo-to-photo comparison"}.`
          : "The saved baseline had a photo, so a fresh image keeps this repeat check-in story honest."
        : "The baseline was describe-only, so guided inputs alone are still a complete follow-up flow.",
      done: !needsFreshPhoto || hasFreshPhoto,
      actionKey: needsFreshPhoto && !hasFreshPhoto ? "photo" : "",
      actionLabel: needsFreshPhoto && !hasFreshPhoto ? "Add photo now" : "",
    },
    {
      label: draftChanged ? "Draft now differs from the saved baseline" : "Update at least one field before analysis",
      detail: draftChanged
        ? `${changeCount} meaningful draft change${changeCount === 1 ? "" : "s"} detected across stool form, color, flags, or notes.`
        : "Right now the follow-up draft still mirrors the saved entry too closely to tell a useful comparison story.",
      done: draftChanged,
      actionKey: !draftChanged ? "draft" : "",
      actionLabel: !draftChanged ? "Edit draft now" : "",
    },
    {
      label: missionLoaded ? "Next-step mission is attached" : "Mission will appear after the result is saved",
      detail: missionLoaded
        ? `${followUpMission.title}.`
        : "The result flow can still work now, but the save step is what turns it into a concrete tracker mission.",
      done: missionLoaded,
    },
  ];

  const doneCount = checklist.filter((item) => item.done).length;
  const nextMissingAction = checklist.find((item) => !item.done && item.actionKey)?.actionKey ?? "";
  const nextMissingActionLabel = checklist.find((item) => !item.done && item.actionLabel)?.actionLabel ?? "";

  return {
    title: readyToAnalyze ? "Follow-up draft is ready to analyze" : "Follow-up draft still needs one more move",
    tone: readyToAnalyze ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950",
    body: readyToAnalyze
      ? "The saved baseline, current draft edits, and photo state now line up cleanly enough for a real repeat-check-in comparison."
      : needsFreshPhoto && !hasFreshPhoto
        ? "Add a fresh photo or keep editing the draft before analysis so the next result feels like a true follow-up instead of a duplicate rerun."
        : "Make one meaningful draft change before analysis so the result screen has a real comparison to explain.",
    progressLabel: `${doneCount}/${checklist.length} follow-up steps ready`,
    readyToAnalyze,
    checklist,
    nextMissingAction,
    nextMissingActionLabel,
  };
}

function buildFollowUpDraftCoach(reusedHistoryItem, form, selectedFile, history = []) {
  if (!reusedHistoryItem) {
    return null;
  }

  const changeCount = [
    Number(reusedHistoryItem.bristolTypeId || 0) !== Number(form.bristolTypeId || 0),
    reusedHistoryItem.colorLabel !== (COLOR_OPTIONS.find((color) => color.value === form.colorValue)?.label ?? ""),
    JSON.stringify([...(reusedHistoryItem.flags ?? [])].sort()) !== JSON.stringify([...(form.flags ?? [])].sort()),
    (reusedHistoryItem.notes ?? "").trim() !== form.notes.trim(),
  ].filter(Boolean).length;
  const recentCautionCount = history.slice(0, 4).filter((item) => item.shouldTalkToDoctor).length;
  const roughRecentTrend = recentCautionCount >= 2 || reusedHistoryItem.shouldTalkToDoctor;

  if (reusedHistoryItem.hasPhoto && !selectedFile) {
    return {
      title: roughRecentTrend ? "Add a fresh photo before analyzing this rough-trend follow-up" : "Re-attach a fresh photo before you run the follow-up",
      tone: roughRecentTrend ? "bg-rose-50 text-rose-950" : "bg-violet-50 text-violet-950",
      body: roughRecentTrend
        ? "The saved baseline already sits inside a rougher recent trend, so running this follow-up without a new photo weakens the strongest before/after evidence the product can show. Attach a fresh photo if you want the repeat-check-in story to feel credible."
        : "The reused check-in had a photo attached, but this new draft does not yet. For the cleanest product story, add a fresh photo if you want this follow-up to feel like a real repeat check-in instead of a note-only update.",
      bullets: [
        roughRecentTrend
          ? `${recentCautionCount} of the last ${Math.min(history.length, 4)} saved entr${Math.min(history.length, 4) === 1 ? "y" : "ies"} already carried higher-caution language, so this is exactly when a fresh image matters more.`
          : "You do not need the old image — a new photo is the honest way to compare the next check-in.",
        changeCount > 0
          ? `${changeCount} field${changeCount === 1 ? "" : "s"} already changed in the draft, so this is shaping into a true follow-up instead of a duplicate save.`
          : "Right now the draft still matches the reused save closely, so either add a fresh photo or update what changed before analyzing.",
      ],
    };
  }

  if (changeCount === 0) {
    return {
      title: "Update what changed before analyzing",
      tone: "bg-amber-50 text-amber-950",
      body: "This follow-up draft still mirrors the reused save almost exactly. Adjust the stool type, color, flags, or notes so the comparison tells a real story instead of replaying the same entry.",
      bullets: [
        "Even one small update makes the follow-up comparison read more honestly in the result screen.",
        reusedHistoryItem.hasPhoto
          ? "If this is another photo-first check-in, adding a fresh image will make the repeat-check-in flow feel much more believable."
          : "If this is a no-photo follow-up, add a note about what changed since the last save.",
      ],
    };
  }

  return {
    title: "This draft is ready for a real comparison",
    tone: "bg-emerald-50 text-emerald-950",
    body: `This follow-up draft already differs from the reused save in ${changeCount} place${changeCount === 1 ? "" : "s"}, so the result screen should have enough movement to compare against the last entry meaningfully.`,
    bullets: [
      reusedHistoryItem.hasPhoto && !selectedFile
        ? "Add a fresh photo if you want to keep the story photo-first all the way through."
        : selectedFile
          ? "A fresh photo is attached, which helps the repeat-check-in flow feel complete."
          : "No photo is attached, but the structured changes are enough for a clean follow-up demo.",
      "After analysis, use the comparison card to explain how this entry moved relative to the saved baseline.",
    ],
  };
}

function buildFollowUpQuickFillOptions(reusedHistoryItem, form, history = []) {
  if (!reusedHistoryItem) {
    return [];
  }

  const options = [];
  const lowerNotes = form.notes.toLowerCase();
  const currentType = Number(form.bristolTypeId || reusedHistoryItem.bristolTypeId || 4);
  const baselineType = Number(reusedHistoryItem.bristolTypeId || 4);
  const hasUrgentFlag = form.flags.includes("urgent");
  const hasPersistentFlag = form.flags.includes("persistent");
  const driverSignals = getHistoryDriverSignals(history);
  const dominantDriver = driverSignals[0]?.id ?? "";
  const dominantDriverLabel = driverSignals[0]?.label ?? "Recent history pattern";
  const cautionCount = history.filter((item) => item.shouldTalkToDoctor).length;
  const inCautionPatch = cautionCount >= 2 || reusedHistoryItem.shouldTalkToDoctor;
  const quickFillWhy = {
    baselineShift: `Why it showed up: the reused baseline was Bristol ${baselineType}, so Stool Scout is offering a one-tap form shift instead of making you edit the draft from scratch.`,
    settling: `Why it showed up: the draft is still on the rougher side versus the saved baseline, so a recovery-style tap helps test whether things are actually calming down.`,
    driver: `Why it showed up: recent saved notes keep clustering around ${dominantDriverLabel.toLowerCase()}, so the draft can reuse that context without retyping it.`,
    caution: `Why it showed up: ${cautionCount} recent saved entr${cautionCount === 1 ? "y" : "ies"} already used stronger caution language, so the follow-up draft should be able to escalate fast in one tap.`,
    fallback: "Why it showed up: this keeps the repeat-check-in story moving even if the recent history is not strong enough to pick a smarter pattern-specific edit yet.",
  };

  if (currentType <= 4) {
    options.push({
      id: "looser-shift",
      label: "Mark looser",
      description: "Nudge the draft one Bristol step looser and note that today looks rougher than baseline.",
      why: quickFillWhy.baselineShift,
      apply(currentForm) {
        const nextType = Math.min(7, Math.max(currentType + 1, 5));

        return {
          ...currentForm,
          bristolTypeId: nextType,
          notes: appendQuickFillNote(currentForm.notes, "Looser than the last saved check-in today."),
        };
      },
    });
  }

  if (currentType >= 5 && currentType >= baselineType) {
    options.push({
      id: "settling-down",
      label: "Mark settling down",
      description: "Pull the draft one Bristol step toward baseline and add recovery-style context.",
      why: quickFillWhy.settling,
      apply(currentForm) {
        const nextType = Math.max(4, currentType - 1);
        const nextFlags = currentForm.flags.filter((flag) => flag !== "urgent");

        return {
          ...currentForm,
          bristolTypeId: nextType,
          flags: nextFlags,
          notes: appendQuickFillNote(currentForm.notes, "Feels a bit more settled than the last saved check-in today."),
        };
      },
    });
  }

  if (dominantDriver === "travel" && !lowerNotes.includes("travel")) {
    options.push({
      id: "travel-note",
      label: "Repeat travel context",
      description: "Carry the recent travel / off-routine story into this follow-up in one tap.",
      why: quickFillWhy.driver,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Travel / off routine again today, so this check-in may not match baseline conditions."),
        };
      },
    });
  }

  if (dominantDriver === "hydration-routine" && !lowerNotes.includes("hydration")) {
    options.push({
      id: "hydration-note",
      label: "Repeat hydration context",
      description: "Reuse the hydration / routine driver that keeps showing up in saved history.",
      why: quickFillWhy.driver,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Hydration and routine were off again compared with the last saved check-in."),
        };
      },
    });
  }

  if (dominantDriver === "food-trigger" && !lowerNotes.includes("meal") && !lowerNotes.includes("food")) {
    options.push({
      id: "meal-trigger-note",
      label: "Add meal trigger",
      description: "Drop in the recurring food / meal-change driver from recent history.",
      why: quickFillWhy.driver,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Meal timing or a likely food trigger may be part of this shift again today."),
        };
      },
    });
  }

  if (dominantDriver === "stress" && !lowerNotes.includes("stress")) {
    options.push({
      id: "stress-note",
      label: "Add stress context",
      description: "Carry over the recent stress / pressure pattern so the comparison story stays believable.",
      why: quickFillWhy.driver,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Stress and schedule pressure were higher again today than baseline."),
        };
      },
    });
  }

  if (dominantDriver === "illness" && !lowerNotes.includes("sick") && !lowerNotes.includes("bug")) {
    options.push({
      id: "illness-note",
      label: "Add feeling-sick note",
      description: "Carry over the short-term illness / bug angle from recent notes.",
      why: quickFillWhy.driver,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Still feeling a bit sick / bug-like today, so this may be part of the same short-term patch."),
        };
      },
    });
  }

  if (inCautionPatch && !hasUrgentFlag) {
    options.push({
      id: "flag-urgency",
      label: "Flag urgency",
      description: "Recent saved entries are already rough, so add urgency without retyping the context.",
      why: quickFillWhy.caution,
      apply(currentForm) {
        return {
          ...currentForm,
          flags: [...currentForm.flags, "urgent"],
          notes: appendQuickFillNote(currentForm.notes, "Feels more urgent than the last saved check-in."),
        };
      },
    });
  }

  if (inCautionPatch && !hasPersistentFlag) {
    options.push({
      id: "flag-persistent",
      label: "Flag persistence",
      description: "Note that the rough pattern is still carrying over from the saved baseline.",
      why: quickFillWhy.caution,
      apply(currentForm) {
        return {
          ...currentForm,
          flags: [...currentForm.flags, "persistent"],
          notes: appendQuickFillNote(currentForm.notes, "This still feels like part of the same rough stretch rather than a one-off."),
        };
      },
    });
  }

  if (!options.some((option) => option.id === "travel-note") && !lowerNotes.includes("travel")) {
    options.push({
      id: "travel-note",
      label: "Add travel note",
      description: "Drop in a quick travel / routine-disruption note for the comparison story.",
      why: quickFillWhy.fallback,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Travel / off routine today, so this check-in may not match baseline conditions."),
        };
      },
    });
  }

  if (!options.some((option) => option.id === "hydration-note") && !lowerNotes.includes("hydration")) {
    options.push({
      id: "hydration-note",
      label: "Add hydration note",
      description: "Capture a likely hydration / routine driver in one tap.",
      why: quickFillWhy.fallback,
      apply(currentForm) {
        return {
          ...currentForm,
          notes: appendQuickFillNote(currentForm.notes, "Hydration and routine were off compared with the last saved check-in."),
        };
      },
    });
  }

  return options.slice(0, 4);
}

function appendQuickFillNote(existingNotes, snippet) {
  const trimmedExisting = existingNotes.trim();
  const trimmedSnippet = snippet.trim();

  if (!trimmedSnippet) {
    return existingNotes;
  }

  if (!trimmedExisting) {
    return trimmedSnippet;
  }

  if (trimmedExisting.toLowerCase().includes(trimmedSnippet.toLowerCase())) {
    return trimmedExisting;
  }

  return `${trimmedExisting}${/[.!?]$/.test(trimmedExisting) ? "" : "."} ${trimmedSnippet}`;
}

function buildFollowUpDraftDeltaPreview(reusedHistoryItem, form, selectedFile) {
  if (!reusedHistoryItem) {
    return null;
  }

  const currentColorLabel = COLOR_OPTIONS.find((color) => color.value === form.colorValue)?.label ?? "Unknown";
  const currentType = BRISTOL_TYPES.find((type) => Number(type.id) === Number(form.bristolTypeId));
  const previousFlags = Array.isArray(reusedHistoryItem.flags) ? [...reusedHistoryItem.flags] : [];
  const currentFlags = Array.isArray(form.flags) ? [...form.flags] : [];
  const previousFlagsKey = JSON.stringify([...previousFlags].sort());
  const currentFlagsKey = JSON.stringify([...currentFlags].sort());
  const notesChanged = (reusedHistoryItem.notes ?? "").trim() !== form.notes.trim();
  const formChanged = Number(reusedHistoryItem.bristolTypeId || 0) !== Number(form.bristolTypeId || 0);
  const colorChanged = reusedHistoryItem.colorLabel !== currentColorLabel;
  const flagsChanged = previousFlagsKey !== currentFlagsKey;
  const photoShiftLabel = reusedHistoryItem.hasPhoto
    ? selectedFile
      ? "Photo refreshed"
      : "Photo missing"
    : selectedFile
      ? "Photo added"
      : "No photo on either entry";

  const changeBadges = [
    formChanged ? "Stool form changed" : "Stool form same",
    colorChanged ? "Color changed" : "Color same",
    flagsChanged ? "Flags changed" : "Flags same",
    notesChanged ? "Notes updated" : "Notes unchanged",
    photoShiftLabel,
  ];

  return {
    changeCount: [formChanged, colorChanged, flagsChanged, notesChanged].filter(Boolean).length,
    previous: {
      mode: reusedHistoryItem.mode === "photo" ? "Photo-first" : "Describe-it",
      stool: `${reusedHistoryItem.stoolTypeLabel}: ${reusedHistoryItem.stoolTypeName}`,
      color: reusedHistoryItem.colorLabel,
      flags: previousFlags.length ? previousFlags.join(", ") : "None",
      notes: (reusedHistoryItem.notes ?? "").trim() || "No notes saved",
      photo: reusedHistoryItem.hasPhoto ? "Had photo attached" : "No photo attached",
    },
    current: {
      mode: form.mode === "photo" ? "Photo-first" : "Describe-it",
      stool: currentType ? `${currentType.label}: ${currentType.name}` : "Unknown stool form",
      color: currentColorLabel,
      flags: currentFlags.length ? currentFlags.join(", ") : "None",
      notes: form.notes.trim() || "No notes yet",
      photo: selectedFile ? `Fresh photo attached (${selectedFile.name})` : "No fresh photo attached",
    },
    narrative: [
      formChanged
        ? `Stool form moved from Bristol ${reusedHistoryItem.bristolTypeId} to Bristol ${form.bristolTypeId}.`
        : `Stool form still points at Bristol ${form.bristolTypeId}.`,
      colorChanged
        ? `Color changed from ${reusedHistoryItem.colorLabel} to ${currentColorLabel}.`
        : `Color stayed at ${currentColorLabel}.`,
      flagsChanged
        ? `Flags changed from ${previousFlags.length ? previousFlags.join(", ") : "none"} to ${currentFlags.length ? currentFlags.join(", ") : "none"}.`
        : `Flags stayed ${currentFlags.length ? currentFlags.join(", ") : "clear of extra flags"}.`,
    ],
    changeBadges,
  };
}

function buildFollowUpResultCarryover(deltaPreview, result) {
  if (!deltaPreview || !result?.stoolType || !result?.color) {
    return null;
  }

  const photoLine = deltaPreview.current.photo.includes("Fresh photo")
    ? "A fresh photo stayed attached through analysis, so the repeat-check-in story still feels complete."
    : deltaPreview.previous.photo === "Had photo attached"
      ? "This follow-up ran without a fresh photo even though the baseline had one, so the result should be framed as a structured comparison rather than a strict photo-to-photo match."
      : "This follow-up stayed in the guided-input lane, which is still honest for a no-photo comparison flow.";

  return {
    title:
      deltaPreview.changeCount > 0
        ? `Result compared against a draft with ${deltaPreview.changeCount} real field change${deltaPreview.changeCount === 1 ? "" : "s"}`
        : "Result came from a nearly unchanged follow-up draft",
    tone: deltaPreview.changeCount > 0 ? "bg-blue-50 text-blue-950" : "bg-amber-50 text-amber-950",
    body:
      deltaPreview.changeCount > 0
        ? `The analyzed result now keeps the before/after setup visible: the saved baseline and the edited draft were not just pre-analysis scaffolding, they are part of the follow-up story for this ${result.stoolType.label.toLowerCase()} result.`
        : "The analyzed result stayed very close to the saved baseline, so the app should frame this more as confirmation of the same pattern than as a dramatic shift.",
    bullets: [...deltaPreview.narrative, photoLine],
  };
}

function buildExportSummary({
  result,
  form,
  history,
  analysisMeta,
  reuseHistoryBridge,
  followUpComparison,
  projectedTrendScore,
  projectedHistoryFollowUpWindow,
  projectedHistoryRecoveryOutlook,
  projectedHistoryNextStep,
}) {
  if (!result?.stoolType || !result?.color) {
    return "";
  }

  const recentHistory = history.slice(0, 3);
  const cautionCount = history.filter((item) => item.shouldTalkToDoctor).length;
  const trend = getTrendDirection(history);
  const driverSignals = getHistoryDriverSignals(history);

  const sections = [
    "Stool Scout check-in summary",
    "",
    `Mode: ${form.mode === "photo" ? "Photo-first" : "Describe-it"}`,
    `Current result: ${result.stoolType.label} — ${result.stoolType.name}`,
    `Color: ${result.color.label}`,
    `Severity framing: ${result.urgencyLabel}`,
    `Re-check window: ${result.recheckWindow}`,
    `Flags: ${form.flags.length ? form.flags.join(", ") : "None"}`,
    `Notes: ${form.notes.trim() || "None"}`,
    "",
    "Why it landed here:",
    ...result.reasoningBullets.slice(0, 4).map((bullet) => `- ${bullet}`),
    "",
    "What to do next:",
    ...result.todayPlan.slice(0, 2).map((item) => `- ${item}`),
    ...result.followUpPlan.slice(0, 2).map((item) => `- ${item}`),
  ];

  if (analysisMeta?.route) {
    sections.push("", `Analysis route: ${analysisMeta.route}`);
  }

  if (followUpComparison) {
    sections.push(
      "",
      `Follow-up comparison: ${followUpComparison.headline}`,
      followUpComparison.body,
      ...followUpComparison.metrics.map((metric) => `- ${metric.label}: ${metric.value}`),
    );
  }

  if (reuseHistoryBridge) {
    sections.push(
      "",
      `Saved-story carryover: ${reuseHistoryBridge.title}`,
      reuseHistoryBridge.body,
      ...reuseHistoryBridge.bullets.map((bullet) => `- ${bullet}`),
    );
  }

  if (history.length) {
    sections.push(
      "",
      `Saved history: ${history.length} entr${history.length === 1 ? "y" : "ies"}`,
      `Recent trend: ${trend.label}`,
      `Recent caution count: ${cautionCount}/${history.length}`,
      ...(driverSignals.length
        ? [
            `Likely pattern drivers: ${driverSignals.map((signal) => signal.label).join(", ")}`,
          ]
        : []),
      "Recent entries:",
      ...recentHistory.map(
        (item) =>
          `- ${formatSavedAt(item.savedAt)} · ${item.stoolTypeLabel} ${item.stoolTypeName} · ${item.colorLabel} · ${item.shouldTalkToDoctor ? "higher caution" : "lower caution"}`,
      ),
    );
  }

  if (projectedTrendScore || projectedHistoryFollowUpWindow || projectedHistoryRecoveryOutlook || projectedHistoryNextStep) {
    sections.push("", "If you save this now:");

    if (projectedTrendScore) {
      sections.push(
        `Projected trend score: ${projectedTrendScore.headline}`,
        projectedTrendScore.body,
        ...((projectedTrendScore.bullets ?? []).map((bullet) => `- ${bullet}`)),
      );
    }

    if (projectedHistoryFollowUpWindow) {
      sections.push(
        "",
        `Projected follow-up window: ${projectedHistoryFollowUpWindow.title}`,
        projectedHistoryFollowUpWindow.body,
        ...((projectedHistoryFollowUpWindow.badges ?? []).map((badge) => `- ${badge}`)),
        ...((projectedHistoryFollowUpWindow.bullets ?? []).map((bullet) => `- ${bullet}`)),
      );
    }

    if (projectedHistoryRecoveryOutlook) {
      sections.push(
        "",
        `Projected recovery outlook: ${projectedHistoryRecoveryOutlook.title}`,
        projectedHistoryRecoveryOutlook.body,
        ...((projectedHistoryRecoveryOutlook.bullets ?? []).map((bullet) => `- ${bullet}`)),
      );
    }

    if (projectedHistoryNextStep) {
      sections.push(
        "",
        `Projected next step: ${projectedHistoryNextStep.title}`,
        projectedHistoryNextStep.body,
        ...((projectedHistoryNextStep.bullets ?? []).map((bullet) => `- ${bullet}`)),
      );
    }
  }

  sections.push(
    "",
    "Important: Stool Scout is an educational wellness tracker, not a medical diagnostic device.",
  );

  return sections.join("\n");
}

function HistoryPatternRail({ history }) {
  if (!history.length) {
    return null;
  }

  const chronologicalHistory = [...history].reverse();
  const latest = history[0];
  const baselineDistance = Math.abs(4 - Number(latest.bristolTypeId || 4));
  const railTone = latest.shouldTalkToDoctor
    ? "bg-rose-50 text-rose-950"
    : baselineDistance >= 2
      ? "bg-amber-50 text-amber-950"
      : "bg-emerald-50 text-emerald-950";
  const railHeadline = latest.shouldTalkToDoctor
    ? "Latest saved point is still on the caution side of the recent pattern."
    : baselineDistance >= 2
      ? "Latest saved point is still noticeably away from baseline Bristol 4."
      : "Latest saved point is sitting fairly close to the wellness baseline.";

  return (
    <div className={`mt-4 rounded-3xl p-4 ${railTone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Pattern rail</h3>
          <p className="mt-2 text-sm leading-6">
            Read left to right: each saved entry lands on the Bristol scale so a reviewer can see the recent shape of the story without opening every card.
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
          {history.length} point{history.length === 1 ? "" : "s"}
        </div>
      </div>

      <p className="mt-3 text-sm font-semibold">{railHeadline}</p>

      <div className="mt-4 overflow-x-auto pb-1">
        <div
          className="grid min-w-[22rem] gap-2"
          style={{ gridTemplateColumns: `4.25rem repeat(${chronologicalHistory.length}, minmax(3.75rem, 1fr))` }}
        >
          {[7, 6, 5, 4, 3, 2, 1].map((level) => (
            <div key={`row-${level}`} className="contents">
              <div
                className={`flex min-h-[3rem] items-center rounded-2xl px-3 text-xs font-semibold uppercase tracking-[0.16em] ${
                  level === 4 ? "bg-white/80 text-stone-900 ring-1 ring-white" : "bg-white/45"
                }`}
              >
                T{level}
              </div>
              {chronologicalHistory.map((item, index) => {
                const isActiveLevel = Number(item.bristolTypeId || 0) === level;
                const nextItem = chronologicalHistory[index + 1];

                return (
                  <div
                    key={`${item.id}-${level}`}
                    className={`flex min-h-[3rem] items-center justify-center rounded-2xl border border-dashed px-2 ${
                      level === 4 ? "border-white/80 bg-white/65" : "border-white/40 bg-white/30"
                    }`}
                  >
                    {isActiveLevel ? (
                      <div
                        className={`w-full rounded-2xl px-2 py-2 text-center text-[11px] font-semibold leading-4 shadow-sm ${
                          item.shouldTalkToDoctor
                            ? "bg-rose-500 text-white"
                            : item.hasPhoto
                              ? "bg-violet-700 text-white"
                              : "bg-emerald-600 text-white"
                        }`}
                      >
                        <div>{formatSavedAtCompact(item.savedAt)}</div>
                        <div className="mt-1 opacity-90">{item.colorLabel}</div>
                        <div className="mt-1 opacity-90">{nextItem ? formatRelativeGap(nextItem.savedAt, item.savedAt) : "Start"}</div>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.16em] opacity-45">
                        {level === 4 && index === chronologicalHistory.length - 1 ? "Latest" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
        <span className="rounded-full bg-violet-700 px-3 py-2 text-white">Photo-first save</span>
        <span className="rounded-full bg-emerald-600 px-3 py-2 text-white">Describe-it save</span>
        <span className="rounded-full bg-rose-500 px-3 py-2 text-white">Higher caution</span>
      </div>
    </div>
  );
}

function HistoryTimeline({ history }) {
  if (!history.length) {
    return null;
  }

  const chronologicalHistory = [...history].reverse();

  return (
    <div className="mt-4 rounded-3xl bg-violet-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-violet-950">Recent stool-form timeline</h3>
          <p className="mt-2 text-sm leading-6 text-violet-950">
            Newest entries appear on the right. Higher bars mean looser stool form on the Bristol scale.
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-800">
          {history.length} saved
        </div>
      </div>

      <div className="mt-4 flex items-end gap-2 overflow-x-auto pb-1">
        {chronologicalHistory.map((item, index) => {
          const previousItem = chronologicalHistory[index - 1];
          const heightClass = [
            "h-10",
            "h-14",
            "h-20",
            "h-24",
            "h-28",
            "h-32",
            "h-36",
          ][Math.max(0, Math.min(6, Number(item.bristolTypeId || 1) - 1))];

          return (
            <div key={item.id} className="min-w-[5rem] flex-1">
              <div className="flex h-40 items-end justify-center rounded-[1.5rem] bg-white/70 p-3 ring-1 ring-violet-200">
                <div
                  className={`flex w-full max-w-[3.25rem] flex-col justify-end rounded-[1rem] px-2 py-3 text-center text-xs font-semibold ${
                    item.shouldTalkToDoctor
                      ? "bg-rose-400 text-white"
                      : "bg-violet-600 text-white"
                  } ${heightClass}`}
                >
                  <span>{item.stoolTypeLabel.replace("Type ", "T")}</span>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-800">
                {index === 0 ? "Start" : index === chronologicalHistory.length - 1 ? "Latest" : `#${index + 1}`}
              </p>
              <p className="mt-1 text-center text-xs text-violet-900">{item.colorLabel}</p>
              <p className="mt-2 text-xs leading-5 text-violet-950">{buildTimelineMessage(item, previousItem)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepPill({ step, active, done, label }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${
        active
          ? "bg-stone-900 text-white"
          : done
            ? "bg-emerald-100 text-emerald-900"
            : "bg-stone-200 text-stone-600"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[11px] text-stone-900">
        {step}
      </span>
      {label}
    </div>
  );
}

function CaptureActionCard({ mode, selectedFile, onContinue, onSkipPhoto }) {
  const isPhotoMode = mode === "photo";
  const headline = selectedFile
    ? "Photo loaded — move straight into stool details"
    : isPhotoMode
      ? "Camera-first flow ready"
      : "Describe-it flow ready";
  const body = selectedFile
    ? "You already have a demo image in place, so the next tap should get you into the guided interpretation layer without hunting around the screen."
    : isPhotoMode
      ? "Take or load a photo first if you want the strongest demo story, then move into the guided inputs and analysis."
      : "You can skip the photo entirely and still move into the structured check-in for a privacy-first walkthrough.";

  return (
    <div className="mt-4 rounded-3xl bg-stone-950 p-4 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Next best action</p>
          <p className="mt-2 text-base font-semibold">{headline}</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">{body}</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-200">
          {selectedFile ? "Photo-first demo armed" : isPhotoMode ? "Waiting on image" : "No photo needed"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-3xl bg-white px-4 py-4 text-left text-stone-900 transition hover:bg-stone-100"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Primary CTA</p>
          <p className="mt-2 text-sm font-semibold">
            {selectedFile ? "Continue with this photo" : "Continue to stool details"}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Keep the mobile flow moving instead of making someone scan for the next button mid-demo.
          </p>
        </button>

        <button
          type="button"
          onClick={onSkipPhoto}
          className="rounded-3xl bg-emerald-50 px-4 py-4 text-left text-emerald-950 transition hover:bg-emerald-100"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Fallback CTA</p>
          <p className="mt-2 text-sm font-semibold">Skip photo, just describe it</p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            Useful when the camera roll is empty, privacy comes up, or you want the fastest no-image walkthrough.
          </p>
        </button>
      </div>
    </div>
  );
}

function buildPresenterBeat(step, analysisResult, hasProjectedTrackerPreview) {
  if (analysisResult) {
    return {
      badge: "Beat 3 · Land the takeaway",
      title: hasProjectedTrackerPreview ? "Turn the result into a tracker story" : "Turn the result into a product story",
      body: hasProjectedTrackerPreview
        ? "Walk through the plain-English read, why the action ladder is conservative, and then point at the result-screen tracker preview so the follow-up story lands before you even scroll into full history."
        : "Walk through the plain-English read, why the action ladder is conservative, and how saved history makes the product feel ongoing instead of novelty-only.",
      coach: hasProjectedTrackerPreview
        ? "Pause on the result headline first, then use the 'If you save this now' tracker-preview card to show the likely next-step guidance before jumping to saved history."
        : "Pause on the result headline first, then use the next-check-in and escalation sections to show the app is useful without pretending to diagnose.",
      tone: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    };
  }

  if (step >= 2) {
    return {
      badge: "Beat 2 · Trigger the engine",
      title: "Show that the flow is actually live",
      body: "This is the moment to run analysis and remind people the app is posting a real check-in through the server route rather than swapping to a hard-coded fake result.",
      coach: "Before tapping the button, mention that the upload, structured inputs, and future vision handoff all go through the same API seam.",
      tone: "bg-violet-50 text-violet-950 ring-violet-200",
    };
  }

  return {
    badge: "Beat 1 · Frame the capture flow",
    title: "Open with the phone-first intake",
    body: "Anchor the demo on the capture surface, then explain that privacy-conscious users can still fall back to guided description without breaking the product story.",
    coach: "Keep this beat short: point at the loaded fixture, say the product starts camera-first, and move into analysis before the walkthrough drifts.",
    tone: "bg-blue-50 text-blue-950 ring-blue-200",
  };
}

function PresenterModeCard({
  activeDemoPack,
  step,
  analysisResult,
  historyCount,
  hasProjectedTrackerPreview,
  onAnalyze,
  isAnalyzing,
  onReset,
  loadedAt,
  nowMs,
}) {
  if (!activeDemoPack?.presenterMode) {
    return null;
  }

  const defaultStepPrompt = activeDemoPack.presenterMode.nextStepLabels[step] ?? activeDemoPack.presenterMode.nextStepLabels[3];
  const currentStepPrompt = analysisResult && hasProjectedTrackerPreview
    ? "Call out the 'If you save this now' tracker-preview card before you scroll any farther. It proves the app already knows the likely follow-up story, not just the one-shot result."
    : defaultStepPrompt;
  const resultStateLabel = analysisResult
    ? hasProjectedTrackerPreview
      ? "Result + tracker preview live"
      : "Result is live"
    : step >= 2
      ? "Ready to run analysis"
      : "Pack loaded at capture step";
  const presenterBeat = buildPresenterBeat(step, analysisResult, hasProjectedTrackerPreview);
  const elapsedMs = loadedAt ? Math.max(0, nowMs - loadedAt) : 0;
  const presenterTimeline = buildPresenterTimeline({ elapsedMs, analysisResult });

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">Presenter mode</p>
          <h2 className="mt-2 text-xl font-bold text-stone-900">{activeDemoPack.name}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{activeDemoPack.presenterMode.opener}</p>
        </div>
        <div className="rounded-3xl bg-violet-50 px-4 py-3 text-sm text-violet-950">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Demo state</p>
          <p className="mt-2 font-semibold">{resultStateLabel}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-violet-700">{historyCount} saved history entries loaded</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StepPill step="1" active={step === 1} done={step > 1} label="Capture framing" />
        <StepPill step="2" active={step === 2} done={Boolean(analysisResult)} label="Run analysis" />
        <StepPill step="3" active={Boolean(analysisResult)} done={false} label="Land result" />
      </div>

      <div className={`mt-4 rounded-3xl p-4 ring-1 ${presenterBeat.tone}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{presenterBeat.badge}</p>
            <p className="mt-2 text-base font-semibold">{presenterBeat.title}</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2 text-right text-sm ring-1 ring-white/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Demo clock</p>
            <p className="mt-1 text-base font-semibold">{formatDemoElapsed(elapsedMs)}</p>
          </div>
        </div>
        <p className="mt-2 text-sm leading-6">{presenterBeat.body}</p>
        <p className="mt-3 rounded-2xl bg-white/70 px-3 py-3 text-sm leading-6 ring-1 ring-white/80">
          <span className="font-semibold">Presenter coaching:</span> {presenterBeat.coach}
        </p>
      </div>

      <div className={`mt-4 rounded-3xl p-4 ring-1 ${presenterTimeline.pace.tone}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{presenterTimeline.pace.badge}</p>
            <p className="mt-2 text-sm leading-6">{presenterTimeline.pace.body}</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">Target: 30-second walkthrough</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {presenterTimeline.segments.map((segment) => (
            <div
              key={segment.id}
              className={`rounded-3xl p-4 ring-1 ${
                segment.active
                  ? "bg-white/70 ring-white/90"
                  : segment.done
                    ? "bg-white/50 ring-white/60"
                    : "bg-white/30 ring-white/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{segment.window}</p>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                  {segment.active ? "Now" : segment.done ? "Done" : "Up next"}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{segment.label}</p>
              <p className="mt-2 text-sm leading-6">{segment.target}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-violet-50 p-4 text-violet-950">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Say this next</p>
        <p className="mt-2 text-sm leading-6">{currentStepPrompt}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {[
          ...activeDemoPack.presenterMode.proofPoints,
          ...(analysisResult && hasProjectedTrackerPreview
            ? ["The result screen already previews the likely tracker takeaway, so the follow-up story lands before you even jump into full history."]
            : []),
        ].map((point) => (
          <div key={point} className="rounded-3xl bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Proof point</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">{point}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {!analysisResult ? (
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="rounded-full bg-violet-700 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? "Running demo analysis..." : "Run presenter step"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-300"
        >
          Clear presenter pack
        </button>
      </div>
    </section>
  );
}

function MobileActionDock({
  step,
  selectedFile,
  isAnalyzing,
  analysisResult,
  hasSavedCurrentResult,
  savedCount,
  onContinue,
  onSkipPhoto,
  onAnalyze,
  onBackToPhoto,
  onSave,
  onJumpToHistory,
  onStartAnother,
}) {
  const statusLabel =
    step === 1
      ? selectedFile
        ? "Photo ready"
        : "Capture step"
      : step === 2
        ? "Describe step"
        : analysisResult
          ? "Result ready"
          : "Result step";

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-4 sm:px-6 lg:hidden">
      <div className="mx-auto w-full max-w-md rounded-[1.75rem] bg-stone-950/95 p-3 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Quick action</p>
            <p className="mt-1 text-sm font-semibold text-white">{statusLabel}</p>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-200">
            Step {step} / 3
          </div>
        </div>

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onContinue}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-900"
            >
              {selectedFile ? "Use this photo" : "Continue"}
            </button>
            <button
              type="button"
              onClick={onSkipPhoto}
              className="rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 ring-1 ring-emerald-400/30"
            >
              Skip photo
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze stool"}
            </button>
            <button
              type="button"
              onClick={onBackToPhoto}
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10"
            >
              Back to photo
            </button>
          </div>
        ) : null}

        {step >= 3 ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={hasSavedCurrentResult}
              className="rounded-2xl bg-white px-3 py-3 text-xs font-semibold text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasSavedCurrentResult ? `Saved (${savedCount})` : `Save (${savedCount})`}
            </button>
            <button
              type="button"
              onClick={onJumpToHistory}
              className={`rounded-2xl px-3 py-3 text-xs font-semibold ring-1 ${hasSavedCurrentResult ? 'bg-emerald-300 text-stone-950 ring-emerald-200' : 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/30'}`}
            >
              {hasSavedCurrentResult ? 'Review save' : 'History'}
            </button>
            <button
              type="button"
              onClick={onStartAnother}
              className="rounded-2xl bg-violet-500/20 px-3 py-3 text-xs font-semibold text-violet-100 ring-1 ring-violet-400/30"
            >
              New check-in
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultCard({ result, onSave, savedCount, analysisMeta, historyCoach, projectedHistoryNextStep, projectedHistoryFollowUpWindow, projectedHistoryRecoveryOutlook, projectedTrendScore, projectedSavedHandoffSummary, followUpComparison, followUpResultCarryover, reuseHistoryBridge, onJumpToHistory, onStartAnother, onStartSavedFollowUp, hasSavedCurrentResult, exportSummary, exportStatus, onCopySummary, onShareSummary, sectionRef }) {
  const projectedTrackerSignalCount = [projectedTrendScore, projectedHistoryFollowUpWindow, projectedHistoryRecoveryOutlook, projectedSavedHandoffSummary].filter(Boolean).length;
  if (!result?.stoolType || !result?.color) {
    return null;
  }

  const savedFollowUpPrompt = buildSavedFollowUpPrompt(
    result,
    followUpComparison,
    projectedHistoryFollowUpWindow,
    projectedHistoryNextStep,
  );
  const resultSnapshot = buildResultSnapshot(result);
  const whyThisResult = buildWhyThisResult(result);
  const actionLadder = buildActionLadder(result);
  const topReasoning = result.reasoningBullets.slice(0, 3);

  return (
    <section ref={sectionRef} className="rounded-[2rem] border border-white/70 bg-white/92 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-6">
        <div className="rounded-[1.75rem] bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#0f766e_100%)] p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-200">Analysis result</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                {result.stoolType.label}: {result.stoolType.name}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/75">{result.summaryLead}</p>
              {resultSnapshot ? (
                <p className="mt-3 text-base font-medium text-white/90">{resultSnapshot.ifThenLine}</p>
              ) : null}
            </div>
            <div className={`min-w-[12rem] rounded-[1.5rem] px-4 py-4 ring-1 ${result.shouldTalkToDoctor ? 'bg-rose-400/14 text-rose-50 ring-rose-200/30' : 'bg-emerald-400/12 text-emerald-50 ring-emerald-200/25'}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-75">Severity</p>
              <p className="mt-2 text-lg font-semibold">{result.urgencyLabel}</p>
              <p className="mt-2 text-sm leading-6 opacity-85">{result.recheckWindow}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] bg-white/8 px-4 py-4 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Color</p>
              <p className="mt-2 text-base font-semibold">{result.color.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{result.color.interpretation}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/8 px-4 py-4 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Gut rhythm</p>
              <p className="mt-2 text-base font-semibold">{result.stoolType.gutTone}</p>
            </div>
            <div className="rounded-[1.4rem] bg-white/8 px-4 py-4 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Confidence</p>
              <p className="mt-2 text-base font-semibold">{result.confidenceLabel}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{result.confidenceBody}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.6rem] bg-stone-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Why this landed here</p>
            <p className="mt-3 text-base font-semibold text-stone-950">{whyThisResult?.headline ?? 'Structured interpretation'}</p>
            <p className="mt-2 text-sm leading-7 text-stone-600">{whyThisResult?.body ?? result.notesSummary}</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-700">
              {(whyThisResult?.bullets?.slice(0, 3) ?? topReasoning).map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[1.6rem] bg-stone-950 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Save or hand off</p>
                <p className="mt-2 text-lg font-semibold">{hasSavedCurrentResult ? "Saved — now land the tracker story" : "Don’t let the flow die on the result"}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {hasSavedCurrentResult ? 'Saved' : 'Ready'}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <button type="button" onClick={onSave} disabled={hasSavedCurrentResult} className="rounded-[1.3rem] bg-white px-4 py-4 text-left text-stone-900 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Primary action</p>
                <p className="mt-2 text-sm font-semibold">{hasSavedCurrentResult ? `Saved to history (${savedCount})` : `Save this check-in (${savedCount})`}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{hasSavedCurrentResult ? "This result is already part of the live tracker." : "Keep the tracker alive with one tap."}</p>
              </button>

              {hasSavedCurrentResult ? (
                <div className="rounded-[1.3rem] bg-emerald-50 px-4 py-4 text-emerald-950 ring-1 ring-emerald-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Post-save handoff</p>
                      <p className="mt-2 text-sm font-semibold">The highlighted history card is now the fastest proof this is a tracker, not a novelty result.</p>
                    </div>
                    <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900 ring-1 ring-emerald-200">
                      {projectedTrackerSignalCount} tracker signal{projectedTrackerSignalCount === 1 ? "" : "s"} added
                    </div>
                  </div>

                  {savedFollowUpPrompt ? (
                    <div className="mt-3 rounded-[1.1rem] bg-white px-4 py-4 ring-1 ring-emerald-100">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">What the next draft should test</p>
                          <p className="mt-2 text-sm font-semibold text-stone-900">{savedFollowUpPrompt.title}</p>
                          <p className="mt-2 text-sm leading-6 text-stone-700">{savedFollowUpPrompt.body}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {savedFollowUpPrompt.badges.map((badge) => (
                            <span key={badge} className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800 ring-1 ring-emerald-100">
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {savedFollowUpPrompt.bullets.map((bullet) => (
                          <div key={bullet} className="rounded-[1rem] bg-emerald-50/60 px-3 py-3 ring-1 ring-emerald-100">
                            <p className="text-sm leading-6 text-stone-800">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {projectedTrendScore ? (
                      <div className="rounded-[1rem] bg-white px-3 py-3 ring-1 ring-emerald-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Trend score</p>
                        <p className="mt-2 text-sm font-semibold text-stone-900">{projectedTrendScore.headline}</p>
                      </div>
                    ) : null}
                    {projectedHistoryFollowUpWindow ? (
                      <div className="rounded-[1rem] bg-white px-3 py-3 ring-1 ring-emerald-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Follow-up</p>
                        <p className="mt-2 text-sm font-semibold text-stone-900">{projectedHistoryFollowUpWindow.title}</p>
                      </div>
                    ) : null}
                    {projectedHistoryRecoveryOutlook ? (
                      <div className="rounded-[1rem] bg-white px-3 py-3 ring-1 ring-emerald-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Recovery outlook</p>
                        <p className="mt-2 text-sm font-semibold text-stone-900">{projectedHistoryRecoveryOutlook.title}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onJumpToHistory} className={`rounded-[1.3rem] px-4 py-4 text-left ring-1 ${hasSavedCurrentResult ? 'bg-emerald-300 text-stone-950 ring-emerald-200' : 'bg-emerald-400/15 text-emerald-50 ring-emerald-300/20'}`}>
                  <p className="text-sm font-semibold">{hasSavedCurrentResult ? 'Review highlighted history' : 'Open history'}</p>
                  <p className={`mt-2 text-sm leading-6 ${hasSavedCurrentResult ? 'text-stone-800/80' : 'text-emerald-100/80'}`}>{hasSavedCurrentResult ? 'Jump straight to the latest saved card and trend snapshot.' : 'See the trend story.'}</p>
                </button>
                <button
                  type="button"
                  onClick={hasSavedCurrentResult ? onStartSavedFollowUp : onStartAnother}
                  className={`rounded-[1.3rem] px-4 py-4 text-left ring-1 ${hasSavedCurrentResult ? 'bg-violet-200 text-stone-950 ring-violet-100' : 'bg-white/8 text-white ring-white/10'}`}
                >
                  <p className="text-sm font-semibold">{hasSavedCurrentResult ? 'Draft next follow-up' : 'Start another'}</p>
                  <p className={`mt-2 text-sm leading-6 ${hasSavedCurrentResult ? 'text-stone-800/80' : 'text-white/70'}`}>{hasSavedCurrentResult ? 'Reuse the newest saved check-in immediately so the comparison flow keeps moving.' : 'Run a follow-up fast.'}</p>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onCopySummary} className="rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10">Copy summary</button>
                <button type="button" onClick={onShareSummary} className="rounded-full bg-emerald-300 px-4 py-3 text-sm font-semibold text-stone-950">Share summary</button>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">{exportStatus || `${Math.max(1, exportSummary.split("\n").length)} lines ready`}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {actionLadder.map((step) => (
            <div key={step.title} className={`rounded-[1.5rem] p-4 ${step.tone}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{step.title}</p>
              <p className="mt-2 text-sm leading-6">{step.body}</p>
            </div>
          ))}
        </div>

        {historyCoach ? (
          <div className={`rounded-[1.5rem] p-4 ${historyCoach.tone}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Trend-aware follow-up</p>
            <p className="mt-2 text-base font-semibold">{historyCoach.title}</p>
            <p className="mt-2 text-sm leading-6">{historyCoach.body}</p>
          </div>
        ) : null}

        {projectedHistoryNextStep ? (
          <div className={`rounded-[1.5rem] p-4 ${projectedHistoryNextStep.tone}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">If you save this now</p>
                <p className="mt-2 text-base font-semibold">{projectedHistoryNextStep.title}</p>
                <p className="mt-2 text-sm leading-6">{projectedHistoryNextStep.body}</p>
              </div>
              <div className="rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
                Tracker preview
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {projectedHistoryNextStep.bullets.map((bullet) => (
                <div key={bullet} className="rounded-[1.25rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                  <p className="text-sm leading-6">{bullet}</p>
                </div>
              ))}
            </div>

            {projectedSavedHandoffSummary ? (
              <div className="mt-4 rounded-[1.25rem] bg-white/75 px-4 py-4 ring-1 ring-white/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">Projected save handoff</p>
                    <p className="mt-2 text-sm font-semibold">{projectedSavedHandoffSummary.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{projectedSavedHandoffSummary.body}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    {projectedSavedHandoffSummary.badges?.map((badge) => (
                      <span key={badge} className="rounded-full bg-white px-3 py-2 ring-1 ring-white/80">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
                {projectedSavedHandoffSummary.bullets?.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {projectedSavedHandoffSummary.bullets.map((bullet) => (
                      <div key={bullet} className="rounded-[1rem] bg-white px-4 py-4 ring-1 ring-white/80">
                        <p className="text-sm leading-6">{bullet}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {projectedHistoryFollowUpWindow || projectedHistoryRecoveryOutlook || projectedTrendScore ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {projectedTrendScore ? (
                  <div className={`rounded-[1.25rem] p-4 ${projectedTrendScore.tone}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Projected trend score</p>
                    <p className="mt-2 text-sm font-semibold">{projectedTrendScore.headline}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{projectedTrendScore.body}</p>
                    {projectedTrendScore.bullets?.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 opacity-90">
                        {projectedTrendScore.bullets.slice(0, 2).map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {projectedHistoryFollowUpWindow ? (
                  <div className={`rounded-[1.25rem] p-4 ${projectedHistoryFollowUpWindow.tone}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Projected follow-up window</p>
                    <p className="mt-2 text-sm font-semibold">{projectedHistoryFollowUpWindow.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{projectedHistoryFollowUpWindow.body}</p>
                    {projectedHistoryFollowUpWindow.badges?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                        {projectedHistoryFollowUpWindow.badges.map((badge) => (
                          <span key={badge} className="rounded-full bg-white/70 px-3 py-2 ring-1 ring-white/80">
                            {badge}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {projectedHistoryFollowUpWindow.bullets?.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 opacity-90">
                        {projectedHistoryFollowUpWindow.bullets.slice(0, 2).map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {projectedHistoryRecoveryOutlook ? (
                  <div className={`rounded-[1.25rem] p-4 ${projectedHistoryRecoveryOutlook.tone}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Projected recovery outlook</p>
                    <p className="mt-2 text-sm font-semibold">{projectedHistoryRecoveryOutlook.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{projectedHistoryRecoveryOutlook.body}</p>
                    {projectedHistoryRecoveryOutlook.bullets?.length ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 opacity-90">
                        {projectedHistoryRecoveryOutlook.bullets.slice(0, 2).map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {reuseHistoryBridge ? (
          <div className="rounded-[1.5rem] bg-violet-50 p-4 text-violet-950 ring-1 ring-violet-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">Exact saved-story carryover</p>
                <p className="mt-2 text-base font-semibold">{reuseHistoryBridge.title}</p>
                <p className="mt-2 text-sm leading-6">{reuseHistoryBridge.body}</p>
              </div>
              <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-900 ring-1 ring-violet-200">
                History → result bridge
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-900">
              {reuseHistoryBridge.badges?.map((badge) => (
                <span key={badge} className="rounded-full bg-white px-3 py-2 ring-1 ring-violet-200">
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reuseHistoryBridge.bullets?.map((bullet) => (
                <div key={bullet} className="rounded-[1.1rem] bg-white px-4 py-4 ring-1 ring-violet-100">
                  <p className="text-sm leading-6 text-stone-700">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {followUpComparison ? (
          <div className={`rounded-[1.5rem] p-4 ${followUpComparison.tone}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Compared with baseline</p>
                <p className="mt-2 text-base font-semibold">{followUpComparison.headline}</p>
                <p className="mt-2 text-sm leading-6">{followUpComparison.body}</p>
              </div>
              <div className="rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
                {followUpComparison.sourceLabel}
              </div>
            </div>

            {followUpComparison.metrics?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {followUpComparison.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.1rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">{metric.label}</p>
                    <p className="mt-2 text-sm font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {followUpComparison.bullets?.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {followUpComparison.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-[1.1rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                    <p className="text-sm leading-6">{bullet}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {followUpResultCarryover ? (
          <div className={`rounded-[1.5rem] p-4 ${followUpResultCarryover.tone}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">Draft-to-result carryover</p>
                <p className="mt-2 text-base font-semibold">{followUpResultCarryover.title}</p>
                <p className="mt-2 text-sm leading-6">{followUpResultCarryover.body}</p>
              </div>
              <div className="rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
                Follow-up result story
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {followUpResultCarryover.bullets.map((bullet) => (
                <div key={bullet} className="rounded-[1.1rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                  <p className="text-sm leading-6">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <details className="group rounded-[1.5rem] bg-stone-50 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-stone-900">
            Deeper interpretation details
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 group-open:hidden">Expand</span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 group-open:inline">Collapse</span>
          </summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {analysisMeta ? (
              <div className="rounded-[1.3rem] bg-violet-50 p-4">
                <p className="text-sm font-semibold text-violet-950">Analysis engine</p>
                <p className="mt-2 text-sm leading-6 text-violet-950">{analysisMeta.route ? `Routed through ${analysisMeta.route}. ` : ''}{analysisMeta.engine === 'rule-based-prototype' ? 'API-backed prototype analysis.' : analysisMeta.engine}</p>
              </div>
            ) : null}
            <div className="rounded-[1.3rem] bg-stone-100 p-4">
              <p className="text-sm font-semibold text-stone-900">Attention flags</p>
              {result.cautionReasons.length ? (
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">
                  {result.cautionReasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-stone-700">No major warning flags were selected in this check-in.</p>
              )}
            </div>
            <div className="rounded-[1.3rem] bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-950">Nutrition steps</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-950">
                {result.nutritionSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
            </div>
            <div className="rounded-[1.3rem] bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-950">Escalate faster if…</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-blue-950">
                {(result.escalationTriggers?.length ? result.escalationTriggers : ['If the next check-in looks more extreme or symptoms worsen, seek medical guidance.']).map((trigger) => <li key={trigger}>{trigger}</li>)}
              </ul>
            </div>
          </div>
          <p className="mt-4 rounded-[1.3rem] border border-dashed border-stone-300 bg-white px-4 py-4 text-sm leading-6 text-stone-700"><span className="font-semibold">Important:</span> Stool Scout is an educational wellness tracker, not a medical diagnostic device.</p>
        </details>
      </div>
    </section>
  );
}

function HistoryCard({ history, onClear, onReuse, exportStatus, onCopyHistorySummary, onShareHistorySummary, sectionRef, recentlySavedId }) {
  const highlightedEntry = recentlySavedId ? history.find((item) => item.id === recentlySavedId) ?? null : null;
  const highlightedEntryIndex = highlightedEntry ? history.findIndex((item) => item.id === highlightedEntry.id) : -1;
  const previousEntry = highlightedEntryIndex >= 0 ? history[highlightedEntryIndex + 1] ?? null : null;
  const savedHandoffSummary = buildSavedHandoffSummary(highlightedEntry, previousEntry);
  const summary = buildHistorySummary(history);
  const historyInsights = buildHistoryInsights(history);
  const trackerSignals = buildTrackerSignals(history);
  const followUpWindow = buildFollowUpWindow(history);
  const trendScore = buildTrendScore(history);
  const driverSignals = getHistoryDriverSignals(history);
  const driverAwareNextStep = buildDriverAwareNextStep(history);
  const latestThree = history.slice(0, 3);

  return (
    <section ref={sectionRef} id="saved-history" className="rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">History</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">Recent check-ins</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">Secondary, quieter, and actually useful: this is where Stool Scout becomes a tracker instead of a one-off checker.</p>
        </div>
        {history.length ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onShareHistorySummary} className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">Share summary</button>
            <button type="button" onClick={onCopyHistorySummary} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">Copy summary</button>
            <button type="button" onClick={onClear} className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700">Clear</button>
          </div>
        ) : null}
      </div>

      {history.length ? <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{exportStatus || 'History summary is ready for copy/share.'}</p> : null}

      {highlightedEntry ? (
        <div className="mt-4 rounded-[1.5rem] bg-emerald-50 p-4 text-emerald-950 ring-1 ring-emerald-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Just saved</p>
              <p className="mt-2 text-base font-semibold">{savedHandoffSummary?.title ?? 'This check-in is now part of the tracker story.'}</p>
              <p className="mt-2 text-sm leading-6">{savedHandoffSummary?.body ?? 'Use the highlighted card below to show how one result becomes a reusable follow-up instead of dying on the results screen.'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onReuse(highlightedEntry)}
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                Reuse newest save
              </button>
              <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900 ring-1 ring-emerald-200">
                Latest entry highlighted
              </div>
            </div>
          </div>
          {savedHandoffSummary ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900">
                {savedHandoffSummary.badges.map((badge) => (
                  <span key={badge} className="rounded-full bg-white px-3 py-2 ring-1 ring-emerald-200">
                    {badge}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {savedHandoffSummary.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-[1rem] bg-white px-3 py-3 text-sm leading-6 text-stone-700 ring-1 ring-emerald-100">
                    {bullet}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.6rem] bg-stone-950 p-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Trend snapshot</p>
          <p className="mt-3 text-xl font-semibold">{summary.headline}</p>
          <p className="mt-3 text-sm leading-7 text-white/75">{summary.body}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[trendScore, followUpWindow, trackerSignals[0]].map((item, index) => (
              <div key={index} className="rounded-[1.3rem] bg-white/8 p-4 ring-1 ring-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{index === 0 ? 'Trend score' : index === 1 ? 'Follow-up window' : trackerSignals[0].title}</p>
                <p className="mt-2 text-sm font-semibold">{index === 0 ? trendScore.headline : index === 1 ? followUpWindow.title : trackerSignals[0].value}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{index === 0 ? trendScore.body : index === 1 ? followUpWindow.body : trackerSignals[0].body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.6rem] bg-stone-50 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Latest saved entries</p>
          {latestThree.length ? (
            <div className="mt-4 space-y-3">
              {latestThree.map((item, index) => {
                const isRecentlySaved = item.id === recentlySavedId;
                const previousForItem = latestThree[index + 1] ?? history.find((candidate) => candidate.savedAt < item.savedAt) ?? null;
                const itemSavedHandoffSummary = buildSavedHandoffSummary(item, previousForItem);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onReuse(item)}
                    className={`w-full rounded-[1.3rem] px-4 py-4 text-left ring-1 transition ${
                      isRecentlySaved
                        ? 'bg-emerald-50 ring-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.12)] hover:ring-emerald-400'
                        : 'bg-white ring-stone-200 hover:ring-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-900">{item.stoolTypeLabel}: {item.stoolTypeName}</p>
                      <div className="flex flex-wrap justify-end gap-2">
                        {isRecentlySaved ? (
                          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white">Newest save</span>
                        ) : null}
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${item.shouldTalkToDoctor ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'}`}>{item.shouldTalkToDoctor ? 'Higher caution' : 'Lower caution'}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">{formatSavedAt(item.savedAt)} · {item.mode === 'photo' ? 'Photo' : 'Describe'} · {item.colorLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.notes || 'Tap to reuse as the next follow-up check-in.'}</p>

                    {itemSavedHandoffSummary ? (
                      <div className={`mt-3 rounded-[1rem] px-3 py-3 ring-1 ${isRecentlySaved ? 'bg-white/90 ring-emerald-200' : 'bg-stone-50 ring-stone-200'}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isRecentlySaved ? 'text-emerald-700' : 'text-stone-500'}`}>Saved handoff preview</p>
                            <p className="mt-2 text-sm font-semibold text-stone-900">{itemSavedHandoffSummary.title}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                            {itemSavedHandoffSummary.badges?.slice(0, 2).map((badge) => (
                              <span key={badge} className={`rounded-full px-2.5 py-1 ${isRecentlySaved ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-stone-700 ring-1 ring-stone-200'}`}>
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{itemSavedHandoffSummary.body}</p>
                        {itemSavedHandoffSummary.bullets?.length ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {itemSavedHandoffSummary.bullets.slice(0, 2).map((bullet) => (
                              <div key={bullet} className={`rounded-[0.9rem] px-3 py-3 text-sm leading-6 ${isRecentlySaved ? 'bg-emerald-50 text-emerald-950' : 'bg-white text-stone-700 ring-1 ring-stone-200'}`}>
                                {bullet}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isRecentlySaved ? 'text-emerald-700' : 'text-stone-500'}`}>
                        {isRecentlySaved ? 'Best next demo beat: turn this save into a follow-up draft.' : 'One tap turns this into the next follow-up draft.'}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isRecentlySaved ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
                        Reuse as follow-up
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-[1.3rem] bg-white px-4 py-4 text-sm leading-6 text-stone-600 ring-1 ring-stone-200">No saved check-ins yet. Save one result and the tracker starts to make sense.</p>
          )}
        </div>
      </div>

      {history.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {historyInsights.map((insight) => (
            <div key={insight.title} className="rounded-[1.4rem] bg-stone-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">{insight.title}</p>
              <p className="mt-2 text-sm font-semibold text-stone-900">{insight.value}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{insight.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {history.length ? (
        <div className={`mt-4 rounded-[1.5rem] p-4 ${driverAwareNextStep.tone}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Recommended next step</p>
              <p className="mt-2 text-base font-semibold">{driverAwareNextStep.title}</p>
              <p className="mt-2 text-sm leading-6">{driverAwareNextStep.body}</p>
            </div>
            <div className="rounded-full bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
              Tracker guidance
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {driverAwareNextStep.bullets.map((bullet) => (
              <div key={bullet} className="rounded-[1.25rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                <p className="text-sm leading-6">{bullet}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {driverSignals.length ? (
        <div className="mt-4 rounded-[1.5rem] bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200/70">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">Likely pattern drivers</p>
              <p className="mt-2 text-sm leading-6 text-amber-950">
                Repeated note themes now get pulled into the tracker so a reviewer can see what might be driving the recent story without opening every saved card.
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800 ring-1 ring-amber-200">
              {driverSignals.length} signal{driverSignals.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {driverSignals.map((signal) => (
              <div key={signal.id} className="rounded-[1.3rem] bg-white px-4 py-4 ring-1 ring-amber-200/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Driver signal</p>
                <p className="mt-2 text-sm font-semibold text-amber-950">{signal.label}</p>
                <p className="mt-2 text-sm leading-6 text-amber-950">{signal.body}</p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  {signal.matchCount} recent match{signal.matchCount === 1 ? "" : "es"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {history.length ? (
        <details className="group mt-4 rounded-[1.5rem] bg-stone-50 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-stone-900">
            Open deeper tracker details
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 group-open:hidden">Expand</span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 group-open:inline">Collapse</span>
          </summary>
          <HistoryPatternRail history={history} />
          <HistoryTimeline history={history} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {trackerSignals.map((signal) => (
              <div key={signal.title} className={`rounded-[1.4rem] p-4 ${signal.tone}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">{signal.title}</p>
                <p className="mt-2 text-sm font-semibold">{signal.value}</p>
                <p className="mt-2 text-sm leading-6 opacity-90">{signal.body}</p>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [activeDemoPackId, setActiveDemoPackId] = useState("");
  const [activeDemoPackLoadedAt, setActiveDemoPackLoadedAt] = useState(0);
  const [presenterNowMs, setPresenterNowMs] = useState(() => Date.now());
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [history, setHistory] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
      return [];
    }
  });
  const [form, setForm] = useState({
    mode: "photo",
    bristolTypeId: 4,
    colorValue: "brown",
    flags: [],
    notes: "",
  });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reusedHistoryItem, setReusedHistoryItem] = useState(null);
  const [analysisMeta, setAnalysisMeta] = useState(null);
  const [analysisError, setAnalysisError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [demoStatus, setDemoStatus] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [recentlySavedHistoryId, setRecentlySavedHistoryId] = useState("");
  const [followUpMission, setFollowUpMission] = useState(null);
  const [followUpNotesCollapsed, setFollowUpNotesCollapsed] = useState(false);
  const describeSectionRef = useRef(null);
  const resultSectionRef = useRef(null);
  const historySectionRef = useRef(null);
  const fileInputRef = useRef(null);
  const notesTextareaRef = useRef(null);
  const lastDemoPackPressRef = useRef({ id: "", at: 0, source: "" });

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!activeDemoPackId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPresenterNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [activeDemoPackId]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeDemoPackId || !activeDemoPackLoadedAt || step !== 2) {
      return undefined;
    }

    let canceled = false;
    const timeoutIds = [];

    const scrollDescribeSectionIntoView = (behavior = "smooth") => {
      if (canceled) {
        return;
      }

      const describeSection = describeSectionRef.current;

      if (!describeSection) {
        return;
      }

      const top = Math.max(0, window.scrollY + describeSection.getBoundingClientRect().top - 24);

      window.scrollTo({
        top,
        behavior,
      });
    };

    scrollDescribeSectionIntoView("auto");

    const frameId = window.requestAnimationFrame(() => {
      scrollDescribeSectionIntoView("auto");
      timeoutIds.push(window.setTimeout(() => scrollDescribeSectionIntoView("smooth"), 120));
      timeoutIds.push(window.setTimeout(() => scrollDescribeSectionIntoView("smooth"), 320));
      timeoutIds.push(window.setTimeout(() => scrollDescribeSectionIntoView("smooth"), 700));
    });

    return () => {
      canceled = true;
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [activeDemoPackId, activeDemoPackLoadedAt, step]);

  const previewInsight = useMemo(
    () =>
      buildInsight({
        ...form,
        hasPhoto: Boolean(selectedFile),
      }),
    [form, selectedFile],
  );

  const analysisStyle = ANALYSIS_STYLES[form.mode];
  const completionPercent = step === 1 ? 33 : step === 2 ? 66 : 100;
  const displayedResult = analysisResult ?? previewInsight;
  const hasSavedCurrentResult = useMemo(
    () =>
      history.some(
        (item) =>
          JSON.stringify({
            mode: item.mode,
            bristolTypeId: item.bristolTypeId,
            colorLabel: item.colorLabel,
            flags: [...item.flags].sort(),
            notes: item.notes,
            hasPhoto: item.hasPhoto,
            savedAtSource: item.hasPhoto ? "photo-attached" : "",
          }) ===
          JSON.stringify({
            mode: form.mode,
            bristolTypeId: displayedResult?.stoolType?.id ?? null,
            colorLabel: displayedResult?.color?.label ?? null,
            flags: [...form.flags].sort(),
            notes: form.notes.trim(),
            hasPhoto: Boolean(selectedFile),
            savedAtSource: Boolean(selectedFile) ? "photo-attached" : "",
          }),
      ),
    [displayedResult, form.flags, form.mode, form.notes, history, selectedFile],
  );
  const activeDemoPack = useMemo(
    () => DEMO_PACKS.find((pack) => pack.id === activeDemoPackId) ?? null,
    [activeDemoPackId],
  );
  const historyCoach = useMemo(() => buildHistoryCoach(history, displayedResult), [history, displayedResult]);
  const projectedHistory = useMemo(() => {
    if (!displayedResult?.stoolType || !displayedResult?.color) {
      return null;
    }

    return [
      buildHistoryItem(form, displayedResult, Boolean(selectedFile), {
        id: "projected-next-save",
        savedAt: new Date().toISOString(),
      }),
      ...history,
    ]
      .slice(0, MAX_HISTORY_ITEMS)
      .sort((left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime());
  }, [displayedResult, form, history, selectedFile]);
  const projectedHistoryNextStep = useMemo(
    () => (projectedHistory ? buildDriverAwareNextStep(projectedHistory) : null),
    [projectedHistory],
  );
  const projectedHistoryFollowUpWindow = useMemo(
    () => (projectedHistory ? buildFollowUpWindow(projectedHistory) : null),
    [projectedHistory],
  );
  const projectedHistoryRecoveryOutlook = useMemo(
    () => (projectedHistory ? buildRecoveryOutlook(projectedHistory) : null),
    [projectedHistory],
  );
  const projectedTrendScore = useMemo(
    () => (projectedHistory ? buildTrendScore(projectedHistory) : null),
    [projectedHistory],
  );
  const projectedSavedHandoffSummary = useMemo(
    () => (projectedHistory?.length ? buildSavedHandoffSummary(projectedHistory[0], projectedHistory[1] ?? null) : null),
    [projectedHistory],
  );
  const comparisonBaseline = useMemo(() => {
    if (reusedHistoryItem) {
      return {
        entry: reusedHistoryItem,
        sourceLabel: "reused check-in",
      };
    }

    if (!hasSavedCurrentResult && history[0]) {
      return {
        entry: history[0],
        sourceLabel: "last saved check-in",
      };
    }

    return null;
  }, [hasSavedCurrentResult, history, reusedHistoryItem]);
  const followUpComparison = useMemo(
    () =>
      comparisonBaseline
        ? buildFollowUpComparison(comparisonBaseline.entry, displayedResult, comparisonBaseline.sourceLabel)
        : null,
    [comparisonBaseline, displayedResult],
  );
  const currentSavedFollowUpMission = useMemo(
    () =>
      displayedResult?.stoolType && displayedResult?.color
        ? buildSavedFollowUpPrompt(
            displayedResult,
            followUpComparison,
            projectedHistoryFollowUpWindow,
            projectedHistoryNextStep,
          )
        : null,
    [displayedResult, followUpComparison, projectedHistoryFollowUpWindow, projectedHistoryNextStep],
  );
  const followUpDraftReadiness = useMemo(
    () => buildFollowUpDraftReadiness(reusedHistoryItem, form, selectedFile, followUpMission),
    [followUpMission, reusedHistoryItem, form, selectedFile],
  );
  const followUpDraftCoach = useMemo(
    () => buildFollowUpDraftCoach(reusedHistoryItem, form, selectedFile, history),
    [history, reusedHistoryItem, form, selectedFile],
  );
  const reuseHistoryBridge = useMemo(
    () => buildReuseHistoryBridge(reusedHistoryItem, history),
    [history, reusedHistoryItem],
  );
  const followUpDraftDeltaPreview = useMemo(
    () => buildFollowUpDraftDeltaPreview(reusedHistoryItem, form, selectedFile),
    [reusedHistoryItem, form, selectedFile],
  );
  const followUpQuickFillOptions = useMemo(
    () => buildFollowUpQuickFillOptions(reusedHistoryItem, form, history),
    [history, reusedHistoryItem, form],
  );
  const followUpResultCarryover = useMemo(
    () => buildFollowUpResultCarryover(followUpDraftDeltaPreview, displayedResult),
    [displayedResult, followUpDraftDeltaPreview],
  );
  const exportSummary = useMemo(
    () => buildExportSummary({
      result: displayedResult,
      form,
      history,
      analysisMeta,
      reuseHistoryBridge,
      followUpComparison,
      projectedTrendScore,
      projectedHistoryFollowUpWindow,
      projectedHistoryRecoveryOutlook,
      projectedHistoryNextStep,
    }),
    [
      analysisMeta,
      displayedResult,
      followUpComparison,
      form,
      history,
      projectedHistoryFollowUpWindow,
      projectedHistoryNextStep,
      projectedHistoryRecoveryOutlook,
      projectedTrendScore,
      reuseHistoryBridge,
    ],
  );

  function scrollToSection(sectionRef, options = {}) {
    if (typeof window === "undefined") {
      return;
    }

    const behavior = options.behavior ?? "smooth";
    const offsetTop = options.offsetTop ?? 0;
    const shouldFocus = options.focus ?? true;

    window.requestAnimationFrame(() => {
      const section = sectionRef?.current;

      if (!section) {
        return;
      }

      section.scrollIntoView({
        behavior,
        block: "start",
        inline: "nearest",
      });

      if (offsetTop) {
        window.requestAnimationFrame(() => {
          window.scrollBy({
            top: offsetTop,
            behavior,
          });
        });
      }

      if (typeof section.focus === "function" && shouldFocus) {
        section.focus({ preventScroll: true });
      }
    });
  }

  function forceDemoPackDescribeHandoff() {
    if (typeof window === "undefined") {
      return;
    }

    const handoffAttemptsMs = [0, 80, 220, 500];

    handoffAttemptsMs.forEach((delayMs) => {
      window.setTimeout(() => {
        scrollToSection(describeSectionRef, {
          behavior: "auto",
        });
      }, delayMs);
    });

    window.setTimeout(() => {
      notesTextareaRef.current?.focus();
    }, 260);
  }

  function updateHistory(nextHistory) {
    setHistory(nextHistory);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
    }
  }

  function handleSaveCheckIn() {
    if (hasSavedCurrentResult) {
      return;
    }

    const sourceResult = analysisResult ?? previewInsight;
    const savedItem = buildHistoryItem(form, sourceResult, Boolean(selectedFile));
    const nextHistory = [savedItem, ...history].slice(0, MAX_HISTORY_ITEMS);

    updateHistory(nextHistory);
    setRecentlySavedHistoryId(savedItem.id);
    setFollowUpMission(currentSavedFollowUpMission);
    setExportStatus("Saved to history. The newest entry is highlighted for the tracker handoff.");
    scrollToSection(historySectionRef);
  }

  function handleStartSavedFollowUp() {
    const savedEntry = history.find((item) => item.id === recentlySavedHistoryId) ?? history[0] ?? null;

    if (!savedEntry) {
      setExportStatus("Save a check-in first so Stool Scout has something to reuse.");
      return;
    }

    handleReuseHistoryItem(savedEntry, {
      keepMission: true,
      followUpMission: currentSavedFollowUpMission,
    });
  }

  async function copyPlainTextSummary(text, successLabel) {
    if (!text || typeof navigator === "undefined" || !navigator.clipboard) {
      setExportStatus("Copy is unavailable on this device/browser right now.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setExportStatus(successLabel);
    } catch {
      setExportStatus("Copy failed. Try again on a browser that allows clipboard access.");
    }
  }

  async function sharePlainTextSummary({ title, text, successLabel }) {
    if (!text || typeof navigator === "undefined") {
      setExportStatus("Share is unavailable on this device/browser right now.");
      return;
    }

    if (!navigator.share) {
      await copyPlainTextSummary(text, `${successLabel} Share sheet unavailable, so the summary was copied instead.`);
      return;
    }

    try {
      await navigator.share({
        title,
        text,
      });
      setExportStatus(successLabel);
    } catch (error) {
      if (error?.name === "AbortError") {
        setExportStatus("Share canceled.");
        return;
      }

      await copyPlainTextSummary(text, `${successLabel} Share fallback copied the summary instead.`);
    }
  }

  function handleCopyCurrentSummary() {
    copyPlainTextSummary(exportSummary, "Copied current check-in summary.");
  }

  function handleShareCurrentSummary() {
    sharePlainTextSummary({
      title: "Stool Scout check-in summary",
      text: exportSummary,
      successLabel: "Opened the share sheet for the current check-in summary.",
    });
  }

  function buildHistoryExportSummary() {
    const driverSignals = getHistoryDriverSignals(history);
    const historySummary = buildHistorySummary(history);
    const trend = getTrendDirection(history);
    const cautionCount = history.filter((item) => item.shouldTalkToDoctor).length;
    const trendScore = buildTrendScore(history);
    const followUpWindow = buildFollowUpWindow(history);
    const recoveryOutlook = buildRecoveryOutlook(history);
    const driverAwareNextStep = buildDriverAwareNextStep(history);
    const trackerSignals = buildTrackerSignals(history);

    return [
      "Stool Scout saved history summary",
      "",
      `Saved entries: ${history.length}`,
      ...history.slice(0, 5).map(
        (item) =>
          `- ${formatSavedAt(item.savedAt)} · ${item.stoolTypeLabel} ${item.stoolTypeName} · ${item.colorLabel} · ${item.shouldTalkToDoctor ? "higher caution" : "lower caution"}`,
      ),
      "",
      historySummary.headline,
      historySummary.body,
      "",
      `Trend: ${trend.label}`,
      `Caution count: ${cautionCount}/${history.length}`,
      `Trend score: ${trendScore.headline}`,
      `Follow-up window: ${followUpWindow.title}`,
      `Recovery outlook: ${recoveryOutlook.title}`,
      `Recommended next step: ${driverAwareNextStep.title}`,
      ...(driverSignals.length ? [`Likely pattern drivers: ${driverSignals.map((signal) => signal.label).join(", ")}`] : []),
      "",
      "Tracker signals:",
      ...trackerSignals.map((signal) => `- ${signal.title}: ${signal.value}. ${signal.body}`),
      "",
      "Follow-up window details:",
      `- ${followUpWindow.body}`,
      ...((followUpWindow.badges ?? []).map((badge) => `- ${badge}`)),
      ...((followUpWindow.bullets ?? []).map((bullet) => `- ${bullet}`)),
      "",
      "Recovery outlook details:",
      `- ${recoveryOutlook.body}`,
      ...((recoveryOutlook.bullets ?? []).map((bullet) => `- ${bullet}`)),
      "",
      "Recommended next-step details:",
      `- ${driverAwareNextStep.body}`,
      ...((driverAwareNextStep.bullets ?? []).map((bullet) => `- ${bullet}`)),
      ...(driverSignals.length
        ? [
            "",
            "Pattern-driver signals:",
            ...driverSignals.map((signal) => `- ${signal.label}: ${signal.body}`),
          ]
        : []),
      "",
      "Important: Stool Scout is an educational wellness tracker, not a medical diagnostic device.",
    ].join("\n");
  }

  function handleCopyHistorySummary() {
    copyPlainTextSummary(buildHistoryExportSummary(), "Copied saved-history summary.");
  }

  function handleShareHistorySummary() {
    sharePlainTextSummary({
      title: "Stool Scout saved history summary",
      text: buildHistoryExportSummary(),
      successLabel: "Opened the share sheet for the saved-history summary.",
    });
  }

  function jumpToHistory() {
    setExportStatus(history.length ? "Jumped to saved history." : exportStatus);
    scrollToSection(historySectionRef);
  }

  function goToDescribeStep() {
    setStep(2);
    scrollToSection(describeSectionRef);
  }

  function jumpToFollowUpAction(actionKey) {
    if (actionKey === "photo") {
      setStep(1);
      requestAnimationFrame(() => {
        fileInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        fileInputRef.current?.focus();
      });
      return;
    }

    if (actionKey === "draft") {
      setStep(2);
      requestAnimationFrame(() => {
        scrollToSection(describeSectionRef);
        notesTextareaRef.current?.focus();
      });
    }
  }

  function startAnotherCheckIn() {
    setActiveDemoPackId("");
    setActiveDemoPackLoadedAt(0);
    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");
    setReusedHistoryItem(null);
    setFollowUpMission(null);
    setFollowUpNotesCollapsed(false);
    setRecentlySavedHistoryId("");
    setStep(1);
  }

  function handleClearHistory() {
    updateHistory([]);
    setRecentlySavedHistoryId("");
  }

  function handleReuseHistoryItem(item, options = {}) {
    setActiveDemoPackId("");
    setActiveDemoPackLoadedAt(0);
    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");
    setRecentlySavedHistoryId("");
    setFollowUpMission(options.keepMission ? options.followUpMission ?? followUpMission : null);
    setFollowUpNotesCollapsed(Boolean(item?.notes?.trim()));
    setReusedHistoryItem(item);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setForm({
      mode: item.mode,
      bristolTypeId: Number(item.bristolTypeId || 4),
      colorValue:
        COLOR_OPTIONS.find((color) => color.label === item.colorLabel)?.value ?? "brown",
      flags: Array.isArray(item.flags) ? item.flags : [],
      notes: item.notes ?? "",
    });
    setExportStatus(`Loaded ${item.stoolTypeLabel}: ${item.stoolTypeName} as a follow-up draft.`);
    setStep(2);
    scrollToSection(describeSectionRef);
  }

  function applyDemoHistoryPreset(preset) {
    setActiveDemoPackId("");
    setActiveDemoPackLoadedAt(0);
    updateHistory(buildSeededHistoryFromPreset(preset));
    setRecentlySavedHistoryId("");
    setReusedHistoryItem(null);
    setFollowUpMission(null);
    setDemoStatus(`Loaded ${preset.items.length} saved history entries from ${preset.name}.`);
  }

  function applySelectedFile(file, options = {}) {
    const preserveDemoPack = options.preserveDemoPack ?? false;
    const preserveStep = options.preserveStep ?? false;
    const preserveDemoStatus = options.preserveDemoStatus ?? false;
    const preserveReuseContext = options.preserveReuseContext ?? false;

    if (!preserveDemoPack) {
      setActiveDemoPackId("");
      setActiveDemoPackLoadedAt(0);
    }

    if (!preserveStep) {
      setStep(1);
    }

    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");
    setUploadError("");

    if (!preserveDemoStatus) {
      setDemoStatus("");
    }

    if (!preserveReuseContext) {
      setReusedHistoryItem(null);
      setFollowUpMission(null);
    }

    if (!file) {
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
      return;
    }

    const validationError = getImageValidationError(file);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setForm((currentForm) => ({ ...currentForm, mode: "photo" }));
  }

  async function applyDemoImageFixture(fixture, options = {}) {
    const response = await fetch(fixture.path);

    if (!response.ok) {
      throw new Error("Could not load the built-in demo image.");
    }

    const blob = await response.blob();
    const file = new File([blob], fixture.fileName, { type: fixture.mimeType });
    applySelectedFile(file, options);

    if (!options.preserveDemoStatus) {
      setDemoStatus(`Loaded ${fixture.name}. The photo-first demo flow is ready.`);
    }
  }

  async function handleDemoImageFixture(fixture) {
    try {
      await applyDemoImageFixture(fixture);
    } catch (error) {
      setDemoStatus(error.message || "Could not load the built-in demo image.");
    }
  }

  function handleDemoPackPress(pack, source = "click") {
    const now = Date.now();
    const lastPress = lastDemoPackPressRef.current;

    if (lastPress.id === pack.id && now - lastPress.at < 750) {
      return;
    }

    lastDemoPackPressRef.current = {
      id: pack.id,
      at: now,
      source,
    };
    applyDemoPack(pack);
  }

  function applyDemoPack(pack) {
    const fixture = getDemoFixtureById(pack.fixtureId);
    const scenario = getDemoScenarioById(pack.scenarioId);
    const historyPreset = getDemoHistoryPresetById(pack.historyPresetId);

    if (!scenario || !historyPreset) {
      setDemoStatus("Demo pack is missing one of its linked presets.");
      return;
    }

    const loadCoreDemoPackState = ({ mode, status }) => {
      flushSync(() => {
        setActiveDemoPackId(pack.id);
        setActiveDemoPackLoadedAt(Date.now());
        setPresenterNowMs(Date.now());
        updateHistory(buildSeededHistoryFromPreset(historyPreset));
        setAnalysisResult(null);
        setAnalysisMeta(null);
        setAnalysisError("");
        setRecentlySavedHistoryId("");
        setReusedHistoryItem(null);
        setFollowUpMission(null);
        setForm({
          ...scenario.form,
          mode,
        });
        setStep(2);
        setDemoStatus(status);
      });
      forceDemoPackDescribeHandoff();
    };

    loadCoreDemoPackState({
      mode: scenario.form.mode,
      status: `Loaded ${pack.name}: guided inputs and seeded history are ready. Demo photo is loading if this device supports it.`,
    });

    if (!fixture) {
      return;
    }

    void applyDemoImageFixture(fixture, {
      preserveDemoPack: true,
      preserveStep: true,
      preserveDemoStatus: true,
    })
      .then(() => {
        loadCoreDemoPackState({
          mode: "photo",
          status: `Loaded ${pack.name}: sample photo, guided inputs, and seeded history are ready.`,
        });
      })
      .catch(() => {
        loadCoreDemoPackState({
          mode: scenario.form.mode,
          status: `Loaded ${pack.name}: guided inputs and seeded history are ready. Built-in photo fixture could not be loaded on this device, so the pack fell back to the no-photo path.`,
        });
      });
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      applySelectedFile(null);
      return;
    }

    const validationError = getImageValidationError(file);

    if (validationError) {
      setUploadError(validationError);
      event.target.value = "";
      return;
    }

    applySelectedFile(file);
  }

  function handleFlagToggle(flagValue) {
    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");

    setForm((currentForm) => {
      const alreadySelected = currentForm.flags.includes(flagValue);

      return {
        ...currentForm,
        flags: alreadySelected
          ? currentForm.flags.filter((flag) => flag !== flagValue)
          : [...currentForm.flags, flagValue],
      };
    });
  }

  function handleApplyFollowUpQuickFill(option) {
    if (!option?.apply) {
      return;
    }

    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");
    setForm((currentForm) => option.apply(currentForm));
    setExportStatus(`Applied quick fill: ${option.label}.`);

    requestAnimationFrame(() => {
      notesTextareaRef.current?.focus();
    });
  }

  function applyDemoScenario(scenario) {
    setActiveDemoPackId("");
    setActiveDemoPackLoadedAt(0);
    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");
    setRecentlySavedHistoryId("");
    setFollowUpMission(null);
    setDemoStatus(`Loaded ${scenario.name}. Review the guided inputs, then run analysis.`);
    setForm(scenario.form);
    setStep(2);
  }

  function resetDemo() {
    setActiveDemoPackId("");
    setActiveDemoPackLoadedAt(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setStep(1);
    setAnalysisResult(null);
    setAnalysisMeta(null);
    setAnalysisError("");
    setRecentlySavedHistoryId("");
    setDemoStatus("");
    setIsAnalyzing(false);
    setReusedHistoryItem(null);
    setFollowUpMission(null);
    setFollowUpNotesCollapsed(false);
    setForm({
      mode: "photo",
      bristolTypeId: 4,
      colorValue: "brown",
      flags: [],
      notes: "",
    });
  }

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const payload = new FormData();
      payload.append("mode", form.mode);
      payload.append("bristolTypeId", String(form.bristolTypeId));
      payload.append("colorValue", form.colorValue);
      payload.append("flags", JSON.stringify(form.flags));
      payload.append("notes", form.notes);

      if (selectedFile) {
        payload.append("photo", selectedFile);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setAnalysisResult(data.result);
      setAnalysisMeta(data.analysisMeta ?? null);
      setStep(3);
      scrollToSection(resultSectionRef);
    } catch (error) {
      setAnalysisResult(null);
      setAnalysisMeta(null);
      setAnalysisError(error.message || "Unable to analyze this check-in right now.");
      setStep(3);
      scrollToSection(resultSectionRef);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#f8fafc_30%,#f5f5f4_100%)] px-4 py-5 pb-32 text-stone-900 sm:px-6 sm:py-8 sm:pb-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:gap-6">
        <section className="overflow-hidden rounded-[2rem] bg-stone-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">Stool Scout</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
                Start with a photo. Or just describe it. Then get a clearer gut-health read.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base">
                Mobile-first, honest, and built for fast demos: capture or upload a stool photo, or skip straight to a description-based check-in. Then get a conservative read on stool type, gut rhythm, nutrition ideas, and when to be more cautious.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Demo readiness</p>
              <p className="mt-2 text-3xl font-bold text-white">{completionPercent}%</p>
              <p className="mt-1 text-sm text-stone-300">Current step: {step === 1 ? "Capture" : step === 2 ? "Describe" : "Results"}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <StepPill step="1" active={step === 1} done={step > 1} label="Capture" />
            <StepPill step="2" active={step === 2} done={step > 2} label="Describe" />
            <StepPill step="3" active={step === 3} done={false} label="Results" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="rounded-3xl bg-stone-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Check-in route
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Start with a photo if you have one. Otherwise, use the guided description path and keep the check-in moving.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetDemo}
                    className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {Object.entries(ANALYSIS_STYLES).map(([value, details]) => {
                    const isActive = form.mode === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setAnalysisResult(null);
                          setAnalysisMeta(null);
                          setAnalysisError("");
                          setForm((currentForm) => ({
                            ...currentForm,
                            mode: value,
                          }));
                          setStep(1);
                        }}
                        className={`rounded-3xl border px-4 py-4 text-left transition ${
                          isActive
                            ? "border-stone-900 bg-stone-900 text-white"
                            : "border-stone-300 bg-white text-stone-800"
                        }`}
                      >
                        <p className="text-sm font-semibold">{details.badge}</p>
                        <p className={`mt-2 text-sm leading-6 ${isActive ? "text-stone-200" : "text-stone-600"}`}>
                          {details.body}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">{analysisStyle.badge}</p>
                <h2 className="mt-2 text-xl font-bold text-emerald-950">{analysisStyle.headline}</h2>
                <p className="mt-2 text-sm leading-6 text-emerald-950">{analysisStyle.body}</p>
              </div>

              <div className="rounded-3xl bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">How the product works</p>
                <h2 className="mt-2 text-xl font-bold text-violet-950">Structured input first, clearer guidance second</h2>
                <p className="mt-2 text-sm leading-6 text-violet-950">
                  Stool Scout turns a quick check-in into a conservative read on stool form, caution level, likely drivers, and what to do next. The app already posts each analysis request through <span className="font-semibold">/api/analyze</span>, which keeps the current product honest and preserves a clean seam for future image intelligence.
                </p>
              </div>

              <div className="rounded-3xl bg-white p-4 ring-1 ring-stone-200 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Product principles</p>
                    <h2 className="mt-2 text-xl font-bold text-stone-950">What this app is trying to be</h2>
                  </div>
                  <div className="rounded-full bg-stone-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-700">
                    MVP direction
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {PRODUCT_PRINCIPLES.map((principle) => (
                    <div key={principle.title} className="rounded-[1.5rem] bg-stone-50 p-4">
                      <p className="text-sm font-semibold text-stone-950">{principle.title}</p>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{principle.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-amber-50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                      Quick starts
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-amber-950">Open the app with a believable check-in already loaded</h2>
                    <p className="mt-2 text-sm leading-6 text-amber-950">
                      These presets are still useful for fast founder reviews, but they now act more like guided starting points than a pure demo gimmick.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {DEMO_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => applyDemoScenario(scenario)}
                      className="rounded-3xl bg-white px-4 py-4 text-left ring-1 ring-amber-200 transition hover:ring-amber-400"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-amber-950">{scenario.name}</p>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                          {scenario.form.mode === "photo" ? "Photo-first" : "Describe-it"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-amber-950">{scenario.blurb}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-emerald-50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Guided app states</p>
                    <h2 className="mt-2 text-xl font-bold text-emerald-950">Load a complete starting point in one move</h2>
                    <p className="mt-2 text-sm leading-6 text-emerald-950">
                      These packs preload a photo fixture, guided inputs, and seeded tracker history together so the app can open in a believable state without manual setup.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {DEMO_PACKS.map((pack) => {
                    const isActivePack = activeDemoPackId === pack.id;

                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => handleDemoPackPress(pack, "click")}
                        className={[
                          "touch-manipulation rounded-3xl px-4 py-4 text-left transition active:scale-[0.99]",
                          isActivePack
                            ? "bg-emerald-950 text-white ring-2 ring-emerald-500 shadow-lg"
                            : "bg-white text-emerald-950 ring-1 ring-emerald-200 hover:ring-emerald-400",
                        ].join(" ")}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className={isActivePack ? "text-sm font-semibold text-white" : "text-sm font-semibold text-emerald-950"}>{pack.name}</p>
                            <p className={isActivePack ? "mt-2 text-sm leading-6 text-emerald-50" : "mt-2 text-sm leading-6 text-emerald-950"}>{pack.blurb}</p>
                          </div>
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                              isActivePack ? "bg-white/15 text-emerald-50" : "bg-emerald-100 text-emerald-900",
                            ].join(" ")}
                          >
                            {isActivePack ? "Loaded" : "Tap to load"}
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <p className={isActivePack ? "text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100" : "text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700"}>
                            Photo + guided inputs + saved trend
                          </p>
                          <span className={isActivePack ? "text-sm font-semibold text-white" : "text-sm font-semibold text-emerald-900"}>
                            {isActivePack ? "Ready" : "Load pack →"}
                          </span>
                        </div>
                        {isActivePack ? (
                          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-emerald-50 ring-1 ring-white/10">
                            Demo pack loaded. The app should jump you into the guided describe step with seeded tracker history ready below.
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {demoStatus ? (
                  <div className="mt-4 rounded-3xl bg-blue-50 p-4 text-blue-950 ring-1 ring-blue-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Demo status</p>
                    <p className="mt-2 text-sm leading-6">{demoStatus}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl bg-blue-50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Fast first-run flow</p>
                    <h2 className="mt-2 text-xl font-bold text-blue-950">What a new user should do first</h2>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl bg-white p-4 ring-1 ring-blue-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">1</p>
                    <p className="mt-2 text-sm font-semibold text-blue-950">Start with a photo or quick-start state</p>
                    <p className="mt-2 text-sm leading-6 text-blue-950">Open with the fastest believable input path instead of making the first session feel like work.</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 ring-1 ring-blue-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">2</p>
                    <p className="mt-2 text-sm font-semibold text-blue-950">Get a clear read</p>
                    <p className="mt-2 text-sm leading-6 text-blue-950">Turn the check-in into a structured result with likely pattern, caution level, and practical next actions.</p>
                  </div>
                  <div className="rounded-3xl bg-white p-4 ring-1 ring-blue-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">3</p>
                    <p className="mt-2 text-sm font-semibold text-blue-950">Save the pattern</p>
                    <p className="mt-2 text-sm leading-6 text-blue-950">The habit loop matters: save the result so the next check-in has context and the trend becomes more useful.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-blue-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">History shortcut states</p>
                      <p className="mt-2 text-sm leading-6 text-blue-950">
                        These quick-load history states help test the tracker experience fast, but the long-term goal is a habit product where the trend builds from real repeat check-ins.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                      Demo shortcut
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {DEMO_HISTORY_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyDemoHistoryPreset(preset)}
                        className="rounded-3xl bg-blue-50 px-4 py-4 text-left ring-1 ring-blue-200 transition hover:ring-blue-400"
                      >
                        <p className="text-sm font-semibold text-blue-950">{preset.name}</p>
                        <p className="mt-2 text-sm leading-6 text-blue-950">{preset.blurb}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                          Loads {preset.items.length} saved entries
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">Take or upload a photo</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Start here on mobile. Camera-first is the intended experience, but upload works too.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200"
                  >
                    Step 1
                  </button>
                </div>

                <label className="mt-4 block rounded-3xl bg-white p-4 ring-1 ring-stone-200">
                  <span className="block text-sm font-semibold text-stone-900">Photo input</span>
                  <span className="mt-1 block text-sm text-stone-600">
                    Use camera or upload from library. Later this will feed a real vision model. JPG, PNG, and WebP are supported up to 8 MB.
                  </span>
                  <input
                    ref={fileInputRef}
                    className="mt-4 block w-full text-sm text-stone-700"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={handleFileChange}
                  />
                </label>

                {uploadError ? (
                  <div className="mt-4 rounded-3xl bg-rose-50 p-4 text-rose-950">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Upload issue</p>
                    <p className="mt-2 text-sm leading-6">{uploadError}</p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Current image status</p>
                    <p className="mt-2 text-sm font-semibold text-stone-900">
                      {selectedFile ? "Photo attached" : "No photo attached yet"}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {selectedFile
                        ? `${selectedFile.name} · ${formatFileSize(selectedFile.size)}`
                        : "You can still continue with guided inputs only."}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Fast demo script</p>
                    <p className="mt-2 text-sm text-stone-700">
                      Upload a sample image, tap continue, pick a stool type + color, then call the analysis route and show the result card.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-blue-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Built-in sample fixtures</p>
                      <p className="mt-2 text-sm leading-6 text-blue-950">
                        Load a bundled PNG so the photo-first flow stays repeatable even when there is no camera roll handy during QA or a live walkthrough.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-900 ring-1 ring-blue-200">
                      Repeatable QA
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {DEMO_IMAGE_FIXTURES.map((fixture) => (
                      <button
                        key={fixture.id}
                        type="button"
                        onClick={() => handleDemoImageFixture(fixture)}
                        className="rounded-3xl bg-white px-4 py-4 text-left ring-1 ring-blue-200 transition hover:ring-blue-400"
                      >
                        <p className="text-sm font-semibold text-blue-950">{fixture.name}</p>
                        <p className="mt-2 text-sm leading-6 text-blue-950">{fixture.blurb}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                          Loads {fixture.fileName}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <CaptureActionCard
                  mode={form.mode}
                  selectedFile={selectedFile}
                  onContinue={goToDescribeStep}
                  onSkipPhoto={() => {
                    setAnalysisResult(null);
                    setAnalysisMeta(null);
                    setAnalysisError("");
                    setForm((currentForm) => ({ ...currentForm, mode: "describe" }));
                    goToDescribeStep();
                  }}
                />
              </div>

              <div ref={describeSectionRef} tabIndex={-1} className="rounded-3xl bg-stone-50 p-4 sm:p-5 focus:outline-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">Describe the stool</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Whether AI reads the image or not, this layer gives the app a safer, clearer, more controllable interpretation path.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={goToDescribeStep}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200"
                  >
                    Step 2
                  </button>
                </div>

                {reusedHistoryItem ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-3xl bg-blue-50 p-4 text-blue-950">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Follow-up draft</p>
                          <p className="mt-2 text-sm font-semibold">
                            Reusing {reusedHistoryItem.stoolTypeLabel}: {reusedHistoryItem.stoolTypeName} from {formatSavedAt(reusedHistoryItem.savedAt)}
                          </p>
                          <p className="mt-2 text-sm leading-6">
                            The form is prefilled from that saved check-in so you can update just what changed and then compare the new result against the prior entry.
                          </p>
                        </div>
                        <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-900 ring-1 ring-blue-200">
                          Baseline → new entry
                        </div>
                      </div>

                      {followUpDraftDeltaPreview ? (
                        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
                          <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-blue-100">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Saved baseline</p>
                            <p className="mt-2 text-sm font-semibold text-stone-900">{followUpDraftDeltaPreview.previous.stool}</p>
                            <p className="mt-1 text-sm leading-6 text-stone-600">{followUpDraftDeltaPreview.previous.color} · {followUpDraftDeltaPreview.previous.flags}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-stone-500">{formatSavedAt(reusedHistoryItem.savedAt)}</p>
                          </div>

                          <div className="flex items-center justify-center">
                            <div className="rounded-full bg-blue-600 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                              {followUpDraftDeltaPreview.changeCount > 0
                                ? `${followUpDraftDeltaPreview.changeCount} change${followUpDraftDeltaPreview.changeCount === 1 ? '' : 's'}`
                                : 'Edit draft'}
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] bg-blue-950 px-4 py-4 text-white ring-1 ring-blue-800">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">Current draft</p>
                            <p className="mt-2 text-sm font-semibold">{followUpDraftDeltaPreview.current.stool}</p>
                            <p className="mt-1 text-sm leading-6 text-blue-100">{followUpDraftDeltaPreview.current.color} · {followUpDraftDeltaPreview.current.flags}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-blue-200">{selectedFile ? 'Fresh photo attached' : reusedHistoryItem.hasPhoto ? 'Needs fresh photo for full photo-to-photo story' : 'Describe-only follow-up draft'}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {followUpMission ? (
                      <div className="rounded-3xl bg-emerald-50 p-4 text-emerald-950 ring-1 ring-emerald-200">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Carryover from saved result</p>
                            <p className="mt-2 text-sm font-semibold">{followUpMission.title}</p>
                            <p className="mt-2 text-sm leading-6">{followUpMission.body}</p>
                          </div>
                          <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900 ring-1 ring-emerald-200">
                            Follow-up mission loaded
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-900">
                          {followUpMission.badges?.map((badge) => (
                            <span key={badge} className="rounded-full bg-white px-3 py-2 ring-1 ring-emerald-200">
                              {badge}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {followUpMission.bullets?.slice(0, 4).map((bullet) => (
                            <div key={bullet} className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-emerald-100">
                              <p className="text-sm leading-6 text-stone-700">{bullet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {reuseHistoryBridge ? (
                      <div className="rounded-3xl bg-violet-50 p-4 text-violet-950 ring-1 ring-violet-200">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Exact saved-story carryover</p>
                            <p className="mt-2 text-sm font-semibold">{reuseHistoryBridge.title}</p>
                            <p className="mt-2 text-sm leading-6">{reuseHistoryBridge.body}</p>
                          </div>
                          <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-900 ring-1 ring-violet-200">
                            History → draft bridge
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-900">
                          {reuseHistoryBridge.badges?.map((badge) => (
                            <span key={badge} className="rounded-full bg-white px-3 py-2 ring-1 ring-violet-200">
                              {badge}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {reuseHistoryBridge.bullets?.map((bullet) => (
                            <div key={bullet} className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-violet-100">
                              <p className="text-sm leading-6 text-stone-700">{bullet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {followUpDraftReadiness ? (
                      <div className={`rounded-3xl p-4 ${followUpDraftReadiness.tone}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Follow-up readiness</p>
                            <p className="mt-2 text-sm font-semibold">{followUpDraftReadiness.title}</p>
                            <p className="mt-2 text-sm leading-6">{followUpDraftReadiness.body}</p>
                          </div>
                          <div className="rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
                            {followUpDraftReadiness.progressLabel}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {followUpDraftReadiness.checklist.map((item) => (
                            <div key={item.label} className="rounded-[1.25rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">{item.label}</p>
                                  <p className="mt-2 text-sm leading-6 opacity-90">{item.detail}</p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${item.done ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
                                  {item.done ? "Ready" : "Needs action"}
                                </span>
                              </div>
                              {!item.done && item.actionKey ? (
                                <button
                                  type="button"
                                  onClick={() => jumpToFollowUpAction(item.actionKey)}
                                  className="mt-3 rounded-full bg-stone-900 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
                                >
                                  {item.actionLabel}
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {!followUpDraftReadiness.readyToAnalyze && followUpDraftReadiness.nextMissingAction ? (
                          <div className="mt-4 flex justify-start">
                            <button
                              type="button"
                              onClick={() => jumpToFollowUpAction(followUpDraftReadiness.nextMissingAction)}
                              className="rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white"
                            >
                              {followUpDraftReadiness.nextMissingActionLabel || "Do the next missing step"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {followUpDraftCoach ? (
                      <div className={`rounded-3xl p-4 ${followUpDraftCoach.tone}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Follow-up coaching</p>
                            <p className="mt-2 text-sm font-semibold">{followUpDraftCoach.title}</p>
                            <p className="mt-2 text-sm leading-6">{followUpDraftCoach.body}</p>
                          </div>
                          <div className="rounded-full bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/80">
                            {selectedFile ? 'Fresh photo attached' : reusedHistoryItem.hasPhoto ? 'Photo prompt active' : 'Describe-only follow-up'}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {followUpDraftCoach.bullets.map((bullet) => (
                            <div key={bullet} className="rounded-[1.25rem] bg-white/70 px-4 py-4 ring-1 ring-white/70">
                              <p className="text-sm leading-6">{bullet}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {followUpDraftDeltaPreview ? (
                      <div className="rounded-3xl bg-white p-4 ring-1 ring-blue-200">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Before / after preview</p>
                            <p className="mt-2 text-sm font-semibold text-stone-900">
                              {followUpDraftDeltaPreview.changeCount > 0
                                ? `This draft already changes ${followUpDraftDeltaPreview.changeCount} core field${followUpDraftDeltaPreview.changeCount === 1 ? '' : 's'} before analysis.`
                                : 'This draft still mirrors the saved baseline too closely.'}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                              The follow-up flow now shows the saved baseline beside the in-progress draft so the next comparison is obvious before you even run analysis.
                            </p>
                          </div>
                          <div className="rounded-full bg-blue-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-900 ring-1 ring-blue-200">
                            Draft delta preview
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-700">
                          {followUpDraftDeltaPreview.changeBadges.map((badge) => (
                            <span key={badge} className="rounded-full bg-stone-100 px-3 py-2 ring-1 ring-stone-200">
                              {badge}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-2">
                          <div className="rounded-[1.25rem] bg-stone-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Saved baseline</p>
                            <div className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
                              <p><span className="font-semibold text-stone-900">Mode:</span> {followUpDraftDeltaPreview.previous.mode}</p>
                              <p><span className="font-semibold text-stone-900">Stool:</span> {followUpDraftDeltaPreview.previous.stool}</p>
                              <p><span className="font-semibold text-stone-900">Color:</span> {followUpDraftDeltaPreview.previous.color}</p>
                              <p><span className="font-semibold text-stone-900">Flags:</span> {followUpDraftDeltaPreview.previous.flags}</p>
                              <p><span className="font-semibold text-stone-900">Photo:</span> {followUpDraftDeltaPreview.previous.photo}</p>
                              <p><span className="font-semibold text-stone-900">Notes:</span> {followUpDraftDeltaPreview.previous.notes}</p>
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] bg-blue-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Current follow-up draft</p>
                            <div className="mt-3 space-y-2 text-sm leading-6 text-blue-950">
                              <p><span className="font-semibold">Mode:</span> {followUpDraftDeltaPreview.current.mode}</p>
                              <p><span className="font-semibold">Stool:</span> {followUpDraftDeltaPreview.current.stool}</p>
                              <p><span className="font-semibold">Color:</span> {followUpDraftDeltaPreview.current.color}</p>
                              <p><span className="font-semibold">Flags:</span> {followUpDraftDeltaPreview.current.flags}</p>
                              <p><span className="font-semibold">Photo:</span> {followUpDraftDeltaPreview.current.photo}</p>
                              <p><span className="font-semibold">Notes:</span> {followUpDraftDeltaPreview.current.notes}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          {followUpDraftDeltaPreview.narrative.map((line) => (
                            <div key={line} className="rounded-[1.25rem] bg-white px-4 py-4 text-sm leading-6 text-stone-700 ring-1 ring-stone-200">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-900">Bristol stool type</span>
                    <select
                      className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                      value={form.bristolTypeId}
                      onChange={(event) => {
                        setAnalysisResult(null);
                        setAnalysisMeta(null);
                        setAnalysisError("");
                        setForm((currentForm) => ({
                          ...currentForm,
                          bristolTypeId: Number(event.target.value),
                        }));
                      }}
                    >
                      {BRISTOL_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label} — {type.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-stone-900">Observed color</span>
                    <select
                      className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                      value={form.colorValue}
                      onChange={(event) => {
                        setAnalysisResult(null);
                        setAnalysisMeta(null);
                        setAnalysisError("");
                        setForm((currentForm) => ({
                          ...currentForm,
                          colorValue: event.target.value,
                        }));
                      }}
                    >
                      {COLOR_OPTIONS.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-stone-900">Additional flags</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {ALERT_FLAGS.map((flag) => {
                      const isActive = form.flags.includes(flag.value);

                      return (
                        <button
                          key={flag.value}
                          type="button"
                          onClick={() => handleFlagToggle(flag.value)}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            isActive
                              ? "border-stone-900 bg-stone-900 text-white"
                              : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"
                          }`}
                        >
                          {flag.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {reusedHistoryItem && followUpQuickFillOptions.length ? (
                  <div className="mt-4 rounded-3xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Quick-fill follow-up edits</p>
                        <p className="mt-2 text-sm font-semibold">One tap makes the follow-up draft meaningfully different from the saved baseline.</p>
                        <p className="mt-2 text-sm leading-6">Useful for mobile demos when you want the comparison story to change fast without typing everything manually.</p>
                      </div>
                      <div className="rounded-full bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900 ring-1 ring-amber-200">
                        Tap to update draft
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {followUpQuickFillOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleApplyFollowUpQuickFill(option)}
                          className="rounded-[1.25rem] bg-white px-4 py-4 text-left ring-1 ring-amber-200 transition hover:ring-amber-400"
                        >
                          <p className="text-sm font-semibold text-amber-950">{option.label}</p>
                          <p className="mt-2 text-sm leading-6 text-amber-950">{option.description}</p>
                          {option.why ? (
                            <p className="mt-3 text-xs leading-5 text-amber-900/80">{option.why}</p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-3xl bg-white p-4 ring-1 ring-stone-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Notes</p>
                      <p className="mt-2 text-sm font-semibold text-stone-900">Context makes the tracker smarter</p>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        Travel, hydration, meal changes, stress, and symptoms usually explain more than stool form alone.
                      </p>
                    </div>
                    {reusedHistoryItem && form.notes.trim() ? (
                      <button
                        type="button"
                        onClick={() => setFollowUpNotesCollapsed((currentValue) => !currentValue)}
                        className="rounded-full bg-stone-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-700 ring-1 ring-stone-200"
                      >
                        {followUpNotesCollapsed ? "Expand notes" : "Collapse notes"}
                      </button>
                    ) : null}
                  </div>

                  {reusedHistoryItem ? (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[1.25rem] bg-stone-50 px-4 py-4 ring-1 ring-stone-200">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Saved baseline context</p>
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                          {(reusedHistoryItem.notes ?? "").trim() || "No notes were saved on the baseline entry, so add context now if anything changed."}
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] bg-blue-50 px-4 py-4 ring-1 ring-blue-200">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Current draft context</p>
                        <p className="mt-2 text-sm leading-6 text-blue-950">
                          {form.notes.trim()
                            ? followUpNotesCollapsed
                              ? `${form.notes.trim().slice(0, 120)}${form.notes.trim().length > 120 ? "…" : ""}`
                              : form.notes.trim()
                            : "No follow-up context added yet. Add one line about what changed since the saved baseline."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {!followUpNotesCollapsed ? (
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-semibold text-stone-900">Notes field</span>
                      <textarea
                        ref={notesTextareaRef}
                        className="min-h-28 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-900"
                        placeholder="Recent foods, stress, medication, travel, anything weird, or just describe what you noticed..."
                        value={form.notes}
                        onChange={(event) => {
                          setAnalysisResult(null);
                          setAnalysisMeta(null);
                          setAnalysisError("");
                          setForm((currentForm) => ({
                            ...currentForm,
                            notes: event.target.value,
                          }));
                        }}
                      />
                    </label>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="rounded-full bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAnalyzing ? "Analyzing..." : "Analyze stool"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-300"
                  >
                    Back to photo
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            {activeDemoPack ? (
              <PresenterModeCard
                activeDemoPack={activeDemoPack}
                step={step}
                analysisResult={analysisResult}
                historyCount={history.length}
                hasProjectedTrackerPreview={Boolean(projectedHistoryNextStep)}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                onReset={resetDemo}
                loadedAt={activeDemoPackLoadedAt}
                nowMs={presenterNowMs}
              />
            ) : null}

            <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Live preview</p>
                  <h2 className="mt-2 text-xl font-bold text-stone-900">Capture screen</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    This simulates the first mobile screen: photo capture first, then interpretation.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700"
                >
                  View step 1
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[2rem] bg-stone-950 p-3 text-white">
                <div className="mx-auto flex min-h-[26rem] max-w-[22rem] flex-col rounded-[2rem] bg-stone-900 p-4 shadow-2xl ring-1 ring-white/10">
                  <div className="mb-4 flex items-center justify-between text-xs text-stone-400">
                    <span>Stool Scout</span>
                    <span>{form.mode === "photo" ? "AI capture" : "Describe mode"}</span>
                  </div>

                  <div className="relative flex-1 overflow-hidden rounded-[1.5rem] bg-stone-800">
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt="Uploaded stool preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-stone-400">
                        Camera / upload preview appears here. This should feel like the first screen of the app.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-3 text-xs leading-5 text-stone-200">
                      <p className="font-semibold text-white">Detected route</p>
                      <p className="mt-1">{selectedFile ? "Photo attached" : "No image yet"}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 text-xs leading-5 text-stone-200">
                      <p className="font-semibold text-white">Likely type</p>
                      <p className="mt-1">{displayedResult.stoolType?.label ?? "—"}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="mt-4 rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAnalyzing ? "Calling analysis..." : "Show results"}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Quick demo notes</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-700">
                {QUICK_DEMO_NOTES.map((note) => (
                  <li key={note} className="rounded-2xl bg-stone-50 px-4 py-3">
                    {note}
                  </li>
                ))}
              </ul>
            </section>

            <HistoryCard
              history={history}
              onClear={handleClearHistory}
              onReuse={handleReuseHistoryItem}
              exportStatus={exportStatus}
              onCopyHistorySummary={handleCopyHistorySummary}
              onShareHistorySummary={handleShareHistorySummary}
              sectionRef={historySectionRef}
              recentlySavedId={recentlySavedHistoryId}
            />

            {step >= 3 ? (
              <>
                {analysisError ? (
                  <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
                    <div className="rounded-3xl bg-rose-50 p-4">
                      <h2 className="text-lg font-bold text-rose-950">Analysis failed</h2>
                      <p className="mt-2 text-sm leading-6 text-rose-950">{analysisError}</p>
                      <p className="mt-2 text-sm leading-6 text-rose-950">
                        The product should handle this gracefully. The current client preview still exists, but the demo result is intentionally tied to the API response.
                      </p>
                    </div>
                  </section>
                ) : null}

                <ResultCard
                  result={displayedResult}
                  onSave={handleSaveCheckIn}
                  savedCount={history.length}
                  analysisMeta={analysisMeta}
                  historyCoach={historyCoach}
                  projectedHistoryNextStep={projectedHistoryNextStep}
                  projectedHistoryFollowUpWindow={projectedHistoryFollowUpWindow}
                  projectedHistoryRecoveryOutlook={projectedHistoryRecoveryOutlook}
                  projectedTrendScore={projectedTrendScore}
                  projectedSavedHandoffSummary={projectedSavedHandoffSummary}
                  followUpComparison={followUpComparison}
                  followUpResultCarryover={followUpResultCarryover}
                  reuseHistoryBridge={reuseHistoryBridge}
                  onJumpToHistory={jumpToHistory}
                  onStartAnother={startAnotherCheckIn}
                  onStartSavedFollowUp={handleStartSavedFollowUp}
                  hasSavedCurrentResult={hasSavedCurrentResult}
                  exportSummary={exportSummary}
                  exportStatus={exportStatus}
                  onCopySummary={handleCopyCurrentSummary}
                  onShareSummary={handleShareCurrentSummary}
                  sectionRef={resultSectionRef}
                />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <MobileActionDock
        step={step}
        selectedFile={selectedFile}
        isAnalyzing={isAnalyzing}
        analysisResult={analysisResult}
        hasSavedCurrentResult={hasSavedCurrentResult}
        savedCount={history.length}
        onContinue={goToDescribeStep}
        onSkipPhoto={() => {
          setAnalysisResult(null);
          setAnalysisMeta(null);
          setAnalysisError("");
          setForm((currentForm) => ({ ...currentForm, mode: "describe" }));
          goToDescribeStep();
        }}
        onAnalyze={handleAnalyze}
        onBackToPhoto={() => setStep(1)}
        onSave={handleSaveCheckIn}
        onJumpToHistory={jumpToHistory}
        onStartAnother={startAnotherCheckIn}
      />
    </main>
  );
}
