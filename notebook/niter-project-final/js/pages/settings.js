import { supabaseClient } from "../config/supabase.js";
import {
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
  escapeHtml,
  generateInitialsAvatar,
  parseNiterStudentId,
} from "../utils/helpers.js";
import { currentUser, currentProfile, updateUserUI, deleteAccountAndAllData } from "../modules/auth.js";
import { setCurrentModule } from "../modules/feed.js";
import { renderSidebarMenu } from "../modules/navigation.js";
import { removeProfileHeaderCard } from "./profile.js";
import { triggerInstallPrompt } from "../modules/pwa.js";

// Apply Theme Functionality
export function applyTheme(theme = null) {
  if (!theme) {
    try {
      theme = localStorage.getItem("app_theme") || "system";
    } catch (e) {
      theme = "system";
    }
  } else {
    try {
      localStorage.setItem("app_theme", theme);
    } catch (e) {}
  }

  let effectiveTheme = theme;
  if (theme === "system") {
    effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  if (effectiveTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function initThemeListener() {
  applyTheme();

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const storedTheme = localStorage.getItem("app_theme") || "system";
      if (storedTheme === "system") {
        applyTheme("system");
      }
    });
}

export async function renderSettingsPage() {
  setCurrentModule("settings");
  clearNavActiveStates();
  renderRightSidebar("settings");
  renderSidebarMenu("home");
  clearNavActiveStates();

  const contentInner = document.getElementById("content-inner");
  if (!contentInner) return;

  // Clean up any profile header card from profile views
  removeProfileHeaderCard();

  // Update Header Metadata
  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");
  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");
  const postsFeed = document.getElementById("posts-feed");
  const feedTitle = document.getElementById("feed-title");
  const feedFilterTag = document.getElementById("feed-filter-tag");

  if (createPostCard) createPostCard.style.display = "none";
  if (cardsSection) cardsSection.style.display = "none";

  if (pageTitle) pageTitle.innerText = "Account Settings";
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub)
    pageSub.innerText =
      "Manage your personal profile details, student identification, and appearance preferences.";
  if (moduleBadge) moduleBadge.innerText = "SETTINGS";

  if (feedTitle) feedTitle.innerText = "Preferences & Info";
  if (feedFilterTag)
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> CONFIGURATION`;

  const currentTheme = localStorage.getItem("app_theme") || "system";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light";

  // Render Header Metrics Tag
  renderMetrics([
    { label: "Account Mode", val: currentUser ? "Authenticated" : "Guest" },
    { label: "System Theme", val: systemTheme },
  ]);

  let profileFormHTML = "";
  if (currentUser && currentProfile) {
    let nameToUse = (currentProfile.name || "").trim();
    if (nameToUse.includes("[Deleted") || nameToUse.toLowerCase().includes("deleted")) {
      const emailPrefix = (currentUser.email || "").split("@")[0] || "Campus User";
      nameToUse = emailPrefix
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    const nameParts = nameToUse.split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    let studentId = currentProfile.student_id || "";
    if (studentId.includes("[Deleted") || studentId.toLowerCase() === "deleted") {
      studentId = (currentUser.email || "").split("@")[0] || "";
    }

    profileFormHTML = `
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon">
            <i data-lucide="user-cog"></i>
          </div>
          <div>
            <h3 class="settings-card-title">Personal Information</h3>
            <p class="settings-card-subtitle">Update your display name, student credentials, and profile info.</p>
          </div>
        </div>

        <form id="settings-profile-form" class="settings-form">
          <div class="form-row">
            <div class="form-group">
              <label for="settings-firstname">First Name <span class="text-danger">*</span></label>
              <input type="text" id="settings-firstname" name="settings_firstname" autocomplete="given-name" class="form-input" value="${escapeHtml(
                firstName
              )}" placeholder="First name" required />
            </div>
            <div class="form-group">
              <label for="settings-lastname">Last Name</label>
              <input type="text" id="settings-lastname" name="settings_lastname" autocomplete="family-name" class="form-input" value="${escapeHtml(
                lastName
              )}" placeholder="Last name" />
            </div>
          </div>

          <div class="form-group">
            <label for="settings-studentid">Student ID</label>
            <input type="text" id="settings-studentid" name="settings_studentid" class="form-input" value="${escapeHtml(
              studentId
            )}" placeholder="e.g. 2021-1-60-001" />
            <small class="form-hint">Used for auto-identifying your department & batch year.</small>
          </div>

          <div class="settings-form-actions">
            <button type="submit" id="btn-save-settings-profile" class="btn btn-primary">
              <i data-lucide="save"></i> <span>Save Info Changes</span>
            </button>
            <span id="settings-profile-msg" class="settings-msg"></span>
          </div>
        </form>
      </div>
    `;
  } else {
    profileFormHTML = `
      <div class="network-auth-required-card" style="margin: 0 0 1.5rem 0;">
        <div class="network-auth-icon">
          <i data-lucide="user-cog"></i>
        </div>
        <h3>Personal Information & Account Settings</h3>
        <p>Please <strong>Log In</strong> or <strong>Sign Up</strong> to customize your display name, student credentials, and account preferences.</p>
        <div class="network-auth-actions">
          <button class="btn btn-primary" id="settings-login-btn">
            <i data-lucide="log-in"></i> <span>Log In</span>
          </button>
          <button class="btn btn-outline" id="settings-signup-btn">
            <i data-lucide="user-plus"></i> <span>Sign Up</span>
          </button>
        </div>
      </div>
    `;
  }

  const themeCardHTML = `
    <div class="settings-card">
      <div class="settings-card-header">
        <div class="settings-card-icon">
          <i data-lucide="sun-moon"></i>
        </div>
        <div>
          <h3 class="settings-card-title">Appearance Theme</h3>
          <p class="settings-card-subtitle">Choose your preferred visual style or sync with your system settings.</p>
        </div>
      </div>

      <div class="theme-selection-group">
        <label for="theme-option-system" class="theme-option ${currentTheme === "system" ? "active" : ""}">
          <input type="radio" id="theme-option-system" name="app-theme" value="system" aria-label="System theme" ${
            currentTheme === "system" ? "checked" : ""
          }>
          <div class="theme-option-content">
            <i data-lucide="laptop"></i>
            <span class="theme-label">System</span>
            <span class="theme-desc">Sync with system mode</span>
          </div>
        </label>

        <label for="theme-option-light" class="theme-option ${currentTheme === "light" ? "active" : ""}">
          <input type="radio" id="theme-option-light" name="app-theme" value="light" aria-label="Light theme" ${
            currentTheme === "light" ? "checked" : ""
          }>
          <div class="theme-option-content">
            <i data-lucide="sun"></i>
            <span class="theme-label">Light</span>
            <span class="theme-desc">Clean bright style</span>
          </div>
        </label>

        <label for="theme-option-dark" class="theme-option ${currentTheme === "dark" ? "active" : ""}">
          <input type="radio" id="theme-option-dark" name="app-theme" value="dark" aria-label="Dark theme" ${
            currentTheme === "dark" ? "checked" : ""
          }>
          <div class="theme-option-content">
            <i data-lucide="moon"></i>
            <span class="theme-label">Dark</span>
            <span class="theme-desc">Eye-safe dark canvas</span>
          </div>
        </label>
      </div>
    </div>
  `;

  const pwaCardHTML = `
    <div class="settings-card">
      <div class="settings-card-header">
        <div class="settings-card-icon">
          <i data-lucide="smartphone"></i>
        </div>
        <div>
          <h3 class="settings-card-title">Progressive Web App (PWA)</h3>
          <p class="settings-card-subtitle">Install Notebook on your home screen or desktop for fast offline campus access & mobile experience.</p>
        </div>
      </div>
      <div style="margin-top: 1rem; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        <button type="button" id="settings-pwa-install-btn" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
          <i data-lucide="download"></i> <span>Install Notebook App</span>
        </button>
        <span class="text-muted" style="font-size: 0.85rem;">Offline support enabled via Service Worker</span>
      </div>
    </div>
  `;

  const userNameVal = currentProfile && currentProfile.name ? currentProfile.name : (currentUser?.email || "User");

  const dangerCardHTML = `
    <div class="settings-card danger-zone-card" id="danger-zone-card">
      <div class="settings-card-header">
        <div class="settings-card-icon danger-icon">
          <i data-lucide="user-x"></i>
        </div>
        <div>
          <h3 class="settings-card-title text-danger">Delete Account</h3>
          <p class="settings-card-subtitle">Permanently delete your account and wipe all personal posts, comments, likes, and settings.</p>
        </div>
      </div>

      <div class="delete-account-initial" id="delete-account-initial">
        <p class="delete-account-warning">
          <strong>Warning:</strong> Deleting your account is permanent and irreversible. All your profile information, posts, comments, likes, notifications, friend connections, and saved preferences will be completely removed.
        </p>

        <div class="settings-form-actions" style="margin-top: 1rem;">
          <button type="button" id="btn-show-delete-account-form" class="btn btn-danger">
            <i data-lucide="trash-2"></i> <span>Delete Account</span>
          </button>
        </div>
      </div>

      <div class="delete-account-form-box hidden" id="delete-account-form-box">
        <div class="delete-form-inner" style="border-top: 1px solid rgba(239, 68, 68, 0.2); padding-top: 1.25rem; margin-top: 0.5rem;">
          <div class="report-target-banner" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: flex-start; gap: 0.75rem;">
            <i data-lucide="alert-triangle" style="color: #EF4444; flex-shrink: 0; width: 20px; height: 20px; margin-top: 2px;"></i>
            <div>
              <strong style="color: var(--ink); display: block; font-size: 0.95rem; margin-bottom: 0.25rem;">Account & Data Permanent Purge</strong>
              <span style="font-size: 0.85rem; color: var(--ink-soft); line-height: 1.45;">
                This action will permanently delete all your data across the campus network. This cannot be undone.
              </span>
            </div>
          </div>

          <p style="font-size: 0.88rem; color: var(--ink); font-weight: 600; margin-bottom: 0.5rem;">The following items will be permanently erased:</p>
          <ul class="delete-summary-list">
            <li><i data-lucide="trash-2"></i> All published posts & media uploads</li>
            <li><i data-lucide="trash-2"></i> Comments, replies, and reactions</li>
            <li><i data-lucide="trash-2"></i> Profile details, student ID & department info</li>
            <li><i data-lucide="trash-2"></i> Friend connections and sent/received requests</li>
            <li><i data-lucide="trash-2"></i> Saved settings, preferences & notifications</li>
          </ul>

          <div class="form-group" style="margin-top: 1.25rem; margin-bottom: 1rem;">
            <label for="input-confirm-delete-account" class="form-label" style="font-size: 0.88rem; color: var(--ink); font-weight: 600; margin-bottom: 0.5rem; display: block;">
              Type <strong style="color: #EF4444; background: rgba(239, 68, 68, 0.1); padding: 3px 8px; border-radius: 4px; font-family: var(--font-mono);">${escapeHtml(userNameVal)}</strong> below to confirm:
            </label>
            <input type="text" id="input-confirm-delete-account" class="form-input" placeholder="Type ${escapeHtml(userNameVal)} here" style="border-color: rgba(239, 68, 68, 0.3);" />
            <span id="delete-form-msg" class="settings-msg error" style="margin-top: 0.5rem; display: block; min-height: 20px;"></span>
          </div>

          <div class="support-form-actions" style="display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center; margin-top: 1.25rem;">
            <button type="button" class="btn btn-outline" id="btn-cancel-delete-account">
              Cancel & Keep Account
            </button>
            <button type="button" class="btn btn-danger" id="btn-confirm-delete-account" disabled>
              <i data-lucide="trash-2"></i> <span>Permanently Delete Everything</span>
            </button>
          </div>
        </div>
      </div>

      <div id="delete-account-success-box" class="support-success-box hidden"></div>
    </div>
  `;

  if (postsFeed) {
    if (currentUser && currentProfile) {
      postsFeed.innerHTML = `
        <div class="settings-container">
          ${profileFormHTML}
          ${themeCardHTML}
          ${pwaCardHTML}
          ${dangerCardHTML}
        </div>
      `;
    } else {
      postsFeed.innerHTML = `
        ${profileFormHTML}
        <div class="settings-container">
          ${themeCardHTML}
          ${pwaCardHTML}
        </div>
      `;
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // PWA Install Button Handler
  const pwaInstallBtn = document.getElementById("settings-pwa-install-btn");
  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener("click", () => {
      triggerInstallPrompt();
    });
  }

  // Setup Event Listeners

  // 1. Profile Auth Triggers (if unauthenticated)
  const loginBtn = document.getElementById("settings-login-btn");
  const signupBtn = document.getElementById("settings-signup-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const authModal = document.getElementById("auth-modal");
      const overlay = document.getElementById("overlay");
      if (authModal) authModal.classList.add("open");
      if (overlay) overlay.classList.add("active");
      const loginTab = document.getElementById("tab-login");
      if (loginTab) loginTab.click();
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      const authModal = document.getElementById("auth-modal");
      const overlay = document.getElementById("overlay");
      if (authModal) authModal.classList.add("open");
      if (overlay) overlay.classList.add("active");
      const signupTab = document.getElementById("tab-signup");
      if (signupTab) signupTab.click();
    });
  }

  // 2. Save Profile Form (if authenticated)
  const profileForm = document.getElementById("settings-profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const firstName = document.getElementById("settings-firstname")?.value.trim() || "";
      const lastName = document.getElementById("settings-lastname")?.value.trim() || "";
      const studentId = document.getElementById("settings-studentid")?.value.trim() || "";
      const msgEl = document.getElementById("settings-profile-msg");
      const submitBtn = document.getElementById("btn-save-settings-profile");

      if (!firstName) {
        if (msgEl) {
          msgEl.className = "settings-msg error";
          msgEl.innerText = "First Name is required.";
        }
        return;
      }

      const fullName = lastName ? `${firstName} ${lastName}` : firstName;
      const parsed = parseNiterStudentId(studentId);
      const avatarUrl = generateInitialsAvatar(fullName, "#2A46FF", "#FFFFFF");

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Saving...";
      }

      try {
        const updates = {
          name: fullName,
          student_id: studentId,
          department: parsed.deptCode || (currentProfile ? currentProfile.department : ""),
          year: parsed.year || (currentProfile ? currentProfile.year : ""),
          avatar_url: avatarUrl,
        };

        if (supabaseClient && currentUser) {
          const { error } = await supabaseClient
            .from("profiles")
            .update(updates)
            .eq("id", currentUser.id);

          if (error) {
            console.error("Error updating profile in Supabase:", error);
            if (msgEl) {
              msgEl.className = "settings-msg error";
              msgEl.innerText = "Failed to update profile: " + error.message;
            }
            return;
          }
        }

        // Update local profile object
        if (currentProfile) {
          Object.assign(currentProfile, updates);
          updateUserUI(currentProfile);
        }

        if (msgEl) {
          msgEl.className = "settings-msg success";
          msgEl.innerText = "Profile information updated successfully!";
        }
      } catch (err) {
        console.error("Error saving settings:", err);
        if (msgEl) {
          msgEl.className = "settings-msg error";
          msgEl.innerText = "An error occurred while saving.";
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<i data-lucide="save"></i> <span>Save Info Changes</span>`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    });
  }

  // 3. Theme Toggle Selector
  const themeOptions = document.querySelectorAll(".theme-option");
  themeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const radio = option.querySelector('input[type="radio"]');
      if (!radio) return;

      const selectedTheme = radio.value;
      radio.checked = true;

      // Update active styling
      themeOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      // Apply theme & update metrics
      applyTheme(selectedTheme);
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark" : "Light";
      renderMetrics([
        { label: "Account Mode", val: currentUser ? "Authenticated" : "Guest" },
        { label: "System Theme", val: systemTheme },
      ]);
    });
  });

  // 4. Inline Account Deletion Handlers
  const showDeleteFormBtn = document.getElementById("btn-show-delete-account-form");
  const deleteInitialBox = document.getElementById("delete-account-initial");
  const deleteFormBox = document.getElementById("delete-account-form-box");
  const deleteSuccessBox = document.getElementById("delete-account-success-box");
  const cancelDeleteBtn = document.getElementById("btn-cancel-delete-account");
  const confirmDeleteBtn = document.getElementById("btn-confirm-delete-account");
  const confirmInput = document.getElementById("input-confirm-delete-account");
  const formMsg = document.getElementById("delete-form-msg");

  showDeleteFormBtn?.addEventListener("click", () => {
    deleteInitialBox?.classList.add("hidden");
    deleteFormBox?.classList.remove("hidden");
    if (confirmInput) {
      confirmInput.value = "";
      confirmInput.focus();
    }
    if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
    if (formMsg) formMsg.innerText = "";
    if (window.lucide) window.lucide.createIcons();
  });

  cancelDeleteBtn?.addEventListener("click", () => {
    deleteFormBox?.classList.add("hidden");
    deleteInitialBox?.classList.remove("hidden");
    if (confirmInput) confirmInput.value = "";
    if (formMsg) formMsg.innerText = "";
  });

  confirmInput?.addEventListener("input", (e) => {
    const text = e.target.value.trim().toLowerCase();
    const expected = userNameVal.trim().toLowerCase();
    if (confirmDeleteBtn) {
      confirmDeleteBtn.disabled = text !== expected;
    }
  });

  confirmDeleteBtn?.addEventListener("click", async () => {
    const text = confirmInput?.value.trim().toLowerCase() || "";
    const expected = userNameVal.trim().toLowerCase();
    if (text !== expected) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.innerText = "Deleting Account & Data...";

    const res = await deleteAccountAndAllData();

    if (res.success) {
      deleteFormBox?.classList.add("hidden");
      deleteInitialBox?.classList.add("hidden");

      if (deleteSuccessBox) {
        deleteSuccessBox.innerHTML = `
          <div class="success-ticket-card" style="border-left: 4px solid #DC2626; background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.25); border-radius: var(--radius-md); padding: 1.5rem; text-align: center;">
            <div class="success-ticket-icon" style="color: #DC2626; background: transparent; padding: 0; font-size: 2.2rem; margin-bottom: 0.5rem; display: flex; justify-content: center;">
              <i data-lucide="check-circle-2"></i>
            </div>
            <h4 style="color: #DC2626; font-family: var(--font-display); font-size: 1.15rem; font-weight: 600; margin-bottom: 0.35rem;">Account & All Data Permanently Deleted</h4>
            <p style="font-size: 0.88rem; color: var(--ink-soft); margin-bottom: 0.5rem;">Goodbye <strong>${escapeHtml(userNameVal)}</strong>. All your profile information, posts, comments, likes, notifications, and settings have been completely purged.</p>
            <div class="ticket-meta" style="font-size: 0.82rem; color: var(--muted); margin-top: 0.5rem;">
              <span>Status: <strong style="color: #DC2626;">Purged & Cleared</strong></span> &bull; 
              <span>Redirecting to Home page...</span>
            </div>
          </div>
        `;
        deleteSuccessBox.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
      }

      setTimeout(async () => {
        const { switchModule } = await import("../modules/navigation.js");
        switchModule("home");
      }, 2500);
    } else {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.innerHTML = `<i data-lucide="trash-2"></i> <span>Permanently Delete Everything</span>`;
      if (window.lucide) window.lucide.createIcons();
      if (formMsg) formMsg.innerText = res.message || "Error deleting account.";
    }
  });

}
