import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import omniLogo from "../assets/images/omni-logo.png";
import { Check, Clock, Mail, MapPin, Phone, Shield, Star } from "lucide-react";
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

function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const roleCards = useMemo(
    () =>
      roleList.map((role) => ({
        id: role,
        ...roleMeta[role]
      })),
    []
  );

  useEffect(() => {
    const role = new URLSearchParams(location.search).get("role");
    if (role && roleList.includes(role)) {
      navigate(`/login?role=${role}`, { replace: true });
    }
  }, [location.search, navigate]);

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
      `}
    </style>
  );

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen bg-gray-50 animated-gradient">
        <header className="bg-white/80 shadow-sm border-b backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-2">
                <img src={omniLogo} alt="Omni Logo" className="h-8 w-8 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">Omni</h1>
              </div>
              <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1.5">
                  <Phone className="w-4 h-4" />
                  <span>+91 123-456-7890</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Mail className="w-4 h-4" />
                  <span>support@omniservices.com</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="py-20 sm:py-24 px-4">
          <div className="max-w-7xl mx-auto text-center">
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
          </div>
        </section>

        <section className="py-20 px-4 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-3xl font-bold text-center text-gray-900 mb-4">Choose Your Role</h3>
            <p className="text-center text-gray-600 mb-12">Login or signup with proper page URLs, then continue to your dashboard.</p>
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

        <section className="py-20 px-4">
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

        <footer className="bg-gray-900 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
