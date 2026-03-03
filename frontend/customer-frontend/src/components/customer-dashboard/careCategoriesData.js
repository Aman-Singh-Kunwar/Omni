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
  safetyStandards,
  addOns = []
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
    safetyStandards,
    addOns
  };
}

const careCategories = [
  {
    slug: "home-care",
    title: "Home Care",
    heroImage:
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1800&q=80",
    heroImagePosition: "center 85%",
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
        safetyStandards: "Non-toxic products and checklist-based hygiene protocol.",
        addOns: [
          { title: "Premium Microfiber Cloth Set", price: 299, image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80" },
          { title: "Eco-Friendly All-Purpose Cleaner", price: 249, image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80" }
        ]
      }),
      createService({
        title: "Carpentry Care",
        description: "Precision fixes and fittings that feel seamlessly done.",
        image:
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1600&q=80"
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
        safetyStandards: "Dust-managed work zone and secure tool handling protocol.",
        addOns: [
          { title: "Wood Polish & Care Kit", price: 499, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRmPyPRqbGpJiWQQNWLc6NWSTtdqzQ6PPQfxg&s" },
          { title: "Furniture Touch-Up Markers", price: 349, image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80" }
        ]
      }),
      createService({
        title: "Plumbing Support",
        description: "Quiet problem-solving for smooth everyday routines.",
        image:
          "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1600&q=80",
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRK4p-UKxdcA_5DOb2sZN_AL2GnK4Q7pjoPhQ&s"
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
        safetyStandards: "Clean water-safe materials and strict leak-test protocol.",
        addOns: [
          { title: "Drain Maintenance Tablets", price: 299, image: "https://m.media-amazon.com/images/I/815jRf6r3uL.jpg" },
          { title: "Pipe Sealant Kit", price: 399, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSVwecsHUVC6WzzOG5hOJH75CHOF6SQkmiTQA&s" }
        ]
      }),
      createService({
        title: "Electrical Care",
        description: "Safe, clean electrical work with complete peace of mind.",
        image:
          "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1555963966-b7ae5404b6ed?auto=format&fit=crop&w=1600&q=80"
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
        safetyStandards: "Isolated work protocol with insulated equipment usage.",
        addOns: [
          { title: "LED Bulb Pack (6-pack)", price: 449, image: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80" },
          { title: "Outlet Safety Covers (10-pack)", price: 199, image: "https://images.squarespace-cdn.com/content/v1/5e6a76f253bbf959f9098618/1586457056844-RGDS7ZY1GCFCBF7D8H7B/Qdos-Safety-babyproofing-StayPut-Double-Outlet-Plugs-%281%29.jpg?format=1000w" }
        ]
      }),
      createService({
        title: "AC Maintenance",
        description: "Comfort-first climate care for every season at home.",
        image:
          "https://www.hhaircon.com.au/wp-content/uploads/2022/03/is-yearly-ac-maintenance-worth-it.jpg",
        gallery: [
          "https://www.hhaircon.com.au/wp-content/uploads/2022/03/is-yearly-ac-maintenance-worth-it.jpg",
          "https://www.expertaircon.com/images/resource/services/s15.jpg"
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
        safetyStandards: "Leak-safe handling and equipment-checked servicing process.",
        addOns: [
          { title: "Coil Cleaner Spray", price: 399, image: "https://m.media-amazon.com/images/I/61kkzYlxoKL.jpg?auto=format&fit=crop&w=800&q=80" },
          { title: "Air Freshener Strips (6-pack)", price: 199, image: "https://sc04.alicdn.com/kf/He37063de0f004ac2b7608e09659f5323N.jpg" }
        ]
      }),
      createService({
        title: "Car Service",
        description: "Road-ready vehicle care with doorstep convenience.",
        image:
          "https://autocarrepair.in/blog/wp-content/uploads/2024/06/mechanic-working-on-engine.jpg?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://autocarrepair.in/blog/wp-content/uploads/2024/06/mechanic-working-on-engine.jpg?auto=format&fit=crop&w=1600&q=80",
          "https://www.gaadizo.com/gaadizo-car-service-repairs/assets/media/components/b-main-slider/dent%20repairs.jpg?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Basic inspection and fluid top-up", "Battery and tire health check", "Preventive maintenance guidance"],
        duration: "60 to 120 minutes",
        idealFor: "Routine doorstep maintenance for daily-use cars",
        process: [
          "Vehicle condition and safety check",
          "Core tune-up and care routine",
          "Performance summary with next-service tips"
        ],
        tools: ["Diagnostic scanner", "OEM-safe fluids", "Pressure and battery test tools"],
        safetyStandards: "Checklist-based service flow with safe handling for all moving components.",
        addOns: [
          { title: "Premium Car Shampoo", price: 399, image: "https://selzer.in/cdn/shop/products/WhatsAppImage2022-11-24at16.51.23_1_1200x1200.jpg?auto=format&fit=crop&w=800&q=80" },
          { title: "Air Freshener Pack (3-pack)", price: 249, image: "https://cycle.in/cdn/shop/files/Lia-Car-Air-Freshener-Gel-Citric-Tango_LS.jpg?auto=format&fit=crop&w=800&q=80" }
        ]
      })
    ]
  },
  {
    slug: "personal-grooming",
    title: "Personal Grooming",
    heroImage:
      "https://png.pngtree.com/background/20250111/original/pngtree-organic-spa-beauty-products-displayed-on-a-textured-gray-table-picture-image_13371766.jpg",
    heroImagePosition: "center 75%",
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
          "https://indianschoolofimage.com/wp-content/uploads/2025/03/Mens-grooming.jpg?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://indianschoolofimage.com/wp-content/uploads/2025/03/Mens-grooming.jpg?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1600&q=80",
          "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80"
        ],
        includes: ["Personal consultation", "Styling and finishing", "Aftercare guidance"],
        duration: "75 to 120 minutes",
        idealFor: "Professionals and families preferring in-home grooming comfort",
        process: ["Consultation and look planning", "Careful styling session", "Final finish and tidy wrap-up"],
        tools: ["Salon-grade styling kit", "Sanitized comb set", "Heat protection products"],
        safetyStandards: "Tool sterilization and skin-safe product protocol for each visit.",
        addOns: [
          { title: "Hair Care Product Set", price: 899, image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=800&q=80" },
          { title: "Professional Comb Kit", price: 499, image: "https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=800&q=80" }
        ]
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
        safetyStandards: "Single-use disposables and patch-safe product handling protocol.",
        addOns: [
          { title: "Moisturizing Face Mask Pack (3-pack)", price: 599, image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=800&q=80" },
          { title: "Hydrating Serum Set", price: 999, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80" }
        ]
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
        safetyStandards: "Paint-safe products with scratch-minimizing application methods.",
        addOns: [
          { title: "Car Wax & Polish Kit", price: 699, image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80" },
          { title: "Tire Shine Spray", price: 349, image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80" },
          { title: "Microfiber Drying Towels (3-pack)", price: 499, image: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80" },
          { title: "Glass Rain Repellent", price: 549, image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80" }
        ]
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
        safetyStandards: "Residue-free products and allergen-conscious cleaning workflow.",
        addOns: [
          { title: "Leather Conditioner", price: 549, image: "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=800&q=80" },
          { title: "Fabric Stain Remover", price: 449, image: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80" },
          { title: "Dashboard Protectant", price: 399, image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80" },
          { title: "Car Vacuum Handheld", price: 1299, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80" }
        ]
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
        safetyStandards: "Checklist-driven inspection with quality assurance before completion.",
        addOns: [
          { title: "Engine Oil Additive", price: 499, image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80" },
          { title: "Windshield Washer Fluid", price: 199, image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80" },
          { title: "Multi-Purpose Lubricant", price: 299, image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80" },
          { title: "Emergency Car Kit", price: 799, image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=800&q=80" }
        ]
      })
    ]
  }
];

export { careCategories };
