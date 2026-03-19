/**
 * intentDetector.js
 * FILE: backend/src/routes/chatbot/intentDetector.js
 *
 * Detects user intent and builds role-specific system prompts.
 * Supports landing, customer, worker, and broker roles.
 */

// ── Service keyword map (customer-side) ──────────────────────────────────────
const SERVICE_KEYWORDS = {
  "vehicle-care":      ["car wash", "detailing", "interior", "vehicle", "routine car care"],
  "home-care":         ["plumb", "pipe", "leak", "electric", "wiring", "carpent", "paint", "ac", "air condition", "clean", "car service"],
  "personal-grooming": ["hair", "salon", "groom", "stylist", "skin", "facial", "beauty", "glow"]
};

// ── Intent detection ──────────────────────────────────────────────────────────

export function detectIntent(message, role = "customer") {
  const lower = message.toLowerCase();

  // ── LANDING intents ───────────────────────────────────────────────────────
  if (role === "landing") {
    if (/how\s*(it)?\s*work|working steps|steps of working|process|workflow|कैसे काम|काम कैसे करता/.test(lower))
      return { type: "how_it_works" };
    if (/feedback|testimonial|testimonials|review|reviews|what people say|फीडबैक|रिव्यू|प्रतिक्रिया/.test(lower))
      return { type: "testimonials" };
    if (/faq|faqs|frequently asked|queries|query|question|questions|doubt|प्रश्न|सवाल|क्वेरी/.test(lower))
      return { type: "faqs" };
    if (/login|log in|sign in|signup|sign up|register|create account|join|लॉगिन|साइनअप|रजिस्टर/.test(lower))
      return { type: "auth" };
    if (/role|customer|worker|broker|which should i choose|best for me|कौन सा रोल|रोल चुन/.test(lower))
      return { type: "role_selection" };
    if (/service|clean|plumb|electric|ac|groom|hair|facial|car wash|detailing|सर्विस|क्लीनिंग|प्लंबर|इलेक्ट्रीशियन/.test(lower))
      return { type: "services_overview" };
    if (/price|pricing|cost|charge|fees|कितना|दाम|कीमत/.test(lower))
      return { type: "pricing" };
    if (/safe|trust|verified|warranty|refund|support|payment|सुरक्षित|ट्रस्ट|रिफंड|सपोर्ट/.test(lower))
      return { type: "trust" };
    return { type: "general", serviceSlug: null };
  }

  // ── CUSTOMER intents ──────────────────────────────────────────────────────
  if (role === "customer") {
    if (/where|status|track|booking status|कहां|ट्रैक|स्थिति/.test(lower))
      return { type: "order_tracking", serviceSlug: null };
    if (/cancel|reschedule|postpone|रद्द|बदलना|कैंसिल/.test(lower))
      return { type: "cancellation", serviceSlug: null };
    if (/price|cost|how much|rate|charge|discount|offer|कितना|दाम|कीमत|ऑफर/.test(lower))
      return { type: "pricing", serviceSlug: detectService(lower) };
    if (/book|schedule|appoint|कब|बुक|अपॉइंट/.test(lower))
      return { type: "booking", serviceSlug: detectService(lower) };
    if (/recommend|suggest|best|which|problem|issue|not working|सुझाव|समस्या/.test(lower))
      return { type: "recommendation", serviceSlug: detectService(lower) };
    if (/refund|warranty|policy|payment|method|how long|duration|रिफंड|वारंटी|पॉलिसी/.test(lower))
      return { type: "faq", serviceSlug: null };
    const svc = detectService(lower);
    if (svc) return { type: "recommendation", serviceSlug: svc };
  }

  // ── WORKER intents ────────────────────────────────────────────────────────
  if (role === "worker") {
    if (/earn|income|payment|payout|commission|कमाई|पेमेंट|कमीशन/.test(lower))
      return { type: "earnings" };
    if (/job request|new job|pending|accept|reject|जॉब|काम/.test(lower))
      return { type: "job_requests" };
    if (/schedule|upcoming|confirm|today|कल|आज|शेड्यूल/.test(lower))
      return { type: "schedule" };
    if (/review|rating|feedback|रिव्यू|रेटिंग/.test(lower))
      return { type: "reviews" };
    if (/available|availability|status|अवेलेबल/.test(lower))
      return { type: "availability" };
    if (/broker|code|commission limit|ब्रोकर|कोड/.test(lower))
      return { type: "broker_link" };
    if (/profile|services|skill|प्रोफाइल/.test(lower))
      return { type: "profile" };
  }

  // ── BROKER intents ────────────────────────────────────────────────────────
  if (role === "broker") {
    if (/worker|team|network|linked|staff|वर्कर|टीम/.test(lower))
      return { type: "workers" };
    if (/earn|income|commission|profit|कमाई|कमीशन/.test(lower))
      return { type: "earnings" };
    if (/booking|job|service|बुकिंग|काम/.test(lower))
      return { type: "bookings" };
    if (/code|broker code|share|invite|कोड|शेयर/.test(lower))
      return { type: "broker_code" };
  }

  return { type: "general", serviceSlug: null };
}

function detectService(lower) {
  for (const [slug, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return slug;
  }
  return null;
}

// ── System prompts ────────────────────────────────────────────────────────────

const BASE_RULES = `
LANGUAGE RULE: Detect the language of the user's message and reply in the SAME language.
- Hindi input → Hindi reply (Devanagari)
- English input → English reply
- Hinglish input → Hinglish reply
Keep replies warm, helpful, and concise (2–4 sentences unless detail needed).
Never make up data. If unsure, say so and guide the user appropriately.

PROJECT GROUNDING RULES:
- Use only routes, pages, services, and policies explicitly defined below.
- Do NOT invent features, screens, discounts, pricing, timelines, or support channels.
- If user asks for unavailable/unknown info, clearly say it's not available and offer nearest in-app action.
- For booking help, follow this exact app flow:
  1) Open specific service detail page: /customer/category/:slug/service/:serviceSlug
  2) On service page choose plan/add-ons/offers, then tap Continue Booking
  3) Booking form on /bookings/new: fill date, time, location, description
  4) Confirm using Book Service.`;

const ROLE_TRAINING = {
  landing: `
TRAINING EXAMPLES:
- User: "how omni works" -> Explain 3 landing steps and suggest opening /?section=how-it-works.
- User: "show feedback" -> Summarize testimonials and suggest /?section=testimonials.
- User: "faq cancellation" -> Give concise FAQ answer and suggest /?section=faq.
- User: "worker signup" -> Route to /signup?role=worker.
`,
  customer: `
TRAINING EXAMPLES:
- User: "book electrician" -> First guide to matching service detail page, then continue booking.
- User: "my booking status" -> Direct to /bookings.
- User: "price for cleaning" -> Explain indicative pricing + final price shown in booking flow.
`,
  worker: `
TRAINING EXAMPLES:
- User: "new jobs" -> Direct to /job-requests.
- User: "today schedule" -> Direct to /schedule.
- User: "my earnings" -> Direct to /earnings with net-payout explanation.
`,
  broker: `
TRAINING EXAMPLES:
- User: "my workers" -> Direct to /workers.
- User: "commission" -> Explain 5% model and direct to /earnings.
- User: "broker code" -> Direct to /profile for shareable code.
`
};

export function buildSystemPrompt(intent, role = "customer") {
  if (role === "landing") return buildLandingPrompt(intent);
  if (role === "worker") return buildWorkerPrompt(intent);
  if (role === "broker") return buildBrokerPrompt(intent);
  return buildCustomerPrompt(intent);
}

function buildLandingPrompt(intent) {
  const base = `You are Omni Guide — an onboarding chatbot shown on Omni landing page.
Your primary goal is to guide visitors to the correct role and auth route.

Landing routes:
- Home: /
- Login: /login?role=customer | /login?role=worker | /login?role=broker
- Signup: /signup?role=customer | /signup?role=worker | /signup?role=broker

Platform role summary:
- Customer: books and tracks services
- Worker: accepts jobs and earns income
- Broker: links workers and earns commission

Service categories to mention at a high level only:
- Home care, Personal grooming, Vehicle care

DO NOT provide customer dashboard-only instructions (like /bookings/new flow) on landing unless user explicitly says they already have a customer account and want to continue there.
Prefer onboarding CTA guidance: choose role, then login/signup.
${BASE_RULES}
${ROLE_TRAINING.landing}`;

  const extras = {
    auth: "\nFOCUS: Help user choose login/signup route by role. Keep it short and actionable.",
    role_selection: "\nFOCUS: Compare Customer vs Worker vs Broker in 1-2 lines each and suggest a best-fit role.",
    how_it_works: "\nFOCUS: Explain the exact 3 landing flow steps clearly and concisely.",
    testimonials: "\nFOCUS: Share representative feedback from Customer, Broker, and Service Provider examples.",
    faqs: "\nFOCUS: Answer common landing questions like request speed, cancellation, worker verification, and broker visibility.",
    services_overview: "\nFOCUS: Describe available service categories briefly and direct user to customer signup/login to explore details.",
    pricing: "\nFOCUS: Explain that exact prices are shown after selecting service and location inside customer app.",
    trust: "\nFOCUS: Reassure with concise quality/safety guidance and suggest starting with customer signup/login.",
    general: "\nFOCUS: Keep answers onboarding-first and ask a clarifying question if intent is unclear."
  };

  return base + (extras[intent.type] || extras.general);
}

function buildCustomerPrompt(intent) {
  const base = `You are Omni Assistant — a friendly AI chatbot for Omni, a home services marketplace in India (like Urban Company).
You help customers with: booking services, recommendations, pricing, tracking orders, cancellations, FAQs.

Available services: House Cleaning, Carpentry Care, Plumbing Support, Electrical Care, AC Maintenance, Car Service, At-Home Hair Styling, Skin & Glow Rituals, Premium Car Wash, Interior Detailing, Routine Car Care.
App pages: Home (/), Bookings (/bookings), Favorites (/favorites), Profile (/profile), Settings (/settings).
Category pages: /customer/category/home-care, /customer/category/personal-grooming, /customer/category/vehicle-care.
Service detail route pattern: /customer/category/:slug/service/:serviceSlug.
Booking route: /bookings/new.
${BASE_RULES}
${ROLE_TRAINING.customer}`;

  const extras = {
    order_tracking: "\nFOCUS: Help the user check booking status. Direct them to /bookings page.",
    booking: `\nFOCUS: Help book a service. ${intent.serviceSlug ? `They seem interested in ${intent.serviceSlug}.` : "Ask which service they need."} Guide: service → date → time → confirm.`,
    pricing: `\nFOCUS: Answer pricing questions. ${intent.serviceSlug ? `Focus on ${intent.serviceSlug}.` : ""} Mention final price shows at booking.`,
    recommendation: `\nFOCUS: Suggest the right service. ${intent.serviceSlug ? `Likely a ${intent.serviceSlug} issue.` : "Ask clarifying questions."} Give 2–3 practical options.`,
    cancellation: "\nFOCUS: Help cancel or reschedule. Cancellation is free within 10 minutes of booking. Direct to /bookings.",
    faq: "\nFOCUS: Answer clearly. Refund: 7-day policy. Payment: card, UPI, cash. Warranty: 30-day guarantee. Duration depends on service.",
    general: "\nBe helpful. If unclear, ask a clarifying question or suggest browsing services."
  };
  return base + (extras[intent.type] || extras.general);
}

function buildWorkerPrompt(intent) {
  const base = `You are Omni Assistant — an AI assistant for Omni service workers.
You help workers with: viewing job requests, managing their schedule, checking earnings, updating profile, understanding broker commission, and improving ratings.

Worker app pages:
- Overview/Dashboard: /
- Job Requests: /job-requests (pending jobs to accept/reject)
- Schedule: /schedule (confirmed & upcoming jobs)
- Earnings: /earnings (total earnings, completed jobs, broker commission deductions)
- Reviews: /reviews (customer ratings and feedback)
- Job Profile: /job-profile (public profile visible to customers)
- Profile: /profile (personal info, services offered, availability toggle)
- Settings: /settings

Key facts for workers:
- Broker commission is 5% per completed job (first 10 jobs only per broker)
- Workers can accept or reject job requests from the Job Requests tab
- Availability can be toggled ON/OFF from Profile
- Average rating affects job visibility to customers
${BASE_RULES}
${ROLE_TRAINING.worker}`;

  const extras = {
    earnings:     "\nFOCUS: Explain earnings clearly. Net payout = total amount - 5% broker commission (if linked). Direct to /earnings.",
    job_requests: "\nFOCUS: Help with job requests. Explain accept/reject flow. Direct to /job-requests.",
    schedule:     "\nFOCUS: Help with schedule. Explain confirmed vs upcoming jobs. Direct to /schedule.",
    reviews:      "\nFOCUS: Help improve ratings. Suggest being punctual, professional, and communicating well. Direct to /reviews.",
    availability: "\nFOCUS: Help toggle availability. Direct to /profile to update it.",
    broker_link:  "\nFOCUS: Explain broker commission — 5% for first 10 completed jobs per broker. Worker keeps the rest.",
    profile:      "\nFOCUS: Help update profile, add services, set availability. Direct to /profile.",
    general:      "\nBe helpful. Guide the worker to the right section of the app."
  };
  return base + (extras[intent.type] || extras.general);
}

function buildBrokerPrompt(intent) {
  const base = `You are Omni Assistant — an AI assistant for Omni brokers.
You help brokers with: managing their worker network, viewing commission earnings, sharing broker code, and understanding the platform.

Broker app pages:
- Overview/Dashboard: /
- Workers: /workers (all linked workers, their stats, jobs, earnings)
- Bookings: /bookings (completed bookings with commission breakdown)
- Earnings: /earnings (total commission earned, recent credits)
- Profile: /profile (broker code, personal info)
- Settings: /settings

Key facts for brokers:
- Broker code is a unique 6-character code workers enter at signup to link with the broker
- Commission rate is 5% per completed booking by linked workers
- Commission applies to first 10 jobs per worker (per broker relationship)
- Broker earns passive income from every completed job by their linked workers
- Workers must use broker code at signup — it cannot be changed after signup
${BASE_RULES}
${ROLE_TRAINING.broker}`;

  const extras = {
    workers:     "\nFOCUS: Help manage worker network. Explain linking via broker code, viewing stats. Direct to /workers.",
    earnings:    "\nFOCUS: Explain commission earnings. 5% per completed job, first 10 per worker. Direct to /earnings.",
    bookings:    "\nFOCUS: Help view booking history and commissions. Direct to /bookings.",
    broker_code: "\nFOCUS: Explain broker code — unique 6-char code shared with workers to link them. Found in /profile. Share with trusted workers only.",
    general:     "\nBe helpful. Guide the broker to the right section of their dashboard."
  };
  return base + (extras[intent.type] || extras.general);
}