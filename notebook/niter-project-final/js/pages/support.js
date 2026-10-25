import {
  clearNavActiveStates,
  renderRightSidebar,
  renderMetrics,
  showToast,
  escapeHtml,
} from "../utils/helpers.js";
import { currentUser, currentProfile } from "../modules/auth.js";
import { setCurrentModule } from "../modules/feed.js";
import { renderSidebarMenu } from "../modules/navigation.js";
import { removeProfileHeaderCard } from "./profile.js";

export async function renderSupportPage() {
  setCurrentModule("support");
  clearNavActiveStates();
  renderRightSidebar("support");
  renderSidebarMenu("home");
  clearNavActiveStates();

  const contentInner = document.getElementById("content-inner");
  if (!contentInner) return;

  // Clean up any profile header card
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

  if (pageTitle) pageTitle.innerText = "Support Desk";
  if (pageEyebrow) pageEyebrow.innerText = "HELP & CONTACT";
  if (pageSub)
    pageSub.innerText =
      "Have questions, need technical assistance, or want to give feedback? Contact our campus support desk anytime.";
  if (moduleBadge) moduleBadge.innerText = "SUPPORT";

  if (feedTitle) feedTitle.innerText = "Help Channels";
  if (feedFilterTag)
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> 24/7 HELPLINE`;

  // Render Header Metrics Ribbon
  renderMetrics([
    { label: "Facebook", val: "Recommended" },
    { label: "Email", val: "notebooksupport@gmail.com" },
  ]);

  const userNameVal = currentProfile?.full_name || currentUser?.email?.split("@")[0] || "";
  const userEmailVal = currentUser?.email || "";

  const supportHTML = `
    <div class="support-container">
      
      <!-- HERO ANNOUNCEMENT BANNER -->
      <div class="support-banner">
        <div class="support-banner-content">
          <div class="support-banner-icon">
            <i data-lucide="headset"></i>
          </div>
          <div>
            <h3>Campus Support Desk</h3>
            <p>We are here to help you with account issues, technical queries, or feedback. Contact us directly through WhatsApp or Facebook for the fastest support response.</p>
          </div>
        </div>
      </div>

      <!-- TOP FEATURED CARD: FACEBOOK PROFILE (RECOMMENDED) -->
      <div class="support-card support-card-recommended support-card-featured support-card-facebook">
        <div class="support-card-badge">
          <i data-lucide="sparkles"></i> <span>FACEBOOK RECOMMENDED</span>
        </div>
        
        <div class="support-featured-inner">
          <div class="support-featured-info">
            <div class="support-card-header">
              <div class="support-icon-box facebook-bg">
                <i data-lucide="share-2"></i>
              </div>
              <div>
                <h4 class="support-card-title">Facebook Profile</h4>
                <p class="support-card-sub">Official campus Facebook contact & active community desk</p>
              </div>
            </div>

            <div class="support-number-box">
              <span class="support-country-tag">FB</span>
              <span class="support-phone-val">Campus Facebook Page</span>
            </div>

            <p class="support-card-desc">Connect with our Facebook page for official updates, community announcements, or to send a direct message on Messenger.</p>
          </div>

          <div class="support-featured-actions">
            <a href="https://www.facebook.com/share/1EZmJPVpnN/" target="_blank" rel="noopener noreferrer" class="btn btn-facebook full-width-btn">
              <i data-lucide="external-link"></i> <span>Visit Facebook Profile</span>
            </a>
            <button class="btn btn-outline full-width-btn copy-support-btn" data-copy="https://www.facebook.com/share/1EZmJPVpnN/">
              <i data-lucide="copy"></i> <span>Copy FB Link</span>
            </button>
          </div>
        </div>
      </div>

      <!-- SECONDARY 2-COLUMN GRID: WHATSAPP & EMAIL -->
      <div class="support-secondary-grid">
        
        <!-- CHANNEL 1: WHATSAPP HELPLINE -->
        <div class="support-card support-card-whatsapp">
          <div class="support-card-header">
            <div class="support-icon-box whatsapp-bg">
              <i data-lucide="message-circle"></i>
            </div>
            <div>
              <h4 class="support-card-title">Message in WhatsApp</h4>
              <p class="support-card-sub">Fastest live response line</p>
            </div>
          </div>

          <div class="support-number-box">
            <span class="support-country-tag">BD</span>
            <span class="support-phone-val">+880 1710-181527</span>
          </div>

          <p class="support-card-desc">Reach our support team directly on WhatsApp for instant assistance with account recovery, platform bugs, or general campus queries.</p>

          <div class="support-card-actions">
            <a href="https://wa.me/8801710181527" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp full-width-btn">
              <i data-lucide="message-circle"></i> <span>Open WhatsApp Chat</span>
            </a>
            <button class="btn btn-outline btn-sm copy-support-btn" data-copy="+8801710181527">
              <i data-lucide="copy"></i> <span>Copy Number</span>
            </button>
          </div>
        </div>

        <!-- CHANNEL 2: EMAIL SUPPORT -->
        <div class="support-card support-card-email">
          <div class="support-card-header">
            <div class="support-icon-box mail-bg">
              <i data-lucide="mail"></i>
            </div>
            <div>
              <h4 class="support-card-title">Option to Send Email</h4>
              <p class="support-card-sub">Official email desk for formal requests</p>
            </div>
          </div>

          <div class="support-number-box">
            <span class="support-country-tag">EMAIL</span>
            <span class="support-phone-val" style="font-size: 0.82rem; word-break: break-all; line-height: 1.2;">notebooksupport@gmail.com</span>
          </div>

          <p class="support-card-desc">Send us a detailed email query. Our support desk reviews and responds to all email inquiries within 24 hours.</p>

          <div class="support-card-actions">
            <a href="mailto:notebooksupport@gmail.com?subject=Campus%20Notebook%20Support%20Request" class="btn btn-email full-width-btn">
              <i data-lucide="send"></i> <span>Send Email</span>
            </a>
            <button class="btn btn-outline btn-sm copy-support-btn" data-copy="notebooksupport@gmail.com">
              <i data-lucide="copy"></i> <span>Copy Email</span>
            </button>
          </div>
        </div>

      </div>

      <!-- SUPPORT TICKET FORM -->
      <div class="support-form-card">
        <div class="support-card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <div class="support-icon-box primary-bg">
            <i data-lucide="file-text"></i>
          </div>
          <div>
            <h3 class="support-card-title" style="font-size: 1.2rem;">Send a Support Message</h3>
            <p class="support-card-sub">Submit your query directly and our support desk will follow up with you.</p>
          </div>
        </div>

        <form id="support-ticket-form" class="support-form">
          <div class="support-form-grid">
            <div class="form-group">
              <label for="support-name" class="form-label">Your Name <span class="required">*</span></label>
              <input type="text" id="support-name" name="support_name" autocomplete="name" class="form-input" placeholder="e.g. Tanvir Hossain" value="${escapeHtml(userNameVal)}" required />
            </div>

            <div class="form-group">
              <label for="support-email" class="form-label">Email / Contact <span class="required">*</span></label>
              <input type="text" id="support-email" name="support_email" autocomplete="email" class="form-input" placeholder="e.g. student@niter.edu.bd or phone" value="${escapeHtml(userEmailVal)}" required />
            </div>
          </div>

          <div class="form-group">
            <label for="support-category" class="form-label">Topic Category <span class="required">*</span></label>
            <div class="category-select-wrapper">
              <i data-lucide="tag" class="select-leading-icon"></i>
              <select id="support-category" name="support_category" class="form-select category-select" required>
                <option value="General Query" selected>📢 General Inquiry / Campus Information</option>
                <option value="WhatsApp Help">💬 WhatsApp Assistance</option>
                <option value="Facebook Help">🌐 Facebook / Social Inquiry</option>
                <option value="Account & Profile">👤 Account, Login & Profile Support</option>
                <option value="Technical Issue">🛠️ Bug Report or Technical Issue</option>
                <option value="Privacy & Security">🔒 Privacy & Safety Concern</option>
              </select>
              <i data-lucide="chevron-down" class="select-trailing-icon"></i>
            </div>
          </div>

          <div class="form-group">
            <label for="support-subject" class="form-label">Subject <span class="required">*</span></label>
            <input type="text" id="support-subject" name="support_subject" class="form-input" placeholder="Brief summary of your question or issue" required />
          </div>

          <div class="form-group">
            <label for="support-message" class="form-label">Detailed Message <span class="required">*</span></label>
            <textarea id="support-message" name="support_message" class="form-textarea" rows="4" placeholder="Please describe how we can assist you..." required></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-ticket">
              <i data-lucide="send"></i> <span>Submit Support Ticket</span>
            </button>
          </div>
        </form>
        <div id="support-success-box" class="support-success-box hidden"></div>
      </div>

      <!-- FAQ ACCORDION SECTION -->
      <div class="support-faq-card">
        <div class="support-card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div class="support-icon-box help-bg">
            <i data-lucide="help-circle"></i>
          </div>
          <div>
            <h3 class="support-card-title" style="font-size: 1.2rem;">Frequently Asked Questions</h3>
            <p class="support-card-sub">Quick answers to common questions about campus services.</p>
          </div>
        </div>

        <div class="faq-list">
          <div class="faq-item">
            <button class="faq-question">
              <span>How fast is the response on WhatsApp?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Our WhatsApp support line (+880 1710-181527) is monitored 24/7. Messages are typically answered within 5 to 15 minutes by our active campus helpdesk team.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question">
              <span>What should I do if I am unable to log in to my account?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Send a message on WhatsApp or call +880 1710-181527 with your registered email or NITER Student ID. Our desk will help verify your identity and reset your password.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question">
              <span>How do I adjust my privacy settings or restrict profile viewing?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Go to the <strong>Privacy & Security</strong> page from the right sidebar menu. You can toggle profile access, activity visibility (Friends Only vs Public), comment replies, and friend tagging preferences.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question">
              <span>How can I report inappropriate posts or abusive behavior?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Click the 3-dots context menu on any post or comment to select "Report". Alternatively, send the link or details directly to our WhatsApp support number for swift moderation.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  if (postsFeed) {
    postsFeed.innerHTML = supportHTML;
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Copy Buttons
  document.querySelectorAll(".copy-support-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.copy;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(`Copied ${text} to clipboard!`, "success");
        }).catch(() => {
          showToast(`Copied: ${text}`, "success");
        });
      }
    });
  });

  // Bind Form Submit
  const form = document.getElementById("support-ticket-form");
  const successBox = document.getElementById("support-success-box");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("support-name")?.value.trim();
      const email = document.getElementById("support-email")?.value.trim();
      const category = document.getElementById("support-category")?.value;
      const contactMethod = "WhatsApp & Email";
      const subject = document.getElementById("support-subject")?.value.trim();
      const message = document.getElementById("support-message")?.value.trim();

      const ticketId = `TICK-${Math.floor(10000 + Math.random() * 90000)}`;

      // Persist ticket locally
      try {
        const existingTickets = JSON.parse(localStorage.getItem("campus_support_tickets") || "[]");
        const newTicket = {
          id: ticketId,
          name,
          email,
          category,
          contactMethod,
          subject,
          message,
          created_at: new Date().toISOString(),
          user_id: currentUser?.id || null
        };
        existingTickets.unshift(newTicket);
        localStorage.setItem("campus_support_tickets", JSON.stringify(existingTickets));
      } catch (err) {
        console.warn("Error saving support ticket:", err);
      }

      const fullMessageText = `Hello Support Desk,\n\nI submitted Ticket #${ticketId}\nName: ${name}\nContact: ${email}\nCategory: ${category}\nSubject: ${subject}\n\nMessage:\n${message}`;

      if (successBox) {
        successBox.innerHTML = `
          <div class="success-ticket-card">
            <div class="success-ticket-icon">
              <i data-lucide="check-circle-2"></i>
            </div>
            <h4>Support Ticket Created & Logged!</h4>
            <p>Thank you <strong>${escapeHtml(name)}</strong>. Your support ticket reference is <strong class="ticket-id">#${ticketId}</strong>.</p>
            <div class="ticket-meta">
              <span><strong>Category:</strong> ${escapeHtml(category)}</span> &bull; 
              <span><strong>Subject:</strong> ${escapeHtml(subject)}</span>
            </div>
            <p class="ticket-note">To deliver your message immediately to the support team, choose your preferred direct channel below:</p>
            <div class="success-ticket-actions">
              <a href="https://wa.me/8801710181527?text=${encodeURIComponent(fullMessageText)}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">
                <i data-lucide="message-circle"></i> <span>Send to WhatsApp (+880 1710-181527)</span>
              </a>
              <a href="mailto:notebooksupport@gmail.com?subject=${encodeURIComponent(`[Ticket #${ticketId}] ${subject}`)}&body=${encodeURIComponent(fullMessageText)}" class="btn btn-email btn-sm">
                <i data-lucide="mail"></i> <span>Send via Email (notebooksupport@gmail.com)</span>
              </a>
            </div>
          </div>
        `;
        successBox.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
      }

      form.reset();
      showToast(`Support ticket #${ticketId} submitted successfully!`, "success");
    });
  }

  // Bind FAQ Accordion
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isActive = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));
      if (!isActive) {
        item.classList.add("open");
      }
    });
  });
}
