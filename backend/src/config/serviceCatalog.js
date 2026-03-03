const SERVICE_CATALOG = Object.freeze([
  { name: "Plumber", category: "Home Care", basePrice: 550, rating: 4.8 },
  { name: "Electrician", category: "Home Care", basePrice: 500, rating: 4.9 },
  { name: "Carpenter", category: "Home Care", basePrice: 600, rating: 4.7 },
  { name: "Painter", category: "Home Care", basePrice: 650, rating: 4.6 },
  { name: "AC Repair", category: "Home Care", basePrice: 700, rating: 4.8 },
  { name: "House Cleaning", category: "Home Care", basePrice: 450, rating: 4.9 },
  { name: "Hair Stylist", category: "Personal Grooming", basePrice: 800, rating: 4.7 },
  { name: "Car Service", category: "Home Care", basePrice: 900, rating: 4.5 }
]);

const SERVICE_ALIAS_PAIRS = [
  ["Plumber", "Plumber"],
  ["Plumbing Support", "Plumber"],
  ["Electrician", "Electrician"],
  ["Electrical Care", "Electrician"],
  ["Carpenter", "Carpenter"],
  ["Carpentry Care", "Carpenter"],
  ["General Repairs", "Carpenter"],
  ["Painter", "Painter"],
  ["AC Repair", "AC Repair"],
  ["AC Maintenance", "AC Repair"],
  ["House Cleaning", "House Cleaning"],
  ["Hair Stylist", "Hair Stylist"],
  ["At-Home Hair Styling", "Hair Stylist"],
  ["Skin & Glow Rituals", "Hair Stylist"],
  ["Wellness Grooming", "Hair Stylist"],
  ["Car Service", "Car Service"],
  ["Premium Car Wash", "Car Service"],
  ["Interior Detailing", "Car Service"],
  ["Routine Car Care", "Car Service"]
];

const SERVICE_NAMES = Object.freeze(SERVICE_CATALOG.map((service) => service.name));

const SERVICE_NAME_BY_ALIAS = (() => {
  const aliasMap = new Map();
  SERVICE_ALIAS_PAIRS.forEach(([alias, canonicalName]) => {
    aliasMap.set(String(alias).trim().toLowerCase(), canonicalName);
  });
  SERVICE_NAMES.forEach((serviceName) => {
    aliasMap.set(serviceName.trim().toLowerCase(), serviceName);
  });
  return aliasMap;
})();

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function normalizeServiceName(value) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }
  return SERVICE_NAME_BY_ALIAS.get(normalized.toLowerCase()) || "";
}

function normalizeServices(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const normalizedServices = [];

  values.forEach((value) => {
    const serviceName = normalizeServiceName(value);
    if (!serviceName) {
      return;
    }
    const serviceKey = serviceName.toLowerCase();
    if (seen.has(serviceKey)) {
      return;
    }
    seen.add(serviceKey);
    normalizedServices.push(serviceName);
  });

  return normalizedServices;
}

function isSupportedServiceName(value) {
  return Boolean(normalizeServiceName(value));
}

export { SERVICE_CATALOG, SERVICE_NAMES, isSupportedServiceName, normalizeServiceName, normalizeServices };
