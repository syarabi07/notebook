import { supabaseClient } from "../config/supabase.js";
import {
  generateInitialsAvatar,
  parseNiterStudentId,
} from "../utils/helpers.js";
import {
  registerUserPrivacySettings,
  extractAndRegisterPrivacy,
  cleanAllUserLocalStorage,
  isUserDeleted,
  unregisterDeletedUser,
} from "../utils/storage.js";

export let currentUser = null;
export let currentProfile = null;

export async function checkUserSession() {
  if (!supabaseClient) {
    updateUserUI(null);
    return;
  }
  try {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      currentUser = session.user;
      const profileFound = await fetchUserProfile(currentUser.id);
      if (!profileFound) {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentProfile = null;
        updateUserUI(null);
      }
    } else {
      currentUser = null;
      currentProfile = null;
      updateUserUI(null);
    }
  } catch (err) {
    console.error("Error checking session:", err);
    currentUser = null;
    currentProfile = null;
    updateUserUI(null);
  }
}

export async function fetchUserProfile(userId) {
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      const isDeletedDept = data.department === "Deleted";
      const isDeletedNamePlaceholder =
        !data.name ||
        data.name.includes("[Deleted") ||
        data.name.toLowerCase() === "deleted user" ||
        data.name.toLowerCase() === "deleted";

      // If both department is "Deleted" and name is deleted placeholder, the profile was removed by account deletion
      if (isDeletedDept && isDeletedNamePlaceholder) {
        currentProfile = null;
        updateUserUI(null);
        return false;
      }

      // If profile is active but name/student_id has stale "[Deleted User]" placeholder, sanitize it automatically
      if (data.name && (data.name.includes("[Deleted") || data.name.toLowerCase() === "deleted user")) {
        const emailPrefix = (currentUser?.email || "").split("@")[0] || "Campus User";
        data.name = emailPrefix
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        supabaseClient.from("profiles").update({ name: data.name }).eq("id", data.id).then(() => {});
      }

      if (data.student_id && (data.student_id.includes("[Deleted") || data.student_id.toLowerCase() === "deleted")) {
        data.student_id = (currentUser?.email || "").split("@")[0] || "";
        supabaseClient.from("profiles").update({ student_id: data.student_id }).eq("id", data.id).then(() => {});
      }

      // Valid profile exists in database, so account is active!
      // Clear any stale deleted user flags in local storage & auth metadata
      unregisterDeletedUser(data.id, data.name, data.student_id, currentUser?.email);

      if (
        currentUser &&
        (currentUser.user_metadata?.deleted === true ||
          currentUser.user_metadata?.name?.includes("[Deleted"))
      ) {
        try {
          await supabaseClient.auth.updateUser({
            data: { deleted: false, name: data.name, student_id: data.student_id },
          });
        } catch (e) {
          console.warn("Error resetting deleted user_metadata:", e);
        }
      }

      extractAndRegisterPrivacy(data);
      currentProfile = data;
      if (currentUser && currentUser.user_metadata?.privacy_settings) {
        registerUserPrivacySettings(currentUser.id, currentUser.user_metadata.privacy_settings);
      }
      updateUserUI(data);
      return true;
    } else {
      currentProfile = null;
      updateUserUI(null);
      return false;
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
    currentProfile = null;
    updateUserUI(null);
    return false;
  }
}

export function updateUserUI(profile) {
  const nameEl = document.getElementById("nav-user-name");
  const idEl = document.getElementById("nav-user-id");
  const avatarImg = document.getElementById("nav-avatar-img");
  const postAvatar = document.getElementById("post-user-avatar");
  const authActionBtn = document.getElementById("btn-auth-action");
  const authActionText = document.getElementById("auth-action-text");
  const authActionIcon = document.getElementById("auth-action-icon");

  if (profile) {
    if (nameEl) nameEl.innerText = profile.name;
    if (idEl) idEl.innerText = profile.student_id || "";
    const avatarUrl = generateInitialsAvatar(
      profile.name,
      "#2A46FF",
      "#FFFFFF",
    );
    if (avatarImg) avatarImg.src = avatarUrl;
    if (postAvatar) postAvatar.src = avatarUrl;

    if (authActionBtn)
      authActionBtn.className = "menu-item-btn direct-link text-danger";
    if (authActionText) authActionText.innerText = "Log Out";
    if (authActionIcon) {
      authActionIcon.setAttribute("data-lucide", "log-out");
      if (window.lucide) window.lucide.createIcons();
    }
  } else {
    if (nameEl) nameEl.innerText = "Guest User";
    if (idEl) idEl.innerText = "Click to Log In";
    const guestAvatar = generateInitialsAvatar(
      "Guest User",
      "#8E95A5",
      "#FFFFFF",
    );
    if (avatarImg) avatarImg.src = guestAvatar;
    if (postAvatar) postAvatar.src = guestAvatar;

    if (authActionBtn)
      authActionBtn.className = "menu-item-btn direct-link text-accent";
    if (authActionText) authActionText.innerText = "Login / Sign Up";
    if (authActionIcon) {
      authActionIcon.setAttribute("data-lucide", "log-in");
      if (window.lucide) window.lucide.createIcons();
    }
  }
}

export function requireAuth(actionName = "perform this action") {
  if (!currentUser || !currentProfile) {
    openAuthModal();
    alert(`Please log in or sign up to ${actionName}.`);
    return false;
  }
  return true;
}

export function openAuthModal() {
  const authModal = document.getElementById("auth-modal");
  const overlay = document.getElementById("overlay");
  if (authModal) {
    authModal.classList.add("open");
    authModal.setAttribute("aria-hidden", "false");
    authModal.removeAttribute("inert");
  }
  if (overlay) overlay.classList.add("active");
}

export function closeAuthModal() {
  const authModal = document.getElementById("auth-modal");
  const overlay = document.getElementById("overlay");
  if (authModal) {
    if (document.activeElement && authModal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    authModal.classList.remove("open");
    authModal.setAttribute("aria-hidden", "true");
    authModal.setAttribute("inert", "");
  }
  if (overlay) overlay.classList.remove("active");
}

export function switchAuthTab(tab) {
  const tabsContainer = document.querySelector(".auth-tabs");
  if (tabsContainer) {
    tabsContainer.style.display = tab === "reset" ? "none" : "flex";
  }

  document
    .getElementById("tab-login")
    ?.classList.toggle("active", tab === "login");
  document
    .getElementById("tab-signup")
    ?.classList.toggle("active", tab === "signup");
  document
    .getElementById("form-login")
    ?.classList.toggle("active", tab === "login");
  document
    .getElementById("form-signup")
    ?.classList.toggle("active", tab === "signup");
  document
    .getElementById("form-reset")
    ?.classList.toggle("active", tab === "reset");

  if (tab === "reset") {
    const loginEmail = document.getElementById("login-email")?.value;
    const resetEmailInput = document.getElementById("reset-email");
    if (loginEmail && resetEmailInput && !resetEmailInput.value) {
      resetEmailInput.value = loginEmail;
    }
  }
}

export async function handleResetPassword(e) {
  e.preventDefault();
  const emailInput = document.getElementById("reset-email");
  const email = emailInput?.value?.trim();
  const submitBtn = document.getElementById("btn-reset-submit");

  if (!email) {
    alert("Please enter your registered email address.");
    return;
  }

  if (submitBtn) submitBtn.innerText = "Sending Link...";

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      alert("Password Reset Error: " + error.message);
    } else {
      alert("A password reset link has been sent to " + email + "!\n\nPlease check your email inbox to reset your password.");
      switchAuthTab("login");
    }
  } catch (err) {
    console.error("Reset Password Exception:", err);
    alert("Failed to send password reset link. Please try again.");
  } finally {
    if (submitBtn) submitBtn.innerText = "Send Reset Link";
  }
}

export function handleUserAreaClick() {
  if (!currentUser || !currentProfile) {
    openAuthModal();
  } else if (window.innerWidth <= 1280) {
    openDrawer(document.getElementById("right-sidebar"));
  }
}

export function handleLogoutOrLogin() {
  if (currentUser) {
    handleLogout();
  } else {
    closeDrawers();
    openAuthModal();
  }
}

export async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email")?.value?.trim();
  const password = document.getElementById("login-password")?.value;
  const submitBtn = document.getElementById("btn-login-submit");

  if (submitBtn) submitBtn.innerText = "Logging in...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    if (submitBtn) submitBtn.innerText = "Log In";
  } else {
    currentUser = data.user;

    // Check if user has an active profile in database
    const profileFound = await fetchUserProfile(currentUser.id);

    if (!profileFound) {
      await supabaseClient.auth.signOut();
      currentUser = null;
      currentProfile = null;
      updateUserUI(null);
      alert("This account has been permanently deleted and no longer exists. Please sign up for a new account.");
      if (submitBtn) submitBtn.innerText = "Log In";
      return;
    }

    closeAuthModal();
    if (submitBtn) submitBtn.innerText = "Log In";
    
    // Switch and re-render current module
    const { switchModule, getCurrentModule } = await import("./navigation.js");
    switchModule(getCurrentModule());
  }
}

export async function handleSignup(e) {
  e.preventDefault();
  const firstName = document.getElementById("signup-firstname")?.value.trim() || "";
  const lastName = document.getElementById("signup-lastname")?.value.trim() || "";
  const studentId = document.getElementById("signup-studentid")?.value.trim() || "";
  const email = document.getElementById("signup-email")?.value.trim() || "";
  const password = document.getElementById("signup-password")?.value || "";
  const submitBtn = document.getElementById("btn-signup-submit");

  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  const parsed = parseNiterStudentId(studentId);
  const avatarDataUri = generateInitialsAvatar(fullName, "#2A46FF", "#FFFFFF");

  if (submitBtn) submitBtn.innerText = "Creating account...";

  // Clear any prior deleted user flag in local storage for this email/name/studentId
  unregisterDeletedUser(email, fullName, studentId);

  const { data: authData, error: authError } = await supabaseClient.auth.signUp(
    {
      email,
      password,
      options: {
        data: {
          name: fullName,
          student_id: studentId,
          department: parsed.deptCode,
          year: parsed.year,
          deleted: false,
        },
      },
    },
  );

  if (authError) {
    const errText = (authError.message || "").toLowerCase();
    const isAlreadyRegistered =
      errText.includes("already registered") ||
      errText.includes("already exists") ||
      errText.includes("unique constraint");

    if (isAlreadyRegistered) {
      // Attempt to authenticate with provided credentials to check if account was deleted
      const { data: signInData, error: signInErr } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

      if (!signInErr && signInData?.user) {
        const existingUser = signInData.user;
        const profileFound = await fetchUserProfile(existingUser.id);

        if (!profileFound) {
          // Profile was deleted -> Re-create account with newly submitted details!
          unregisterDeletedUser(existingUser.id, email, fullName, studentId);

          try {
            await supabaseClient.auth.updateUser({
              password,
              data: {
                name: fullName,
                student_id: studentId,
                department: parsed.deptCode,
                year: parsed.year,
                deleted: false,
              },
            });
          } catch (e) {
            console.warn("Error updating user_metadata on signup recovery:", e);
          }

          const profilePayload = {
            id: existingUser.id,
            name: fullName,
            student_id: studentId,
            department: parsed.deptCode,
            year: parsed.year,
            avatar_url: avatarDataUri,
          };

          const { data: updatedRows, error: updateErr } = await supabaseClient
            .from("profiles")
            .update(profilePayload)
            .eq("id", existingUser.id)
            .select();

          if (updateErr || !updatedRows || updatedRows.length === 0) {
            const { error: upsertErr } = await supabaseClient
              .from("profiles")
              .upsert([profilePayload], { onConflict: "id" });
            if (upsertErr) console.error("Profile Upsert Error on recovery:", upsertErr);
          }

          currentUser = existingUser;
          await fetchUserProfile(existingUser.id);

          alert("Your account has been successfully re-created!");
          closeAuthModal();
          if (submitBtn) submitBtn.innerText = "Create Account";

          const { switchModule, getCurrentModule } = await import("./navigation.js");
          switchModule(getCurrentModule());
          return;
        } else {
          // Active profile exists -> user logged in successfully
          alert("An active account already exists with this email address. Logging you in...");
          closeAuthModal();
          if (submitBtn) submitBtn.innerText = "Create Account";

          const { switchModule, getCurrentModule } = await import("./navigation.js");
          switchModule(getCurrentModule());
          return;
        }
      } else {
        // Password mismatch or credentials error
        alert(
          "An account with this email address already exists.\n\n" +
          "If you previously deleted your account, please enter your original password in the Sign Up form, or use the Log In tab."
        );
        if (submitBtn) submitBtn.innerText = "Create Account";
        return;
      }
    }

    alert(authError.message);
    if (submitBtn) submitBtn.innerText = "Create Account";
    return;
  }

  if (authData.user) {
    // Unregister user ID from deleted registry
    unregisterDeletedUser(authData.user.id, email, fullName, studentId);

    // Update user_metadata to explicitly remove deleted status
    try {
      await supabaseClient.auth.updateUser({
        data: {
          name: fullName,
          student_id: studentId,
          department: parsed.deptCode,
          year: parsed.year,
          deleted: false,
        },
      });
    } catch (e) {
      console.warn("Error updating user_metadata on signup:", e);
    }

    const profilePayload = {
      id: authData.user.id,
      name: fullName,
      student_id: studentId,
      department: parsed.deptCode,
      year: parsed.year,
      avatar_url: avatarDataUri,
    };

    const { data: updatedRows, error: updateErr } = await supabaseClient
      .from("profiles")
      .update(profilePayload)
      .eq("id", authData.user.id)
      .select();

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      const { error: upsertErr } = await supabaseClient
        .from("profiles")
        .upsert([profilePayload], { onConflict: "id" });
      if (upsertErr) console.error("Profile Upsert Error:", upsertErr);
    }

    currentUser = authData.user;
    await fetchUserProfile(authData.user.id);

    alert("Account created successfully!");
    closeAuthModal();
    const { switchModule, getCurrentModule } = await import("./navigation.js");
    switchModule(getCurrentModule());
  }
  if (submitBtn) submitBtn.innerText = "Create Account";
}

export async function handleLogout() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.error("Error signing out from Supabase:", err);
  } finally {
    currentUser = null;
    currentProfile = null;
    updateUserUI(null);
    closeDrawers();
    try {
      const { switchModule, getCurrentModule } = await import("./navigation.js");
      switchModule(getCurrentModule());
    } catch (err) {
      console.error("Error re-rendering feed after logout:", err);
    }
    alert("Logged out successfully.");
  }
}

function openDrawer(sidebar) {
  const overlay = document.getElementById("overlay");
  if (window.innerWidth <= 1280 && sidebar) {
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeDrawers() {
  const leftSidebar = document.getElementById("left-sidebar");
  const rightSidebar = document.getElementById("right-sidebar");
  const overlay = document.getElementById("overlay");
  if (leftSidebar) leftSidebar.classList.remove("open");
  if (rightSidebar) rightSidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
}

export async function deleteAccountAndAllData() {
  if (!currentUser) return { success: false, message: "No active user session." };

  const userId = currentUser.id;
  const userEmail = currentUser.email || "";
  const userName = currentProfile ? currentProfile.name : "";
  const userStudentId = currentProfile ? currentProfile.student_id : "";

  try {
    if (supabaseClient) {
      // 0. Set deleted user metadata in auth user object
      try {
        await supabaseClient.auth.updateUser({
          data: { deleted: true, name: "Deleted User" },
        });
      } catch (e) {
        console.warn("Update auth metadata error:", e);
      }

      // 1. Delete comment likes by user
      try {
        await supabaseClient.from("comment_likes").delete().eq("user_id", userId);
      } catch (e) {
        console.warn("Delete comment_likes error:", e);
      }

      // 2. Delete post likes by user
      try {
        await supabaseClient.from("post_likes").delete().eq("user_id", userId);
      } catch (e) {
        console.warn("Delete post_likes error:", e);
      }

      // 3. Delete comments authored by user
      try {
        await supabaseClient.from("comments").delete().eq("author_id", userId);
      } catch (e) {
        console.warn("Delete comments error:", e);
      }

      // 4. Delete notifications related to user
      try {
        await supabaseClient
          .from("notifications")
          .delete()
          .or(`recipient_id.eq.${userId},actor_id.eq.${userId}`);
      } catch (e) {
        console.warn("Delete notifications error:", e);
      }

      // 5. Delete posts authored by user
      try {
        await supabaseClient.from("posts").delete().eq("author_id", userId);
      } catch (e) {
        console.warn("Delete posts error:", e);
      }

      // 6. Wipe profile data and attempt deletion
      try {
        await supabaseClient
          .from("profiles")
          .update({ name: "Deleted User", student_id: "Deleted", department: "Deleted", year: "Deleted" })
          .eq("id", userId);

        const { error: delErr } = await supabaseClient.from("profiles").delete().eq("id", userId);
        if (delErr) {
          console.warn("Delete profile returned error:", delErr);
        }
      } catch (e) {
        console.warn("Delete profile error:", e);
      }

      // 7. Sign out auth session
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        console.warn("Auth sign out error:", e);
      }
    }

    // Clean user data from local storage & register deleted user identifiers
    cleanAllUserLocalStorage(userId, userName, userStudentId, userEmail);

    // Reset memory state
    currentUser = null;
    currentProfile = null;
    updateUserUI(null);
    closeDrawers();

    return { success: true };
  } catch (err) {
    console.error("Account deletion failed:", err);
    return { success: false, message: err.message || "Failed to delete account." };
  }
}

