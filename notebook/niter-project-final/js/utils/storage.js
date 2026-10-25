import { supabaseClient } from "../config/supabase.js";
import { currentUser, currentProfile } from "../modules/auth.js";

const SHORTCUTS_KEY = "notebook_shortcuts_visible";
const SHARES_KEY = "notebook_shares";
const SAVED_POSTS_PREFIX = "notebook_saved_posts_";

const memoryStorage = {};

export function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return memoryStorage[key] || null;
  }
}

export function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    memoryStorage[key] = value;
  }
}

export function getShortcutsVisibility() {
  const saved = safeStorageGet(SHORTCUTS_KEY);
  return saved !== null ? saved === "true" : true;
}

export function setShortcutsVisibility(visible) {
  safeStorageSet(SHORTCUTS_KEY, visible);
}

export function getLocalShares() {
  const raw = safeStorageGet(SHARES_KEY);
  try {
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setLocalShares(sharesObj) {
  safeStorageSet(SHARES_KEY, JSON.stringify(sharesObj));
}

export function getSavedPostIds(userId) {
  if (!userId) return [];
  const key = `${SAVED_POSTS_PREFIX}${userId}`;
  let localList = [];
  try {
    const raw = safeStorageGet(key);
    if (raw) localList = JSON.parse(raw);
  } catch (e) {
    localList = [];
  }

  // If currentUser is logged in and has user_metadata.saved_posts from database, merge with local
  if (
    currentUser &&
    currentUser.id === userId &&
    currentUser.user_metadata?.saved_posts
  ) {
    const dbList = currentUser.user_metadata.saved_posts;
    if (Array.isArray(dbList)) {
      const merged = Array.from(new Set([...dbList, ...localList]));
      safeStorageSet(key, JSON.stringify(merged));
      return merged;
    }
  }

  return localList;
}

export function isPostSaved(postId, userId) {
  if (!userId || !postId) return false;
  const savedIds = getSavedPostIds(userId);
  return savedIds.includes(String(postId));
}

export async function toggleSavePost(postId, userId) {
  if (!userId || !postId) return false;
  const key = `${SAVED_POSTS_PREFIX}${userId}`;
  let savedIds = getSavedPostIds(userId);
  const strId = String(postId);
  let isSavedNow = false;

  if (savedIds.includes(strId)) {
    savedIds = savedIds.filter((id) => id !== strId);
    isSavedNow = false;
  } else {
    savedIds.push(strId);
    isSavedNow = true;
  }

  safeStorageSet(key, JSON.stringify(savedIds));

  // Sync to database user metadata in Supabase
  if (supabaseClient && currentUser && currentUser.id === userId) {
    try {
      if (!currentUser.user_metadata) currentUser.user_metadata = {};
      currentUser.user_metadata.saved_posts = savedIds;

      await supabaseClient.auth.updateUser({
        data: { saved_posts: savedIds },
      });
    } catch (err) {
      console.warn("Error syncing saved posts to Supabase database:", err);
    }
  }

  return isSavedNow;
}

const PRIVACY_KEY_PREFIX = "notebook_privacy_settings_";
const GLOBAL_PRIVACY_REGISTRY_KEY = "notebook_global_privacy_registry";

export const DEFAULT_PRIVACY_SETTINGS = {
  allowViewProfile: true,
  allowPostLikes: true,
  allowPostComments: true,
  allowCommentLikes: true,
  allowCommentReplies: true,
  allowFriendTagging: true,
  activityVisibility: "public", // "public" | "friends"
};

// In-memory cache for cross-module lookup
const privacySettingsCache = {};

export function getGlobalPrivacyRegistry() {
  try {
    const raw = safeStorageGet(GLOBAL_PRIVACY_REGISTRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading global privacy registry:", e);
  }
  return {};
}

export function extractAndRegisterPrivacy(profile) {
  if (!profile || !profile.id) return profile;

  if (profile.student_id && typeof profile.student_id === "string" && profile.student_id.includes("[priv:")) {
    const match = profile.student_id.match(/\[priv:(.+?)\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        registerUserPrivacySettings(profile.id, parsed);
      } catch (e) {}
      profile.student_id = profile.student_id.replace(/\[priv:.+?\]/, "").trim();
    }
  }

  if (profile.privacy_settings && typeof profile.privacy_settings === "object") {
    registerUserPrivacySettings(profile.id, profile.privacy_settings);
  }

  return profile;
}

export function registerUserPrivacySettings(userId, settings) {
  if (!userId || !settings) return;
  const merged = { ...DEFAULT_PRIVACY_SETTINGS, ...settings };
  privacySettingsCache[userId] = merged;
  try {
    const registry = getGlobalPrivacyRegistry();
    registry[userId] = merged;
    safeStorageSet(GLOBAL_PRIVACY_REGISTRY_KEY, JSON.stringify(registry));
    safeStorageSet(`${PRIVACY_KEY_PREFIX}${userId}`, JSON.stringify(merged));
  } catch (e) {
    console.warn("Error registering user privacy settings:", e);
  }
}

export function getPrivacySettings(userId = null) {
  const currentUserId = currentUser ? currentUser.id : null;
  const targetId = userId || currentUserId || "current_user";

  // 1. In-memory cache
  if (privacySettingsCache[targetId]) {
    return privacySettingsCache[targetId];
  }

  // 2. Direct key in localStorage
  const key = `${PRIVACY_KEY_PREFIX}${targetId}`;
  try {
    const raw = safeStorageGet(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const settings = { ...DEFAULT_PRIVACY_SETTINGS, ...parsed };
      privacySettingsCache[targetId] = settings;
      return settings;
    }
  } catch (e) {
    console.warn("Error reading privacy settings:", e);
  }

  // 3. Check Global Privacy Registry in localStorage
  try {
    const registry = getGlobalPrivacyRegistry();
    if (registry[targetId]) {
      const settings = { ...DEFAULT_PRIVACY_SETTINGS, ...registry[targetId] };
      privacySettingsCache[targetId] = settings;
      return settings;
    }
  } catch (e) {}

  // 4. Current user metadata fallback
  if (
    currentUserId &&
    currentUserId === targetId &&
    currentUser.user_metadata?.privacy_settings
  ) {
    const settings = { ...DEFAULT_PRIVACY_SETTINGS, ...currentUser.user_metadata.privacy_settings };
    privacySettingsCache[targetId] = settings;
    return settings;
  }

  // 5. Last saved settings fallback (ONLY for current user, not for other authors)
  if (!userId || userId === currentUserId) {
    try {
      const rawLast = safeStorageGet("notebook_last_privacy_settings");
      if (rawLast) {
        const parsed = JSON.parse(rawLast);
        const settings = { ...DEFAULT_PRIVACY_SETTINGS, ...parsed };
        privacySettingsCache[targetId] = settings;
        return settings;
      }
    } catch (e) {}
  }

  return { ...DEFAULT_PRIVACY_SETTINGS };
}

export async function savePrivacySettings(settings, userId = null) {
  const currentUserId = currentUser ? currentUser.id : null;
  const targetId = userId || currentUserId || "current_user";
  const mergedSettings = { ...DEFAULT_PRIVACY_SETTINGS, ...settings };

  registerUserPrivacySettings(targetId, mergedSettings);

  if (!userId || userId === currentUserId) {
    try {
      safeStorageSet("notebook_last_privacy_settings", JSON.stringify(mergedSettings));
    } catch (e) {}
  }

  if (supabaseClient && currentUser && currentUser.id === targetId) {
    try {
      if (!currentUser.user_metadata) currentUser.user_metadata = {};
      currentUser.user_metadata.privacy_settings = mergedSettings;

      await supabaseClient.auth.updateUser({
        data: { privacy_settings: mergedSettings },
      });

      if (currentProfile) {
        let baseStudentId = (currentProfile.student_id || "NITER Student")
          .replace(/\[priv:.+?\]/, "")
          .trim();
        const updatedStudentId = `${baseStudentId} [priv:${JSON.stringify(mergedSettings)}]`;

        await supabaseClient
          .from("profiles")
          .update({ student_id: updatedStudentId })
          .eq("id", currentUser.id);

        currentProfile.student_id = baseStudentId;
      }
    } catch (err) {
      console.warn("Error syncing privacy settings to Supabase:", err);
    }
  }
}

/* ==========================================================================
   GLOBAL BLOCK REGISTRY & BLOCK LOOKUP HELPERS
   ========================================================================== */

const GLOBAL_BLOCK_REGISTRY_KEY = "notebook_global_block_registry";

export function getGlobalBlockRegistry() {
  try {
    const raw = safeStorageGet(GLOBAL_BLOCK_REGISTRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading global block registry:", e);
  }
  return {};
}

export function registerBlockInGlobalRegistry(blockerIdOrName, targetIdOrName) {
  if (!blockerIdOrName || !targetIdOrName) return;
  try {
    const registry = getGlobalBlockRegistry();
    const blockerKey = String(blockerIdOrName).toLowerCase();
    const targetKey = String(targetIdOrName).toLowerCase();

    if (!registry[blockerKey]) registry[blockerKey] = [];
    if (!registry[blockerKey].includes(targetKey)) {
      registry[blockerKey].push(targetKey);
    }
    const origTarget = String(targetIdOrName);
    if (!registry[blockerKey].includes(origTarget)) {
      registry[blockerKey].push(origTarget);
    }
    safeStorageSet(GLOBAL_BLOCK_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn("Error registering block in registry:", e);
  }
}

export function removeBlockFromGlobalRegistry(blockerIdOrName, targetIdOrName) {
  if (!blockerIdOrName || !targetIdOrName) return;
  try {
    const registry = getGlobalBlockRegistry();
    const blockerKey = String(blockerIdOrName).toLowerCase();
    const targetKey = String(targetIdOrName).toLowerCase();

    if (registry[blockerKey]) {
      registry[blockerKey] = registry[blockerKey].filter(
        (id) => String(id).toLowerCase() !== targetKey && id !== String(targetIdOrName)
      );
    }
    safeStorageSet(GLOBAL_BLOCK_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn("Error removing block from registry:", e);
  }
}

export function isUserBlockedEitherWay(userAId, userAName, userBId, userBName) {
  const registry = getGlobalBlockRegistry();

  const identifiersA = [userAId, userAName].filter(Boolean).map((s) => String(s).toLowerCase());
  const identifiersB = [userBId, userBName].filter(Boolean).map((s) => String(s).toLowerCase());

  if (identifiersA.length === 0 || identifiersB.length === 0) return false;

  // Check if A blocked B
  for (const a of identifiersA) {
    const blockedByA = registry[a] || [];
    const lowerBlocked = blockedByA.map((s) => String(s).toLowerCase());
    for (const b of identifiersB) {
      if (lowerBlocked.includes(b)) return true;
    }
  }

  // Check if B blocked A
  for (const b of identifiersB) {
    const blockedByB = registry[b] || [];
    const lowerBlocked = blockedByB.map((s) => String(s).toLowerCase());
    for (const a of identifiersA) {
      if (lowerBlocked.includes(a)) return true;
    }
  }

  return false;
}

export function isBlockedWithCurrentUser(targetId, targetName) {
  if (!targetId && !targetName) return false;

  const selfId = currentUser ? currentUser.id : (currentProfile ? currentProfile.id : null);
  const selfName = currentProfile ? currentProfile.name : (currentUser ? currentUser.email : null);

  if (!selfId && !selfName) return false;

  if (selfId && targetId && String(selfId).toLowerCase() === String(targetId).toLowerCase()) return false;
  if (selfName && targetName && String(selfName).toLowerCase() === String(targetName).toLowerCase()) return false;

  // Check local network state of current user
  try {
    const netKey = `niter_network_relationships_${selfId || currentProfile?.id || "guest"}`;
    const rawNet = localStorage.getItem(netKey);
    if (rawNet) {
      const parsedNet = JSON.parse(rawNet);
      if (parsedNet && Array.isArray(parsedNet.blockedUsers)) {
        const lowerBlocked = parsedNet.blockedUsers.map((s) => String(s).toLowerCase());
        if (targetId && lowerBlocked.includes(String(targetId).toLowerCase())) return true;
        if (targetName && lowerBlocked.includes(String(targetName).toLowerCase())) return true;
      }
    }
  } catch (e) {}

  return isUserBlockedEitherWay(selfId, selfName, targetId, targetName);
}

export function cleanAllUserLocalStorage(userId, userName, userStudentId, userEmail) {
  if (!userId) return;

  registerDeletedUser(userId, userName, userStudentId, userEmail);

  const identifiers = [userId, userName, userStudentId, userEmail]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  // 1. Remove direct user key entries
  const directKeys = [
    `notebook_saved_posts_${userId}`,
    `notebook_privacy_settings_${userId}`,
    `niter_privacy_settings_${userId}`,
    `niter_network_relationships_${userId}`,
  ];
  if (userName) {
    directKeys.push(`niter_network_relationships_${String(userName).toLowerCase()}`);
  }

  directKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });

  // 2. Remove user from global privacy registry & global block registry
  try {
    const privRegistry = getGlobalPrivacyRegistry();
    if (privRegistry[userId]) {
      delete privRegistry[userId];
      safeStorageSet(GLOBAL_PRIVACY_REGISTRY_KEY, JSON.stringify(privRegistry));
    }
  } catch (e) {}

  try {
    const blockRegistry = getGlobalBlockRegistry();
    identifiers.forEach((idKey) => {
      if (blockRegistry[idKey]) delete blockRegistry[idKey];
    });
    Object.keys(blockRegistry).forEach((blocker) => {
      if (Array.isArray(blockRegistry[blocker])) {
        blockRegistry[blocker] = blockRegistry[blocker].filter(
          (target) => !identifiers.includes(String(target).toLowerCase())
        );
      }
    });
    safeStorageSet(GLOBAL_BLOCK_REGISTRY_KEY, JSON.stringify(blockRegistry));
  } catch (e) {}

  // 3. Clean network relationships in all niter_network_relationships_* keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("niter_network_relationships_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          let changed = false;
          ["friends", "sentRequests", "receivedRequests", "blockedUsers"].forEach((prop) => {
            if (Array.isArray(parsed[prop])) {
              const origLen = parsed[prop].length;
              parsed[prop] = parsed[prop].filter(
                (item) => !identifiers.includes(String(item).toLowerCase())
              );
              if (parsed[prop].length !== origLen) changed = true;
            }
          });
          if (changed) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
      }
    }
  } catch (e) {}

  // 4. Clean support tickets & report tickets from localStorage
  try {
    const rawSupport = localStorage.getItem("campus_support_tickets");
    if (rawSupport) {
      const tickets = JSON.parse(rawSupport);
      const filtered = tickets.filter(
        (t) =>
          !identifiers.includes(String(t.userId || "").toLowerCase()) &&
          !identifiers.includes(String(t.userName || "").toLowerCase()) &&
          !identifiers.includes(String(t.userEmail || "").toLowerCase())
      );
      localStorage.setItem("campus_support_tickets", JSON.stringify(filtered));
    }
  } catch (e) {}

  try {
    const rawReports = localStorage.getItem("campus_report_tickets");
    if (rawReports) {
      const reports = JSON.parse(rawReports);
      const filtered = reports.filter(
        (r) =>
          !identifiers.includes(String(r.reporterId || "").toLowerCase()) &&
          !identifiers.includes(String(r.reporterName || "").toLowerCase())
      );
      localStorage.setItem("campus_report_tickets", JSON.stringify(filtered));
    }
  } catch (e) {}
}

/* ==========================================================================
   GLOBAL DELETED USERS REGISTRY
   ========================================================================== */

const GLOBAL_DELETED_USERS_KEY = "notebook_global_deleted_users";

export function getGlobalDeletedUsersRegistry() {
  try {
    const raw = safeStorageGet(GLOBAL_DELETED_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading global deleted users registry:", e);
  }
  return [];
}

export function registerDeletedUser(...args) {
  try {
    const deleted = getGlobalDeletedUsersRegistry();
    let changed = false;

    args.filter(Boolean).forEach((item) => {
      const idStr = String(item).toLowerCase().trim();
      if (idStr && !deleted.includes(idStr)) {
        deleted.push(idStr);
        changed = true;
      }
    });

    if (changed) {
      safeStorageSet(GLOBAL_DELETED_USERS_KEY, JSON.stringify(deleted));
    }
  } catch (e) {
    console.warn("Error registering deleted user:", e);
  }
}

export function unregisterDeletedUser(...args) {
  try {
    let deleted = getGlobalDeletedUsersRegistry();
    let changed = false;

    args.filter(Boolean).forEach((item) => {
      const idStr = String(item).toLowerCase().trim();
      if (idStr && deleted.includes(idStr)) {
        deleted = deleted.filter((x) => x !== idStr);
        changed = true;
      }
    });

    if (changed) {
      safeStorageSet(GLOBAL_DELETED_USERS_KEY, JSON.stringify(deleted));
    }
  } catch (e) {
    console.warn("Error unregistering deleted user:", e);
  }
}

export function isUserDeleted(idOrName) {
  if (!idOrName) return false;
  const deleted = getGlobalDeletedUsersRegistry();
  const searchStr = String(idOrName).toLowerCase().trim();
  return deleted.includes(searchStr);
}




