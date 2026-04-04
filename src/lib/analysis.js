export const BRISTOL_TYPES = [
  {
    id: 1,
    label: "Type 1",
    name: "Separate hard lumps",
    summary: "Often associated with constipation or low fluid intake.",
    gutTone: "Lower motility / slower transit pattern.",
    nutrition: [
      "Increase water intake steadily through the day.",
      "Add more soluble + insoluble fiber from oats, fruit, beans, and vegetables.",
      "Look at routine, stress, and movement because they can slow transit too.",
    ],
  },
  {
    id: 2,
    label: "Type 2",
    name: "Lumpy and sausage-like",
    summary: "Can suggest mild constipation or slow transit.",
    gutTone: "Slightly backed-up / dry transit pattern.",
    nutrition: [
      "Push hydration higher for the next day or two.",
      "Increase fiber gradually rather than all at once.",
      "A regular eating schedule can help bowel rhythm stabilize.",
    ],
  },
  {
    id: 3,
    label: "Type 3",
    name: "Sausage with surface cracks",
    summary: "Usually considered fairly typical.",
    gutTone: "Mostly balanced with a little dryness possible.",
    nutrition: [
      "Keep water and fiber intake steady.",
      "If this feels slightly dry for you, add fruit, oats, or chia/flax.",
      "Consistency beats extreme changes.",
    ],
  },
  {
    id: 4,
    label: "Type 4",
    name: "Smooth, soft sausage or snake",
    summary: "Usually considered the most typical / balanced stool form.",
    gutTone: "Balanced gut rhythm for many people.",
    nutrition: [
      "Keep doing what is working: hydration, fiber, sleep, and routine.",
      "Focus on diversity of plants across the week to support gut bacteria.",
      "No major correction needed if you feel good overall.",
    ],
  },
  {
    id: 5,
    label: "Type 5",
    name: "Soft blobs with clear edges",
    summary: "May suggest lower fiber intake or mild urgency.",
    gutTone: "Slightly fast transit / less formed pattern.",
    nutrition: [
      "Consider a bit more fiber and more regular meal timing.",
      "Watch whether greasy foods, alcohol, or stress are pushing urgency.",
      "Hydration still matters even when stool is softer.",
    ],
  },
  {
    id: 6,
    label: "Type 6",
    name: "Fluffy pieces with ragged edges",
    summary: "May suggest loose stool, irritation, or a short-term diet issue.",
    gutTone: "Irritated / faster transit pattern.",
    nutrition: [
      "Hydrate well, especially if bowel movements are frequent.",
      "Go easier on alcohol, ultra-greasy foods, and anything that predictably irritates your gut.",
      "Try simpler meals briefly while you watch whether it settles.",
    ],
  },
  {
    id: 7,
    label: "Type 7",
    name: "Watery, no solid pieces",
    summary: "Suggests diarrhea and higher dehydration risk.",
    gutTone: "Very fast transit / high irritation pattern.",
    nutrition: [
      "Prioritize fluids and electrolytes.",
      "Keep food simple and easy on the stomach until it settles.",
      "If severe, persistent, or paired with other red flags, get medical advice.",
    ],
  },
];

export const COLOR_OPTIONS = [
  {
    value: "brown",
    label: "Brown",
    interpretation: "Typical stool color for many people.",
  },
  {
    value: "light-brown",
    label: "Light brown / tan",
    interpretation: "Can still be normal, depending on diet and hydration.",
  },
  {
    value: "green",
    label: "Green",
    interpretation: "Can happen with leafy foods, supplements, or faster transit.",
  },
  {
    value: "yellow",
    label: "Yellow / greasy",
    interpretation: "Can sometimes point to fat malabsorption or digestive issues.",
  },
  {
    value: "black",
    label: "Black / tarry",
    interpretation: "Can be from iron or bismuth, but can also be a warning sign.",
  },
  {
    value: "red",
    label: "Red",
    interpretation: "Can come from food, but can also be a warning sign for bleeding.",
  },
  {
    value: "pale",
    label: "Pale / clay-colored",
    interpretation: "Unusual and worth paying attention to if persistent.",
  },
];

export const ALERT_FLAGS = [
  { value: "pain", label: "Pain, cramping, or straining" },
  { value: "blood", label: "Visible blood" },
  { value: "mucus", label: "Noticeable mucus" },
  { value: "urgent", label: "Urgency / difficult to hold" },
  { value: "persistent", label: "Same problem for several days" },
  { value: "fever", label: "Fever, vomiting, or feeling ill" },
];

export function getBristolTypeById(id) {
  return BRISTOL_TYPES.find((type) => type.id === Number(id));
}

export function getColorByValue(value) {
  return COLOR_OPTIONS.find((color) => color.value === value);
}

export function buildInsight({ mode, bristolTypeId, colorValue, flags, notes, hasPhoto }) {
  const stoolType = getBristolTypeById(bristolTypeId);
  const color = getColorByValue(colorValue);
  const hasWarningColor = ["black", "red", "pale", "yellow"].includes(colorValue);
  const hasUrgentFlags = flags.includes("blood") || flags.includes("fever");
  const hasPersistentFlags = flags.includes("persistent") || flags.includes("pain");
  const isLoosePattern = stoolType?.id >= 6;
  const isConstipationPattern = stoolType?.id <= 2;
  const isBalancedPattern = stoolType?.id >= 3 && stoolType?.id <= 5;

  const cautionReasons = [];
  const reasoningBullets = [];

  if (hasWarningColor) {
    cautionReasons.push(`Color note: ${color?.label ?? "Unusual color"}`);
    reasoningBullets.push(`The reported color was ${color?.label?.toLowerCase() ?? "unusual"}, which deserves a more careful follow-up than a standard brown result.`);
  }

  if (hasUrgentFlags) {
    cautionReasons.push("Urgent symptoms were selected.");
    reasoningBullets.push("A higher-risk symptom flag was selected, so the result should lean conservative rather than reassuring.");
  }

  if (hasPersistentFlags) {
    cautionReasons.push("Symptoms may be persistent or uncomfortable.");
    reasoningBullets.push("Persistence, pain, or straining makes the trend more important than a one-off read.");
  }

  if (flags.includes("mucus")) {
    cautionReasons.push("Mucus was selected, which may be worth monitoring if it keeps happening.");
    reasoningBullets.push("Mucus was noted, which is not always serious but is worth tracking if it repeats.");
  }

  if (flags.includes("urgent") && !hasUrgentFlags) {
    cautionReasons.push("Urgency can be a sign that transit is running faster than usual.");
    reasoningBullets.push("Urgency usually means the gut is moving faster than baseline, even if no emergency flag was selected.");
  }

  const bacteriaRead = isConstipationPattern
    ? "This pattern can line up with low fiber, low fluid intake, inconsistent routine, or slower gut transit — all of which can affect the gut environment."
    : isLoosePattern
      ? "This pattern can show up when the gut is irritated or transit is moving too fast, which can make the microbiome feel less stable short-term."
      : "This pattern looks closer to a balanced transit rhythm, which is generally friendlier to a steady gut environment.";

  if (isConstipationPattern) {
    reasoningBullets.push("The selected Bristol type is on the firmer / slower-transit end of the scale.");
  }

  if (isBalancedPattern) {
    reasoningBullets.push("The selected Bristol type sits in the more typical middle range, so the app avoids overreacting to a single check-in.");
  }

  if (isLoosePattern) {
    reasoningBullets.push("The selected Bristol type is on the looser / faster-transit end of the scale, so hydration and follow-up matter more.");
  }

  const summaryLead =
    mode === "photo"
      ? hasPhoto
        ? "The AI-style photo flow suggests this stool most closely matches:"
        : "The photo-first flow is selected, but there is no image attached yet — so this result is based on your guided inputs."
      : "This result is based on your description and guided selections rather than an image.";

  let confidenceLabel = "Guided wellness read";
  let confidenceBody = "This result is directionally useful for a demo, but it should be treated like a structured self-check, not a diagnosis.";

  if (mode === "photo" && hasPhoto) {
    confidenceLabel = "Photo + guided-input prototype read";
    confidenceBody = "The product is using a real photo flow plus your guided inputs, but the final interpretation is still conservative and rule-based until a real vision model is integrated.";
  }

  const todayPlan = [];
  const monitorPlan = [];
  const followUpPlan = [];
  const escalationTriggers = [];
  let urgencyLabel = "Lower-caution wellness check-in";
  let urgencyBody = "Nothing in this entry automatically makes it look high-risk. Treat it like a self-tracking moment and watch the pattern over time.";
  let recheckWindow = "Re-check within the next few days if the pattern repeats or changes.";

  if (isConstipationPattern) {
    todayPlan.push("Increase water steadily over the day instead of chugging all at once.");
    todayPlan.push("Bias toward fruit, oats, beans, vegetables, or another fiber source that usually sits well with you.");
    monitorPlan.push("Track whether bowel movements stay hard or infrequent over the next 24-72 hours.");
    monitorPlan.push("Notice whether travel, stress, low movement, or schedule changes line up with the pattern.");
  }

  if (isBalancedPattern) {
    todayPlan.push("Keep routine steady instead of making a big correction for one check-in.");
    monitorPlan.push("Use repeat check-ins to see if your typical pattern stays stable across the week.");
  }

  if (isLoosePattern) {
    todayPlan.push("Hydrate early and consider electrolytes if you are going more often than usual.");
    todayPlan.push("Keep meals simpler for the next several hours if your gut feels irritated.");
    monitorPlan.push("Watch for repeat loose stools, rising urgency, or signs of dehydration.");
  }

  if (flags.includes("pain")) {
    todayPlan.push("Do not write off significant pain as just a food issue if it feels unusual for you.");
    escalationTriggers.push("Pain or cramping is getting stronger instead of settling.");
  }

  if (flags.includes("urgent")) {
    monitorPlan.push("Notice whether urgency is tied to particular foods, caffeine, alcohol, or stress.");
    escalationTriggers.push("Urgency keeps repeating or becomes hard to control.");
  }

  if (flags.includes("persistent")) {
    followUpPlan.push("Because this has lasted several days, treat trend tracking as more important than a single reading.");
    escalationTriggers.push("The same issue is still happening after another day or two.");
  }

  if (hasWarningColor) {
    followUpPlan.push("Unusual stool color is worth re-checking soon instead of assuming it is random.");
    escalationTriggers.push("Unusual color keeps showing up on the next bowel movement.");
  }

  if (hasUrgentFlags || stoolType?.id === 7) {
    followUpPlan.push("If this continues, gets worse, or comes with feeling unwell, seek medical advice rather than relying on an app.");
    escalationTriggers.push("You feel unwell, dehydrated, feverish, or the stool is turning fully watery.");
  }

  if (hasUrgentFlags || stoolType?.id === 7) {
    urgencyLabel = "High-caution check-in";
    urgencyBody = "This entry includes a more concerning stool pattern or symptom flag, so the app should push toward prompt follow-up instead of reassurance.";
    recheckWindow = "Re-check later today only if symptoms are settling — otherwise get medical advice instead of repeatedly checking the app.";
  } else if (hasWarningColor || hasPersistentFlags || cautionReasons.length >= 2) {
    urgencyLabel = "Moderate-caution check-in";
    urgencyBody = "This does not automatically mean something serious is happening, but it is strong enough that trend tracking and follow-up should happen sooner.";
    recheckWindow = "Re-check within 12-24 hours, especially if the same pattern, pain, or unusual color continues.";
  } else if (isLoosePattern || isConstipationPattern) {
    urgencyLabel = "Monitor-this pattern";
    urgencyBody = "The stool form is off the middle range, but without stronger red flags this is still more about short-term correction and trend watching than panic.";
    recheckWindow = "Re-check after your next 1-2 bowel movements to see whether hydration, food, and routine shift things back toward baseline.";
  }

  if (isConstipationPattern) {
    escalationTriggers.push("You still feel backed up after hydration, fiber, and routine correction.");
  }

  if (isLoosePattern) {
    escalationTriggers.push("Loose stool repeats through the day instead of settling after food and hydration changes.");
  }

  if (flags.includes("blood")) {
    escalationTriggers.push("Visible blood keeps happening or increases.");
  }

  if (!followUpPlan.length) {
    followUpPlan.push("If this pattern becomes frequent or starts changing, use repeated check-ins to look for trends before making major assumptions.");
  }

  const nextCheckInPlan = {
    title: resultTitleForCadence(urgencyLabel, stoolType),
    timing: recheckWindow,
    body: buildCadenceBody({
      urgencyLabel,
      hasWarningColor,
      hasUrgentFlags,
      isLoosePattern,
      isConstipationPattern,
      hasPersistentFlags,
    }),
    checklist: buildNextCheckChecklist({ stoolType, flags, hasPhoto, mode }),
  };

  return {
    stoolType,
    color,
    cautionReasons,
    bacteriaRead,
    confidenceLabel,
    confidenceBody,
    summaryLead,
    urgencyLabel,
    urgencyBody,
    recheckWindow,
    reasoningBullets,
    nutritionSteps: stoolType?.nutrition ?? [],
    shouldTalkToDoctor: hasWarningColor || hasUrgentFlags || hasPersistentFlags || stoolType?.id === 7,
    todayPlan,
    monitorPlan,
    followUpPlan,
    escalationTriggers: [...new Set(escalationTriggers)],
    nextCheckInPlan,
    notesSummary: notes.trim()
      ? `Your notes may matter here: ${notes.trim()}`
      : "No extra notes were added for this check-in.",
  };
}


function resultTitleForCadence(urgencyLabel, stoolType) {
  if (urgencyLabel === "High-caution check-in") {
    return "Do not just keep checking the app";
  }

  if (urgencyLabel === "Moderate-caution check-in") {
    return "Do one clean follow-up check soon";
  }

  if (stoolType?.id <= 2) {
    return "Use the next check-in to see if things soften";
  }

  if (stoolType?.id >= 6) {
    return "Use the next check-in to see if things settle";
  }

  return "Use the next check-in to confirm baseline";
}

function buildCadenceBody({ urgencyLabel, hasWarningColor, hasUrgentFlags, isLoosePattern, isConstipationPattern, hasPersistentFlags }) {
  if (urgencyLabel === "High-caution check-in") {
    return "This is not a casual trend-watching result. If symptoms are not clearly easing, the safer move is outside follow-up instead of repeated self-checks.";
  }

  if (urgencyLabel === "Moderate-caution check-in") {
    return "A quick follow-up check can tell you whether this was a one-off or the start of a pattern, but you should not let repeated caution signals drag on without acting.";
  }

  if (hasWarningColor || hasUrgentFlags || hasPersistentFlags) {
    return "Treat the next check-in like a decision point: either the pattern is easing, or it is becoming something to escalate.";
  }

  if (isLoosePattern) {
    return "The next bowel movement matters more than endless logging. You want to see whether hydration and simpler meals are pulling things back toward baseline.";
  }

  if (isConstipationPattern) {
    return "One follow-up after hydration, fiber, and routine changes is more useful than checking repeatedly without changing anything.";
  }

  return "A single steady follow-up check is enough to confirm whether this still looks like your normal baseline.";
}

function buildNextCheckChecklist({ stoolType, flags, hasPhoto, mode }) {
  const checklist = [
    "Compare stool form and color against this entry instead of starting from scratch.",
    "Note whether food, travel, stress, medication, or timing changed before the next bowel movement.",
  ];

  if (mode === "photo" && hasPhoto) {
    checklist.push("If you use a photo again, capture it in similar lighting so the comparison is more honest.");
  }

  if (stoolType?.id <= 2) {
    checklist.push("Ask: did hydration, movement, or fiber make the next stool easier to pass?");
  } else if (stoolType?.id >= 6) {
    checklist.push("Ask: is the next stool more formed, and are urgency or frequency settling down?");
  } else {
    checklist.push("Ask: does the next check-in still look like the same balanced pattern, or is it drifting?");
  }

  if (flags.includes("pain") || flags.includes("persistent")) {
    checklist.push("Track whether discomfort is easing, unchanged, or clearly getting worse.");
  }

  if (flags.includes("blood") || flags.includes("fever")) {
    checklist.push("If the same red-flag symptom is still present, stop treating this like a routine tracker moment.");
  }

  return checklist;
}
