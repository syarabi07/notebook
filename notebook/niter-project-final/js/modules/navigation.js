import { sidebarData, cardData, moduleMeta } from "../config/constants.js";
import {
  getShortcutsVisibility,
  setShortcutsVisibility,
} from "../utils/storage.js";
import {
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
} from "../utils/helpers.js";
import {
  renderFeed,
  setCurrentModule,
  getCurrentModule,
} from "./feed.js";
export { getCurrentModule } from "./feed.js";
import {
  renderProfilePage,
  removeProfileHeaderCard,
} from "../pages/profile.js";
import {
  renderNotificationsPage,
  fetchNotifications,
  updateNavNotifBadge,
} from "../pages/notifications.js";
import { renderFriendsPage, getNetworkState, fetchNetworkStateFromSupabase } from "../pages/friends.js";
import { renderSavedPage } from "../pages/saved.js";
import { renderSettingsPage } from "../pages/settings.js";
import { renderPrivacyPage } from "../pages/privacy.js";
import { renderSupportPage } from "../pages/support.js";
import { renderReportPage } from "../pages/report.js";
import { currentUser } from "./auth.js";
import { supabaseClient } from "../config/supabase.js";
import { getSavedPostIds } from "../utils/storage.js";

let cardsVisible = getShortcutsVisibility();
let lastScrollTop = 0;

export function applyCardsVisibilityState() {
  const wrapper = document.getElementById("cards-grid-wrapper");
  const btnText = document.getElementById("toggle-cards-text");
  const btnIcon = document.getElementById("toggle-cards-icon");

  if (wrapper) wrapper.classList.toggle("hidden", !cardsVisible);
  if (btnText)
    btnText.innerText = cardsVisible ? "Hide Shortcuts" : "Show Shortcuts";
  if (btnIcon) {
    btnIcon.setAttribute("data-lucide", cardsVisible ? "eye-off" : "eye");
    if (window.lucide) window.lucide.createIcons();
  }
}

export function toggleCardsSection() {
  cardsVisible = !cardsVisible;
  setShortcutsVisibility(cardsVisible);
  applyCardsVisibilityState();
}

export function setupScrollListeners() {
  const mainContent = document.querySelector(".main-content");

  if (mainContent) {
    mainContent.addEventListener("scroll", () => {
      const currentScroll = mainContent.scrollTop;
      const maxScroll = mainContent.scrollHeight - mainContent.clientHeight;

      if (window.innerWidth <= 1280) {
        if (currentScroll <= 40) {
          document.body.classList.remove("nav-hidden");
        } else if (currentScroll >= maxScroll - 20) {
          // Stay in current state near bottom boundary to prevent elastic bounce thrashing
        } else if (currentScroll > lastScrollTop + 5) {
          document.body.classList.add("nav-hidden");
        } else if (currentScroll < lastScrollTop - 5) {
          document.body.classList.remove("nav-hidden");
        }
        lastScrollTop = Math.max(0, currentScroll);
      }
    });
  }
}

export function toggleSubmenu(buttonElement) {
  const navGroup = buttonElement.closest(".nav-group");
  if (!navGroup) return;

  const wrapper = navGroup.querySelector(".submenu-wrapper");
  const isExpanded = buttonElement.getAttribute("aria-expanded") === "true";

  const parentSidebar = navGroup.closest(".sidebar-links");
  if (parentSidebar) {
    parentSidebar.querySelectorAll(".nav-group").forEach((group) => {
      if (group !== navGroup) {
        const groupBtn = group.querySelector(".menu-item-btn");
        const groupWrapper = group.querySelector(".submenu-wrapper");
        if (groupBtn && groupWrapper) {
          groupBtn.setAttribute("aria-expanded", "false");
          groupBtn.classList.remove("expanded");
          groupWrapper.classList.remove("open");
        }
      }
    });
  }

  if (isExpanded) {
    buttonElement.setAttribute("aria-expanded", "false");
    buttonElement.classList.remove("expanded");
    wrapper.classList.remove("open");
  } else {
    buttonElement.setAttribute("aria-expanded", "true");
    buttonElement.classList.add("expanded");
    wrapper.classList.add("open");
  }
}

export function selectSubmenuItem(element) {
  document
    .querySelectorAll(".submenu-item")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
}

export async function updateHomeCardTags(items) {
  if (!items || !Array.isArray(items)) return items;
  const clone = items.map((item) => ({ ...item }));

  if (currentUser) {
    // 1. My Profile - Posts count
    let postsCount = 0;
    if (supabaseClient) {
      try {
        const { count, error } = await supabaseClient
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", currentUser.id);
        if (!error && count !== null) {
          postsCount = count;
        }
      } catch (err) {
        console.warn("Error fetching post count for card tag:", err);
      }
    }
    const profileItemIndex = clone.findIndex((c) => c.title === "My Profile");
    if (profileItemIndex !== -1) {
      clone[profileItemIndex].tag = `${postsCount} ${postsCount === 1 ? "Post" : "Posts"}`;
    }

    // 2. Friends & Network - Friends count
    let netState = getNetworkState();
    if (supabaseClient) {
      try {
        netState = await fetchNetworkStateFromSupabase();
      } catch (err) {
        console.warn("Error fetching network state for card tag:", err);
      }
    }
    const friendsCount = netState?.friends?.length || 0;
    const friendsItemIndex = clone.findIndex((c) => c.title === "Friends & Network");
    if (friendsItemIndex !== -1) {
      clone[friendsItemIndex].tag = `${friendsCount} ${friendsCount === 1 ? "Friend" : "Friends"}`;
    }

    // 3. Saved Posts
    const savedIds = getSavedPostIds(currentUser.id);
    let validSavedCount = 0;
    if (savedIds.length > 0) {
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from("posts")
            .select("id");
          if (!error && data) {
            validSavedCount = data.filter((p) =>
              savedIds.includes(String(p.id))
            ).length;
          } else {
            validSavedCount = savedIds.length;
          }
        } catch (err) {
          validSavedCount = savedIds.length;
        }
      } else {
        validSavedCount = savedIds.length;
      }
    }
    const savedItemIndex = clone.findIndex((c) => c.title === "Saved Posts");
    if (savedItemIndex !== -1) {
      clone[savedItemIndex].tag = `${validSavedCount} Saved`;
    }
  } else {
    const profileItemIndex = clone.findIndex((c) => c.title === "My Profile");
    if (profileItemIndex !== -1) clone[profileItemIndex].tag = "0 Posts";
    const friendsItemIndex = clone.findIndex((c) => c.title === "Friends & Network");
    if (friendsItemIndex !== -1) clone[friendsItemIndex].tag = "0 Friends";
    const savedItemIndex = clone.findIndex((c) => c.title === "Saved Posts");
    if (savedItemIndex !== -1) clone[savedItemIndex].tag = "0 Saved";
  }

  return clone;
}

export async function renderCards(moduleId) {
  let items = cardData[moduleId] || [];
  if (moduleId === "home") {
    items = await updateHomeCardTags(items);
  }
  const contentGrid = document.getElementById("content-grid");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reducedMotion) {
    paintCards(moduleId, items);
    return;
  }

  if (contentGrid) {
    contentGrid.innerHTML = items
      .map(() => `<div class="card skeleton"></div>`)
      .join("");
  }
  setTimeout(() => paintCards(moduleId, items), 100);
}

export function paintCards(moduleId, items) {
  const contentGrid = document.getElementById("content-grid");
  if (!contentGrid) return;
  contentGrid.innerHTML = items
    .map(
      (item, i) => {
        const slug = (item.title || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return `
        <a href="#${slug}" class="card card-enter" style="animation-delay: ${i * 40}ms">
            <div class="card-top">
                <div class="card-icon"><i data-lucide="${item.icon}"></i></div>
                <div class="card-top-right">
                    <span class="card-tag">${item.tag}</span>
                    <div class="card-arrow"><i data-lucide="arrow-up-right"></i></div>
                </div>
            </div>
            <h3 class="card-title">${item.title}</h3>
            <p class="card-desc">${item.desc}</p>
        </a>
    `;
      },
    )
    .join("");
  if (window.lucide) window.lucide.createIcons();
}

export function renderSidebarMenu(moduleId) {
  const dynamicLinks = document.getElementById("dynamic-links");
  if (!dynamicLinks) return;
  dynamicLinks.innerHTML = "";
  const items = sidebarData[moduleId] || [];

  items.forEach((item, index) => {
    const navGroup = document.createElement("div");
    navGroup.className = "nav-group";

    if (item.submenus && item.submenus.length > 0) {
      const autoExpand = index === 0 ? "true" : "false";
      const expandedClass = index === 0 ? "expanded" : "";
      const openWrapperClass = index === 0 ? "open" : "";

      navGroup.innerHTML = `
            <button class="menu-item-btn ${expandedClass}" aria-expanded="${autoExpand}">
                <div class="menu-item-left">
                    <i data-lucide="${item.icon}"></i>
                    <span>${item.label}</span>
                </div>
                <i data-lucide="chevron-right" class="chevron-icon"></i>
            </button>
            <div class="submenu-wrapper ${openWrapperClass}">
                <div class="submenu-content">
                    ${item.submenus
                      .map(
                        (sub) => {
                          const subSlug = (sub || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-");
                          return `
                        <a href="#${subSlug}" class="submenu-item">
                            <span class="sub-dot"></span>
                            <span>${sub}</span>
                        </a>
                    `;
                        },
                      )
                      .join("")}
                </div>
            </div>
        `;
    } else {
      navGroup.innerHTML = `
            <button class="menu-item-btn direct-sidebar-btn" data-action="${item.action || "saved"}">
                <div class="menu-item-left">
                    <i data-lucide="${item.icon}"></i>
                    <span>${item.label}</span>
                </div>
            </button>
      `;
    }

    dynamicLinks.appendChild(navGroup);
  });

  if (window.lucide) window.lucide.createIcons();
}

export async function switchModule(moduleId, extraData = null) {
  setCurrentModule(moduleId);
  const mainContent = document.querySelector(".main-content");
  const createPostCard = document.getElementById("create-post-card");
  const cardsSection = document.getElementById("cards-section");
  const pageTitle = document.getElementById("page-title");
  const pageEyebrow = document.getElementById("page-eyebrow");
  const pageSub = document.getElementById("page-sub");
  const moduleBadge = document.getElementById("module-badge");
  const cardsSubtitle = document.getElementById("cards-subtitle");
  const contentInner = document.getElementById("content-inner");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.body.classList.remove("nav-hidden");

  // Deactivate all navigation active states
  clearNavActiveStates();

  // Sync notification badge across all pages
  fetchNotifications();

  // Handle Profile Page View
  if (moduleId === "profile") {
    renderProfilePage();
    closeDrawers();
    return;
  }

  // Handle Notifications Page View
  if (moduleId === "notifications") {
    renderNotificationsPage();
    closeDrawers();
    return;
  }

  // Handle Friends & Network Page View
  if (moduleId === "friends") {
    renderFriendsPage();
    closeDrawers();
    return;
  }

  // Handle Saved Posts Page View
  if (moduleId === "saved") {
    renderSavedPage();
    closeDrawers();
    return;
  }

  // Handle Settings Page View
  if (moduleId === "settings") {
    renderSettingsPage();
    closeDrawers();
    return;
  }

  // Handle Privacy Page View
  if (moduleId === "privacy") {
    renderPrivacyPage();
    closeDrawers();
    return;
  }

  // Handle Support Desk Page View
  if (moduleId === "support") {
    renderSupportPage();
    closeDrawers();
    return;
  }

  // Handle Report Page View
  if (moduleId === "report") {
    renderReportPage(extraData);
    closeDrawers();
    return;
  }

  // Update active module buttons for standard modules
  document.querySelectorAll(".module-btn").forEach((btn) => {
    const isActive = btn.dataset.module === moduleId;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-current", isActive ? "page" : "false");
  });

  // Render standard right sidebar for main modules
  renderRightSidebar("standard");

  // Clean up profile card when on standard modules
  removeProfileHeaderCard();

  if (createPostCard) {
    createPostCard.style.display = moduleId === "home" ? "block" : "none";
  }

  if (cardsSection) {
    cardsSection.style.display = "block";
  }

  if (!reducedMotion && contentInner) {
    contentInner.classList.remove("content-fade");
    void contentInner.offsetWidth;
    contentInner.classList.add("content-fade");
  }

  let meta = moduleMeta[moduleId] || moduleMeta["home"];

  if (moduleId === "home") {
    try {
      const { loadRegisteredClassmates } = await import("../pages/friends.js");
      const classmates = await loadRegisteredClassmates();
      const count = classmates ? classmates.length : 0;
      meta = {
        ...meta,
        metrics: [
          { label: "Total Users", val: count.toLocaleString() },
          { label: "Feed Status", val: "Live" },
        ],
      };
    } catch (err) {
      console.warn("Error calculating total signed up users:", err);
    }
  }

  if (pageTitle) pageTitle.innerText = meta.title;
  if (pageEyebrow) pageEyebrow.innerText = "NOTEBOOK";
  if (pageSub) pageSub.innerText = meta.sub;
  if (moduleBadge) moduleBadge.innerText = `${moduleId.toUpperCase()}`;
  if (cardsSubtitle) cardsSubtitle.innerText = meta.subtitleCards;

  renderMetrics(meta.metrics || []);
  renderSidebarMenu(moduleId);
  renderCards(moduleId);
  renderFeed(moduleId);

  closeDrawers();
}

export function openDrawer(sidebar) {
  const overlay = document.getElementById("overlay");
  if (window.innerWidth <= 1280 && sidebar) {
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

export function closeDrawers() {
  const leftSidebar = document.getElementById("left-sidebar");
  const rightSidebar = document.getElementById("right-sidebar");
  const overlay = document.getElementById("overlay");
  if (leftSidebar) leftSidebar.classList.remove("open");
  if (rightSidebar) rightSidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
}
