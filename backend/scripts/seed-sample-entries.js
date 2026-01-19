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

const sampleTags = ["walk", "breathing", "journaling", "stretch", "quiet time", "seeded-sample"];

const symptomManifestations = {
  MDD_A1_DEPRESSED_MOOD: [
    "I feel a heavy emptiness that I just can't shake.",
    "It feels like there's a gray filter over everything today.",
    "I just wanted to cry for no reason this morning.",
    "I feel hollowed out, like a shell.",
    "There is a constant background noise of sadness.",
    "I feel emotionally numb, not even sad, just nothing.",
    "It feels like I'm moving through deep water.",
    "I can't find a single thing to look forward to.",
    "This sadness feels physical, like a bruise in my chest.",
    "I'm wearing a mask; smiling hurts my face.",
    "The air feels heavy and thick around me.",
    "I woke up feeling like the day was already ruined.",
    "I just want to disappear into the couch.",
    "It is not just sadness, it is a total lack of hope.",
    "I feel fragile, like I might break if someone speaks to me.",
  ],
  MDD_A2_ANHEDONIA: [
    "I tried to play guitar, but I just didn't care about it.",
    "Food tastes like cardboard; I'm just eating to survive.",
    "I canceled plans with friends. The thought of socializing is exhausting.",
    "I looked at my painting supplies and felt absolutely nothing.",
    "My favorite show was on, but I just stared through the TV.",
    "I used to love my morning coffee, now it's just hot water.",
    "Music sounds like noise today.",
    "I cannot remember what it feels like to be excited about a weekend.",
    "Walking the dog used to be the best part of my day; now it's a chore.",
    "I saw everyone laughing and I couldn't understand why.",
    "Nothing sparks my interest, not even small things.",
    "I feel completely indifferent to things that usually matter.",
    "It feels like my fun switch has been turned off.",
    "I just went through the motions at practice today.",
    "Why bother doing anything if it all feels the same?",
  ],
  MDD_A3_APPETITE_WEIGHT_CHANGE: [
    "I realized at 8 PM I hadn't eaten a single thing all day.",
    "Forced myself to eat toast, but it felt like chewing sand.",
    "I can't stop eating; it's the only thing that numbs the feeling.",
    "Clothes are hanging off me; I must have lost weight without trying.",
    "All food looks disgusting to me right now.",
    "I ate an entire bag of chips without even tasting them.",
    "The smell of dinner cooking made me nauseous.",
    "I have zero appetite, not even for my favorite meal.",
    "Bingeing on sugar is the only way I get through the night.",
    "My stomach is growling but the idea of eating is exhausting.",
    "I keep snacking even though I'm uncomfortably full.",
    "Food has lost all its flavor; I'm just eating to survive.",
    "I've lost 5 pounds this week because I just forget to eat.",
  ],
  MDD_A4_INSOMNIA: [
    "Woke up at 3 AM again and couldn't get back to sleep.",
    "Stared at the ceiling for hours before drifting off.",
    "My mind wouldn't shut off until the sun came up.",
    "I slept in 20-minute bursts. I'm exhausted.",
    "I woke up panicked at 4 AM.",
    "Tossed and turned all night, never got comfortable.",
    "I watched the clock change every hour.",
    "It took me forever to fall asleep.",
    "I woke up way before my alarm and just lay there.",
    "Sleep feels impossible lately.",
    "I dread going to bed because I know I won't sleep.",
    "Every small noise wakes me up instantly.",
    "I feel like I haven't slept in weeks.",
    "Waking up felt like I hadn't slept at all.",
    "Too tired to move, too awake to sleep.",
  ],
  MDD_A5_PSYCHOMOTOR_CHANGE: [
    "It feels like my legs weigh a thousand pounds.",
    "I've been pacing the apartment for an hour; I can't sit still.",
    "Speaking feels like too much effort; my voice sounds slow.",
    "I'm fidgeting constantly, tearing at my cuticles.",
    "My body feels sluggish, like I'm moving underwater.",
    "I keep tapping my foot; I feel like I'm vibrating inside.",
    "It took me five minutes just to put my socks on.",
    "I can't settle down to watch a movie; I have to keep moving.",
    "My movements feel clumsy and disjointed today.",
    "People keep asking why I'm so jumpy.",
    "I feel physically heavy, like gravity is stronger today.",
    "I can't stay in one spot; my skin is crawling.",
    "Everything I do feels like it's in slow motion.",
  ],
  MDD_A6_FATIGUE: [
    "I took a shower and had to lie down immediately after.",
    "My bones feel tired.",
    "I slept 10 hours and woke up exhausted.",
    "Even lifting my phone feels like a workout.",
    "I'm running on empty; zero energy for anything.",
    "The walk to the mailbox felt like a marathon.",
    "I feel drained, physically and mentally.",
    "My eyelids feel heavy, like I'm drugged.",
    "I'm too tired to even brush my teeth.",
    "Just existing feels exhausting today.",
    "I feel like a battery that won't hold a charge.",
    "My limbs feel like lead.",
    "I cancelled everything because I just don't have the energy.",
  ],
  MDD_A7_WORTHLESSNESS: [
    "I feel like a burden to everyone around me.",
    "I can't stop thinking about that mistake I made five years ago.",
    "My family would be better off without me dragging them down.",
    "I feel guilty for taking up space.",
    "I'm just a failure; I can't do anything right.",
    "I feel rotten inside, like I'm a bad person.",
    "Everything that goes wrong is somehow my fault.",
    "I don't deserve the support my friends give me.",
    "I'm ashamed of who I've become.",
    "Constant self-criticism is replaying in my head.",
    "I look at myself and just feel disgust.",
    "I apologize for everything, even things I didn't do.",
    "I feel like a waste of resources.",
  ],
  MDD_A8_CONCENTRATION: [
    "I stared at the computer screen for 20 minutes doing nothing.",
    "I can't follow the plot of the show I'm watching.",
    "Making a simple decision like what to wear felt impossible.",
    "My brain feels like it's full of cotton wool.",
    "I keep losing my train of thought mid-sentence.",
    "I read the email three times and still don't know what it says.",
    "Focusing on a conversation is physically painful.",
    "I feel scattered and unable to complete one task.",
    "My mind goes blank whenever someone asks me a question.",
    "I stood in the kitchen forgetting why I went in there.",
    "It's hard to process what people are saying to me.",
    "I feel paralyzed by the smallest choices.",
    "My memory is shot; I can't remember yesterday.",
  ],
  MDD_A9_PASSIVE: [
    "I wonder if anyone would actually miss me if I was gone.",
    "I wish I could just go to sleep and never wake up.",
    "The world would keep turning fine without me.",
    "I feel like I'm already dead inside.",
    "It feels like there's no way out of this pain except ceasing to exist.",
    "I'm not planning anything, but death feels like a relief.",
    "I pray to God that I don't wake up tomorrow.",
    "I feel like a burden to everyone around me; they'd be better off.",
  ],
  MDD_A9_ACTIVE: [
    "I found myself staring at the medicine cabinet counting pills today.",
    "I started writing letters to my family just in case.",
    "I drove past the bridge again and had to pull over to stop myself.",
    "I have a plan now, and it is scaring me how calm I feel about it.",
    "I looked up how many of my meds it would take to end it.",
    "I am starting to give away my things; I won't need them soon.",
    "I can't trust myself to be alone tonight.",
  ],
  SPEC_MEL_MORNING_WORSE: [
    "Mornings feel especially heavy and slow.",
    "It always seems worse early in the day.",
  ],
  SPEC_ANXIOUS_KEYED_UP: [
    "I can't sit still; I feel like my skin is crawling.",
    "My mind is racing with worries that something bad is about to happen.",
  ],
  SPEC_ANXIOUS_WORRY: [
    "Worry makes it hard to focus on anything else.",
    "I keep expecting something to go wrong.",
  ],
  SPEC_PSYCHOTIC_FEATURES: [
    "I heard a voice telling me I'm rotting from the inside out.",
    "I know my organs are shutting down even though the doctors say I'm fine.",
    "I feel like I have sinner written on my forehead for everyone to see.",
    "The voices are getting louder, telling me I deserve this pain.",
    "I smell rotting meat everywhere I go; I think it's me.",
    "I'm convinced the police are coming for me because of mistakes I made years ago.",
    "I saw a shadow standing at the foot of my bed watching me.",
  ],
  POSITIVE_FUNCTIONING: [
    "I actually enjoyed my morning coffee today.",
    "I finished a task at work without feeling totally drained.",
    "I laughed at a joke for the first time in months.",
    "The heavy fog seems to be lifting a little bit.",
    "I went for a walk and noticed the sun was shining.",
    "I cooked a real dinner tonight instead of ordering out.",
    "I called my sister and we talked for an hour.",
    "I woke up feeling rested for once.",
    "I'm starting to feel like myself again.",
    "I looked forward to the weekend today.",
  ],
  SPEC_ANXIOUS_DISTRESS: [
    "I feel keyed up, like a wire is pulled tight inside me.",
    "I can't relax; I have this knot of dread in my stomach.",
    "My thoughts are racing with worries about the future.",
    "I feel like something awful is about to happen.",
    "I'm shaking and I don't know why.",
    "I feel so tense my jaw hurts.",
    "I can't concentrate because I'm so worried.",
    "I feel like I'm going to lose control.",
    "Restlessness is keeping me up; I have to keep moving.",
    "I feel terrified for no specific reason.",
    "My heart is pounding even though I'm sitting still.",
    "I'm constantly waiting for the other shoe to drop.",
  ],
  SPEC_MELANCHOLIC_FEATURES: [
    "The depression feels physically heavy today, different from just sadness.",
    "I woke up at 4 AM with a sense of dread.",
    "Mornings are the hardest; I can barely face the day.",
    "Even when good news came, I couldn't feel happy about it.",
    "I feel completely empty, not just sad.",
    "The mood doesn't lift, no matter what happens.",
    "I woke up feeling absolute despair before the sun was up.",
    "I feel a profound despondency that nothing can touch.",
    "It's 5 AM and I'm wide awake with dark thoughts.",
    "The morning fog in my head is unbearable.",
    "I feel totally numb to everything good happening.",
    "This feeling is physically painful in my chest.",
  ],
  SPEC_MIXED_FEATURES: [
    "I feel exhausted but my mind is racing at a million miles an hour.",
    "I'm crying, but I also feel incredibly wired.",
    "I have so much energy I want to scream, but I feel hopeless.",
    "My thoughts are jumping around so fast I can't catch them.",
    "I feel an agitated pressure to keep talking.",
    "I haven't slept but I don't feel tired, just sad and buzzing.",
    "I feel impulsive, like I might do something risky.",
    "My brain is loud and fast, even though my mood is low.",
    "I feel like I'm vibrating with nervous energy.",
    "I started three new projects today while feeling miserable.",
    "I'm irritable and snappy, everything is moving too slow.",
    "I feel a weird mix of high energy and deep depression.",
  ],
};

const contextScenarios = {
  ROUTINE: [
    "I had to go grocery shopping today.",
    "Work was incredibly busy with meetings.",
    "I spent the afternoon cleaning the apartment.",
    "It rained heavily all afternoon.",
    "I had lunch with my sister.",
    "I tried to read a new book.",
    "I had a deadline to meet by 5 PM.",
    "I took the bus into the city.",
    "I sat on the porch for a while.",
    "I had to help my kid with homework.",
  ],
  STRESSOR: [
    "My car wouldn't start this morning.",
    "I got into a small argument with my partner.",
    "I received a bill I wasn't expecting.",
    "The news today was really overwhelming.",
    "My boss gave me critical feedback.",
  ],
};

const confounders = {
  SUBSTANCE_USE: [
    "I had a few too many drinks last night to numb the feeling.",
    "I think my new blood pressure meds are making me tired.",
    "I smoked some weed to help me sleep, but I feel groggy today.",
    "My head hurts, probably a hangover from the weekend.",
  ],
  MEDICAL_ISSUES: [
    "My thyroid levels are off again according to the doctor.",
    "I've been in so much physical pain from my back injury.",
    "The chronic fatigue flare-up is really bad this week.",
  ],
  MANIC_SIGNAL: [
    "I stayed up all night cleaning and didn't feel tired at all.",
    "My thoughts are racing so fast I can't keep up with them.",
    "I spent way too much money online today but I felt amazing doing it.",
  ],
};

const medicationSignals = [
  "I forgot to take my meds yesterday, maybe that's why I'm dizzy.",
  "I started the new dose this morning.",
  "I'm feeling withdrawal symptoms since I ran out of my prescription.",
  "The doctor increased my dosage last week.",
];

const symptomDenials = {
  MDD_A4_INSOMNIA: [
    "I actually slept pretty well last night for once.",
    "No trouble sleeping, just feeling low during the day.",
    "Finally caught up on sleep; got a solid 8 hours.",
  ],
  MDD_A9_PASSIVE: [
    "I'm feeling down, but I don't want to hurt myself.",
    "I definitely want to be here, I just want the pain to stop.",
    "No dark thoughts today, thankfully.",
  ],
  MDD_A9_ACTIVE: [
    "I am feeling low, but I do not have any plans to harm myself.",
    "I am not going to act on those thoughts, even when they show up.",
    "No planning or intent today, just trying to get through it.",
  ],
};

const impairmentManifestations = {
  IMPACT_WORK: [
    "I called in sick again; I just couldn't face the office.",
    "I stared at my screen for 3 hours and accomplished nothing.",
    "My boss asked why I'm missing deadlines.",
  ],
  IMPACT_SOCIAL: [
    "I ignored all my texts for the third day in a row.",
    "I cancelled dinner plans. I can't be around people.",
    "My partner is getting frustrated with my silence.",
  ],
  IMPACT_SELF_CARE: [
    "I haven't showered in three days.",
    "The laundry is piling up and I can't make myself do it.",
    "I'm living off takeout because cooking feels impossible.",
  ],
};

const clinicalProfiles = {
  MDD_SEVERE_MELANCHOLIC: {
    title: "Heavy, empty mornings",
    diagnosis: "Major Depressive Disorder",
    specifiers: ["Melancholic Features", "Severe"],
    themes: ["emptiness", "guilt", "morning-dread"],
    triggers: ["early mornings", "isolation"],
    symptomProbabilities: {
      MDD_A1_DEPRESSED_MOOD: 0.95,
      MDD_A2_ANHEDONIA: 0.9,
      SPEC_MEL_MORNING_WORSE: 0.8,
      MDD_A5_PSYCHOMOTOR_CHANGE: 0.7,
      MDD_A9_PASSIVE: 0.3,
      SPEC_PSYCHOTIC_FEATURES: 0.05,
    },
    baseIntensity: { min: 0.8, max: 1.0 },
    emotions: [
      { label: "empty", intensity: 90, tone: "negative" },
      { label: "exhausted", intensity: 85, tone: "negative" },
    ],
  },
  MDD_SEVERE_WITH_RISK: {
    title: "Crisis point",
    diagnosis: "Major Depressive Disorder",
    specifiers: ["Severe", "With Psychotic Features"],
    themes: ["despair", "voices", "planning"],
    triggers: ["isolation", "sleep loss"],
    symptomProbabilities: {
      MDD_A1_DEPRESSED_MOOD: 0.95,
      MDD_A9_ACTIVE: 0.4,
      SPEC_PSYCHOTIC_FEATURES: 0.6,
      MDD_A7_WORTHLESSNESS: 0.9,
    },
    baseIntensity: { min: 0.9, max: 1.0 },
    emotions: [
      { label: "despair", intensity: 95, tone: "negative" },
      { label: "overwhelmed", intensity: 90, tone: "negative" },
    ],
    impairmentProbability: 0.8,
  },
  MDD_MODERATE_ANXIOUS: {
    title: "Restless and worried",
    diagnosis: "Major Depressive Disorder",
    specifiers: ["Anxious Distress", "Moderate"],
    themes: ["worry", "sleep", "focus"],
    triggers: ["work pressure", "social stress"],
    symptomProbabilities: {
      MDD_A1_DEPRESSED_MOOD: 0.7,
      MDD_A4_INSOMNIA: 0.6,
      MDD_A6_FATIGUE: 0.5,
      MDD_A8_CONCENTRATION: 0.6,
      SPEC_ANXIOUS_KEYED_UP: 0.8,
      SPEC_ANXIOUS_WORRY: 0.8,
    },
    baseIntensity: { min: 0.4, max: 0.7 },
    emotions: [
      { label: "tense", intensity: 80, tone: "negative" },
      { label: "worried", intensity: 75, tone: "negative" },
    ],
  },
  MDD_MILD_FATIGUE: {
    title: "Low energy day",
    diagnosis: "Major Depressive Disorder",
    specifiers: ["Mild"],
    themes: ["energy", "sleep", "motivation"],
    triggers: ["late night", "overcommitment"],
    symptomProbabilities: {
      MDD_A1_DEPRESSED_MOOD: 0.5,
      MDD_A6_FATIGUE: 0.7,
      MDD_A4_INSOMNIA: 0.4,
      MDD_A8_CONCENTRATION: 0.3,
    },
    baseIntensity: { min: 0.3, max: 0.5 },
    emotions: [{ label: "low", intensity: 55, tone: "negative" }],
    impairmentProbability: 0.15,
    confounderProbability: 0.03,
  },
  MDD_PARTIAL_REMISSION: {
    title: "Steadying",
    diagnosis: "Major Depressive Disorder",
    specifiers: ["In Partial Remission"],
    themes: ["recovery", "sleep", "focus"],
    triggers: ["routine", "rest"],
    symptomProbabilities: {
      MDD_A1_DEPRESSED_MOOD: 0.2,
      MDD_A4_INSOMNIA: 0.2,
      POSITIVE_FUNCTIONING: 0.5,
    },
    baseIntensity: { min: 0.1, max: 0.4 },
    emotions: [{ label: "steady", intensity: 40, tone: "neutral" }],
    impairmentProbability: 0.1,
    confounderProbability: 0.02,
  },
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
const roll = () => Math.random();

const callLlm = async ({ baseUrl, apiKey, model, messages, maxTokens }) => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey || "sk-local"}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
};

const expandSummaryWithLlm = async ({ baseSymptoms, context, profile, lengthInstruction }) => {
  const baseUrl = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  if (!apiKey && !isLocal) {
    return { summary: null, reason: "missing_api_key" };
  }

  const styleHints = [
    "Write in a stream-of-consciousness style.",
    "Use short, punchy sentences.",
    "Focus on sensory details of the environment.",
    "Write with a tone of exhaustion.",
    "Write with a tone of frustration.",
    "Make it sound like a quick note jotted down on a phone.",
    "Matter-of-fact tone with a soft emotional undercurrent.",
    "Include one small routine detail.",
    "Keep sentences short and slightly varied in length.",
    "Include one gentle contrast (worse earlier, steadier later).",
    "Use a single metaphor without overdoing it.",
    "Keep it under six sentences.",
  ];

  const response = await callLlm({
    baseUrl,
    apiKey,
    model,
    messages: [
      {
        role: "system",
        content: [
          "You are generating a realistic first-person journal entry.",
          "Embed the symptoms naturally into the life context provided.",
          "Do not mention diagnoses or clinical terms. Show, don't tell.",
          "Keep it human and specific, avoid melodrama.",
          "Occasionally include hedging or attribution (e.g., 'maybe', 'I think it's because...').",
          `Target length: ${lengthInstruction}. Use plain language.`,
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Context/Activity: "${context}"`,
          `Clinical symptoms to weave in: "${baseSymptoms}"`,
          `Profile background: This user has ${profile.diagnosis} (${profile.specifiers.join(", ")})`,
          `Style hint: ${pickRandom(styleHints)}`,
          "Write the journal entry.",
        ].join("\n"),
      },
    ],
    maxTokens: 220,
  });

  return { summary: response || null };
};

const buildEntry = async ({ date, profileKey, lengthTier }) => {
  const profile = clinicalProfiles[profileKey] || clinicalProfiles.MDD_MODERATE_ANXIOUS;
  let selectedSymptoms = [];

  Object.entries(profile.symptomProbabilities).forEach(([symptom, probability]) => {
    if (roll() <= probability) {
      selectedSymptoms.push(symptom);
    }
  });

  if (!selectedSymptoms.length) {
    const fallback = Object.entries(profile.symptomProbabilities).sort((a, b) => b[1] - a[1])[0];
    if (fallback) selectedSymptoms.push(fallback[0]);
  }
  if (selectedSymptoms.includes("POSITIVE_FUNCTIONING") && selectedSymptoms.includes("MDD_A9_ACTIVE")) {
    selectedSymptoms = selectedSymptoms.filter((symptom) => symptom !== "POSITIVE_FUNCTIONING");
  }

  const denialProbability = 0.05;
  const sentences = selectedSymptoms.map((symptom) => {
    const options = symptomManifestations[symptom] || [];
    const denialOptions = symptomDenials[symptom] || [];
    if (denialOptions.length && roll() <= denialProbability) {
      return pickRandom(denialOptions);
    }
    return options.length ? pickRandom(options) : null;
  });

  const impairmentPool = Object.values(impairmentManifestations).flat();
  const impairmentProbability =
    profile.impairmentProbability ?? (profile.baseIntensity?.min || 0.4) > 0.6 ? 0.6 : 0.25;
  const impairmentSentence =
    roll() <= impairmentProbability ? pickRandom(impairmentPool) : null;

  const confounderPool = Object.values(confounders).flat();
  const confounderProbability = profile.confounderProbability ?? 0.05;
  const confounderSentence =
    roll() <= confounderProbability ? pickRandom(confounderPool) : null;
  const medicationProbability = profile.medicationProbability ?? 0.04;
  const medicationSentence =
    roll() <= medicationProbability ? pickRandom(medicationSignals) : null;

  const tier = lengthTier || "standard";
  const symptomTarget = tier === "sparse" ? 1 : tier === "long" ? 6 : 4;
  const intensityRange = profile.baseIntensity || { min: 0.4, max: 0.7 };
  const intensity = () =>
    Number((intensityRange.min + roll() * (intensityRange.max - intensityRange.min)).toFixed(2));
  const baseIntensityValue = intensity();
  let dailyIntensity = baseIntensityValue;
  if (selectedSymptoms.includes("POSITIVE_FUNCTIONING")) {
    dailyIntensity = baseIntensityValue * 0.5;
  }
  const summary = sentences.filter(Boolean).slice(0, symptomTarget).join(" ");
  const context =
    pickRandom([contextScenarios.ROUTINE, contextScenarios.STRESSOR].flat()) ||
    "I moved through the day on autopilot.";
  const baseSummary = [context, summary, impairmentSentence, confounderSentence, medicationSentence]
    .filter(Boolean)
    .join(" ");
  const lengthInstruction =
    tier === "sparse"
      ? "1-2 sentences (very brief)"
      : tier === "long"
        ? "6-8 sentences (brain dump)"
        : "4-6 sentences";
  const expanded = await expandSummaryWithLlm({
    baseSymptoms: summary,
    context,
    profile,
    lengthInstruction,
  });
  if (expanded?.reason === "missing_api_key") {
    console.warn("OPENAI_API_KEY not set; using base symptom summary.");
  }
  const themes = profile.themes || [];
  const triggers = profile.triggers || [];
  const themeIntensity = () => Number((dailyIntensity * (0.9 + roll() * 0.2)).toFixed(2));

  return {
    date: formatFriendlyDate(date),
    dateISO: formatDateIso(date),
    title: `Reflection: ${profile.title}`,
    summary: expanded?.summary || baseSummary,
    tags: [pickRandom(sampleTags), "seeded-sample"],
    triggers: triggers.length ? [pickRandom(triggers)] : [],
    themes,
    themeIntensities: themes.map((theme) => ({ theme, intensity: themeIntensity() })),
    emotions: profile.emotions || [{ label: "low", intensity: 50, tone: "negative" }],
  };
};

const parseArgs = (argv) => {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args.positional.push(token);
    }
  }
  return args;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
};

const parseTrajectory = (value) => {
  if (!value) return null;
  return value.split(",").map((segment) => {
    const [profile, daysRaw] = segment.split(":");
    const days = Number.parseInt(daysRaw, 10);
    return { profile: profile?.trim(), days };
  }).filter((segment) => segment.profile && Number.isFinite(segment.days) && segment.days > 0);
};

const buildTrajectoryResolver = (trajectory, fallbackProfile) => {
  if (!trajectory || !trajectory.length) {
    return () => fallbackProfile;
  }
  const totalDays = trajectory.reduce((sum, segment) => sum + segment.days, 0);
  return (dayIndex) => {
    const effectiveDay = Math.max(0, dayIndex);
    if (effectiveDay >= totalDays) {
      return trajectory[trajectory.length - 1].profile;
    }
    let cursor = 0;
    for (const segment of trajectory) {
      if (effectiveDay < cursor + segment.days) {
        return segment.profile;
      }
      cursor += segment.days;
    }
    return trajectory[trajectory.length - 1].profile;
  };
};

const run = async () => {
  const uri = process.env.MONGODB_URI;
  const args = parseArgs(process.argv.slice(2));
  const userId = args.positional[0] || process.env.SEED_USER_ID;
  const profileKey = args.positional[1] || process.env.SEED_PROFILE || "MDD_MODERATE_ANXIOUS";
  const count = args.count ? Number.parseInt(String(args.count), 10) : null;
  const startDate = args.start ? parseDateOnly(String(args.start)) : null;
  const endDate = args.end ? parseDateOnly(String(args.end)) : null;
  const trajectorySpec = args.trajectory || process.env.SEED_TRAJECTORY || null;
  const trajectory = parseTrajectory(trajectorySpec);
  const skipProbability = args.skip ? Number.parseFloat(String(args.skip)) : 0.2;

  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  if (!userId) {
    throw new Error(
      "Provide a user id: node scripts/seed-sample-entries.js <userId> [profileKey] [--count N] [--start YYYY-MM-DD --end YYYY-MM-DD]",
    );
  }
  if ((args.start && !startDate) || (args.end && !endDate)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new Error("Provide both --start and --end when using a date window.");
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error("--start must be before or equal to --end.");
  }
  if (count !== null && (Number.isNaN(count) || count <= 0)) {
    throw new Error("--count must be a positive integer.");
  }
  if (Number.isNaN(skipProbability) || skipProbability < 0 || skipProbability >= 1) {
    throw new Error("--skip must be a number between 0 and 1.");
  }

  await mongoose.connect(uri);

  const entries = [];
  const today = new Date();
  const existingEntries = await Entry.find({ userId }).select("dateISO").lean();
  const existingDates = new Set(existingEntries.map((entry) => entry.dateISO).filter(Boolean));
  const resolveProfileForDay = buildTrajectoryResolver(trajectory, profileKey);

  const addDays = (date, delta) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  const maxLookbackDays = 365;

  const createEntriesForWindow = async (windowStart, windowEnd) => {
    const days = Math.floor((windowEnd - windowStart) / (1000 * 60 * 60 * 24)) + 1;
    for (let i = 0; i < days; i += 1) {
      const date = addDays(windowStart, i);
      const dateISO = formatDateIso(date);
      if (existingDates.has(dateISO)) {
        continue;
      }
      if (roll() < skipProbability) {
        continue;
      }
      const lengthRoll = roll();
      const lengthTier = lengthRoll < 0.3 ? "sparse" : lengthRoll < 0.8 ? "standard" : "long";
      const phaseProfile = resolveProfileForDay(i);
      entries.push({
        userId,
        ...(await buildEntry({ date, profileKey: phaseProfile, lengthTier })),
      });
    }
  };

  if (startDate && endDate) {
    await createEntriesForWindow(startDate, endDate);
  } else {
    const targetCount = count || 28;
    let filled = 0;
    let offset = 0;
    while (offset <= maxLookbackDays && filled < targetCount) {
      const date = addDays(today, -offset);
      const dateISO = formatDateIso(date);
      if (!existingDates.has(dateISO)) {
        if (roll() < skipProbability) {
          offset += 1;
          continue;
        }
        const lengthRoll = roll();
        const lengthTier = lengthRoll < 0.3 ? "sparse" : lengthRoll < 0.8 ? "standard" : "long";
        const phaseProfile = resolveProfileForDay(filled);
        entries.push({
          userId,
          ...(await buildEntry({ date, profileKey: phaseProfile, lengthTier })),
        });
        filled += 1;
      }
      offset += 1;
    }
  }

  if (!entries.length) {
    console.log("No new dates available. Skipped insert.");
  } else {
    const result = await Entry.insertMany(entries);
    console.log(
      `Inserted ${result.length} sample entries for user ${userId} (${formatDateIso(
        new Date(result[result.length - 1].dateISO),
      )} to ${formatDateIso(new Date(result[0].dateISO))}).`,
    );
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
