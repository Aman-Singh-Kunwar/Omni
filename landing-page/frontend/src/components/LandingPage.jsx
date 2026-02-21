import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Check,
  Clock,
  CreditCard,
  Handshake,
  Headphones,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Shield,
  Star,
  Users
} from "lucide-react";
import { roleList, roleMeta } from "../constants/roles";

const services = [
  "Plumber",
  "Electrician",
  "Carpenter",
  "Painter",
  "AC Repair",
  "Cleaning",
  "Gardening",
  "Appliance Repair",
  "Pest Control",
  "Home Security"
];

const trustPoints = ["Same-day bookings", "Verified professionals", "Transparent pricing", "Live booking updates"];

const howItWorks = [
  {
    id: "step-1",
    icon: Users,
    title: "Choose role and service",
    description: "Select customer, broker, or worker flow and pick the exact service you need in seconds."
  },
  {
    id: "step-2",
    icon: CalendarCheck2,
    title: "Book with time and location",
    description: "Set your preferred schedule, add instructions, and create a request with full clarity."
  },
  {
    id: "step-3",
    icon: Handshake,
    title: "Get matched and complete",
    description: "Workers receive requests quickly, accept jobs, and your booking updates instantly."
  }
];

const testimonials = [
  {
    id: "testimonial-1",
    name: "Ritika Sharma",
    role: "Customer",
    service: "AC Repair",
    rating: 5,
    quote: "Booking was simple and the worker arrived on time. Status updates were clear at every step."
  },
  {
    id: "testimonial-2",
    name: "Ankit Verma",
    role: "Broker",
    service: "Worker Network Management",
    rating: 5,
    quote: "The broker dashboard gives me one place to track team activity, earnings, and service quality."
  },
  {
    id: "testimonial-3",
    name: "Sahil Khan",
    role: "Service Provider",
    service: "Electrical Services",
    rating: 4,
    quote: "I receive job requests quickly and can manage all my bookings without confusion."
  }
];

const faqs = [
  {
    id: "faq-1",
    question: "How fast can a worker receive a booking request?",
    answer:
      "Requests are delivered in real time to eligible workers. Once a worker accepts, the booking status updates immediately."
  },
  {
    id: "faq-2",
    question: "Can I cancel a booking after creating it?",
    answer:
      "Yes. Customers can cancel pending/confirmed bookings within the allowed cancellation window shown in the booking flow."
  },
  {
    id: "faq-3",
    question: "How are workers verified?",
    answer:
      "Workers are onboarded with profile information, service details, and performance tracking through ratings and completed jobs."
  },
  {
    id: "faq-4",
    question: "Do brokers get performance visibility?",
    answer:
      "Yes. Brokers can view linked workers, booking history, and commission insights from the broker dashboard."
  }
];

function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const roleCards = useMemo(
    () =>
      roleList.map((role) => ({
        id: role,
        ...roleMeta[role]
      })),
    []
  );

  useEffect(() => {
    const role = new URLSearchParams(location.search).get("role") || new URLSearchParams(window.location.search).get("role");
    if (role && roleList.includes(role)) {
      navigate(`/login?role=${role}`, { replace: true });
    }
  }, [location.search, navigate]);

  const closeMobileMenu = useCallback(() => {
    setShowMobileMenu(false);
  }, []);

  useEffect(() => {
    if (!showMobileMenu) {
      return;
    }

    const handlePointer = (event) => {
      const target = event.target;
      const clickedInsideNav = navRef.current?.contains(target);
      const clickedInsideMenu = mobileMenuRef.current?.contains(target);
      if (!clickedInsideNav && !clickedInsideMenu) {
        closeMobileMenu();
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };
    const handleScroll = () => closeMobileMenu();
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMobileMenu();
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [closeMobileMenu, showMobileMenu]);

  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname, location.search, closeMobileMenu]);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const GlobalStyles = () => (
    <style>
      {`
        @keyframes gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-gradient {
          background: linear-gradient(-45deg, #f5f7fa, #eef2f5, #f5f7fa, #eef2f5);
          background-size: 400% 400%;
          animation: gradient-animation 15s ease infinite;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(8px);
        }
      `}
    </style>
  );

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-gray-50 animated-gradient">
        <header className="bg-white/80 shadow-sm border-b backdrop-blur-md sticky top-0 z-50">
          <div ref={navRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-2">
                <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">Omni</h1>
              </div>
              <div className="hidden lg:flex items-center space-x-6 text-sm text-gray-600">
                <button type="button" onClick={() => scrollToSection("roles")} className="hover:text-gray-900">
                  Roles
                </button>
                <button type="button" onClick={() => scrollToSection("services")} className="hover:text-gray-900">
                  Services
                </button>
                <button type="button" onClick={() => scrollToSection("how-it-works")} className="hover:text-gray-900">
                  How it works
                </button>
                <button type="button" onClick={() => scrollToSection("faq")} className="hover:text-gray-900">
                  FAQ
                </button>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-sm text-gray-600">
                <a
                  href="tel:+911234567890"
                  className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Call support"
                  title="+91 123-456-7890"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href="mailto:support@omniservices.com"
                  className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Email support"
                  title="support@omniservices.com"
                >
                  <Mail className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => navigate("/signup?role=customer")}
                  className="rounded-lg bg-gray-900 text-white px-3 sm:px-4 py-2 font-semibold hover:bg-gray-800"
                >
                  Get Started
                </button>
                <button
                  type="button"
                  onClick={() => setShowMobileMenu((prev) => !prev)}
                  className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label="Open navigation menu"
                  aria-expanded={showMobileMenu}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showMobileMenu && (
              <div ref={mobileMenuRef} className="lg:hidden border-t border-gray-200 bg-white/95 py-3">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      scrollToSection("roles");
                      closeMobileMenu();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Roles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToSection("services");
                      closeMobileMenu();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Services
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToSection("how-it-works");
                      closeMobileMenu();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    How it works
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      scrollToSection("faq");
                      closeMobileMenu();
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    FAQ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate("/login?role=customer");
                      closeMobileMenu();
                    }}
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <section id="roles" className="py-20 px-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">Choose Your Role</h3>
            <p className="text-center text-gray-600 mb-12">Select your role and continue with the right dashboard experience.</p>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {roleCards.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.id}
                    className={`bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-8 hover:shadow-2xl ${role.hoverColor} transition-all duration-300 transform hover:-translate-y-2 flex flex-col`}
                  >
                    <div className={`w-16 h-16 bg-gradient-to-r ${role.color} rounded-xl flex items-center justify-center mb-6 self-start`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-4">{role.title}</h4>
                    <p className="text-gray-600 mb-6 flex-grow">{role.description}</p>
                    <ul className="space-y-3 mb-8">
                      {role.features.map((feature) => (
                        <li key={feature} className="flex items-center text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 mr-3" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/login?role=${role.id}`)}
                        className="rounded-lg border border-gray-300 py-2.5 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Login
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/signup?role=${role.id}`)}
                        className={`rounded-lg bg-gradient-to-r ${role.color} py-2.5 px-3 text-sm font-semibold text-white hover:opacity-90`}
                      >
                        Sign Up
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 mb-6">
              <BadgeCheck className="w-4 h-4" />
              Live in Dehradun. Expanding to more cities.
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Omni</span> Service Platform
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Connect with skilled professionals for all your service needs. Fast, reliable, and secure booking at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-6 sm:space-y-0 sm:space-x-12 mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">15K+</div>
                <div className="text-sm text-gray-500 mt-1">Active Professionals</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">75K+</div>
                <div className="text-sm text-gray-500 mt-1">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">2M+</div>
                <div className="text-sm text-gray-500 mt-1">Services Completed</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/signup?role=customer")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-white font-semibold hover:opacity-90"
              >
                Book a Service
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("how-it-works")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50"
              >
                See How It Works
              </button>
            </div>
          </div>
        </section>

        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="glass-card rounded-2xl border border-gray-200 px-6 py-5">
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                {trustPoints.map((point) => (
                  <div
                    key={point}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">Services We Offer</h3>
            <p className="text-center text-gray-600 mb-12">Professional services for every need, available now in Dehradun.</p>
            <div className="flex flex-wrap justify-center gap-4">
              {services.map((service) => (
                <div key={service} className="bg-white/90 backdrop-blur-sm rounded-full py-2 px-5 text-center shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
                  <div className="font-semibold text-gray-800">{service}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">How Omni Works</h3>
            <p className="text-center text-gray-600 mb-12">A simple flow designed for customers, workers, and brokers.</p>
            <div className="grid md:grid-cols-3 gap-8">
              {howItWorks.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="glass-card border border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-500">Step {index + 1}</span>
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h4>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-10 text-center">
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">24/7 Availability</h4>
                <p className="text-gray-600">Book services anytime, anywhere with our round-the-clock platform.</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Verified Professionals</h4>
                <p className="text-gray-600">All service providers are background-checked and highly rated.</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">Secure Payments</h4>
                <p className="text-gray-600">Safe and secure payment processing with multiple options.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">What Users Say</h3>
            <p className="text-center text-gray-600 mb-12">Real feedback from our growing Omni community.</p>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((item) => (
                <div key={item.id} className="glass-card border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={`${item.id}-star-${index}`}
                        className={`w-4 h-4 ${index < item.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-5">"{item.quote}"</p>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.role}</p>
                    <p className="text-sm text-blue-700 font-medium mt-1">{item.service}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 px-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">Frequently Asked Questions</h3>
            <p className="text-center text-gray-600 mb-10">Everything you need before getting started.</p>
            <div className="space-y-4">
              {faqs.map((item) => (
                <details key={item.id} className="group rounded-xl border border-gray-200 bg-white p-5">
                  <summary className="cursor-pointer list-none font-semibold text-gray-900 flex items-center justify-between gap-4">
                    {item.question}
                    <span className="text-2xl font-semibold leading-none text-gray-500 group-open:hidden">+</span>
                    <span className="text-2xl font-semibold leading-none text-gray-500 hidden group-open:inline">−</span>
                  </summary>
                  <p className="mt-3 text-gray-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 p-8 sm:p-10 text-white">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-3">Ready to get started with Omni?</h3>
                  <p className="text-blue-100">
                    Join as a customer, broker, or service provider and start using a faster and clearer booking workflow.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row md:justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/signup?role=customer")}
                    className="rounded-lg bg-white text-blue-700 px-5 py-3 font-semibold hover:bg-blue-50"
                  >
                    Create Customer Account
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/signup?role=worker")}
                    className="rounded-lg border border-blue-200 px-5 py-3 font-semibold text-white hover:bg-white/10"
                  >
                    Join as Worker
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="bg-gray-900 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center space-x-2 mb-4">
                  <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                  <h1 className="text-xl font-bold">Omni</h1>
                </div>
                <p className="text-gray-300 text-sm text-center md:text-left">
                  Your trusted platform for connecting with skilled professionals. Fast, reliable, and secure.
                </p>
                <div className="flex items-center space-x-1.5 text-gray-400 mt-4">
                  <MapPin className="w-4 h-4" />
                  <span>Serving across India</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <button type="button" onClick={() => scrollToSection("roles")} className="block hover:text-white">
                    Choose Role
                  </button>
                  <button type="button" onClick={() => scrollToSection("services")} className="block hover:text-white">
                    Services
                  </button>
                  <button type="button" onClick={() => scrollToSection("how-it-works")} className="block hover:text-white">
                    How It Works
                  </button>
                  <button type="button" onClick={() => scrollToSection("faq")} className="block hover:text-white">
                    FAQ
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-4">Support</h4>
                <div className="space-y-3 text-sm text-gray-300">
                  <p className="flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    24/7 customer support
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Avg. response under 10 mins
                  </p>
                  <p className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Secure payment workflows
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
              <p>&copy; 2026 Omni. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default LandingPage;
