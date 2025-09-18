export const APP_NAME = 'Omni';
export const APP_DESCRIPTION = 'Home Services Marketplace';
export const USER_TYPES = {
  CUSTOMER: 'customer',
  BROKER: 'broker',
  WORKER: 'worker'
};

export const SERVICE_CATEGORIES = [
  { id: 1, name: 'Plumber', icon: 'Droplets' },
  { id: 2, name: 'Electrician', icon: 'Zap' },
  { id: 3, name: 'Carpenter', icon: 'Wrench' },
  { id: 4, name: 'Painter', icon: 'Paintbrush' },
  // Add more services
];

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};