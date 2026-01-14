const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Entry = require("../src/models/Entry");

dotenv.config();

const formatFriendlyDate = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const formatDateIso = (date) => date.toISOString().slice(0, 10);

const sampleThemes = [
  "sleep",
  "energy",
  "stress",
  "focus",
  "motivation",
  "connection",
  "self-compassion",
  "overwhelm",
  "rest",
];

const sampleTriggers = ["deadlines", "meetings", "caffeine", "late screen time", "family stress"];
const sampleTags = ["walk", "breathing", "journaling", "stretch", "quiet time", "seeded-sample"];

const sentenceBank = [
  "Sleep felt lighter after I shut screens down early.",
  "Energy dipped mid-afternoon but recovered after a short walk.",
  "Stress built up during back-to-back meetings.",
  "I felt more connected after a quick check-in with a friend.",
  "Motivation returned once I broke the task into smaller steps.",
  "Focus came back after I cleared one thing off the list.",
  "Overwhelm felt louder when I skipped lunch.",
  "Rest felt possible when I paused before the next task.",
  "Self-compassion helped me reset the tone of the day.",
];

const buildEntry = ({ date, themeA, themeB, themeC }) => {
  const summary = [
    sentenceBank[Math.floor(Math.random() * sentenceBank.length)],
    sentenceBank[Math.floor(Math.random() * sentenceBank.length)],
    sentenceBank[Math.floor(Math.random() * sentenceBank.length)],
  ].join(" ");

  return {
    date: formatFriendlyDate(date),
    dateISO: formatDateIso(date),
    title: `Reflection on ${themeA}`,
    summary,
    tags: [sampleTags[Math.floor(Math.random() * sampleTags.length)], "seeded-sample"],
    triggers: [sampleTriggers[Math.floor(Math.random() * sampleTriggers.length)]],
    themes: [themeA, themeB, themeC].filter(Boolean),
    themeIntensities: [themeA, themeB, themeC].filter(Boolean).map((theme) => ({
      theme,
      intensity: Number((0.3 + Math.random() * 0.6).toFixed(2)),
    })),
    emotions: [
      { label: "tired", intensity: Math.floor(40 + Math.random() * 40), tone: "negative" },
      { label: "hopeful", intensity: Math.floor(20 + Math.random() * 40), tone: "positive" },
    ],
  };
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  const userId = process.argv[2] || process.env.SEED_USER_ID;

  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  if (!userId) {
    throw new Error("Provide a user id: node scripts/seed-sample-entries.js <userId>");
  }

  await mongoose.connect(uri);

  const entries = [];
  const today = new Date();
  const existingEntries = await Entry.find({ userId }).select("dateISO").lean();
  const existingDates = new Set(existingEntries.map((entry) => entry.dateISO).filter(Boolean));

  const addDays = (date, delta) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  const windowSize = 28;
  const maxLookbackDays = 365;
  let windowStart = null;
  let windowEnd = null;

  for (let offset = 0; offset <= maxLookbackDays; offset += 1) {
    const end = addDays(today, -offset);
    const start = addDays(end, -(windowSize - 1));
    let hasExisting = false;
    for (let i = 0; i < windowSize; i += 1) {
      const date = addDays(start, i);
      const dateISO = formatDateIso(date);
      if (existingDates.has(dateISO)) {
        hasExisting = true;
        break;
      }
    }
    if (!hasExisting) {
      windowStart = start;
      windowEnd = end;
      break;
    }
  }

  if (!windowStart || !windowEnd) {
    console.log(`No open ${windowSize}-day window found. Skipped insert for user ${userId}.`);
    await mongoose.disconnect();
    return;
  }

  for (let i = 0; i < windowSize; i += 1) {
    const date = addDays(windowStart, i);
    const themeA = sampleThemes[i % sampleThemes.length];
    const themeB = sampleThemes[(i + 2) % sampleThemes.length];
    const themeC = sampleThemes[(i + 4) % sampleThemes.length];
    entries.push({
      userId,
      ...buildEntry({ date, themeA, themeB, themeC }),
    });
  }

  if (!entries.length) {
    console.log(`No new dates available. Skipped insert for user ${userId}.`);
  } else {
    const result = await Entry.insertMany(entries);
    console.log(
      `Inserted ${result.length} sample entries for user ${userId} (${formatDateIso(
        windowStart,
      )} to ${formatDateIso(windowEnd)}).`,
    );
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
