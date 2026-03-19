/**
 * commandMap.js
 * FILE: backend/src/routes/chatbot/commandMap.js
 *
 * Role-specific manual command maps.
 * Landing   → landing page auth/onboarding routes
 * Customer  → /customer routes + dashboard tabs
 * Worker    → worker dashboard tabs (/job-requests, /schedule, /earnings, etc.)
 * Broker    → broker dashboard tabs (/workers, /bookings, /earnings, etc.)
 *
 * Supports English, Hindi, Hinglish.
 * These are handled WITHOUT Gemini — instant responses.
 */

// ── SHARED COMMANDS (work for all roles) ─────────────────────────────────────
const SHARED_COMMANDS = [
  {
    patterns: [/^(hi|hello|hey|hii|helo|नमस्ते|नमस्कार|हेलो|हाय)[\s!.]*$/i],
    path: null,
    replyFn: (role) => {
      const roleGreetings = {
        landing:  "Hi! I'm Omni Guide for the landing page. I can help you choose a role and start signup or login quickly.",
        customer: "👋 Hi! I'm Omni Assistant.\n\nI can help you:\n• 🔧 Book a service\n• 📋 Track your bookings\n• 💡 Get recommendations\n• 💰 Check pricing\n\nWhat do you need today?",
        worker:   "👋 Hi! I'm Omni Assistant for Workers.\n\nI can help you:\n• 📥 View job requests\n• 📅 Check your schedule\n• 💰 View earnings\n• 👤 Update profile\n\nWhat do you need?",
        broker:   "👋 Hi! I'm Omni Assistant for Brokers.\n\nI can help you:\n• 👥 Manage your workers\n• 📋 View bookings & commissions\n• 💰 Check earnings\n• 🔗 Share broker code\n\nHow can I assist?"
      };
      return roleGreetings[role] || roleGreetings.customer;
    },
    action: "greet"
  },
  {
    patterns: [/^(thanks|thank you|thx|धन्यवाद|शुक्रिया)[\s!.]*$/i],
    path: null,
    reply: "You're welcome! 😊 Anything else I can help with?",
    action: "respond"
  },
  {
    patterns: [/^(bye|goodbye|see you|अलविदा|बाय)[\s!.]*$/i],
    path: null,
    reply: "Goodbye! Have a great day! 👋",
    action: "respond"
  },
  {
    patterns: [/\b(profile|my account|account|प्रोफाइल|अकाउंट)\b/i],
    path: "/profile",
    reply: "Opening your profile! 👤",
    action: "navigate"
  },
  {
    patterns: [/\b(settings|preferences|सेटिंग्स)\b/i],
    path: "/settings",
    reply: "Opening settings! ⚙️",
    action: "navigate"
  }
];

// ── LANDING COMMANDS ─────────────────────────────────────────────────────────
const LANDING_COMMANDS = [
  {
    patterns: [/^(hi|hello|hey|hii|helo|नमस्ते|नमस्कार|हेलो|हाय)[\s!.]*$/i],
    path: null,
    reply: "Hi! I can help you choose your Omni role and get started with signup or login.",
    action: "respond"
  },
  {
    patterns: [/^(thanks|thank you|thx|धन्यवाद|शुक्रिया)[\s!.]*$/i],
    path: null,
    reply: "You're welcome. Want me to open signup for a specific role?",
    action: "respond"
  },
  {
    patterns: [/\b(home|landing|main|होम|लैंडिंग)\b/i],
    path: "/",
    reply: "Opening the landing page.",
    action: "navigate"
  },
  {
    patterns: [/\b(customer signup|customer sign up|join as customer|book service|need service|hire service)\b/i],
    path: "/signup?role=customer",
    reply: "Opening customer signup.",
    action: "navigate"
  },
  {
    patterns: [/\b(customer login|login customer|sign in customer)\b/i],
    path: "/login?role=customer",
    reply: "Opening customer login.",
    action: "navigate"
  },
  {
    patterns: [/\b(worker signup|worker sign up|join as worker)\b/i],
    path: "/signup?role=worker",
    reply: "Opening worker signup.",
    action: "navigate"
  },
  {
    patterns: [/\b(worker login|login worker|sign in worker)\b/i],
    path: "/login?role=worker",
    reply: "Opening worker login.",
    action: "navigate"
  },
  {
    patterns: [/\b(broker signup|broker sign up|join as broker)\b/i],
    path: "/signup?role=broker",
    reply: "Opening broker signup.",
    action: "navigate"
  },
  {
    patterns: [/\b(broker login|login broker|sign in broker)\b/i],
    path: "/login?role=broker",
    reply: "Opening broker login.",
    action: "navigate"
  },
  {
    patterns: [/\b(which role|choose role|best role|role for me|customer or worker|customer or broker|वर्कर या कस्टमर|कौन सा रोल)\b/i],
    path: null,
    reply: "If you want to book services, choose Customer. If you provide services, choose Worker. If you manage workers and earn commission, choose Broker.",
    action: "respond"
  },
  {
    patterns: [/\b(how it works|how omni works|steps|working steps|process|workflow|कैसे काम|स्टेप्स)\b/i],
    path: "/?section=how-it-works",
    reply: "Opening How Omni Works section.",
    action: "navigate"
  },
  {
    patterns: [/\b(feedback|testimonial|testimonials|what users say|reviews|फीडबैक|रिव्यू)\b/i],
    path: "/?section=testimonials",
    reply: "Opening user feedback section.",
    action: "navigate"
  },
  {
    patterns: [/\b(faq|faqs|query|queries|question|questions|doubt|प्रश्न|सवाल|क्वेरी)\b/i],
    path: "/?section=faq",
    reply: "Opening FAQs section.",
    action: "navigate"
  },
  {
    patterns: [/\b(services|what services|available services|offerings|service list|कौन सी सर्विस)\b/i],
    path: "/?section=services",
    reply: "Opening services section.",
    action: "navigate"
  }
];

// ── CUSTOMER COMMANDS ────────────────────────────────────────────────────────
const CUSTOMER_COMMANDS = [
  {
    patterns: [/\b(home|dashboard|main|होम|मुख्य)\b/i],
    path: "/",
    reply: "Taking you home! 🏠",
    action: "navigate"
  },
  {
    patterns: [/\b(my bookings|show bookings|view bookings|bookings|मेरी बुकिंग|बुकिंग देखो|बुकिंग)\b/i],
    path: "/bookings",
    reply: "Opening your bookings! 📋",
    action: "navigate"
  },
  {
    patterns: [/\b(favorites|favourites|saved|पसंदीदा)\b/i],
    path: "/favorites",
    reply: "Opening your favorites! ❤️",
    action: "navigate"
  },
  {
    patterns: [/\b(book service|new booking|start booking|बुकिंग करो|नई बुकिंग)\b/i],
    path: "/",
    reply: "Let's choose your service first, then continue booking. 🔎",
    action: "navigate"
  },
  {
    patterns: [/\b(continue booking|confirm booking|complete booking|book now|बुकिंग कन्फर्म|अभी बुक)\b/i],
    path: "/bookings/new",
    reply: "Opening booking form. 📅",
    action: "navigate"
  },
  // Services
  {
    patterns: [/\b(plumb|plumbing|plumber|नल|पाइप|प्लम्बिंग)\b/i],
    path: "/customer/category/home-care/service/plumbing-support",
    reply: "Opening plumbing services! 🔧",
    action: "navigate"
  },
  {
    patterns: [/\b(electrician|electrical|electric|wiring|बिजली|इलेक्ट्रीशियन)\b/i],
    path: "/customer/category/home-care/service/electrical-care",
    reply: "Opening electrical services! ⚡",
    action: "navigate"
  },
  {
    patterns: [/\b(ac repair|ac service|air condition|एसी|एयर कंडीशन)\b/i, /\bac\b/i],
    path: "/customer/category/home-care/service/ac-maintenance",
    reply: "Opening AC repair services! ❄️",
    action: "navigate"
  },
  {
    patterns: [/\b(house clean|home clean|cleaning|सफाई|क्लीनिंग)\b/i],
    path: "/customer/category/home-care/service/house-cleaning",
    reply: "Opening cleaning services! 🧹",
    action: "navigate"
  },
  {
    patterns: [/\b(carpent|carpenter|wood work|बढ़ई|कारपेंटर)\b/i],
    path: "/customer/category/home-care/service/carpentry-care",
    reply: "Opening carpentry services! 🪚",
    action: "navigate"
  },
  {
    patterns: [/\b(paint|painting|painter|रंग|पेंटिंग)\b/i],
    path: "/customer/category/home-care",
    reply: "Opening painting services! 🎨",
    action: "navigate"
  },
  {
    patterns: [/\b(hair|salon|groom|stylist|बाल|हेयर|सैलून)\b/i],
    path: "/customer/category/personal-grooming/service/at-home-hair-styling",
    reply: "Opening grooming services! ✂️",
    action: "navigate"
  },
  {
    patterns: [/\b(skin|facial|beauty|glow|स्किन|फेशियल|ब्यूटी)\b/i],
    path: "/customer/category/personal-grooming/service/skin-glow-rituals",
    reply: "Opening skin & glow services! ✨",
    action: "navigate"
  },
  {
    patterns: [/\b(car wash|wash car|कार वॉश|कार धुलाई)\b/i],
    path: "/customer/category/vehicle-care/service/premium-car-wash",
    reply: "Opening car wash services! 🚗",
    action: "navigate"
  },
  {
    patterns: [/\b(interior detailing|detailing|interior clean)\b/i],
    path: "/customer/category/vehicle-care/service/interior-detailing",
    reply: "Opening interior detailing! 🚘",
    action: "navigate"
  },
  {
    patterns: [/\b(car service|routine car care|vehicle service|गाड़ी सर्विस|कार सर्विस)\b/i],
    path: "/customer/category/home-care/service/car-service",
    reply: "Opening car services! 🚗",
    action: "navigate"
  }
];

// ── WORKER COMMANDS ──────────────────────────────────────────────────────────
const WORKER_COMMANDS = [
  {
    patterns: [/\b(home|dashboard|overview|होम|ओवरव्यू)\b/i],
    path: "/",
    reply: "Taking you to your dashboard! 🏠",
    action: "navigate"
  },
  {
    patterns: [/\b(job requests?|new jobs?|pending jobs?|जॉब रिक्वेस्ट|नए काम|pending)\b/i],
    path: "/job-requests",
    reply: "Opening job requests! 📥",
    action: "navigate"
  },
  {
    patterns: [/\b(schedule|my jobs|upcoming jobs|scheduled|शेड्यूल|आगे के काम)\b/i],
    path: "/schedule",
    reply: "Opening your schedule! 📅",
    action: "navigate"
  },
  {
    patterns: [/\b(earnings?|income|payout|payment|कमाई|इनकम|पेमेंट)\b/i],
    path: "/earnings",
    reply: "Opening your earnings! 💰",
    action: "navigate"
  },
  {
    patterns: [/\b(reviews?|ratings?|feedback|रिव्यू|रेटिंग|फीडबैक)\b/i],
    path: "/reviews",
    reply: "Opening your reviews! ⭐",
    action: "navigate"
  },
  {
    patterns: [/\b(job profile|my profile|public profile|जॉब प्रोफाइल|पब्लिक)\b/i],
    path: "/job-profile",
    reply: "Opening your job profile! 💼",
    action: "navigate"
  },
  {
    patterns: [/\b(availability|available|अवेलेबल|उपलब्धता)\b/i],
    path: "/profile",
    reply: "Go to Profile to update your availability status! 👤",
    action: "navigate"
  }
];

// ── BROKER COMMANDS ──────────────────────────────────────────────────────────
const BROKER_COMMANDS = [
  {
    patterns: [/\b(home|dashboard|overview|होम|ओवरव्यू)\b/i],
    path: "/",
    reply: "Taking you to your dashboard! 🏠",
    action: "navigate"
  },
  {
    patterns: [/\b(my workers?|linked workers?|network|मेरे वर्कर|वर्कर लिस्ट)\b/i],
    path: "/workers",
    reply: "Opening your workers list! 👥",
    action: "navigate"
  },
  {
    patterns: [/\b(bookings?|booking history|completed bookings?|बुकिंग|बुकिंग हिस्ट्री)\b/i],
    path: "/bookings",
    reply: "Opening booking history! 📋",
    action: "navigate"
  },
  {
    patterns: [/\b(earnings?|commission|income|कमाई|कमीशन|इनकम)\b/i],
    path: "/earnings",
    reply: "Opening your earnings & commissions! 💰",
    action: "navigate"
  },
  {
    patterns: [/\b(broker code|my code|share code|ब्रोकर कोड|कोड)\b/i],
    path: "/profile",
    reply: "Go to Profile to find and share your broker code! 🔗",
    action: "navigate"
  }
];

// ── ROLE MAP ──────────────────────────────────────────────────────────────────
const ROLE_COMMANDS = {
  landing:  [...LANDING_COMMANDS],
  customer: [...SHARED_COMMANDS, ...CUSTOMER_COMMANDS],
  worker:   [...SHARED_COMMANDS, ...WORKER_COMMANDS],
  broker:   [...SHARED_COMMANDS, ...BROKER_COMMANDS]
};

/**
 * Matches a user message against commands for a specific role.
 * Returns matched command or null.
 */
export function matchCommand(message, role = "customer") {
  const commands = ROLE_COMMANDS[role] || ROLE_COMMANDS.customer;
  const trimmed = message.trim();

  for (const cmd of commands) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(trimmed)) {
        return {
          path: cmd.path,
          // Support dynamic reply functions (e.g., greeting changes per role)
          reply: typeof cmd.replyFn === "function" ? cmd.replyFn(role) : cmd.reply,
          action: cmd.action
        };
      }
    }
  }
  return null;
}

export { ROLE_COMMANDS };