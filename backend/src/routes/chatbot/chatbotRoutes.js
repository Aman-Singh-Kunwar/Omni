/**
 * chatbotRoutes.js
 * FILE: backend/src/routes/chatbot/chatbotRoutes.js
 *
 * Hybrid chatbot route — serves Landing, Customer, Worker, and Broker roles.
 * Manual commands are handled instantly (no LLM call).
 * Everything else goes to Groq API with a role-specific system prompt.
 * 
 * Response caching enabled to reduce API quota usage.
 */

import express from "express";
import { detectIntent, buildSystemPrompt } from "./intentDetector.js";
import { matchCommand } from "./commandMap.js";
import { buildLandingKnowledgeReply } from "./landingKnowledge.js";
import crypto from "crypto";

const router = express.Router();

// ── Simple response cache (reduces API calls) ────────────────────────────────
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_MAIN_MESSAGE_CHARS = 700;
const MAX_HISTORY_MESSAGE_CHARS = 260;
const MAX_HISTORY_ITEMS = 4;

function getCacheKey(intent, role, language, normalizedMessage) {
  const msgHash = crypto
    .createHash("sha256")
    .update((normalizedMessage || "").toLowerCase())
    .digest("hex")
    .slice(0, 16);

  return `${role}:${language}:${intent.type}:${intent.serviceSlug || ""}:${msgHash}`;
}

function getCachedResponse(cacheKey) {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  responseCache.delete(cacheKey);
  return null;
}

function setCachedResponse(cacheKey, data) {
  responseCache.set(cacheKey, {
    data,
    expiry: Date.now() + CACHE_TTL
  });
}

router.post("/chatbot", async (req, res, next) => {
  try {
    const {
      message,
      conversationHistory = [],
      role = "customer",    // "landing" | "customer" | "worker" | "broker"
      language = "auto",    // "auto" | "en-IN" | "hi-IN"
      routePath = "",
      routeSearch = ""
    } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const userMessage = String(message).trim();
    const userRole = ["landing", "customer", "worker", "broker"].includes(role) ? role : "customer";
    const userLanguage = ["auto", "en-IN", "hi-IN"].includes(language) ? language : "auto";
    const mainUserMessage = extractMainRequest(userMessage, MAX_MAIN_MESSAGE_CHARS);
    const routeContext = buildRouteContext(routePath, routeSearch);
    const apiKey = process.env.GROQ_API_KEY || "";
    const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const automationAction = buildAutomationAction(mainUserMessage, userRole, routeContext);

    // ── Step 1: Manual command check (fast path, no LLM) ────────────────────
    const commandMatch = matchCommand(mainUserMessage, userRole);
    if (commandMatch) {
      let commandReply = commandMatch.reply;
      if (apiKey) {
        commandReply = await enforceReplyLanguage({
          replyText: commandMatch.reply,
          userLanguage,
          apiKey,
          groqModel
        });
      }

      return res.json({
        type: "navigation",
        reply: commandReply,
        navigateTo: commandMatch.path,
        action: automationAction || commandMatch.action || null,
        role: userRole,
        timestamp: new Date().toISOString()
      });
    }

    // ── Step 2: Detect intent ────────────────────────────────────────────────
    const intent = detectIntent(mainUserMessage, userRole);

    // ── Step 2.2: Landing deterministic knowledge answers ───────────────────
    const landingKnowledge =
      userRole === "landing"
        ? buildLandingKnowledgeReply({
            message: mainUserMessage,
            intent,
            userLanguage
          })
        : null;

    if (landingKnowledge) {
      return res.json({
        type: landingKnowledge.navigateTo ? "navigation_suggestion" : "chat",
        reply: landingKnowledge.reply,
        intent: intent.type,
        navigateTo: landingKnowledge.navigateTo || null,
        suggestedActions: landingKnowledge.suggestedActions || buildSuggestedActions(intent, userRole),
        action: null,
        role: userRole,
        language: userLanguage,
        timestamp: new Date().toISOString(),
        cached: false
      });
    }

    // ── Step 2.5: Check cache ────────────────────────────────────────────────
    const cacheKey = getCacheKey(intent, userRole, userLanguage, mainUserMessage);
    const cachedReply = getCachedResponse(cacheKey);
    if (cachedReply) {
      const cachedNavigateTo =
        automationAction?.payload?.navigateTo ||
        extractNavigationFromReply(cachedReply, intent, userRole, mainUserMessage);

      return res.json({
        type: cachedNavigateTo ? "navigation_suggestion" : "chat",
        reply: cachedReply,
        intent: intent.type,
        navigateTo: cachedNavigateTo || null,
        suggestedActions: buildSuggestedActions(intent, userRole),
        action: automationAction || null,
        role: userRole,
        language: userLanguage,
        timestamp: new Date().toISOString(),
        cached: true
      });
    }

    // ── Step 3: Call Groq API ────────────────────────────────────────────────
    if (!apiKey) {
      return res.status(503).json({
        type: "error",
        reply: "AI assistant is temporarily unavailable. Please try again later.",
        timestamp: new Date().toISOString()
      });
    }

    const systemPrompt = `${buildSystemPrompt(intent, userRole)}\n\n${buildLanguageInstruction(userLanguage)}`;
    const compactHistory = preprocessConversationHistory(conversationHistory);
    const messages = [{ role: "system", content: systemPrompt }];
    for (const msg of compactHistory) {
      messages.push(msg);
    }
    messages.push({ role: "user", content: mainUserMessage });

    const groqPayload = {
      model: groqModel,
      messages,
      temperature: 0.7,
      max_tokens: 512,
      top_p: 0.9
    };

    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(groqPayload)
      }
    );

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      console.error("Groq API error:", errData);
      
      // Handle quota exceeded error specifically
      if (groqRes.status === 429) {
        return res.status(429).json({
          type: "error",
          reply: "I'm currently at capacity. Please retry in a few seconds. If this continues, check your Groq usage and limits.",
          timestamp: new Date().toISOString(),
          quotaExceeded: true
        });
      }

      if (groqRes.status === 401 || groqRes.status === 403) {
        return res.status(503).json({
          type: "error",
          reply: "AI assistant key is invalid or unauthorized. Please verify GROQ_API_KEY.",
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(502).json({
        type: "error",
        reply: "Sorry, I'm having trouble right now. Please try again.",
        timestamp: new Date().toISOString()
      });
    }

    const groqData = await groqRes.json();
    let replyText =
      groqData?.choices?.[0]?.message?.content?.trim() ||
      "I'm not sure how to help with that. Could you rephrase?";

    // If model output language doesn't match user's selected language, rewrite once.
    replyText = await enforceReplyLanguage({
      replyText,
      userLanguage,
      apiKey,
      groqModel
    });

    // Cache the reply to reduce API quota usage
    setCachedResponse(cacheKey, replyText);

    const navSuggestion = extractNavigationFromReply(replyText, intent, userRole, mainUserMessage);
    const effectiveNavigateTo = automationAction?.payload?.navigateTo || navSuggestion || null;

    return res.json({
      type: effectiveNavigateTo ? "navigation_suggestion" : "chat",
      reply: replyText,
      intent: intent.type,
      navigateTo: effectiveNavigateTo,
      suggestedActions: buildSuggestedActions(intent, userRole),
      action: automationAction || null,
      role: userRole,
      language: userLanguage,
      timestamp: new Date().toISOString(),
      cached: false
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return next(error);
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractNavigationFromReply(text, intent, role, mainUserMessage = "") {
  const lower = text.toLowerCase();
  if (role === "landing") {
    if (intent.type === "how_it_works") return "/?section=how-it-works";
    if (intent.type === "testimonials") return "/?section=testimonials";
    if (intent.type === "faqs") return "/?section=faq";
    if (intent.type === "trust") return "/?section=trust";
    if (intent.type === "services_overview") return "/?section=services";
    const isLoginIntent = intent.type === "auth" && /login|sign in|log in|लॉगिन/.test(mainUserMessage);
    if (["auth", "role_selection", "pricing"].includes(intent.type)) {
      const path = resolveLandingAuthRoute(mainUserMessage, isLoginIntent ? "login" : "signup");
      return path || "/signup?role=customer";
    }
  }
  if (role === "customer") {
    if (["booking", "recommendation", "pricing"].includes(intent.type)) {
      const specificServicePath = resolveCustomerServiceRoute(mainUserMessage);
      if (specificServicePath) return specificServicePath;
      if (intent.serviceSlug) return `/customer/category/${intent.serviceSlug}`;
      return "/";
    }
    if (intent.type === "order_tracking") return "/bookings";
    if (intent.type === "profile") return "/profile";
  }
  if (role === "worker") {
    if (intent.type === "earnings") return "/earnings";
    if (intent.type === "job_requests") return "/job-requests";
    if (intent.type === "schedule") return "/schedule";
    if (intent.type === "reviews") return "/reviews";
    if (["availability", "profile", "broker_link"].includes(intent.type)) return "/profile";
  }
  if (role === "broker") {
    if (intent.type === "workers") return "/workers";
    if (intent.type === "earnings") return "/earnings";
    if (intent.type === "bookings") return "/bookings";
    if (intent.type === "broker_code") return "/profile";
  }
  return null;
}

function resolveLandingAuthRoute(message, mode = "signup") {
  const lower = String(message || "").toLowerCase();
  const action = mode === "login" ? "login" : "signup";

  if (/worker|काम|जॉब|provider|service provider/.test(lower)) {
    return `/${action}?role=worker`;
  }
  if (/broker|network|commission|ब्रोकर|कमीशन/.test(lower)) {
    return `/${action}?role=broker`;
  }
  if (/customer|book|service|कस्टमर|बुक/.test(lower)) {
    return `/${action}?role=customer`;
  }
  return `/${action}?role=customer`;
}

function resolveCustomerServiceRoute(message) {
  const lower = String(message || "").toLowerCase();

  const routeMatchers = [
    {
      patterns: [/\b(plumb|plumbing|plumber|pipe|नल|पाइप|प्लम्बिंग)\b/i],
      path: "/customer/category/home-care/service/plumbing-support"
    },
    {
      patterns: [/\b(electrician|electrical|electric|wiring|बिजली|इलेक्ट्रीशियन)\b/i],
      path: "/customer/category/home-care/service/electrical-care"
    },
    {
      patterns: [/\b(ac repair|ac service|air condition|एसी|एयर कंडीशन)\b/i, /\bac\b/i],
      path: "/customer/category/home-care/service/ac-maintenance"
    },
    {
      patterns: [/\b(house clean|home clean|cleaning|सफाई|क्लीनिंग)\b/i],
      path: "/customer/category/home-care/service/house-cleaning"
    },
    {
      patterns: [/\b(carpent|carpenter|wood work|बढ़ई|कारपेंटर)\b/i],
      path: "/customer/category/home-care/service/carpentry-care"
    },
    {
      patterns: [/\b(hair|salon|groom|stylist|बाल|हेयर|सैलून)\b/i],
      path: "/customer/category/personal-grooming/service/at-home-hair-styling"
    },
    {
      patterns: [/\b(skin|facial|beauty|glow|स्किन|फेशियल|ब्यूटी)\b/i],
      path: "/customer/category/personal-grooming/service/skin-glow-rituals"
    },
    {
      patterns: [/\b(car wash|wash car|कार वॉश|कार धुलाई)\b/i],
      path: "/customer/category/vehicle-care/service/premium-car-wash"
    },
    {
      patterns: [/\b(interior detailing|detailing|interior clean)\b/i],
      path: "/customer/category/vehicle-care/service/interior-detailing"
    },
    {
      patterns: [/\b(car service|routine car care|vehicle service|गाड़ी सर्विस|कार सर्विस)\b/i],
      path: "/customer/category/home-care/service/car-service"
    }
  ];

  for (const entry of routeMatchers) {
    if (entry.patterns.some((pattern) => pattern.test(lower))) {
      return entry.path;
    }
  }

  return null;
}

function normalizeToBookingServiceName(serviceRoute) {
  const routeToServiceMap = {
    "/customer/category/home-care/service/plumbing-support": "Plumber",
    "/customer/category/home-care/service/electrical-care": "Electrician",
    "/customer/category/home-care/service/ac-maintenance": "AC Repair",
    "/customer/category/home-care/service/house-cleaning": "House Cleaning",
    "/customer/category/home-care/service/carpentry-care": "Carpenter",
    "/customer/category/home-care/service/car-service": "Car Service",
    "/customer/category/personal-grooming/service/at-home-hair-styling": "Hair Stylist",
    "/customer/category/personal-grooming/service/skin-glow-rituals": "Hair Stylist",
    "/customer/category/vehicle-care/service/premium-car-wash": "Car Service",
    "/customer/category/vehicle-care/service/interior-detailing": "Car Service"
  };

  return routeToServiceMap[serviceRoute] || "";
}

function parseTimeFromMessage(message) {
  const lower = String(message || "").toLowerCase();
  const match = lower.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (match) {
    const hour = String(Number(match[1]));
    const minute = String(Number(match[2] || "0")).padStart(2, "0");
    const meridiem = String(match[3] || "").toUpperCase();
    return `${hour}:${minute} ${meridiem}`;
  }

  const twentyFourHourMatch = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!twentyFourHourMatch) return "";

  const hour24 = Number(twentyFourHourMatch[1]);
  const minute = String(twentyFourHourMatch[2]);
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${meridiem}`;
}

function parseDateModeFromMessage(message) {
  const lower = String(message || "").toLowerCase();
  if (/\b(today|आज)\b/i.test(lower)) return "today";
  if (/\b(tomorrow|कल)\b/i.test(lower)) return "tomorrow";
  return "";
}

function parseExplicitDateFromMessage(message) {
  const raw = String(message || "");
  const match = raw.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (!Number.isFinite(year) || year <= 0) {
    year = new Date().getFullYear();
  } else if (year < 100) {
    year += 2000;
  }

  const normalized = new Date(year, month - 1, day);
  const isValid =
    normalized.getFullYear() === year &&
    normalized.getMonth() === month - 1 &&
    normalized.getDate() === day;
  if (!isValid) return "";

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseLocationFromMessage(message) {
  const raw = String(message || "");
  const match = raw.match(/(?:location|address|लोकेशन|पता)\s*[:\-]?\s*([^\n]{4,140})/i);
  if (!match) return "";

  const candidate = normalizeMessageText(match[1], 140).replace(/[.,;!?]+$/, "").trim();
  if (!candidate) return "";
  if (/^(?:my|current)\s+location\b/i.test(candidate)) return "";
  return candidate;
}

function parseBookingReferenceId(message) {
  const raw = String(message || "");
  const match = raw.match(/\b(?:booking|job)\s*(?:id|number|no\.?|#)?\s*[:\-]?\s*([A-Za-z0-9-]{8,})\b/i);
  return match ? String(match[1] || "").trim() : "";
}

function parseWorkerReferenceId(message) {
  const raw = String(message || "");
  const match = raw.match(/\bworker\s*(?:id|number|no\.?|#)?\s*[:\-]?\s*([A-Za-z0-9-]{4,})\b/i);
  return match ? String(match[1] || "").trim() : "";
}

function parseEmailFromMessage(message) {
  const raw = String(message || "");
  const match = raw.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  return match ? String(match[1] || "").trim().toLowerCase() : "";
}

function parseOtpFromMessage(message) {
  const raw = String(message || "");
  const otpWithLabelMatch = raw.match(/\b(?:otp|code|verification code)\s*[:\-]?\s*(\d{6})\b/i);
  if (otpWithLabelMatch) return String(otpWithLabelMatch[1] || "").trim();

  const plainMatch = raw.match(/\b(\d{6})\b/);
  return plainMatch ? String(plainMatch[1] || "").trim() : "";
}

function parseMonthFilterFromMessage(message) {
  const lower = String(message || "").toLowerCase();
  if (/\b(this month|current month)\b/i.test(lower)) return "current";
  if (/\b(last month|previous month|past month)\b/i.test(lower)) return "last";

  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const matchedMonthIndex = monthNames.findIndex((name) => new RegExp(`\\b${name}\\b`, "i").test(lower));
  if (matchedMonthIndex === -1) return "";

  const now = new Date();
  const year = now.getFullYear();
  return `${year}-${String(matchedMonthIndex + 1).padStart(2, "0")}`;
}

function parseStarBandFromMessage(message) {
  const raw = String(message || "").toLowerCase();
  const numericMatch = raw.match(/\b([1-5])\s*(?:star|stars)\b/i);
  if (numericMatch) return String(numericMatch[1] || "");

  const wordsToStars = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5"
  };
  const wordMatch = raw.match(/\b(one|two|three|four|five)\s*(?:star|stars)\b/i);
  if (wordMatch) {
    return wordsToStars[String(wordMatch[1] || "").toLowerCase()] || "";
  }

  return "";
}

function parseDescriptionFromMessage(message) {
  const lower = String(message || "");
  const match = lower.match(/(?:description|desc|note|details|requirement|मेरी डिटेल|विवरण)\s*[:\-]?\s*(.+)$/i);
  if (!match) return "";
  return normalizeMessageText(match[1], 220);
}

function parseChatEditReplacementText(message) {
  const raw = String(message || "");
  const patterns = [
    /(?:edit|change|update)\s+(?:my\s+)?(?:last\s+)?(?:chat\s+)?message\s*(?:to|as)\s*[:\-]?\s*(.+)$/i,
    /(?:message|chat)\s*(?:to|as)\s*[:\-]?\s*(.+)$/i,
    /(?:replace\s+with)\s*[:\-]?\s*(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match && match[1]) {
      return normalizeMessageText(match[1], 500);
    }
  }

  return "";
}

function deriveServiceRouteFromPath(pathname) {
  const path = String(pathname || "").trim();
  if (!path) return "";
  const match = path.match(/^(\/customer\/category\/[^/]+\/service\/[^/?#]+)$/i);
  return match ? String(match[1] || "") : "";
}

function buildRouteContext(routePath, routeSearch) {
  const path = String(routePath || "").trim();
  const search = String(routeSearch || "").trim();

  const normalizedPath = path.startsWith("/") ? path : path ? `/${path}` : "";
  const normalizedSearch =
    search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";

  return {
    path: normalizedPath,
    search: normalizedSearch,
    fullPath: normalizedPath ? `${normalizedPath}${normalizedSearch}` : ""
  };
}

function isSamePath(pathname, targetPathname) {
  return String(pathname || "") === String(targetPathname || "");
}

function isOnPathPrefix(pathname, prefix) {
  const p = String(pathname || "");
  const pre = String(prefix || "");
  return p === pre || p.startsWith(`${pre}/`);
}

function buildCustomerAutomationAction(message, routeContext = {}) {
  const lower = String(message || "").toLowerCase();
  const routePath = String(routeContext.path || "");
  const onHomePage = isSamePath(routePath, "/");
  const onBookingsPage = isOnPathPrefix(routePath, "/bookings");
  const onBookingFormPage = isOnPathPrefix(routePath, "/bookings/new");
  const onServiceDetailsPage = routePath.includes("/service/");
  const mentionsBookingFlow = /\b(book\b|book service|start booking|new booking|continue booking|confirm booking|complete booking|book now|बुक|बुकिंग करो|बुकिंग कन्फर्म|कन्फर्म बुकिंग)\b/i.test(lower);
  const explicitBookingFormIntent =
    /\b((continue|resume|proceed|finalize|finalise|complete|confirm)(?:\s+to)?\s+(?:my\s+)?booking|continue\s+with\s+booking|continue\s+to\s+booking|open\s+booking\s+form|book\s+now|then\s+book|अभी\s+बुक|बुक\s+करो|कन्फर्म)\b/i.test(lower) ||
    (onServiceDetailsPage && /\b(continue|next|proceed|book this|aage|आगे|confirm)\b/i.test(lower));
  const serviceRouteFromMessage = resolveCustomerServiceRoute(lower);
  const serviceRouteFromPage = deriveServiceRouteFromPath(routePath);
  const serviceRoute = serviceRouteFromMessage || serviceRouteFromPage;
  const serviceName = normalizeToBookingServiceName(serviceRoute);
  const useCurrentLocation = /\b(current location|my location|use location|लोकेशन|वर्तमान लोकेशन|current place)\b/i.test(lower);
  const location = parseLocationFromMessage(message);
  const time = parseTimeFromMessage(lower);
  const dateMode = parseDateModeFromMessage(lower);
  const explicitDate = parseExplicitDateFromMessage(message);
  const description = parseDescriptionFromMessage(message);
  const autoSubmit = /\b(book now|confirm booking|book service|then book|बुक करो|अभी बुक)\b/i.test(lower);
  const hasBookingFormFields = Boolean(useCurrentLocation || location || time || dateMode || explicitDate || description || autoSubmit);

  const hasExecutableFields = Boolean(serviceRoute || serviceName || hasBookingFormFields);
  if (mentionsBookingFlow || hasExecutableFields) {
    const shouldOpenBookingForm = explicitBookingFormIntent || hasBookingFormFields;
    const flowStep = shouldOpenBookingForm ? "booking_form" : "service_selection";

    let navigateTo = onHomePage || onServiceDetailsPage ? null : "/";
    if (flowStep === "booking_form") {
      if (onBookingFormPage) {
        navigateTo = routeContext.fullPath || routePath || "/bookings/new";
      } else {
        const params = new URLSearchParams();
        params.set("source", "service");
        if (serviceName) params.set("service", serviceName);
        navigateTo = `/bookings/new?${params.toString()}`;
      }
    } else if (serviceRoute) {
      navigateTo = isSamePath(routePath, serviceRoute) ? null : serviceRoute;
    }

    return {
      type: "customer_booking_flow",
      payload: {
        id: `act-${Date.now()}`,
        flowStep,
        navigateTo,
        serviceRoute,
        serviceName,
        dateMode,
        explicitDate,
        time,
        useCurrentLocation,
        location,
        description,
        autoSubmit
      }
    };
  }

  const wantsTracking = /\b(track|tracking|booking status|where is|status|ट्रैक|स्थिति)\b/i.test(lower);
  const wantsBookingChat = /\b(chat|message|talk|contact worker|worker se baat|चैट|मैसेज|संदेश)\b/i.test(lower);
  const wantsChatEdit = /\b(edit|change|update)\b.*\b(chat|message)\b|\b(chat|message)\b.*\b(edit|change|update)\b/i.test(lower);
  const wantsChatDelete = /\b(delete|remove|erase)\b.*\b(chat|message)\b|\b(chat|message)\b.*\b(delete|remove|erase)\b/i.test(lower);
  const wantsPayment = /\b(pay|payment|pay now|booking pay|भुगतान|पेमेंट)\b/i.test(lower);
  const wantsNotProvided = /\b(not provided|service not done|didn't come|worker nahi aaya|नहीं आया|सर्विस नहीं मिली)\b/i.test(lower);
  const wantsReview = /\b(review|feedback|rating|rate service|edit feedback|रिव्यू|रेटिंग|फीडबैक)\b/i.test(lower);
  const wantsReviewTab = /\b(open review tab|go to review tab|review section|jump to review|review panel)\b/i.test(lower);
  const wantsReviewMedia = /\b(upload|attach|add)\b.*\b(photo|image|video|media|proof)\b|\b(review media|feedback media|photo proof|video proof)\b/i.test(lower);
  const wantsBookingDetails = /\b(booking details|open booking details|show booking details|open booking card|booking card details)\b/i.test(lower);
  const wantsDeleteBooking = /\b(delete booking|remove booking|booking delete|booking hatao|बुकिंग हटाओ|बुकिंग डिलीट)\b/i.test(lower);
  const wantsCancelBooking = /\b(cancel booking|booking cancel|बुकिंग cancel|बुकिंग रद्द|cancel my booking)\b/i.test(lower);

  if (wantsChatEdit || wantsChatDelete) {
    const confirmed = /\b(confirm|confirmed|yes|proceed|sure)\b/i.test(lower);
    return {
      type: "chat_message_action",
      payload: {
        id: `act-${Date.now()}`,
        action: wantsChatDelete ? "delete_last" : "edit_last",
        replacementText: wantsChatDelete ? "" : parseChatEditReplacementText(message),
        confirmed,
        bookingId: parseBookingReferenceId(message),
        navigateTo: onBookingsPage ? null : "/bookings"
      }
    };
  }

  if (
    !wantsTracking &&
    !wantsBookingChat &&
    !wantsPayment &&
    !wantsNotProvided &&
    !wantsReview &&
    !wantsReviewTab &&
    !wantsReviewMedia &&
    !wantsBookingDetails &&
    !wantsDeleteBooking &&
    !wantsCancelBooking
  ) {
    return null;
  }

  const bookingsAction = wantsTracking
    ? "open_tracking"
    : wantsBookingChat
      ? "open_chat"
      : wantsPayment
        ? "open_payment"
        : wantsNotProvided
          ? "open_not_provided"
          : wantsReviewTab
            ? "open_review_tab"
            : wantsReviewMedia
              ? "open_review_media"
          : wantsReview
            ? "open_review"
            : wantsDeleteBooking
              ? "open_delete"
              : wantsBookingDetails
                ? "open_booking_details"
              : "open_cancel";

  return {
    type: "customer_bookings_action",
    payload: {
      id: `act-${Date.now()}`,
      action: bookingsAction,
      bookingId: parseBookingReferenceId(message),
      navigateTo: onBookingsPage ? null : "/bookings"
    }
  };
}

function buildBrokerAutomationAction(message, routeContext = {}) {
  const lower = String(message || "").toLowerCase();
  const routePath = String(routeContext.path || "");
  const onWorkersPage = isOnPathPrefix(routePath, "/workers");
  const onOverviewPage = isSamePath(routePath, "/");
  const onProfilePage = isOnPathPrefix(routePath, "/profile");

  const wantsOpenWorkers = /\b(workers|my workers|worker list|linked workers|network workers|show workers)\b/i.test(lower);
  const wantsShareCode = /\b(share broker code|share code|broker code share|code share karo)\b/i.test(lower);
  const wantsCopyCode = /\b(copy broker code|copy code|broker code copy|code copy)\b/i.test(lower);
  const wantsWorkerProfile = /\b(worker profile|open worker profile|view worker profile|worker details)\b/i.test(lower);
  const wantsTopWorkerProfile = /\b(top worker|best worker|highest worker|top performing worker)\b/i.test(lower);
  const wantsOpenEmailVerify = /\b(open email verification|open verify email|email verification modal|verify email popup)\b/i.test(lower);
  const wantsResendOtp = /\b(resend otp|send otp again|resend verification code|send verification code again)\b/i.test(lower);
  const wantsVerifyOtp = /\b(verify otp|verify code|otp verify|confirm otp)\b/i.test(lower);

  if (wantsOpenEmailVerify || wantsResendOtp || wantsVerifyOtp) {
    const pendingEmail = parseEmailFromMessage(message);
    const otpCode = parseOtpFromMessage(message);
    const hasConfirmation = /\b(confirm|confirmed|yes verify|proceed verify|i confirm|strict confirm)\b/i.test(lower);

    const profileAction = wantsResendOtp ? "resend_email_otp" : wantsVerifyOtp ? "verify_email_otp" : "open_email_verify";

    return {
      type: "broker_profile_action",
      payload: {
        id: `act-${Date.now()}`,
        action: profileAction,
        pendingEmail,
        otpCode,
        confirmed: hasConfirmation,
        navigateTo: onProfilePage ? null : "/profile"
      }
    };
  }

  if (!wantsOpenWorkers && !wantsShareCode && !wantsCopyCode && !wantsWorkerProfile && !wantsTopWorkerProfile) {
    return null;
  }

  const workerId = parseWorkerReferenceId(message);
  let action = "open_workers";
  let navigateTo = onWorkersPage ? null : "/workers";

  if (wantsWorkerProfile) {
    action = "open_worker_profile";
    navigateTo = workerId ? `/worker-profile?workerId=${encodeURIComponent(workerId)}` : "/workers";
  } else if (wantsTopWorkerProfile) {
    action = "open_top_worker_profile";
    navigateTo = onOverviewPage ? null : "/";
  } else if (wantsCopyCode) {
    action = "copy_code";
    navigateTo = "/workers?chatbotAction=copy";
  } else if (wantsShareCode) {
    action = "open_share_modal";
    navigateTo = "/workers?chatbotAction=share";
  }

  return {
    type: "broker_workers_action",
    payload: {
      id: `act-${Date.now()}`,
      action,
      workerId,
      navigateTo
    }
  };
}

function buildSharedDashboardAutomationAction(message, role, routeContext = {}) {
  if (!role || role === "landing") return null;

  const lower = String(message || "").toLowerCase();
  const routePath = String(routeContext.path || "");

  const openNotifications = /\b(open notifications|show notifications|notifications panel|notification panel)\b/i.test(lower);
  const markAllRead = /\b(mark all read|read all notifications|mark notifications read)\b/i.test(lower);
  const clearAllNotifications = /\b(clear notifications|clear all notifications|remove notifications)\b/i.test(lower);
  const openUnreadTarget = /\b(open unread notification|open latest notification|open first unread|unread notification open)\b/i.test(lower);

  if (openNotifications || markAllRead || clearAllNotifications || openUnreadTarget) {
    return {
      type: "dashboard_notification_action",
      payload: {
        id: `act-${Date.now()}`,
        action: markAllRead ? "mark_all_read" : clearAllNotifications ? "clear_all" : openUnreadTarget ? "open_unread_target" : "open_panel",
        navigateTo: routePath || null
      }
    };
  }

  const wantsProfileSection = /\b(profile)\b/i.test(lower) && /\b(email|phone|bio)\b/i.test(lower);
  if (wantsProfileSection) {
    const section = /\bphone\b/i.test(lower) ? "phone" : /\bbio\b/i.test(lower) ? "bio" : "email";
    return {
      type: "profile_section_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "open_profile_section",
        section,
        navigateTo: isOnPathPrefix(routePath, "/profile") ? null : "/profile"
      }
    };
  }

  const wantsSettingsSection =
    /\b(settings|account settings|preferences)\b/i.test(lower) &&
    /\b(notifications?|password|delete account|delete-account|remove account)\b/i.test(lower);
  if (wantsSettingsSection) {
    const section =
      /\bpassword\b/i.test(lower)
        ? "password"
        : /\b(?:delete account|delete-account|remove account)\b/i.test(lower)
          ? "delete-account"
          : "notifications";
    return {
      type: "settings_section_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "open_settings_section",
        section,
        navigateTo: isOnPathPrefix(routePath, "/settings") ? null : "/settings"
      }
    };
  }

  const openRoleSwitch = /\b(switch role|change role|open role switch|role switch)\b/i.test(lower);
  const switchToWorker = /\b(switch to worker|become worker|worker mode)\b/i.test(lower);
  const switchToBroker = /\b(switch to broker|become broker|broker mode)\b/i.test(lower);
  const switchToCustomer = /\b(switch to customer|become customer|customer mode)\b/i.test(lower);

  if (!openRoleSwitch && !switchToWorker && !switchToBroker && !switchToCustomer) {
    return null;
  }

  let targetRole = "";
  if (switchToWorker) targetRole = "worker";
  if (switchToBroker) targetRole = "broker";
  if (switchToCustomer) targetRole = "customer";

  return {
    type: "role_switch_action",
    payload: {
      id: `act-${Date.now()}`,
      action: targetRole ? "switch_role" : "open_switch_modal",
      role: targetRole || null,
      navigateTo: routePath || null
    }
  };
}

function buildWorkerAutomationAction(message, routeContext = {}) {
  const lower = String(message || "").toLowerCase();
  const routePath = String(routeContext.path || "");
  const onJobRequestsPage = isOnPathPrefix(routePath, "/job-requests");
  const onSchedulePage = isOnPathPrefix(routePath, "/schedule");
  const onEarningsPage = isOnPathPrefix(routePath, "/earnings");
  const onReviewsPage = isOnPathPrefix(routePath, "/reviews");
  const bookingId = parseBookingReferenceId(message);

  const hasAcceptKeyword = /\b(accept|approve|take|pick|स्वीकार|एक्सेप्ट)\b/i.test(lower);
  const hasRejectKeyword = /\b(reject|decline|deny|skip|अस्वीकार|रिजेक्ट|मना)\b/i.test(lower);
  const hasJobKeyword = /\b(job|request|booking|काम|रिक्वेस्ट|बुकिंग)\b/i.test(lower);

  if (hasAcceptKeyword && (hasJobKeyword || onJobRequestsPage)) {
    return {
      type: "worker_job_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "accept",
        bookingId,
        navigateTo: onJobRequestsPage ? null : "/job-requests"
      }
    };
  }

  if (hasRejectKeyword && (hasJobKeyword || onJobRequestsPage)) {
    return {
      type: "worker_job_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "reject",
        bookingId,
        navigateTo: onJobRequestsPage ? null : "/job-requests"
      }
    };
  }

  const wantsShareLocation = /\b(share( my)? location|start sharing|live location|turn on location|लोकेशन शेयर|लाइव लोकेशन)\b/i.test(lower);
  const wantsStopSharing = /\b(stop sharing|stop live location|turn off location|stop location|लोकेशन बंद|लोकेशन शेयर बंद)\b/i.test(lower);
  const wantsOpenLocation =
    wantsShareLocation ||
    (/\b(location|map|route|navigation|navigate|लोकेशन|मैप|रूट)\b/i.test(lower) &&
      /\b(open|show|view|track|check|देख|खोल|बताओ|start)\b/i.test(lower));
  if (wantsOpenLocation) {
    return {
      type: "worker_schedule_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "open_location",
        bookingId,
        autoShare: wantsShareLocation,
        navigateTo: onSchedulePage ? null : "/schedule"
      }
    };
  }

  if (wantsStopSharing) {
    return {
      type: "worker_schedule_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "stop_share",
        bookingId,
        autoShare: false,
        navigateTo: onSchedulePage ? null : "/schedule"
      }
    };
  }

  const wantsOpenChat = /\b(chat|message|talk|contact customer|चैट|मैसेज|संदेश)\b/i.test(lower);
  const wantsChatEdit = /\b(edit|change|update)\b.*\b(chat|message)\b|\b(chat|message)\b.*\b(edit|change|update)\b/i.test(lower);
  const wantsChatDelete = /\b(delete|remove|erase)\b.*\b(chat|message)\b|\b(chat|message)\b.*\b(delete|remove|erase)\b/i.test(lower);

  if (wantsChatEdit || wantsChatDelete) {
    const confirmed = /\b(confirm|confirmed|yes|proceed|sure)\b/i.test(lower);
    return {
      type: "chat_message_action",
      payload: {
        id: `act-${Date.now()}`,
        action: wantsChatDelete ? "delete_last" : "edit_last",
        replacementText: wantsChatDelete ? "" : parseChatEditReplacementText(message),
        confirmed,
        bookingId,
        navigateTo: onSchedulePage ? null : "/schedule"
      }
    };
  }

  if (wantsOpenChat) {
    return {
      type: "worker_schedule_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "open_chat",
        bookingId,
        navigateTo: onSchedulePage ? null : "/schedule"
      }
    };
  }

  const wantsOpenEarnings =
    /\b(earnings|income|income report|payment history|earning details)\b/i.test(lower) &&
    /\b(open|show|view|go|check|filter|देख|खोल)\b/i.test(lower);
  if (wantsOpenEarnings) {
    const monthFilter = parseMonthFilterFromMessage(message);
    const query = monthFilter ? `?month=${encodeURIComponent(monthFilter)}` : "";
    return {
      type: "worker_page_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "open_earnings",
        monthFilter,
        navigateTo: onEarningsPage ? null : `/earnings${query}`
      }
    };
  }

  const wantsOpenReviews =
    /\b(reviews?|rating|feedback)\b/i.test(lower) &&
    /\b(open|show|view|go|check|filter|देख|खोल)\b/i.test(lower);
  if (wantsOpenReviews) {
    const starsFilter = parseStarBandFromMessage(message);
    const query = starsFilter ? `?stars=${encodeURIComponent(starsFilter)}` : "";
    return {
      type: "worker_page_action",
      payload: {
        id: `act-${Date.now()}`,
        action: "open_reviews",
        starsFilter,
        navigateTo: onReviewsPage ? null : `/reviews${query}`
      }
    };
  }

  return null;
}

function buildAutomationAction(message, role, routeContext = {}) {
  const sharedAction = buildSharedDashboardAutomationAction(message, role, routeContext);
  if (sharedAction) return sharedAction;

  if (role === "customer") return buildCustomerAutomationAction(message, routeContext);
  if (role === "worker") return buildWorkerAutomationAction(message, routeContext);
  if (role === "broker") return buildBrokerAutomationAction(message, routeContext);
  return null;
}

function buildSuggestedActions(intent, role) {
  const maps = {
    landing: {
      auth:              [{ label: "Create Customer Account", action: "navigate", path: "/signup?role=customer" }, { label: "Login", action: "navigate", path: "/login?role=customer" }],
      role_selection:    [{ label: "Customer Signup", action: "navigate", path: "/signup?role=customer" }, { label: "Worker Signup", action: "navigate", path: "/signup?role=worker" }, { label: "Broker Signup", action: "navigate", path: "/signup?role=broker" }],
      how_it_works:      [{ label: "View How Omni Works", action: "navigate", path: "/?section=how-it-works" }, { label: "Start Signup", action: "navigate", path: "/signup?role=customer" }],
      testimonials:      [{ label: "See User Feedback", action: "navigate", path: "/?section=testimonials" }, { label: "Customer Signup", action: "navigate", path: "/signup?role=customer" }],
      faqs:              [{ label: "Open FAQs", action: "navigate", path: "/?section=faq" }, { label: "Login", action: "navigate", path: "/login?role=customer" }],
      services_overview: [{ label: "See Service List", action: "navigate", path: "/?section=services" }, { label: "Explore as Customer", action: "navigate", path: "/signup?role=customer" }],
      pricing:           [{ label: "View Prices in App", action: "navigate", path: "/signup?role=customer" }],
      trust:             [{ label: "Trust Highlights", action: "navigate", path: "/?section=trust" }, { label: "Start with Customer", action: "navigate", path: "/signup?role=customer" }],
      general:           [{ label: "Customer", action: "navigate", path: "/signup?role=customer" }, { label: "Worker", action: "navigate", path: "/signup?role=worker" }, { label: "Broker", action: "navigate", path: "/signup?role=broker" }]
    },
    customer: {
      booking:       [{ label: "📅 Book Now", action: "navigate", path: "/" }, { label: "📋 My Bookings", action: "navigate", path: "/bookings" }],
      order_tracking:[{ label: "📋 View Bookings", action: "navigate", path: "/bookings" }],
      pricing:       [{ label: "🔍 Browse Services", action: "navigate", path: "/" }],
      recommendation:[{ label: "🔍 View Services", action: "navigate", path: "/" }, { label: "📋 Book Now", action: "navigate", path: "/bookings/new" }],
      general:       [{ label: "🏠 Home", action: "navigate", path: "/" }, { label: "📋 My Bookings", action: "navigate", path: "/bookings" }]
    },
    worker: {
      job_requests:  [{ label: "📥 Job Requests", action: "navigate", path: "/job-requests" }],
      earnings:      [{ label: "💰 Earnings", action: "navigate", path: "/earnings" }],
      schedule:      [{ label: "📅 Schedule", action: "navigate", path: "/schedule" }],
      profile:       [{ label: "👤 Profile", action: "navigate", path: "/profile" }],
      general:       [{ label: "🏠 Overview", action: "navigate", path: "/" }, { label: "📥 Job Requests", action: "navigate", path: "/job-requests" }]
    },
    broker: {
      workers:       [{ label: "👥 My Workers", action: "navigate", path: "/workers" }],
      earnings:      [{ label: "💰 Earnings", action: "navigate", path: "/earnings" }],
      bookings:      [{ label: "📋 Bookings", action: "navigate", path: "/bookings" }],
      general:       [{ label: "🏠 Overview", action: "navigate", path: "/" }, { label: "👥 My Workers", action: "navigate", path: "/workers" }]
    }
  };
  const roleMap = maps[role] || maps.customer;
  return roleMap[intent.type] || roleMap.general;
}

function normalizeMessageText(text, maxLen) {
  return String(text || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function extractMainRequest(text, maxLen) {
  const raw = String(text || "");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => normalizeMessageText(line, maxLen))
    .filter(Boolean);

  // Prefer last meaningful line when users paste larger context and ask at the end.
  const candidate = lines.length > 1 ? lines[lines.length - 1] : raw;
  return normalizeMessageText(candidate, maxLen);
}

function preprocessConversationHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-MAX_HISTORY_ITEMS)
    .map((msg) => {
      const role = msg?.role === "user" ? "user" : "assistant";
      const content = normalizeMessageText(msg?.text, MAX_HISTORY_MESSAGE_CHARS);
      return content ? { role, content } : null;
    })
    .filter(Boolean);
}

function buildLanguageInstruction(userLanguage) {
  if (userLanguage === "hi-IN") {
    return "CRITICAL LANGUAGE OVERRIDE: Reply only in Hindi using Devanagari script. Do NOT reply in English except unavoidable brand names. Keep tone natural and concise.";
  }

  if (userLanguage === "en-IN") {
    return "CRITICAL LANGUAGE OVERRIDE: Reply only in English. Do NOT use Hindi script. Keep tone natural and concise.";
  }

  return "Reply in the same language as the user's latest message. Keep tone natural and concise.";
}

function hasDevanagari(text) {
  return /[\u0900-\u097F]/.test(String(text || ""));
}

async function enforceReplyLanguage({ replyText, userLanguage, apiKey, groqModel }) {
  if (!replyText || userLanguage === "auto") return replyText;

  const replyHasHindiScript = hasDevanagari(replyText);
  const alreadyCorrect =
    (userLanguage === "hi-IN" && replyHasHindiScript) ||
    (userLanguage === "en-IN" && !replyHasHindiScript);

  if (alreadyCorrect) return replyText;

  const targetLanguage = userLanguage === "hi-IN" ? "Hindi (Devanagari script)" : "English";
  const rewritePayload = {
    model: groqModel,
    messages: [
      {
        role: "system",
        content:
          `Rewrite the assistant reply in ${targetLanguage}. Preserve meaning and tone. Keep it concise. Return only rewritten text.`
      },
      {
        role: "user",
        content: replyText
      }
    ],
    temperature: 0.1,
    max_tokens: 512,
    top_p: 0.9
  };

  try {
    const rewriteRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(rewritePayload)
    });

    if (!rewriteRes.ok) {
      return replyText;
    }

    const rewriteData = await rewriteRes.json().catch(() => ({}));
    const rewritten = rewriteData?.choices?.[0]?.message?.content?.trim();
    return rewritten || replyText;
  } catch {
    return replyText;
  }
}

export default router;