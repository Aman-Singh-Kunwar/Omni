/**
 * commandMap.js — Omni Chatbot Command Map (Upgraded)
 *
 * Covers EVERY small task a user might want to do across all 4 roles.
 * Patterns support English, Hindi, Hinglish.
 * Matched commands are handled WITHOUT any LLM call (instant, free).
 */

// ── SHARED COMMANDS (all roles) ───────────────────────────────────────────────
const SHARED_COMMANDS = [
  // Greetings
  {
    patterns: [/^(hi|hello|hey|hii|helo|नमस्ते|नमस्कार|हेलो|हाय|good morning|good evening|good afternoon|सुप्रभात|शुभ संध्या)[\s!.]*$/i],
    path: null,
    replyFn: (role) => {
      const greetings = {
        landing:  "नमस्ते! 👋 मैं Omni Guide हूँ। Customer, Worker, या Broker — कौन सा role आपके लिए सही है, बताएं।\n\nHi! I'm Omni Guide. Tell me — are you looking to book services, provide services, or manage a worker network?",
        customer: "नमस्ते! 👋 मैं Omni Assistant हूँ।\n\nमैं आपकी मदद कर सकता हूँ:\n• 🔧 Service बुक करें\n• 📋 Booking track करें\n• 💰 Pricing जानें\n• ❓ कोई भी सवाल\n\nHello! How can I assist you today?",
        worker:   "नमस्ते! 👋 मैं आपका Worker Assistant हूँ।\n\nमैं help कर सकता हूँ:\n• 📥 Job requests देखें\n• 📅 Schedule check करें\n• 💰 Earnings देखें\n• 👤 Profile update करें\n\nWhat do you need today?",
        broker:   "नमस्ते! 👋 मैं आपका Broker Assistant हूँ।\n\nमैं help कर सकता हूँ:\n• 👥 Workers manage करें\n• 💰 Commission देखें\n• 📋 Bookings check करें\n• 🔗 Broker code share करें"
      };
      return greetings[role] || greetings.customer;
    },
    action: "greet"
  },
  // Thanks
  {
    patterns: [/^(thanks|thank you|thx|thankyou|thank u|shukriya|dhanyavaad|धन्यवाद|शुक्रिया|bahut shukriya|bahut dhanyavaad)[\s!.]*$/i],
    path: null,
    reply: "आपका स्वागत है! 😊 Kya aur kuch help chahiye?\n\nYou're most welcome! Is there anything else I can help you with?",
    action: "respond"
  },
  // Bye
  {
    patterns: [/^(bye|goodbye|see you|alvida|अलविदा|बाय|ok bye|okay bye|phir milenge|फिर मिलेंगे)[\s!.]*$/i],
    path: null,
    reply: "अलविदा! आपका दिन शुभ हो! 👋\n\nGoodbye! Have a wonderful day!",
    action: "respond"
  },
  // Help
  {
    patterns: [/^(help|help me|what can you do|kya kar sakte ho|मदद|सहायता|what do you know|commands|सहायता करो)[\s!.]*$/i],
    path: null,
    replyFn: (role) => {
      const helps = {
        landing:  "मैं इन चीज़ों में help कर सकता हूँ:\n• ✅ Omni कैसे काम करता है\n• 🎭 Role चुनने में (Customer/Worker/Broker)\n• 📝 Signup/Login\n• 💬 Services की जानकारी\n• ❓ FAQs\n\nI can help with: How Omni works, choosing your role, signup/login, services info, and FAQs.",
        customer: "मैं इन चीज़ों में help कर सकता हूँ:\n• 🔧 Service book करना (Plumber, Electrician, AC, Cleaning, etc.)\n• 📋 अपनी bookings देखना\n• ❌ Booking cancel करना\n• 💰 Payment/Pricing\n• ⭐ Review देना\n• 📍 Worker track करना\n• 💬 Worker से chat\n• ❤️ Favorites manage करना\n• 👤 Profile update करना\n• 🔔 Notifications",
        worker:   "मैं इन चीज़ों में help कर सकता हूँ:\n• 📥 Job requests accept/reject करना\n• 📅 Schedule देखना\n• 💰 Earnings check करना\n• ⭐ Reviews देखना\n• 🗺️ Customer location share करना\n• 💬 Customer से chat\n• 👤 Profile & availability update करना\n• 🔗 Broker link की जानकारी",
        broker:   "मैं इन चीज़ों में help कर सकता हूँ:\n• 👥 Linked workers देखना\n• 📋 Completed bookings history\n• 💰 Commission earnings\n• 🔗 Broker code share करना\n• 📊 Worker performance देखना\n• 👤 Profile update करना"
      };
      return helps[role] || helps.customer;
    },
    action: "help"
  },
  // Profile
  {
    patterns: [/\b(profile|my account|account|प्रोफाइल|अकाउंट|my info|personal info|apna profile|अपना प्रोफाइल)\b/i],
    path: "/profile",
    reply: "आपकी profile खुल रही है! 👤\n\nOpening your profile!",
    action: "navigate"
  },
  // Settings
  {
    patterns: [/\b(settings|preferences|notification settings|password|सेटिंग्स|पासवर्ड change|change password|पासवर्ड बदलो|account delete|delete account|logout|log out|sign out|लॉगआउट)\b/i],
    path: "/settings",
    reply: "Settings खुल रही हैं! ⚙️\n\nOpening settings!",
    action: "navigate"
  },
  // What is Omni
  {
    patterns: [/\b(what is omni|omni kya hai|omni kya h|about omni|tell me about|omni ke baare mein|ओमनी क्या है|about this app|app ke baare)\b/i],
    path: null,
    reply: "**Omni** एक home services marketplace है जहाँ:\n• 🏠 **Customers** घर बैठे services book कर सकते हैं\n• 🔧 **Workers** job requests accept कर सकते हैं और income earn कर सकते हैं\n• 📊 **Brokers** workers का network manage करके commission earn कर सकते हैं\n\nServices: Plumber, Electrician, AC Repair, Cleaning, Carpenter, Painter, Hair Stylist, Car Service और भी!\n\n**Omni** is a home services marketplace connecting customers with verified service professionals.",
    action: "respond"
  }
];

// ── LANDING COMMANDS ─────────────────────────────────────────────────────────
const LANDING_COMMANDS = [
  {
    patterns: [/^(hi|hello|hey|hii|नमस्ते|हेलो|हाय)[\s!.]*$/i],
    path: null,
    reply: "नमस्ते! 👋 मैं Omni Guide हूँ।\n\nमैं आपकी help करूँगा:\n• Role समझने में (Customer / Worker / Broker)\n• Signup या Login करने में\n• Services और pricing जानने में\n\nHi! I'm Omni Guide. How can I help you get started with Omni today?",
    action: "respond"
  },
  // Landing page / home
  {
    patterns: [/\b(home|landing|main page|मुख्य पेज|लैंडिंग|back to home)\b/i],
    path: "/",
    reply: "Landing page पर जा रहे हैं! 🏠",
    action: "navigate"
  },
  // How Omni works
  {
    patterns: [/\b(how\s*(it)?\s*work|how omni works|working steps|process|workflow|steps|omni kaise kaam|कैसे काम करता|कैसे काम करे|काम करने का तरीका)\b/i],
    path: "/?section=how-it-works",
    reply: "Omni कैसे काम करता है — यह section खुल रहा है! 📖\n\nOpening 'How Omni Works' section.",
    action: "navigate"
  },
  // Customer signup/login
  {
    patterns: [/\b(customer signup|customer sign up|join as customer|register customer|create customer account|book service signup)\b/i],
    path: "/signup?role=customer",
    reply: "Customer signup खुल रहा है! 📝",
    action: "navigate"
  },
  {
    patterns: [/\b(customer login|login customer|sign in customer|customer sign in|login as customer)\b/i],
    path: "/login?role=customer",
    reply: "Customer login खुल रहा है! 🔐",
    action: "navigate"
  },
  // Worker signup/login
  {
    patterns: [/\b(worker signup|worker sign up|join as worker|register worker|service provider signup|worker register)\b/i],
    path: "/signup?role=worker",
    reply: "Worker signup खुल रहा है! 📝",
    action: "navigate"
  },
  {
    patterns: [/\b(worker login|login worker|sign in worker|worker sign in|login as worker)\b/i],
    path: "/login?role=worker",
    reply: "Worker login खुल रहा है! 🔐",
    action: "navigate"
  },
  // Broker signup/login
  {
    patterns: [/\b(broker signup|broker sign up|join as broker|register broker|broker register)\b/i],
    path: "/signup?role=broker",
    reply: "Broker signup खुल रहा है! 📝",
    action: "navigate"
  },
  {
    patterns: [/\b(broker login|login broker|sign in broker|broker sign in|login as broker)\b/i],
    path: "/login?role=broker",
    reply: "Broker login खुल रहा है! 🔐",
    action: "navigate"
  },
  // Just login/signup (generic)
  {
    patterns: [/^(login|log in|signin|sign in|लॉगिन|साइन इन)[\s!.]*$/i],
    path: "/login?role=customer",
    reply: "Login page खुल रहा है! 🔐",
    action: "navigate"
  },
  {
    patterns: [/^(signup|sign up|register|join|साइनअप|रजिस्टर)[\s!.]*$/i],
    path: "/signup?role=customer",
    reply: "Signup page खुल रहा है! 📝",
    action: "navigate"
  },
  // Role selection help
  {
    patterns: [/\b(which role|choose role|best role|role for me|customer or worker|customer ya worker|customer or broker|worker ya broker|कौन सा रोल|role kaun sa)\b/i],
    path: null,
    reply: "आपके लिए सही role चुनें:\n\n🛒 **Customer**: अगर आप घर बैठे services book करना चाहते हैं\n\n🔧 **Worker**: अगर आप services provide करते हैं और पैसे कमाना चाहते हैं\n\n📊 **Broker**: अगर आप workers का network manage करके commission कमाना चाहते हैं\n\nChoose your role:\n• **Customer** → Book services at home\n• **Worker** → Provide services and earn income\n• **Broker** → Manage workers and earn commission",
    action: "respond"
  },
  // Testimonials/feedback
  {
    patterns: [/\b(feedback|testimonial|testimonials|what users say|reviews|user reviews|log kya kehte|फीडबैक|रिव्यू|user feedback)\b/i],
    path: "/?section=testimonials",
    reply: "User feedback section खुल रहा है! 💬",
    action: "navigate"
  },
  // FAQ
  {
    patterns: [/\b(faq|faqs|frequently asked|queries|query|question|questions|doubt|सवाल|जवाब|प्रश्न|क्वेरी|FAQ)\b/i],
    path: "/?section=faq",
    reply: "FAQs section खुल रहा है! ❓",
    action: "navigate"
  },
  // Services overview
  {
    patterns: [/\b(services|what services|available services|service list|kaunsi services|service kya|सर्विस|उपलब्ध सर्विसेज)\b/i],
    path: "/?section=services",
    reply: "Available services section खुल रहा है! 🔧",
    action: "navigate"
  },
  // Pricing
  {
    patterns: [/\b(price|pricing|cost|charge|fees|how much|rate|daam|kitna|कीमत|दाम|किराया|charges)\b/i],
    path: null,
    reply: "Omni services की pricing:\n\n💰 Services की exact price booking form में दिखती है (service और location के हिसाब से)।\n\nApprox range: ₹450 – ₹900 per service\n• House Cleaning: ~₹450\n• Plumber/Electrician: ~₹500-550\n• AC Repair: ~₹700\n• Hair Stylist: ~₹800\n\nFinal price में **5% platform discount** automatically apply होती है!\n\nPricing is shown at checkout after selecting your service and location.",
    action: "respond"
  },
  // Contact / support
  {
    patterns: [/\b(contact|support|helpline|customer care|help center|संपर्क|सहायता केंद्र|contact us)\b/i],
    path: null,
    reply: "Omni support के लिए:\n• 💬 इसी chatbot में अपना सवाल पूछें\n• 📧 App के settings में account help available है\n• 🔧 Booking issues के लिए My Bookings section देखें\n\nFor support, use this chatbot or check Settings in the app.",
    action: "respond"
  }
];

// ── CUSTOMER COMMANDS ─────────────────────────────────────────────────────────
const CUSTOMER_COMMANDS = [
  // Dashboard/Home
  {
    patterns: [/\b(home|dashboard|main|होम|मुख्य|go home|back to dashboard|dashboard pe jao)\b/i],
    path: "/",
    reply: "Dashboard पर जा रहे हैं! 🏠",
    action: "navigate"
  },
  // Bookings
  {
    patterns: [/\b(my bookings|show bookings|view bookings|bookings|booking history|मेरी बुकिंग|बुकिंग देखो|बुकिंग list|all bookings|booking status)\b/i],
    path: "/bookings",
    reply: "आपकी bookings खुल रही हैं! 📋\n\nOpening your bookings!",
    action: "navigate"
  },
  // Favorites
  {
    patterns: [/\b(favorites|favourites|saved|my favorites|saved workers|पसंदीदा|पसंदीदा workers|liked workers)\b/i],
    path: "/favorites",
    reply: "आपकी favorites खुल रही हैं! ❤️\n\nOpening your favorites!",
    action: "navigate"
  },
  // Book a service (generic)
  {
    patterns: [/\b(book service|new booking|start booking|book now|service book karo|बुकिंग करो|नई बुकिंग|service chahiye|service book karna|koi service book)\b/i],
    path: "/",
    reply: "Service book करने के लिए पहले service choose करें:\n\n🏠 **Home Care** — Plumber, Electrician, AC, Cleaning, Carpenter\n💆 **Personal Grooming** — Hair Stylist, Skin & Glow\n🚗 **Vehicle Care** — Car Wash, Detailing\n\nDashboard से किसी भी service पर click करें या मुझे बताएं कि कौन सी service चाहिए!\n\nTell me which service you need and I'll take you straight there!",
    action: "navigate"
  },
  // Specific service: Plumber
  {
    patterns: [/\b(plumber|plumbing|plumb|pipe leak|nal|नल|पाइप|प्लम्बर|प्लम्बिंग|water leak|toilet|basin|tap repair)\b/i],
    path: "/customer/category/home-care/service/plumbing-support",
    reply: "Plumbing service खुल रही है! 🔧\n\nOpening plumbing services!",
    action: "navigate"
  },
  // Electrician
  {
    patterns: [/\b(electrician|electrical|electric|wiring|bijli|बिजली|इलेक्ट्रीशियन|switch|fan|light install|power cut)\b/i],
    path: "/customer/category/home-care/service/electrical-care",
    reply: "Electrical service खुल रही है! ⚡\n\nOpening electrical services!",
    action: "navigate"
  },
  // AC Repair
  {
    patterns: [/\b(ac repair|ac service|air condition|ac maintenance|एसी|एयर कंडीशन|ac gas|ac not cooling|ac clean)\b/i, /^\bac\b$/i],
    path: "/customer/category/home-care/service/ac-maintenance",
    reply: "AC service खुल रही है! ❄️\n\nOpening AC repair services!",
    action: "navigate"
  },
  // House Cleaning
  {
    patterns: [/\b(house clean|home clean|cleaning|ghar saaf|safai|सफाई|क्लीनिंग|deep clean|bathroom clean|kitchen clean|floor clean)\b/i],
    path: "/customer/category/home-care/service/house-cleaning",
    reply: "Cleaning service खुल रही है! 🧹\n\nOpening house cleaning services!",
    action: "navigate"
  },
  // Carpenter
  {
    patterns: [/\b(carpenter|carpentry|wood work|furniture|badhai|बढ़ई|कारपेंटर|door fix|shelf|wardrobe|cabinet)\b/i],
    path: "/customer/category/home-care/service/carpentry-care",
    reply: "Carpentry service खुल रही है! 🪚\n\nOpening carpentry services!",
    action: "navigate"
  },
  // Painter
  {
    patterns: [/\b(painter|painting|rang|रंग|पेंटिंग|paint|wall paint|house paint|colour|color)\b/i],
    path: "/customer/category/home-care",
    reply: "Painting service खुल रही है! 🎨\n\nOpening painting services!",
    action: "navigate"
  },
  // Hair Stylist
  {
    patterns: [/\b(hair|salon|groom|stylist|haircut|baal|baal katna|बाल|हेयर|सैलून|hair style|hairstyle|shaving|trimming)\b/i],
    path: "/customer/category/personal-grooming/service/at-home-hair-styling",
    reply: "Hair styling service खुल रही है! ✂️\n\nOpening hair styling services!",
    action: "navigate"
  },
  // Skin/Facial
  {
    patterns: [/\b(skin|facial|beauty|glow|face pack|स्किन|फेशियल|ब्यूटी|skin care|moisturize|face massage|facial massage)\b/i],
    path: "/customer/category/personal-grooming/service/skin-glow-rituals",
    reply: "Skin & Glow service खुल रही है! ✨\n\nOpening skin care services!",
    action: "navigate"
  },
  // Car Wash
  {
    patterns: [/\b(car wash|wash car|gaadi dho|कार वॉश|कार धुलाई|car cleaning|vehicle wash)\b/i],
    path: "/customer/category/vehicle-care/service/premium-car-wash",
    reply: "Car wash service खुल रही है! 🚗\n\nOpening car wash services!",
    action: "navigate"
  },
  // Car Interior
  {
    patterns: [/\b(interior detailing|car interior|detailing|car interior clean|seat clean|dashboard clean)\b/i],
    path: "/customer/category/vehicle-care/service/interior-detailing",
    reply: "Interior detailing service खुल रही है! 🚘\n\nOpening interior detailing!",
    action: "navigate"
  },
  // Car Service
  {
    patterns: [/\b(car service|gaadi service|vehicle service|routine car|car maintenance|गाड़ी सर्विस|कार सर्विस)\b/i],
    path: "/customer/category/home-care/service/car-service",
    reply: "Car service खुल रही है! 🚗\n\nOpening car services!",
    action: "navigate"
  },
  // Home Care category
  {
    patterns: [/\b(home care|ghar ki service|घर की सर्विस|home services|ghar mein|house services)\b/i],
    path: "/customer/category/home-care",
    reply: "Home Care category खुल रही है! 🏠",
    action: "navigate"
  },
  // Personal Grooming category
  {
    patterns: [/\b(personal grooming|grooming|beauty services|grooming services|parlour|parlor)\b/i],
    path: "/customer/category/personal-grooming",
    reply: "Personal Grooming category खुल रही है! 💆",
    action: "navigate"
  },
  // Vehicle Care category
  {
    patterns: [/\b(vehicle care|car care|vehicle services|gaadi|गाड़ी)\b/i],
    path: "/customer/category/vehicle-care",
    reply: "Vehicle Care category खुल रही है! 🚗",
    action: "navigate"
  },
  // Booking Form
  {
    patterns: [/\b(continue booking|confirm booking|complete booking|booking form|book now|अभी बुक|बुकिंग कन्फर्म|booking complete karo)\b/i],
    path: "/bookings/new",
    reply: "Booking form खुल रहा है! 📅\n\nOpening booking form. Fill in your date, time, and location.",
    action: "navigate"
  },
  // Cancel booking
  {
    patterns: [/\b(cancel booking|booking cancel|cancel karo|रद्द करो|बुकिंग cancel|booking cancel karna)\b/i],
    path: "/bookings",
    reply: "Booking cancel करने के लिए My Bookings में जाएं।\n\n⚠️ Note: Booking सिर्फ **10 minutes** के अंदर cancel हो सकती है।\n\nGo to My Bookings to cancel. Note: Cancellation is only available within 10 minutes of booking.\n\nOpening your bookings!",
    action: "navigate"
  },
  // Track booking / track worker
  {
    patterns: [/\b(track|track booking|track worker|where is worker|worker kahan hai|worker location|live track|लाइव ट्रैक|ट्रैक करो|worker dhundho)\b/i],
    path: "/bookings",
    reply: "Worker को track करने के लिए My Bookings में जाएं और **Track Worker** button click करें।\n\nGo to My Bookings and click 'Track Worker' to see live location.\n\nOpening your bookings!",
    action: "navigate"
  },
  // Chat with worker
  {
    patterns: [/\b(chat with worker|talk to worker|message worker|worker se baat|worker ko message|worker chat|worker se contact|contact worker)\b/i],
    path: "/bookings",
    reply: "Worker से chat करने के लिए My Bookings में जाएं और **Chat** button click करें।\n\nGo to My Bookings and click 'Chat' to talk with your worker.\n\nOpening your bookings!",
    action: "navigate"
  },
  // Pay booking
  {
    patterns: [/\b(pay|payment|pay now|payment karo|payment karna|bhugtan|भुगतान|paise de|pay booking|booking pay karo)\b/i],
    path: "/bookings",
    reply: "Payment करने के लिए My Bookings में जाएं।\n\n💡 Payment option booking confirm होने के **10 minutes बाद** available होता है।\n\nOpening your bookings to make payment!",
    action: "navigate"
  },
  // Review / feedback
  {
    patterns: [/\b(review|give review|rate|rating|feedback|review dena|rating dena|star dena|रिव्यू|रेटिंग|फीडबैक)\b/i],
    path: "/bookings",
    reply: "Review देने के लिए My Bookings में जाएं और **Give Feedback** button click करें।\n\nOpening your bookings to leave a review!",
    action: "navigate"
  },
  // Price of service
  {
    patterns: [/\b(price|cost|rate|how much|kitna|daam|keemat|charge|fees|कीमत|दाम|कितना लगेगा|kitna lagega)\b/i],
    path: null,
    reply: "Services की approximate pricing:\n\n• 🏠 House Cleaning: ~₹450\n• 🔧 Plumber/Electrician: ~₹500-550\n• 🪚 Carpenter: ~₹600\n• 🎨 Painter: ~₹650\n• ❄️ AC Repair: ~₹700\n• ✂️ Hair Stylist: ~₹800\n• 🚗 Car Service: ~₹900\n\n✅ **5% platform discount** हर booking पर मिलती है!\n\nFinal price booking form में show होती है। Service page पर और detailed pricing है!",
    action: "respond"
  },
  // Discount
  {
    patterns: [/\b(discount|offer|promo|coupon|cashback|chhoot|offer kya hai|discount milega|डिस्काउंट|ऑफर)\b/i],
    path: null,
    reply: "Omni पर हर booking पर **5% platform discount** automatically मिलती है!\n\nService detail page पर और भी special offers होते हैं (plan-wise और seasonal).\n\nBooking form में discount already apply होता है — कोई coupon code नहीं चाहिए!\n\nEvery booking gets 5% off automatically. Check service pages for additional offers.",
    action: "respond"
  },
  // Refund policy
  {
    patterns: [/\b(refund|money back|paise wapas|refund kab milega|paisa wapas|रिफंड|पैसे वापस)\b/i],
    path: null,
    reply: "Refund Policy:\n\n• Booking **10 minutes के अंदर cancel** करें — पूरा refund मिलेगा\n• Service की quality issue होने पर **7 दिन** के अंदर report करें\n• **Service Not Provided** mark करने पर support team contact करेगी\n\nFor refund, go to My Bookings → cancel (within 10 min) or mark 'Service Not Provided'.",
    action: "respond"
  },
  // Service not provided
  {
    patterns: [/\b(service not provided|worker nahi aaya|worker aa nahi|no service|kaam nahi hua|kaam nahi kiya|सर्विस नहीं मिली|worker came|didn't come)\b/i],
    path: "/bookings",
    reply: "अगर worker नहीं आया या service नहीं मिली — My Bookings में जाएं और **Service Not Provided** button click करें।\n\nIf service wasn't provided, go to bookings and click 'Service Not Provided'.\n\nOpening your bookings!",
    action: "navigate"
  },
  // Delete booking
  {
    patterns: [/\b(delete booking|remove booking|booking hatao|booking delete karo|booking हटाओ)\b/i],
    path: "/bookings",
    reply: "Booking delete करने के लिए My Bookings में जाएं और 🗑️ (delete) button click करें।\n\nOpening your bookings to delete!",
    action: "navigate"
  },
  // Worker profile
  {
    patterns: [/\b(worker profile|view worker|worker ki profile|worker ko dekho|worker details)\b/i],
    path: "/",
    reply: "Worker का profile देखने के लिए Dashboard पर available workers में से किसी पर click करें।\n\nGo to Dashboard to view worker profiles.",
    action: "navigate"
  },
  // Available workers
  {
    patterns: [/\b(available workers|workers near me|kaun available|worker list|show workers|workers nearby|nearby workers)\b/i],
    path: "/",
    reply: "Available workers Dashboard पर दिखते हैं!\n\nOpening dashboard to see available workers.",
    action: "navigate"
  },
  // Notification
  {
    patterns: [/\b(notifications|notification settings|alerts|मुझे alert|notification on|notification off|सूचना)\b/i],
    path: "/settings",
    reply: "Notification settings यहाँ मिलेंगी! 🔔\n\nOpening settings for notifications.",
    action: "navigate"
  }
];

// ── WORKER COMMANDS ───────────────────────────────────────────────────────────
const WORKER_COMMANDS = [
  // Dashboard
  {
    patterns: [/\b(home|dashboard|overview|मुख्य|होम|ओवरव्यू|go home)\b/i],
    path: "/",
    reply: "Dashboard पर जा रहे हैं! 🏠",
    action: "navigate"
  },
  // Job Requests
  {
    patterns: [/\b(job requests?|new jobs?|pending jobs?|incoming jobs?|job request dekho|नई job|जॉब रिक्वेस्ट|pending kaam|kaun sa kaam|pending requests?)\b/i],
    path: "/job-requests",
    reply: "Job requests खुल रही हैं! 📥\n\nOpening pending job requests.",
    action: "navigate"
  },
  // Accept job (will trigger automation)
  {
    patterns: [/\b(accept job|accept request|job accept karo|kaam accept karo|job le lo|स्वीकार करो|एक्सेप्ट करो)\b/i],
    path: "/job-requests",
    reply: "Job requests खुल रही हैं — वहाँ **Accept** button click करें! ✅\n\nOpening job requests. Click Accept on the job you want.",
    action: "navigate"
  },
  // Reject job
  {
    patterns: [/\b(reject job|decline job|job reject karo|kaam mat karo|mana karo|अस्वीकार करो|रिजेक्ट करो)\b/i],
    path: "/job-requests",
    reply: "Job requests खुल रही हैं — वहाँ **Decline** button click करें। 🚫\n\nOpening job requests. Click Decline on the job.",
    action: "navigate"
  },
  // Schedule
  {
    patterns: [/\b(schedule|my jobs|upcoming jobs|scheduled jobs|aaj ka kaam|kal ka kaam|today|कल|आज|शेड्यूल|confirmed jobs?|upcoming)\b/i],
    path: "/schedule",
    reply: "आपका schedule खुल रहा है! 📅\n\nOpening your job schedule.",
    action: "navigate"
  },
  // Customer location
  {
    patterns: [/\b(customer location|customer kahan hai|customer ka address|where is customer|customer dhundho|location share|customer map|जाना है|customer kahan)\b/i],
    path: "/schedule",
    reply: "Customer location देखने के लिए Schedule में जाएं और **View Customer Location** button click करें! 📍\n\nOpening schedule to view customer location.",
    action: "navigate"
  },
  // Share location
  {
    patterns: [/\b(share location|live location|share my location|location share karo|apni location|मेरी location|start sharing)\b/i],
    path: "/schedule",
    reply: "Location share करने के लिए Schedule → View Customer Location → **Share My Location Live** click करें! 📡\n\nOpening schedule to start location sharing.",
    action: "navigate"
  },
  // Chat with customer
  {
    patterns: [/\b(chat with customer|customer se baat|message customer|customer ko message|customer chat|customer se contact|ग्राहक से बात)\b/i],
    path: "/schedule",
    reply: "Customer से chat करने के लिए Schedule में **Chat** button click करें! 💬\n\nOpening schedule for customer chat.",
    action: "navigate"
  },
  // Earnings
  {
    patterns: [/\b(earnings?|income|payout|payment|kitna kamaya|kamai|कमाई|पेआउट|इनकम|meri kamai|total earnings?|how much|kitna mila)\b/i],
    path: "/earnings",
    reply: "Earnings देख रहे हैं! 💰\n\nOpening your earnings page.",
    action: "navigate"
  },
  // Commission
  {
    patterns: [/\b(commission|broker commission|deduction|kata|कमीशन|ब्रोकर कमीशन|broker kaata|5 percent|kitna kata)\b/i],
    path: "/earnings",
    reply: "Commission details:\n\n💰 Broker commission: **5% per completed job** (पहले 10 jobs तक)\n\nNet payout = Total amount - 5% commission\n\nEarnings page पर exact breakdown दिखेगा!\n\nOpening earnings for commission details.",
    action: "navigate"
  },
  // Reviews
  {
    patterns: [/\b(reviews?|ratings?|customer feedback|mera review|my reviews?|रिव्यू|रेटिंग|customer rating|star rating|review dekho)\b/i],
    path: "/reviews",
    reply: "आपके reviews खुल रहे हैं! ⭐\n\nOpening your customer reviews.",
    action: "navigate"
  },
  // Job profile (public)
  {
    patterns: [/\b(job profile|my profile|public profile|customer kya dekhte|profile on|job ka profile|जॉब प्रोफाइल)\b/i],
    path: "/job-profile",
    reply: "आपका job profile खुल रहा है! 💼\n\nOpening your public job profile.",
    action: "navigate"
  },
  // Availability
  {
    patterns: [/\b(availability|available|unavailable|online|offline|avail|अवेलेबल|उपलब्ध|available hona|available karna|mark available|mark unavailable)\b/i],
    path: "/profile",
    reply: "Availability Profile में toggle कर सकते हैं! ✅\n\nGo to Profile → check 'Mark me as currently available'.\n\nOpening profile to update availability.",
    action: "navigate"
  },
  // Services offered
  {
    patterns: [/\b(services offered|add service|remove service|service update|service list|service kya dete ho|meri services|meri skills)\b/i],
    path: "/profile",
    reply: "Services add/remove करने के लिए Profile में जाएं — **Services You Provide** dropdown से select करें! 🔧\n\nOpening profile to update services.",
    action: "navigate"
  },
  // Broker link / code
  {
    patterns: [/\b(broker link|broker code|broker kaun|broker ka naam|linked broker|ब्रोकर|broker se linked|referral code|join broker)\b/i],
    path: "/profile",
    reply: "Broker information Profile में मिलेगी!\n\n📋 Note: **Broker code सिर्फ signup के समय** add होता है — बाद में नहीं बदल सकते।\n\nAgr आप already linked हैं तो Profile में broker name और commission usage दिखेगा!\n\nOpening profile to see broker link details.",
    action: "navigate"
  },
  // How much commission left
  {
    patterns: [/\b(commission left|kitne jobs|remaining jobs|commission limit|10 jobs|commission kab|कमीशन कितना बाकी)\b/i],
    path: "/profile",
    reply: "Profile में **Broker commission usage** (जैसे 3/10) दिखता है — यानी आपने 3 commission-eligible jobs complete किए हैं।\n\nAfter 10 jobs, 5% deduction बंद हो जाता है और full payout मिलता है!\n\nOpening profile for commission usage.",
    action: "navigate"
  },
  // Salary / payout
  {
    patterns: [/\b(salary|paise kab|payment kab|paise kaise milenge|kab milega paisa|payment date|earnings kab|कब मिलेगा)\b/i],
    path: "/earnings",
    reply: "Payment/payout:\n\n💵 Payment customer के **Pay Now** button click करने पर instantly process होती है।\n\nApni earnings Earnings page पर real-time में दिखती हैं!\n\nOpening earnings page.",
    action: "navigate"
  },
  // Notification
  {
    patterns: [/\b(notification|notifications|alert|job alert|नोटिफिकेशन|सूचना)\b/i],
    path: "/settings",
    reply: "Notification preferences Settings में set करें! 🔔\n\nOpening settings.",
    action: "navigate"
  }
];

// ── BROKER COMMANDS ───────────────────────────────────────────────────────────
const BROKER_COMMANDS = [
  // Dashboard
  {
    patterns: [/\b(home|dashboard|overview|होम|ओवरव्यू|go home)\b/i],
    path: "/",
    reply: "Dashboard पर जा रहे हैं! 🏠",
    action: "navigate"
  },
  // Workers
  {
    patterns: [/\b(my workers?|linked workers?|network|mera network|worker list|kaun kaun hai|workers dekho|मेरे वर्कर|वर्कर लिस्ट|workers)\b/i],
    path: "/workers",
    reply: "आपके workers खुल रहे हैं! 👥\n\nOpening your linked workers list.",
    action: "navigate"
  },
  // Worker performance
  {
    patterns: [/\b(worker performance|worker stats|worker rating|worker jobs|worker ki kamai|best worker|top worker)\b/i],
    path: "/workers",
    reply: "Workers का performance Workers page पर देखें — completion rate, ratings, और commission सब show होता है! 📊\n\nOpening workers page.",
    action: "navigate"
  },
  // Worker profile (from broker)
  {
    patterns: [/\b(worker profile|view worker|worker ki profile|worker ki detail|worker ko dekho)\b/i],
    path: "/workers",
    reply: "Workers page पर किसी भी worker के **View Job Profile** button पर click करें! 👤\n\nOpening workers to view profiles.",
    action: "navigate"
  },
  // Bookings
  {
    patterns: [/\b(bookings?|booking history|completed bookings?|past bookings?|booking record|बुकिंग|बुकिंग हिस्ट्री|booking list)\b/i],
    path: "/bookings",
    reply: "Booking history खुल रही है! 📋\n\nOpening completed bookings history.",
    action: "navigate"
  },
  // Earnings / commission
  {
    patterns: [/\b(earnings?|commission|income|profit|kamai|कमाई|कमीशन|इनकम|total earned|kitna kamaya|mera paisa)\b/i],
    path: "/earnings",
    reply: "Earnings & commission खुल रहा है! 💰\n\nOpening your earnings and commission page.",
    action: "navigate"
  },
  // Broker code - share
  {
    patterns: [/\b(broker code|my code|share code|referral code|code share karo|ब्रोकर कोड|अपना कोड|code dikhao|code kya hai)\b/i],
    path: "/profile",
    reply: "Broker code Profile में मिलेगा — वहाँ **Share** button भी है! 🔗\n\nOpening profile to find and share your broker code.",
    action: "navigate"
  },
  // How commission works
  {
    patterns: [/\b(how commission|commission kaise|commission kab milta|commission kya|commission explain|5 percent|कमीशन कैसे|कमीशन कब)\b/i],
    path: null,
    reply: "Broker Commission कैसे काम करता है:\n\n• हर **linked worker** की completed booking पर **5% commission** मिलता है\n• यह सिर्फ **पहले 10 jobs** per worker पर applicable है\n• Worker का payout: Total - 5% (आपका commission)\n\nExample: ₹1000 की booking → ₹50 आपको, ₹950 worker को\n\n💡 जितने ज़्यादा workers link करेंगे, उतना ज़्यादा passive income!\n\nHow commission works: 5% per completed job, first 10 jobs per worker.",
    action: "respond"
  },
  // How to add worker
  {
    patterns: [/\b(add worker|worker kaise add|link worker|worker ko kaise jodna|how to add|invite worker|worker invite)\b/i],
    path: "/profile",
    reply: "Worker add करने का तरीका:\n\n1️⃣ Profile में जाएं → अपना **Broker Code** copy करें\n2️⃣ यह code worker को share करें\n3️⃣ Worker signup के समय यह code enter करेगा\n4️⃣ Worker automatically आपके network में add हो जाएगा! ✅\n\nOpening profile to get your broker code.",
    action: "navigate"
  },
  // Share broker code instructions
  {
    patterns: [/\b(share broker code|how to share|code kaise share|code whatsapp|code bhejo|code send karo)\b/i],
    path: "/workers",
    reply: "Broker code share करने का तरीका:\n\n1️⃣ Workers page → **Share** button click करें\n2️⃣ या Profile → Broker Code section → **Share** button\n3️⃣ Code copy होगा — फिर WhatsApp, SMS जहाँ चाहें भेजें\n\n📋 Share करें सिर्फ trusted workers के साथ!\n\nOpening workers page for share option.",
    action: "navigate"
  },
  // Monthly growth
  {
    patterns: [/\b(monthly|growth|stats|statistics|performance|महीने|मासिक|monthly income)\b/i],
    path: "/",
    reply: "Dashboard पर monthly stats और performance overview मिलेगा! 📈\n\nOpening dashboard for statistics.",
    action: "navigate"
  },
  // Notification
  {
    patterns: [/\b(notification|notifications|alert|नोटिफिकेशन|सूचना)\b/i],
    path: "/settings",
    reply: "Notification preferences Settings में set करें! 🔔\n\nOpening settings.",
    action: "navigate"
  }
];

// ── ROLE MAP ───────────────────────────────────────────────────────────────────
const ROLE_COMMANDS = {
  landing:  [...LANDING_COMMANDS, ...SHARED_COMMANDS],
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
  const trimmed = (message || "").trim();

  for (const cmd of commands) {
    for (const pattern of cmd.patterns) {
      if (pattern.test(trimmed)) {
        return {
          path: cmd.path,
          reply: typeof cmd.replyFn === "function" ? cmd.replyFn(role) : cmd.reply,
          action: cmd.action
        };
      }
    }
  }
  return null;
}

export { ROLE_COMMANDS };