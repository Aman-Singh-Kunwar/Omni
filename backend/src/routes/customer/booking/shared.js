import Booking from "../../../models/Booking.js";
import { isLikelyObjectId } from "../../helpers.js";

function ensureCustomerRole(req, res, actionDescription) {
  if (req.authUser.role === "customer") {
    return true;
  }

  res.status(403).json({ message: `Only customers can ${actionDescription}.` });
  return false;
}

function validateBookingId(bookingId, res) {
  if (isLikelyObjectId(bookingId)) {
    return true;
  }

  res.status(400).json({ message: "Invalid booking id." });
  return false;
}

async function findCustomerBooking(authUser, bookingId, options = {}) {
  const includeHidden = options.includeHidden === true;

  return Booking.findOne({
    _id: bookingId,
    $or: [{ customerId: authUser._id }, { customerName: authUser.name }],
    ...(includeHidden ? {} : { hiddenForCustomer: { $ne: true } })
  });
}

export { ensureCustomerRole, findCustomerBooking, validateBookingId };
