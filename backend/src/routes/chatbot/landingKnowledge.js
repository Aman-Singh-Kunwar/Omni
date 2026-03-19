const LANDING_CONTENT = {
  services: [
    "Plumber", "Electrician", "Carpenter", "Painter", "AC Repair",
    "Cleaning", "Gardening", "Appliance Repair", "Pest Control", "Home Security"
  ],
  trustPoints: [
    "Same-day bookings",
    "Verified professionals",
    "Transparent pricing",
    "Live booking updates"
  ],
  howItWorks: [
    {
      title: "Choose role and service",
      description: "Select customer, broker, or worker flow and pick the exact service you need in seconds."
    },
    {
      title: "Book with time and location",
      description: "Set your preferred schedule, add instructions, and create a request with full clarity."
    },
    {
      title: "Get matched and complete",
      description: "Workers receive requests quickly, accept jobs, and your booking updates instantly."
    }
  ],
  testimonials: [
    {
      name: "Ritika Sharma",
      role: "Customer",
      service: "AC Repair",
      rating: 5,
      quote: "Booking was simple and the worker arrived on time. Status updates were clear at every step."
    },
    {
      name: "Ankit Verma",
      role: "Broker",
      service: "Worker Network Management",
      rating: 5,
      quote: "The broker dashboard gives me one place to track team activity, earnings, and service quality."
    },
    {
      name: "Sahil Khan",
      role: "Service Provider",
      service: "Electrical Services",
      rating: 4,
      quote: "I receive job requests quickly and can manage all my bookings without confusion."
    }
  ],
  faqs: [
    {
      question: "How fast can a worker receive a booking request?",
      answer: "Requests are delivered in real time to eligible workers. Once a worker accepts, the booking status updates immediately."
    },
    {
      question: "Can I cancel a booking after creating it?",
      answer: "Yes. Customers can cancel pending or confirmed bookings within the allowed cancellation window shown in the booking flow."
    },
    {
      question: "How are workers verified?",
      answer: "Workers are onboarded with profile information, service details, and performance tracking through ratings and completed jobs."
    },
    {
      question: "Do brokers get performance visibility?",
      answer: "Yes. Brokers can view linked workers, booking history, and commission insights from the broker dashboard."
    }
  ]
};

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

function isHindiPreferred(userLanguage, message) {
  if (userLanguage === "hi-IN") return true;
  if (userLanguage === "en-IN") return false;
  return hasDevanagari(message);
}

function buildLandingKnowledgeReply({ message, intent, userLanguage }) {
  const lower = String(message || "").toLowerCase();
  const isHindi = isHindiPreferred(userLanguage, message);

  if (intent.type === "how_it_works") {
    const lines = LANDING_CONTENT.howItWorks
      .map((step, index) => `${index + 1}) ${step.title} - ${step.description}`)
      .join("\n");

    return {
      reply: isHindi
        ? `Omni ka working flow:\n${lines}\n\nAgar chaho to main aapko role ke hisab se signup page khol du.`
        : `Here are the exact Omni working steps:\n${lines}\n\nI can open signup by role if you want.`,
      navigateTo: "/?section=how-it-works"
    };
  }

  if (intent.type === "testimonials") {
    const lines = LANDING_CONTENT.testimonials
      .map((item) => `- ${item.name} (${item.role}, ${item.service}, ${item.rating}/5): "${item.quote}"`)
      .join("\n");

    return {
      reply: isHindi
        ? `Landing page par real feedback yeh hai:\n${lines}`
        : `Here is real feedback from the landing page:\n${lines}`,
      navigateTo: "/?section=testimonials"
    };
  }

  if (intent.type === "faqs") {
    const pick = () => {
      if (/cancel|reschedule|refund|रद्द|कैंसिल/.test(lower)) return [LANDING_CONTENT.faqs[1]];
      if (/verify|verified|background|worker verify|वेरिफाई|सत्यापन/.test(lower)) return [LANDING_CONTENT.faqs[2]];
      if (/broker|commission|visibility|network|ब्रोकर|कमीशन/.test(lower)) return [LANDING_CONTENT.faqs[3]];
      if (/fast|real time|how fast|receive request|कितनी जल्दी|जल्दी/.test(lower)) return [LANDING_CONTENT.faqs[0]];
      return LANDING_CONTENT.faqs;
    };

    const selectedFaqs = pick();
    const lines = selectedFaqs
      .map((item, index) => `${index + 1}) Q: ${item.question}\n   A: ${item.answer}`)
      .join("\n");

    return {
      reply: isHindi
        ? `Yeh landing FAQs aapke query ke liye relevant hain:\n${lines}`
        : `These landing FAQs are relevant for your query:\n${lines}`,
      navigateTo: "/?section=faq"
    };
  }

  if (intent.type === "services_overview") {
    const services = LANDING_CONTENT.services.join(", ");
    return {
      reply: isHindi
        ? `Landing page par available services: ${services}.\nTop categories: Home care, Personal grooming, Vehicle care.`
        : `Available services on landing page: ${services}.\nTop categories: Home care, Personal grooming, Vehicle care.`,
      navigateTo: "/?section=services"
    };
  }

  if (intent.type === "trust") {
    const points = LANDING_CONTENT.trustPoints.map((point) => `- ${point}`).join("\n");
    return {
      reply: isHindi
        ? `Omni trust highlights:\n${points}`
        : `Omni trust highlights:\n${points}`,
      navigateTo: "/?section=services"
    };
  }

  return null;
}

export { buildLandingKnowledgeReply };
