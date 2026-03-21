/**
 * chatConfig.js — Omni Chatbot Configuration (Upgraded)
 *
 * Role-specific themes, welcome messages, and post-navigation voice guidance.
 * All navigation advice is in both English and Hindi.
 */

const CHAT_SESSION_PREFIX = "omni-chat-session-v1";
const CHATBOT_BOOKING_ACTION_KEY = "omni:chatbot-pending-booking-action";
const CHATBOT_PENDING_ACTION_KEY = "omni:chatbot-pending-action-v1";

const ROLE_THEME = {
  landing: {
    headerGradient: "from-sky-100 to-cyan-100",
    headerDot: "border-sky-500",
    userBubble: "bg-sky-200 text-sky-900",
    chipBorder: "border-sky-200 text-sky-700 hover:bg-sky-50",
    sendBtn: "bg-sky-200 hover:bg-sky-300 text-sky-900",
    inputFocus: "focus:border-sky-400 focus:ring-sky-100",
    label: "Omni Guide"
  },
  customer: {
    headerGradient: "from-blue-600 to-blue-700",
    headerDot: "border-blue-600",
    userBubble: "bg-blue-600 text-white",
    chipBorder: "border-blue-200 text-blue-700 hover:bg-blue-50",
    sendBtn: "bg-blue-600 hover:bg-blue-700",
    inputFocus: "focus:border-blue-400 focus:ring-blue-100",
    label: "Customer Assistant"
  },
  worker: {
    headerGradient: "from-purple-600 to-purple-700",
    headerDot: "border-purple-600",
    userBubble: "bg-purple-600 text-white",
    chipBorder: "border-purple-200 text-purple-700 hover:bg-purple-50",
    sendBtn: "bg-purple-600 hover:bg-purple-700",
    inputFocus: "focus:border-purple-400 focus:ring-purple-100",
    label: "Worker Assistant"
  },
  broker: {
    headerGradient: "from-emerald-600 to-emerald-700",
    headerDot: "border-emerald-600",
    userBubble: "bg-emerald-600 text-white",
    chipBorder: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    sendBtn: "bg-emerald-600 hover:bg-emerald-700",
    inputFocus: "focus:border-emerald-400 focus:ring-emerald-100",
    label: "Broker Assistant"
  }
};

const WELCOME_MESSAGES = {
  landing: {
    text: "नमस्ते! 👋 मैं **Omni Guide** हूँ।\n\nHi! I'm Omni Guide.\n\nI can help you:\n- Choose your role (Customer, Worker, Broker)\n- Understand Omni services\n- Start signup or login\n- Answer any questions",
    actions: [
      { label: "Book Services (Customer)", action: "navigate", path: "/signup?role=customer" },
      { label: "Provide Services (Worker)", action: "navigate", path: "/signup?role=worker" },
      { label: "Which Role Suits Me?", action: "message", text: "Help me choose between customer, worker, and broker" }
    ]
  },
  customer: {
    text: "नमस्ते! 👋 मैं **Omni Assistant** हूँ।\n\nHi! I'm your Omni Assistant.\n\nI can help you:\n- 🔧 Book any service\n- 📋 Track your bookings\n- 💰 Check pricing & offers\n- ⭐ Submit reviews\n- 💬 Chat with workers\n- 📍 Track worker location",
    actions: [
      { label: "📋 My Bookings", action: "navigate", path: "/bookings" },
      { label: "🔧 Book a Service", action: "message", text: "I want to book a service" },
      { label: "💰 Service Prices", action: "message", text: "What are the service prices?" }
    ]
  },
  worker: {
    text: "नमस्ते! 👋 मैं आपका **Worker Assistant** हूँ।\n\nHi! I'm your Worker Assistant.\n\nI can help you:\n- 📥 Manage job requests\n- 📅 Check your schedule\n- 💰 Track earnings\n- 🗺️ Share location with customers\n- 💬 Chat with customers\n- ⭐ View your reviews",
    actions: [
      { label: "📥 Job Requests", action: "navigate", path: "/job-requests" },
      { label: "📅 My Schedule", action: "navigate", path: "/schedule" },
      { label: "💰 Earnings", action: "navigate", path: "/earnings" }
    ]
  },
  broker: {
    text: "नमस्ते! 👋 मैं आपका **Broker Assistant** हूँ।\n\nHi! I'm your Broker Assistant.\n\nI can help you:\n- 👥 Manage your worker network\n- 💰 Check commission earnings\n- 📋 View booking history\n- 🔗 Share broker code\n- 📊 Track worker performance",
    actions: [
      { label: "👥 My Workers", action: "navigate", path: "/workers" },
      { label: "💰 Earnings", action: "navigate", path: "/earnings" },
      { label: "🔗 Broker Code", action: "message", text: "How do I share my broker code?" }
    ]
  }
};

/**
 * Builds voice guidance text spoken AFTER navigating to a page.
 * Called after route change so user knows what to do on the new page.
 */
function buildPostNavigationAdvice(pathname, selectedLanguage = "auto") {
  const path = String(pathname || "").toLowerCase().trim();
  const isHindi = selectedLanguage === "hi-IN";

  // ── LANDING SECTIONS ──────────────────────────────────────────────────────
  if (path === "/" || path === "") {
    return isHindi
      ? "Omni landing page खुल गया है। Customer, Worker, या Broker — अपना role चुनें और शुरू करें।"
      : "Omni landing page is open. Choose your role — Customer, Worker, or Broker — and get started.";
  }
  if (path.includes("how-it-works")) {
    return isHindi
      ? "How It Works section खुल गया है। यहाँ Omni के तीन steps देख सकते हैं।"
      : "How It Works section is open. You can see the three steps of how Omni works.";
  }
  if (path.includes("testimonials")) {
    return isHindi
      ? "User feedback section खुल गया है। Real customer और worker reviews यहाँ हैं।"
      : "User testimonials section is open. Read real customer and worker reviews here.";
  }
  if (path.includes("faq")) {
    return isHindi
      ? "FAQs section खुल गया है। Common questions के answers यहाँ मिलेंगे।"
      : "FAQs section is open. Find answers to common questions here.";
  }

  // ── AUTH PAGES ────────────────────────────────────────────────────────────
  if (path.startsWith("/login")) {
    return isHindi
      ? "Login page खुल गया है। अपना role चुनकर email और password डालें, फिर Login दबाएं।"
      : "Login page is open. Select your role, enter email and password, then tap Login.";
  }
  if (path.startsWith("/signup")) {
    return isHindi
      ? "Signup page खुल गया है। Name, email, password भरें। Worker हैं तो referral code add कर सकते हैं। फिर Sign Up करें।"
      : "Signup page is open. Fill in your name, email, and password. Workers can add a referral code. Then tap Sign Up.";
  }

  // ── CUSTOMER PAGES ────────────────────────────────────────────────────────
  if (path === "/bookings/new" || path.startsWith("/bookings/new")) {
    return isHindi
      ? "Booking form खुल गया है। Step 1: Service और payment receipt देखें। Step 2: Date और time choose करें। Step 3: Location type करें या map से select करें। Step 4: Description में requirement लिखें। Step 5: Book Service दबाकर confirm करें।"
      : "Booking form is open. Step one: review service and payment. Step two: choose date and time. Step three: set your location or pick from map. Step four: add description. Step five: tap Book Service to confirm.";
  }
  if (path.startsWith("/bookings")) {
    return isHindi
      ? "My Bookings page खुल गया है। यहाँ अपनी सभी bookings देख सकते हैं। Active bookings पर Cancel, Pay Now, Track Worker, और Chat buttons दिखेंगे।"
      : "My Bookings page is open. You can see all your bookings here. Active bookings show Cancel, Pay Now, Track Worker, and Chat buttons.";
  }
  if (path.startsWith("/favorites")) {
    return isHindi
      ? "Favorites page खुल गया है। यहाँ saved workers हैं। Book Now button से directly book कर सकते हैं।"
      : "Favorites page is open. Your saved workers are here. Tap Book Now to book directly.";
  }

  // ── SERVICE CATEGORY PAGES ────────────────────────────────────────────────
  if (path.includes("/customer/category/home-care/service/plumbing-support")) {
    return isHindi
      ? "Plumbing service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Plumbing service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/home-care/service/electrical-care")) {
    return isHindi
      ? "Electrical service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Electrical service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/home-care/service/ac-maintenance")) {
    return isHindi
      ? "AC Repair service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "AC Repair service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/home-care/service/house-cleaning")) {
    return isHindi
      ? "House Cleaning service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "House Cleaning service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/home-care/service/carpentry-care")) {
    return isHindi
      ? "Carpentry service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Carpentry service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/home-care/service/car-service")) {
    return isHindi
      ? "Car Service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Car Service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/personal-grooming/service/at-home-hair-styling")) {
    return isHindi
      ? "Hair Styling service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Hair Styling service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/personal-grooming/service/skin-glow-rituals")) {
    return isHindi
      ? "Skin Care service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Skin Care service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/vehicle-care/service/premium-car-wash")) {
    return isHindi
      ? "Car Wash service page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Car Wash service page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/customer/category/vehicle-care/service/interior-detailing")) {
    return isHindi
      ? "Car Interior Detailing page खुल गया है। Plan choose करें, फिर Continue Booking दबाएं।"
      : "Car Interior Detailing page is open. Choose a plan, then tap Continue Booking.";
  }
  if (path.includes("/service/")) {
    return isHindi
      ? "Service detail page खुल गया है। Plan और add-ons choose करें, फिर Continue Booking दबाकर booking form खोलें।"
      : "Service detail page is open. Choose a plan and add-ons, then tap Continue Booking to open the booking form.";
  }
  if (path.includes("/customer/category/home-care")) {
    return isHindi
      ? "Home Care category खुल गई है। Plumbing, Electrical, AC, Cleaning जैसी services यहाँ हैं। किसी पर tap करके details देखें।"
      : "Home Care category is open. Services like Plumbing, Electrical, AC, Cleaning are here. Tap any service for details.";
  }
  if (path.includes("/customer/category/personal-grooming")) {
    return isHindi
      ? "Personal Grooming category खुल गई है। Hair Styling और Skin Care services यहाँ हैं।"
      : "Personal Grooming category is open. Hair Styling and Skin Care services are here.";
  }
  if (path.includes("/customer/category/vehicle-care")) {
    return isHindi
      ? "Vehicle Care category खुल गई है। Car Wash और Interior Detailing services यहाँ हैं।"
      : "Vehicle Care category is open. Car Wash and Interior Detailing services are here.";
  }

  // ── WORKER PAGES ──────────────────────────────────────────────────────────
  if (path.startsWith("/job-requests")) {
    return isHindi
      ? "Job Requests page खुल गया है। हर pending request पर Accept या Decline button दिखेगा। Accept करने पर job आपके Schedule में चली जाएगी।"
      : "Job Requests page is open. Each pending request shows Accept and Decline buttons. Accepting moves the job to your Schedule.";
  }
  if (path.startsWith("/schedule")) {
    return isHindi
      ? "Schedule page खुल गया है। यहाँ confirmed और upcoming jobs हैं। हर job पर View Customer Location और Chat buttons हैं।"
      : "Schedule page is open. Confirmed and upcoming jobs are here. Each job has View Customer Location and Chat buttons.";
  }
  if (path.startsWith("/earnings")) {
    return isHindi
      ? "Earnings page खुल गया है। Total earnings, completed jobs, और हर job की detail यहाँ है। Broker commission भी दिखेगा अगर linked है।"
      : "Earnings page is open. Total earnings, completed jobs, and per-job details are here. Broker commission shown if linked.";
  }
  if (path.startsWith("/reviews")) {
    return isHindi
      ? "Reviews page खुल गया है। Customer ratings और feedback यहाँ देख सकते हैं।"
      : "Reviews page is open. Customer ratings and written feedback are displayed here.";
  }
  if (path.startsWith("/job-profile")) {
    return isHindi
      ? "Job Profile page खुल गया है। यह वो profile है जो customers देखते हैं। Ratings, reviews, और completed jobs यहाँ दिखते हैं।"
      : "Job Profile page is open. This is what customers see. Ratings, reviews, and completed jobs are shown here.";
  }

  // ── BROKER PAGES ──────────────────────────────────────────────────────────
  if (path.startsWith("/workers")) {
    return isHindi
      ? "Workers page खुल गया है। Linked workers की list है। हर worker के stats, jobs, rating, और आपकी commission यहाँ दिखती है।"
      : "Workers page is open. All linked workers are listed with their stats, jobs, ratings, and your commission from each.";
  }

  // ── SHARED PAGES ──────────────────────────────────────────────────────────
  if (path.startsWith("/profile")) {
    return isHindi
      ? "Profile page खुल गया है। Name, email, phone, bio, photo यहाँ update कर सकते हैं। Email change करने पर OTP verify करना होगा। Save Changes दबाएं।"
      : "Profile page is open. Update your name, email, phone, bio, and photo here. Email change requires OTP verification. Tap Save Changes.";
  }
  if (path.startsWith("/settings")) {
    return isHindi
      ? "Settings page खुल गया है। Notification preferences, password change, logout, और account deletion यहाँ है।"
      : "Settings page is open. Manage notification preferences, change password, logout, or delete account here.";
  }

  return "";
}

export {
  CHAT_SESSION_PREFIX,
  CHATBOT_BOOKING_ACTION_KEY,
  CHATBOT_PENDING_ACTION_KEY,
  ROLE_THEME,
  WELCOME_MESSAGES,
  buildPostNavigationAdvice
};