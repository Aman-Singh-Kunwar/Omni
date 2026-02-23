const CUSTOMER_CANCEL_WINDOW_MS = 10 * 60 * 1000;
const CUSTOMER_CANCELLABLE_STATUSES = new Set(["pending", "confirmed", "upcoming"]);
const CUSTOMER_PAYMENT_ELIGIBLE_STATUSES = new Set(["pending", "confirmed", "upcoming", "in-progress"]);
const CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES = new Set(["pending", "confirmed", "upcoming", "in-progress"]);
const CUSTOMER_REVIEW_ELIGIBLE_STATUSES = new Set(["confirmed", "in-progress", "completed", "not-provided"]);
const ACTIVE_BOOKING_STATUSES = new Set(["pending", "in-progress", "confirmed", "upcoming"]);

const BROKER_COMMISSION_RATE_PERCENT = 5;

export {
  ACTIVE_BOOKING_STATUSES,
  BROKER_COMMISSION_RATE_PERCENT,
  CUSTOMER_CANCEL_WINDOW_MS,
  CUSTOMER_CANCELLABLE_STATUSES,
  CUSTOMER_NOT_PROVIDED_ELIGIBLE_STATUSES,
  CUSTOMER_PAYMENT_ELIGIBLE_STATUSES,
  CUSTOMER_REVIEW_ELIGIBLE_STATUSES
};
