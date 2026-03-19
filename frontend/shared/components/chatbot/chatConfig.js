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
    text: "Welcome! I am **Omni Guide** for the landing page.\n\nI can help you:\n- Choose the right role (Customer, Worker, Broker)\n- Understand available services\n- Start signup or login quickly",
    actions: [
      { label: "Start as Customer", action: "navigate", path: "/signup?role=customer" },
      { label: "Worker Login", action: "navigate", path: "/login?role=worker" },
      { label: "Which Role Fits Me?", action: "message", text: "Help me choose between customer, worker, and broker" }
    ]
  },
  customer: {
    text: "Hi! I'm **Omni Assistant**.\n\nI can help you:\n- Book a service\n- Track bookings\n- Get recommendations\n- Check pricing",
    actions: [
      { label: "My Bookings", action: "navigate", path: "/bookings" },
      { label: "Book a Service", action: "message", text: "I want to book a service" },
      { label: "Service Prices", action: "message", text: "What are your service prices?" }
    ]
  },
  worker: {
    text: "Hi! I'm your **Worker Assistant**.\n\nI can help you:\n- View job requests\n- Check your schedule\n- Track earnings\n- View reviews",
    actions: [
      { label: "Job Requests", action: "navigate", path: "/job-requests" },
      { label: "My Schedule", action: "navigate", path: "/schedule" },
      { label: "My Earnings", action: "navigate", path: "/earnings" }
    ]
  },
  broker: {
    text: "Hi! I'm your **Broker Assistant**.\n\nI can help you:\n- Manage workers\n- Check commissions\n- View bookings\n- Share broker code",
    actions: [
      { label: "My Workers", action: "navigate", path: "/workers" },
      { label: "My Earnings", action: "navigate", path: "/earnings" },
      { label: "Broker Code", action: "message", text: "How do I share my broker code?" }
    ]
  }
};

function buildPostNavigationAdvice(pathname, selectedLanguage = "auto") {
  const path = String(pathname || "").toLowerCase();
  const isHindi = selectedLanguage === "hi-IN";

  if (path.startsWith("/bookings/new")) {
    return isHindi
      ? "बुकिंग पेज खुल गया है। पहला स्टेप, सर्विस और पेमेंट रिसीट देखें। दूसरा स्टेप, तारीख और समय चुनें। तीसरा स्टेप, लोकेशन भरें या Select on Map दबाएं। चौथा स्टेप, अपनी जरूरत Description में लिखें। पांचवां स्टेप, Book Service दबाकर कन्फर्म करें।"
      : "Booking page is open. Step one, review service and payment receipt. Step two, select preferred date and time. Step three, set location or choose Select on Map. Step four, add your requirement in description. Step five, click Book Service to confirm.";
  }

  if (path === "/" || path === "") {
    return isHindi
      ? "लैंडिंग पेज खुल गया है। यहां से आप रोल चुन सकते हैं और साइनअप शुरू कर सकते हैं।"
      : "Landing page is open. From here you can choose your role and start signup.";
  }

  if (path.startsWith("/login")) {
    return isHindi
      ? "लॉगिन पेज खुल गया है। अपना रोल चुनकर ईमेल और पासवर्ड से लॉगिन करें।"
      : "Login page is open. Select your role and sign in with your email and password.";
  }

  if (path.startsWith("/signup")) {
    return isHindi
      ? "साइनअप पेज खुल गया है। अपना रोल चुनें और जरूरी जानकारी भरकर अकाउंट बनाएं।"
      : "Signup page is open. Choose a role, fill your details, and create your account.";
  }

  if (path.includes("/service/")) {
    return isHindi
      ? "सर्विस डिटेल पेज खुल गया है। पहला स्टेप, कोई प्लान चुनें। दूसरा स्टेप, जरूरत हो तो add-ons या offer चुनें। तीसरा स्टेप, Continue Booking दबाकर बुकिंग फॉर्म खोलें।"
      : "Service details page is open. Step one, choose a plan. Step two, add optional add-ons or offers. Step three, click Continue Booking to open the booking form.";
  }

  if (path.startsWith("/bookings")) {
    return isHindi
      ? "बुकिंग्स पेज खुल गया है। यहां आप स्टेटस ट्रैक कर सकते हैं, बुकिंग डिटेल देख सकते हैं और एक्टिव बुकिंग मैनेज कर सकते हैं।"
      : "Bookings page is open. You can track status, check booking details, and manage active bookings here.";
  }

  if (path.startsWith("/job-requests")) {
    return isHindi
      ? "जॉब रिक्वेस्ट पेज खुल गया है। आप यहां नई रिक्वेस्ट स्वीकार या अस्वीकार कर सकते हैं।"
      : "Job requests page is open. Review incoming requests and accept or reject them.";
  }

  if (path.startsWith("/schedule")) {
    return isHindi
      ? "शेड्यूल पेज खुल गया है। यहां आप आज और आने वाले कन्फर्म्ड जॉब्स देख सकते हैं।"
      : "Schedule page is open. Check today's and upcoming confirmed jobs here.";
  }

  if (path.startsWith("/earnings")) {
    return isHindi
      ? "अर्निंग्स पेज खुल गया है। यहां आप कमाई, कमीशन और हाल की पेआउट डिटेल देख सकते हैं।"
      : "Earnings page is open. Review income, commission details, and recent payouts.";
  }

  if (path.startsWith("/reviews")) {
    return isHindi
      ? "रिव्यू पेज खुल गया है। यहां आप ग्राहक फीडबैक और रेटिंग देख सकते हैं।"
      : "Reviews page is open. Check customer feedback and ratings here.";
  }

  if (path.startsWith("/workers")) {
    return isHindi
      ? "वर्कर्स पेज खुल गया है। यहां आप अपने नेटवर्क के वर्कर्स और उनका परफॉर्मेंस देख सकते हैं।"
      : "Workers page is open. View linked workers and their performance details.";
  }

  if (path.startsWith("/profile")) {
    return isHindi
      ? "प्रोफाइल पेज खुल गया है। यहां आप अपनी जानकारी और सेटिंग्स अपडेट कर सकते हैं।"
      : "Profile page is open. You can update your account information and settings here.";
  }

  if (path.startsWith("/settings")) {
    return isHindi
      ? "सेटिंग्स पेज खुल गया है। यहां ऐप प्रेफरेंस और अकाउंट विकल्प बदलें।"
      : "Settings page is open. Manage app preferences and account options here.";
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
