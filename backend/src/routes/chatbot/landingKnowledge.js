/**
 * landingKnowledge.js — Omni Landing Page Deterministic Knowledge (Upgraded)
 *
 * Handles knowledge queries without LLM. Fast, accurate, always consistent.
 * Covers: how it works, testimonials, FAQs, services, pricing, trust, contact.
 */

const LANDING_CONTENT = {
  services: [
    { name: "Plumbing Support", category: "Home Care", price: "₹450+" },
    { name: "Electrical Care", category: "Home Care", price: "₹500+" },
    { name: "Carpentry Care", category: "Home Care", price: "₹600+" },
    { name: "Painter", category: "Home Care", price: "₹650+" },
    { name: "AC Maintenance", category: "Home Care", price: "₹700+" },
    { name: "House Cleaning", category: "Home Care", price: "₹450+" },
    { name: "Car Service", category: "Home Care", price: "₹900+" },
    { name: "At-Home Hair Styling", category: "Personal Grooming", price: "₹800+" },
    { name: "Skin & Glow Rituals", category: "Personal Grooming", price: "₹750+" },
    { name: "Premium Car Wash", category: "Vehicle Care", price: "₹499+" },
    { name: "Interior Detailing", category: "Vehicle Care", price: "₹699+" }
  ],
  trustPoints: [
    "Verified professionals with background checks",
    "Transparent pricing — no hidden charges",
    "5% platform discount on every booking",
    "7-day service support guarantee",
    "Real-time booking status updates",
    "Live worker tracking during service"
  ],
  howItWorks: [
    {
      step: 1,
      title: "Choose your service",
      description: "Browse services by category. Select a plan and any add-ons. Continue to booking form."
    },
    {
      step: 2,
      title: "Set time and location",
      description: "Pick your preferred date and time. Add your location — type it or use the map picker."
    },
    {
      step: 3,
      title: "Worker arrives and completes",
      description: "A matched worker accepts your request. Track them live on map. Pay after service. Rate your experience."
    }
  ],
  testimonials: [
    {
      name: "Priya Sharma",
      role: "Customer",
      service: "House Cleaning",
      rating: 5,
      quote: "Booked cleaning in under 2 minutes. The worker arrived on time, was very professional, and the house was spotless. Definitely using again!"
    },
    {
      name: "Rahul Verma",
      role: "Worker",
      service: "Electrician",
      rating: 5,
      quote: "I get job requests directly on my phone. The app shows customer location and lets me chat with them. My earnings have increased significantly."
    },
    {
      name: "Ankit Gupta",
      role: "Broker",
      service: "Network Manager",
      rating: 5,
      quote: "I manage 8 workers through my broker code. The commission comes in automatically for every completed job. Very smooth system."
    },
    {
      name: "Meera Joshi",
      role: "Customer",
      service: "AC Repair",
      rating: 5,
      quote: "Same-day booking and the technician fixed my AC in under an hour. Real-time tracking gave me confidence he was on the way."
    }
  ],
  faqs: [
    {
      question: "How quickly does a worker receive my booking?",
      answer: "Booking requests are delivered in real time. Once a worker accepts, your booking status updates immediately and you receive a notification."
    },
    {
      question: "Can I cancel a booking after creating it?",
      answer: "Yes. You can cancel for free within 10 minutes of booking. After that, a Pay Now button appears since the worker has already been dispatched."
    },
    {
      question: "How are workers verified?",
      answer: "Workers complete profile verification with their services, contact details, and availability. Customer ratings and reviews are public and updated after every completed job."
    },
    {
      question: "What if the service was not provided?",
      answer: "If a worker accepted but didn't show up, use the 'Service Not Provided' button in My Bookings. This flags the issue for resolution."
    },
    {
      question: "How does the broker commission work?",
      answer: "Brokers earn 5% of each completed booking by their linked workers. This applies to the first 10 completed jobs per worker. Commission is tracked in the broker dashboard."
    },
    {
      question: "What payment methods are accepted?",
      answer: "Payment is processed through the app when you tap 'Pay Now' on your booking. It becomes available after the 10-minute cancellation window."
    },
    {
      question: "Is there a service guarantee?",
      answer: "Yes. Omni offers a 7-day service support guarantee. If you face issues after service completion, use the booking page to report them."
    },
    {
      question: "Can I track the worker in real time?",
      answer: "Yes. Once a worker accepts your booking, a 'Track Worker' button appears on your booking card. You can see their live GPS location on a map."
    }
  ],
  pricing: {
    discount: "5% platform discount applied on every booking",
    plans: "Multiple plans available per service (Essential, Advanced, Premium)",
    addons: "Optional add-ons available at extra cost",
    offers: "Limited-time offers shown on service detail pages",
    note: "Final price always shown before confirming booking — no surprises"
  }
};

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

function isHindiPreferred(userLanguage, message) {
  if (userLanguage === "hi-IN") return true;
  if (userLanguage === "en-IN") return false;
  return hasDevanagari(message);
}

export function buildLandingKnowledgeReply({ message, intent, userLanguage }) {
  const lower = String(message || "").toLowerCase();
  const isHindi = isHindiPreferred(userLanguage, message);

  // ── HOW IT WORKS ──────────────────────────────────────────────────────────
  if (intent.type === "how_it_works") {
    const stepsEn = LANDING_CONTENT.howItWorks
      .map(s => `**Step ${s.step}: ${s.title}** — ${s.description}`)
      .join("\n");
    const stepsHi = `**Step 1: Service चुनें** — Category browse करें, plan और add-ons select करें, Continue Booking दबाएं।\n**Step 2: Time और Location set करें** — Date और time चुनें। Location type करें या map से pin करें।\n**Step 3: Worker आए और काम पूरा करे** — Matched worker request accept करे। Live map पर track करें। Service के बाद pay करें और review दें।`;
    return {
      reply: isHindi
        ? `Omni इस तरह काम करता है:\n\n${stepsHi}\n\nKoई भी सवाल हो तो पूछें!`
        : `Here's exactly how Omni works:\n\n${stepsEn}\n\nAny questions? Just ask!`,
      navigateTo: "/?section=how-it-works"
    };
  }

  // ── TESTIMONIALS ──────────────────────────────────────────────────────────
  if (intent.type === "testimonials") {
    const lines = LANDING_CONTENT.testimonials
      .map(t => `**${t.name}** (${t.role}, ${t.service}, ${t.rating}⭐): "${t.quote}"`)
      .join("\n\n");
    const hindiIntro = "यहाँ real user feedback है:";
    const engIntro = "Here's what real Omni users say:";
    return {
      reply: isHindi
        ? `${hindiIntro}\n\n${lines}`
        : `${engIntro}\n\n${lines}`,
      navigateTo: "/?section=testimonials"
    };
  }

  // ── FAQS ──────────────────────────────────────────────────────────────────
  if (intent.type === "faqs") {
    // Pick the most relevant FAQ(s) based on message keywords
    let selected = LANDING_CONTENT.faqs;
    if (/cancel|refund|रद्द|कैंसिल/.test(lower)) selected = [LANDING_CONTENT.faqs[1], LANDING_CONTENT.faqs[6]];
    else if (/verif|background|safe|trust|सुरक्षित|भरोसा/.test(lower)) selected = [LANDING_CONTENT.faqs[2], LANDING_CONTENT.faqs[6]];
    else if (/broker|commission|कमीशन|ब्रोकर/.test(lower)) selected = [LANDING_CONTENT.faqs[4]];
    else if (/fast|quick|how long|speed|कितना समय|जल्दी/.test(lower)) selected = [LANDING_CONTENT.faqs[0]];
    else if (/pay|payment|method|भुगतान/.test(lower)) selected = [LANDING_CONTENT.faqs[5]];
    else if (/not.*provide|didn't come|worker.*not|नहीं आया/.test(lower)) selected = [LANDING_CONTENT.faqs[3]];
    else if (/guarantee|warranty|support|guarantee|गारंटी/.test(lower)) selected = [LANDING_CONTENT.faqs[6]];
    else if (/track|location|map|ट्रैक/.test(lower)) selected = [LANDING_CONTENT.faqs[7]];
    else selected = LANDING_CONTENT.faqs.slice(0, 4); // show top 4 for general FAQ

    const lines = selected
      .map((f, i) => `**Q${i + 1}: ${f.question}**\n${f.answer}`)
      .join("\n\n");
    return {
      reply: isHindi
        ? `यहाँ relevant FAQs हैं:\n\n${lines}\n\nAur kuch poochna hai?`
        : `Here are the most relevant answers:\n\n${lines}\n\nAnything else you'd like to know?`,
      navigateTo: "/?section=faq"
    };
  }

  // ── SERVICES OVERVIEW ─────────────────────────────────────────────────────
  if (intent.type === "services_overview") {
    const grouped = {};
    LANDING_CONTENT.services.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(`${s.name} (${s.price})`);
    });
    const lines = Object.entries(grouped)
      .map(([cat, svcs]) => `**${cat}**: ${svcs.join(", ")}`)
      .join("\n");
    return {
      reply: isHindi
        ? `Omni पर ये services available हैं:\n\n${lines}\n\nSaari services Customer app में details के साथ available हैं।`
        : `Here are all available services on Omni:\n\n${lines}\n\nFull details and plans available inside the Customer app.`,
      navigateTo: "/?section=services"
    };
  }

  // ── PRICING ───────────────────────────────────────────────────────────────
  if (intent.type === "pricing") {
    const p = LANDING_CONTENT.pricing;
    const samplePrices = LANDING_CONTENT.services
      .slice(0, 5)
      .map(s => `${s.name}: ${s.price}`)
      .join(", ");
    return {
      reply: isHindi
        ? `Omni pricing की जानकारी:\n\n✅ ${p.discount}\n📦 ${p.plans}\n➕ ${p.addons}\n🎁 ${p.offers}\n\nSample prices: ${samplePrices}\n\n${p.note}`
        : `Omni pricing information:\n\n✅ ${p.discount}\n📦 ${p.plans}\n➕ ${p.addons}\n🎁 ${p.offers}\n\nSample prices: ${samplePrices}\n\n${p.note}`,
      navigateTo: "/signup?role=customer"
    };
  }

  // ── TRUST ─────────────────────────────────────────────────────────────────
  if (intent.type === "trust") {
    const points = LANDING_CONTENT.trustPoints.map(p => `✅ ${p}`).join("\n");
    return {
      reply: isHindi
        ? `Omni पर भरोसा क्यों करें:\n\n${points}\n\nHar booking safe और transparent है।`
        : `Why trust Omni:\n\n${points}\n\nEvery booking is safe and transparent.`,
      navigateTo: null
    };
  }

  // ── CONTACT ───────────────────────────────────────────────────────────────
  if (intent.type === "contact") {
    return {
      reply: isHindi
        ? "Support के लिए app में login करने के बाद bookings page पर जाएं। वहाँ issue report करने का option है। आप Chatbot से भी हर सवाल पूछ सकते हैं।"
        : "For support, login to the app and go to your Bookings page where you can report issues. You can also ask me any question directly!",
      navigateTo: null
    };
  }

  return null;
}