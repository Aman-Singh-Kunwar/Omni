/**
 * Service data factory function
 * Used to create consistent service objects across categories
 */

export function createService({
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

/**
 * Helper to add service to category
 */
export function createCategory(baseCategory, services) {
  return {
    ...baseCategory,
    services
  };
}

export default { createService, createCategory };
