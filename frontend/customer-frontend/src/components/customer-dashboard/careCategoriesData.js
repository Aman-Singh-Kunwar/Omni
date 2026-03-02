function createService({
  title,
  description,
  image,
  gallery = [],
  includes = [],
  duration,
  process = [],
  tools = [],
  idealFor,
  safetyStandards
}) {
  return {
    title,
    description,
    image,
    gallery: gallery.length ? gallery : [image],
    includes,
    duration,
    process,
    tools,
    idealFor,
    safetyStandards
  };
}

const careCategories = [
  {
    slug: "home-care",
    title: "Home Care",
    heroImage:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1800&q=80",
    cardImage:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
    tagline: "Everything at home, quietly taken care of.",
    cardTagline: "Quiet maintenance for peaceful living.",
    backgroundClass: "bg-stone-100",
    heroOverlayClass: "from-black/55 via-black/35 to-black/15",
    heroTextClass: "text-white",
    services: [
      createService({
        title: "House Cleaning",
        description: "Fresh, thoughtful upkeep that keeps every room at ease.",
        image:
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: [
          "Living area dusting and surface refresh",
          "Kitchen and bathroom sanitation",
          "Floor vacuuming and mopping"
        ],
        duration: "2 to 3 hours",
        idealFor: "Weekly upkeep for busy homes and families",
        process: [
          "Walkthrough and preference alignment",
          "Room-by-room deep tidy execution",
          "Final quality check before handover"
        ],
        tools: ["Microfiber kits", "Vacuum system", "Eco-safe cleaners"],
        safetyStandards: "Non-toxic products and checklist-based hygiene protocol."
      }),
      createService({
        title: "Carpentry Care",
        description: "Precision fixes and fittings that feel seamlessly done.",
        image:
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: [
          "Minor door and hinge alignments",
          "Cabinet and shelf adjustments",
          "Fixture tightening and refinements"
        ],
        duration: "1.5 to 3 hours",
        idealFor: "Homes needing preventive maintenance and small fixes",
        process: [
          "Issue diagnosis and measurement",
          "Repair and fitting with clean finish",
          "Post-service stability and alignment check"
        ],
        tools: ["Precision drill set", "Wood-safe adhesives", "Leveling tools"],
        safetyStandards: "Dust-managed work zone and secure tool handling protocol."
      }),
      createService({
        title: "Plumbing Support",
        description: "Quiet problem-solving for smooth everyday routines.",
        image:
          "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1574359411659-15573f9d8f7a?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1607416759759-31ec2f8fcd84?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: [
          "Leak inspection and minor repair",
          "Faucet and sink flow correction",
          "Drain maintenance and cleanup"
        ],
        duration: "1 to 2.5 hours",
        idealFor: "Households dealing with recurring leak or flow issues",
        process: [
          "Root cause detection",
          "Component repair or replacement",
          "Pressure and leakage validation"
        ],
        tools: ["Pressure gauge", "Sealant kit", "Pipe fitting tools"],
        safetyStandards: "Clean water-safe materials and strict leak-test protocol."
      })
    ]
  },
  {
    slug: "electrical-repairs",
    title: "Electrical & Repairs",
    heroImage:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=2000&q=80",
    cardImage:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1600&q=80",
    tagline: "Reliable repairs for a home that simply works.",
    cardTagline: "Reliable fixes, without the hassle.",
    backgroundClass: "bg-slate-100",
    heroOverlayClass: "from-black/50 via-black/28 to-black/12",
    heroTextClass: "text-white",
    services: [
      createService({
        title: "Electrical Care",
        description: "Safe, clean electrical work with complete peace of mind.",
        image:
          "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1555963966-b7ae5404b6ed?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: [
          "Switchboard and wiring checks",
          "Socket replacement and alignment",
          "Load safety testing"
        ],
        duration: "1 to 2 hours",
        idealFor: "Homes needing routine electrical reliability checks",
        process: [
          "Electrical load assessment",
          "Repair or replacement of components",
          "Safety verification and closure"
        ],
        tools: ["Multimeter", "Insulated toolkit", "Circuit tester"],
        safetyStandards: "Isolated work protocol with insulated equipment usage."
      }),
      createService({
        title: "AC Maintenance",
        description: "Comfort-first climate care for every season at home.",
        image:
          "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1621905252472-e8f6762f91be?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Filter deep clean", "Airflow optimization", "Cooling performance check"],
        duration: "60 to 90 minutes",
        idealFor: "Seasonal servicing and cooling efficiency care",
        process: [
          "System inspection and diagnostics",
          "Cleaning and component tune-up",
          "Final cooling performance validation"
        ],
        tools: ["Fin comb", "Pressure meter", "Coil-safe cleaners"],
        safetyStandards: "Leak-safe handling and equipment-checked servicing process."
      }),
      createService({
        title: "General Repairs",
        description: "Skilled fixes for the small things that matter daily.",
        image:
          "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1581147036324-c1c2f13aa62c?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Minor home fixture repairs", "Mounting and fitting support", "Functionality checks"],
        duration: "1 to 2.5 hours",
        idealFor: "Small unresolved issues across everyday home spaces",
        process: [
          "Problem walkthrough and prioritization",
          "Repair and secure reinstallation",
          "Cleanup and function testing"
        ],
        tools: ["Multi-bit drill", "Fastening kit", "Precision hand tools"],
        safetyStandards: "Work-area protection and secure fixture testing before handover."
      })
    ]
  },
  {
    slug: "personal-grooming",
    title: "Personal Grooming",
    heroImage:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=2000&q=80",
    cardImage:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=80",
    tagline: "Calm, at-home care designed around your time.",
    cardTagline: "Care that comes to you.",
    backgroundClass: "bg-neutral-100",
    heroOverlayClass: "from-black/45 via-black/25 to-black/8",
    heroTextClass: "text-white",
    services: [
      createService({
        title: "At-Home Hair Styling",
        description: "Refined grooming sessions with comfort and privacy.",
        image:
          "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Personal consultation", "Styling and finishing", "Aftercare guidance"],
        duration: "75 to 120 minutes",
        idealFor: "Professionals and families preferring in-home grooming comfort",
        process: ["Consultation and look planning", "Careful styling session", "Final finish and tidy wrap-up"],
        tools: ["Salon-grade styling kit", "Sanitized comb set", "Heat protection products"],
        safetyStandards: "Tool sterilization and skin-safe product protocol for each visit."
      }),
      createService({
        title: "Skin & Glow Rituals",
        description: "Gentle routines that leave you refreshed and restored.",
        image:
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Skin analysis and prep", "Hydration-focused facial", "Post-session care notes"],
        duration: "60 to 90 minutes",
        idealFor: "Monthly skin renewal and stress-release care",
        process: ["Preparation and cleanse", "Targeted treatment application", "Hydration lock and guidance"],
        tools: ["Professional-grade applicators", "Clean towels", "Dermatology-safe products"],
        safetyStandards: "Single-use disposables and patch-safe product handling protocol."
      }),
      createService({
        title: "Wellness Grooming",
        description: "Personal care that fits your day without disruption.",
        image:
          "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1595475884562-073c30d45670?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Routine grooming essentials", "Comfort-led service flow", "Personal preference memory"],
        duration: "45 to 75 minutes",
        idealFor: "Regular at-home grooming with consistent quality",
        process: ["Quick profile and setup", "Core grooming service", "Polish and cleanup"],
        tools: ["Sanitized grooming set", "Skin-safe prep products", "Soft finishing kit"],
        safetyStandards: "Fresh kit prep and strict hygiene protocol before every session."
      })
    ]
  },
  {
    slug: "vehicle-care",
    title: "Vehicle Care",
    heroImage:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2000&q=80",
    cardImage:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
    tagline: "Polished, dependable vehicle care that keeps life moving.",
    cardTagline: "Keep moving, effortlessly.",
    backgroundClass: "bg-zinc-100",
    heroOverlayClass: "from-black/60 via-black/40 to-black/22",
    heroTextClass: "text-white",
    services: [
      createService({
        title: "Premium Car Wash",
        description: "A clean, polished finish with careful detailing standards.",
        image:
          "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Foam pre-wash", "Exterior hand wash", "Polish finish and dry"],
        duration: "45 to 75 minutes",
        idealFor: "City vehicles needing frequent appearance upkeep",
        process: ["Pre-rinse and debris release", "Hand wash and spot detailing", "Finish protection application"],
        tools: ["pH-neutral foam", "Microfiber wash kit", "Water-spot-free drying cloths"],
        safetyStandards: "Paint-safe products with scratch-minimizing application methods."
      }),
      createService({
        title: "Interior Detailing",
        description: "Thoughtful interior refresh for a refined driving space.",
        image:
          "https://images.unsplash.com/photo-1520340356584-8f18ff40a9d4?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1520340356584-8f18ff40a9d4?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Dashboard and console care", "Seat and mat deep clean", "Odor-neutral finish"],
        duration: "90 to 120 minutes",
        idealFor: "Families and daily commuters wanting a refined cabin",
        process: ["Interior inspection", "Targeted cleaning by zone", "Final detailing and scent-neutral close"],
        tools: ["Interior-safe cleaners", "Compact vacuum system", "Fabric-safe brushes"],
        safetyStandards: "Residue-free products and allergen-conscious cleaning workflow."
      }),
      createService({
        title: "Routine Car Care",
        description: "Consistent support that keeps your vehicle road-ready.",
        image:
          "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Fluids and pressure review", "Quick safety scan", "Service reminders and notes"],
        duration: "45 to 60 minutes",
        idealFor: "Preventive maintenance between major service cycles",
        process: ["Multi-point vehicle check", "Minor tune and top-ups", "Performance summary and next-step guidance"],
        tools: ["Pressure tools", "Inspection lights", "OEM-compatible care products"],
        safetyStandards: "Checklist-driven inspection with quality assurance before completion."
      })
    ]
  }
];

export { careCategories };
