import { Briefcase, User, Wrench } from "lucide-react";

export const roleList = ["customer", "broker", "worker"];

export const roleMeta = {
  customer: {
    title: "Customer",
    icon: User,
    color: "from-blue-500 to-blue-600",
    hoverColor: "hover:shadow-blue-300/40",
    description: "Find trusted professionals for your home and business needs.",
    features: ["Browse Services", "Book Appointments", "Track Progress", "Rate & Review"]
  },
  broker: {
    title: "Broker",
    icon: Briefcase,
    color: "from-green-500 to-green-600",
    hoverColor: "hover:shadow-green-300/40",
    description: "Manage workers, jobs, and customer relationships.",
    features: ["Manage Workforce", "Track Commissions", "Handle Escalations", "Grow Network"]
  },
  worker: {
    title: "Service Provider",
    icon: Wrench,
    color: "from-purple-500 to-purple-600",
    hoverColor: "hover:shadow-purple-300/40",
    description: "Offer your professional services and grow your business.",
    features: ["List Services", "Manage Bookings", "Receive Payments", "Build Reputation"]
  }
};
