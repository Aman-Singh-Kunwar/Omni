import jwt from "jsonwebtoken";
import User from "../../models/User.js";
import { toProfileDto } from "../../schemas/profile.js";
import { ensureBrokerCodeForUser } from "./broker.js";

const JWT_SECRET = process.env.JWT_SECRET || "omni-dev-secret";
const JWT_EXPIRES_IN = "7d";

function toAuthUser(user) {
  const { profile } = toProfileDto(user);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    profile
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractBearerToken(req) {
  const value = req.headers.authorization || "";
  const [type, token] = value.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    return "";
  }
  return token;
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Missing auth token." });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (_error) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }
    await ensureBrokerCodeForUser(user);

    req.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function readAuthUserFromRequest(req) {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      return null;
    }
    await ensureBrokerCodeForUser(user);
    return user || null;
  } catch (_error) {
    return null;
  }
}

export { extractBearerToken, readAuthUserFromRequest, requireAuth, signToken, toAuthUser, verifyToken };
