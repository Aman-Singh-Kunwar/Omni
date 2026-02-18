import User from "../models/User.js";
import { PROFILE_PATH_BY_ROLE } from "../schemas/profile.js";

const COMMON_PROFILE_FIELDS = ["bio", "gender", "dateOfBirth", "phone"];

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return String(value || "").trim();
}

function getRoleProfile(user) {
  const path = PROFILE_PATH_BY_ROLE[user?.role];
  return path ? user[path] || {} : {};
}

function readCommonProfile(user) {
  const profile = getRoleProfile(user);
  return {
    bio: String(profile?.bio || "").trim(),
    gender: String(profile?.gender || "").trim(),
    dateOfBirth: profile?.dateOfBirth || null,
    phone: String(profile?.phone || "").trim()
  };
}

function hasValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

function applyCommonProfileToUser(user, commonProfile) {
  const path = PROFILE_PATH_BY_ROLE[user?.role];
  if (!path) {
    return false;
  }

  if (!user[path]) {
    user[path] = {};
  }

  let changed = false;
  COMMON_PROFILE_FIELDS.forEach((field) => {
    if (!Object.hasOwn(commonProfile, field)) {
      return;
    }
    const nextValue = commonProfile[field];
    const currentValue = user[path][field] ?? null;
    const currentComparable = currentValue instanceof Date ? currentValue.toISOString() : String(currentValue ?? "");
    const nextComparable = nextValue instanceof Date ? nextValue.toISOString() : String(nextValue ?? "");
    if (currentComparable !== nextComparable) {
      user[path][field] = nextValue;
      changed = true;
    }
  });

  return changed;
}

function buildCanonicalCommonProfile(users = []) {
  const sorted = [...users].sort((a, b) => {
    const aTs = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTs = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTs - aTs;
  });

  const commonProfile = {
    bio: "",
    gender: "",
    dateOfBirth: null,
    phone: ""
  };

  for (const field of COMMON_PROFILE_FIELDS) {
    for (const user of sorted) {
      const value = readCommonProfile(user)[field];
      if (hasValue(value)) {
        commonProfile[field] = value;
        break;
      }
    }
  }

  return commonProfile;
}

async function syncUserFamilyByEmail(sourceUser, options = {}) {
  if (!sourceUser) {
    return { updated: 0, matched: 0 };
  }

  const sourceEmail = normalizeEmail(sourceUser.email);
  const oldEmail = normalizeEmail(options.oldEmail);
  const emails = [...new Set([sourceEmail, oldEmail].filter(Boolean))];
  if (!emails.length) {
    return { updated: 0, matched: 0 };
  }

  const family = await User.find({ email: { $in: emails } });
  if (!family.length) {
    return { updated: 0, matched: 0 };
  }

  const sourceLike = family.find((item) => String(item._id) === String(sourceUser._id)) || sourceUser;
  const nextName = normalizeName(sourceLike.name);
  const nextEmail = sourceEmail || normalizeEmail(sourceLike.email);
  const nextPasswordHash = sourceLike.passwordHash;
  const commonProfile = readCommonProfile(sourceLike);

  let updated = 0;
  for (const member of family) {
    let changed = false;

    if (nextName && member.name !== nextName) {
      member.name = nextName;
      changed = true;
    }
    if (nextEmail && normalizeEmail(member.email) !== nextEmail) {
      member.email = nextEmail;
      changed = true;
    }
    if (nextPasswordHash && member.passwordHash !== nextPasswordHash) {
      member.passwordHash = nextPasswordHash;
      changed = true;
    }
    if (applyCommonProfileToUser(member, commonProfile)) {
      changed = true;
    }

    if (changed) {
      await member.save();
      updated += 1;
    }
  }

  return { updated, matched: family.length };
}

async function syncAllUserFamilies() {
  const users = await User.find({}).sort({ updatedAt: -1, createdAt: -1 });
  const groups = new Map();

  users.forEach((user) => {
    const email = normalizeEmail(user.email);
    if (!email) {
      return;
    }
    if (!groups.has(email)) {
      groups.set(email, []);
    }
    groups.get(email).push(user);
  });

  let updatedUsers = 0;
  let familyCount = 0;
  for (const [email, family] of groups.entries()) {
    if (family.length < 2) {
      continue;
    }
    familyCount += 1;
    const canonical = family[0];
    const canonicalName = normalizeName(canonical.name);
    const canonicalPasswordHash = canonical.passwordHash;
    const canonicalCommonProfile = buildCanonicalCommonProfile(family);

    for (const member of family) {
      let changed = false;
      if (canonicalName && member.name !== canonicalName) {
        member.name = canonicalName;
        changed = true;
      }
      if (normalizeEmail(member.email) !== email) {
        member.email = email;
        changed = true;
      }
      if (canonicalPasswordHash && member.passwordHash !== canonicalPasswordHash) {
        member.passwordHash = canonicalPasswordHash;
        changed = true;
      }
      if (applyCommonProfileToUser(member, canonicalCommonProfile)) {
        changed = true;
      }
      if (changed) {
        await member.save();
        updatedUsers += 1;
      }
    }
  }

  return { familyCount, updatedUsers };
}

export { normalizeEmail, syncUserFamilyByEmail, syncAllUserFamilies };
