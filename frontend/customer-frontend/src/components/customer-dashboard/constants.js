import { Car, Droplets, Home, Paintbrush, Scissors, Wind, Wrench, Zap } from "lucide-react";

const SERVICE_PRICE_MIN = 250;
const SERVICE_PRICE_MAX = 2500;
const SERVICE_PRICE_STEP = 50;

const BASE_SERVICES = [
  { id: 1, name: "Plumber", icon: Droplets, color: "bg-blue-500", rating: 4.8 },
  { id: 2, name: "Electrician", icon: Zap, color: "bg-yellow-500", rating: 4.9 },
  { id: 3, name: "Carpenter", icon: Wrench, color: "bg-orange-500", rating: 4.7 },
  { id: 4, name: "Painter", icon: Paintbrush, color: "bg-green-500", rating: 4.6 },
  { id: 5, name: "AC Repair", icon: Wind, color: "bg-cyan-500", rating: 4.8 },
  { id: 6, name: "House Cleaning", icon: Home, color: "bg-purple-500", rating: 4.9 },
  { id: 7, name: "Hair Stylist", icon: Scissors, color: "bg-pink-500", rating: 4.7 },
  { id: 8, name: "Car Service", icon: Car, color: "bg-gray-600", rating: 4.5 }
];

const defaultLandingUrl = import.meta.env.PROD ? "https://omni-landing-page.onrender.com" : "http://localhost:5173";
const landingUrl = import.meta.env.VITE_LANDING_APP_URL || defaultLandingUrl;

export { BASE_SERVICES, SERVICE_PRICE_MAX, SERVICE_PRICE_MIN, SERVICE_PRICE_STEP, landingUrl };
