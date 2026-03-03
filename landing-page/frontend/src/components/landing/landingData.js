import { CalendarCheck2, Handshake, Users } from "lucide-react";

export const services = [
    "Plumber", "Electrician", "Carpenter", "Painter", "AC Repair",
    "Cleaning", "Gardening", "Appliance Repair", "Pest Control", "Home Security"
];

export const trustPoints = [
    "Same-day bookings", "Verified professionals", "Transparent pricing", "Live booking updates"
];

export const howItWorks = [
    {
        id: "step-1", icon: Users,
        title: "Choose role and service",
        description: "Select customer, broker, or worker flow and pick the exact service you need in seconds."
    },
    {
        id: "step-2", icon: CalendarCheck2,
        title: "Book with time and location",
        description: "Set your preferred schedule, add instructions, and create a request with full clarity."
    },
    {
        id: "step-3", icon: Handshake,
        title: "Get matched and complete",
        description: "Workers receive requests quickly, accept jobs, and your booking updates instantly."
    }
];

export const testimonials = [
    {
        id: "testimonial-1", name: "Ritika Sharma", role: "Customer", service: "AC Repair",
        rating: 5, quote: "Booking was simple and the worker arrived on time. Status updates were clear at every step."
    },
    {
        id: "testimonial-2", name: "Ankit Verma", role: "Broker", service: "Worker Network Management",
        rating: 5, quote: "The broker dashboard gives me one place to track team activity, earnings, and service quality."
    },
    {
        id: "testimonial-3", name: "Sahil Khan", role: "Service Provider", service: "Electrical Services",
        rating: 4, quote: "I receive job requests quickly and can manage all my bookings without confusion."
    }
];

export const faqs = [
    {
        id: "faq-1",
        question: "How fast can a worker receive a booking request?",
        answer: "Requests are delivered in real time to eligible workers. Once a worker accepts, the booking status updates immediately."
    },
    {
        id: "faq-2",
        question: "Can I cancel a booking after creating it?",
        answer: "Yes. Customers can cancel pending/confirmed bookings within the allowed cancellation window shown in the booking flow."
    },
    {
        id: "faq-3",
        question: "How are workers verified?",
        answer: "Workers are onboarded with profile information, service details, and performance tracking through ratings and completed jobs."
    },
    {
        id: "faq-4",
        question: "Do brokers get performance visibility?",
        answer: "Yes. Brokers can view linked workers, booking history, and commission insights from the broker dashboard."
    }
];
