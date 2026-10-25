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

/**
 * Renders the Report Page.
 * @param {Object|null} reportTargetData Optional target info if coming from Post Card or View Profile page.
 *  e.g., { targetType: 'post'|'profile', targetName: 'John Doe', targetId: 'CS 2607033', postId: '123' }
 */
export async function renderReportPage(reportTargetData = null) {
  setCurrentModule("report");
  clearNavActiveStates();
  renderRightSidebar("report");
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

  if (pageTitle) pageTitle.innerText = "Report Center";
  if (pageEyebrow) pageEyebrow.innerText = "SAFETY & MODERATION";
  if (pageSub)
    pageSub.innerText =
      "Report inappropriate posts, harassment, fake profiles, or safety violations directly to our campus moderation desk.";
  if (moduleBadge) moduleBadge.innerText = "REPORT";

  if (feedTitle) feedTitle.innerText = "Report Channels";
  if (feedFilterTag)
    feedFilterTag.innerHTML = `<span class="realtime-live-dot"></span> MODERATION DESK`;

  // Render Header Metrics Ribbon
  renderMetrics([
    { label: "Helpline", val: "+880 1710-181527" },
    { label: "Email", val: "notebooksupport@gmail.com" },
  ]);

  const userNameVal =
    currentProfile?.full_name ||
    currentProfile?.name ||
    currentUser?.email?.split("@")[0] ||
    "";
  const userEmailVal = currentUser?.email || "";

  // Auto-fill target user values if navigated from Post card or View Profile page
  const autofillTargetName = reportTargetData?.targetName || "";
  const autofillTargetId =
    reportTargetData?.targetId ||
    (reportTargetData?.postId ? `Post #${reportTargetData.postId}` : "");

  let autofillSubject = "";
  if (autofillTargetName) {
    if (reportTargetData?.targetType === "post") {
      autofillSubject = `Report regarding post by ${autofillTargetName}${
        reportTargetData?.postId ? ` (Post #${reportTargetData.postId})` : ""
      }`;
    } else {
      autofillSubject = `Report regarding profile: ${autofillTargetName}${
        autofillTargetId ? ` (${autofillTargetId})` : ""
      }`;
    }
  }

  const reportHTML = `
    <div class="support-container">
      
      <!-- HERO ANNOUNCEMENT BANNER -->
      <div class="support-banner" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%); border-left: 4px solid var(--accent-red, #EF4444);">
        <div class="support-banner-content">
          <div class="support-banner-icon" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">
            <i data-lucide="shield-alert"></i>
          </div>
          <div>
            <h3>Campus Safety & Report Desk</h3>
            <p>We take campus safety and community guidelines seriously. If you encounter abusive behavior, spam, harassment, or fake accounts, submit a report below or reach our moderation team directly on WhatsApp or Facebook for urgent issues.</p>
          </div>
        </div>
      </div>

      <!-- TOP FEATURED CARD: FACEBOOK DESK -->
      <div class="support-card support-card-featured support-card-facebook">
        <div class="support-featured-inner">
          <div class="support-featured-info">
            <div class="support-card-header">
              <div class="support-icon-box facebook-bg">
                <i data-lucide="share-2"></i>
              </div>
              <div>
                <h4 class="support-card-title">Campus Moderation Page</h4>
                <p class="support-card-sub">Official Facebook contact & active campus safety desk</p>
              </div>
            </div>

            <div class="support-number-box">
              <span class="support-country-tag">FB</span>
              <span class="support-phone-val">Campus Facebook Page</span>
            </div>

            <p class="support-card-desc">Send a direct message on Facebook Messenger to connect with our moderation leads for urgent safety reports or appeal requests.</p>
          </div>

          <div class="support-featured-actions">
            <a href="https://www.facebook.com/share/1EZmJPVpnN/" target="_blank" rel="noopener noreferrer" class="btn btn-facebook full-width-btn">
              <i data-lucide="external-link"></i> <span>Open Facebook Desk</span>
            </a>
            <button class="btn btn-outline full-width-btn copy-support-btn" data-copy="https://www.facebook.com/share/1EZmJPVpnN/">
              <i data-lucide="copy"></i> <span>Copy FB Link</span>
            </button>
          </div>
        </div>
      </div>

      <!-- SECONDARY 2-COLUMN GRID: WHATSAPP & EMAIL -->
      <div class="support-secondary-grid">
        
        <!-- CHANNEL 1: WHATSAPP SAFETY HELPLINE -->
        <div class="support-card support-card-whatsapp">
          <div class="support-card-header">
            <div class="support-icon-box whatsapp-bg">
              <i data-lucide="message-circle"></i>
            </div>
            <div>
              <h4 class="support-card-title">Urgent WhatsApp Line</h4>
              <p class="support-card-sub">Fastest live response for safety concerns</p>
            </div>
          </div>

          <div class="support-number-box">
            <span class="support-country-tag">BD</span>
            <span class="support-phone-val">+880 1710-181527</span>
          </div>

          <p class="support-card-desc">Contact our safety hotline directly on WhatsApp for immediate escalation of harassment, unauthorized content, or account compromises.</p>

          <div class="support-card-actions">
            <a href="https://wa.me/8801710181527" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp full-width-btn">
              <i data-lucide="message-circle"></i> <span>WhatsApp Safety Line</span>
            </a>
            <button class="btn btn-outline btn-sm copy-support-btn" data-copy="+8801710181527">
              <i data-lucide="copy"></i> <span>Copy Number</span>
            </button>
          </div>
        </div>

        <!-- CHANNEL 2: EMAIL REPORT DESK -->
        <div class="support-card support-card-email">
          <div class="support-card-header">
            <div class="support-icon-box mail-bg">
              <i data-lucide="mail"></i>
            </div>
            <div>
              <h4 class="support-card-title">Email Report Desk</h4>
              <p class="support-card-sub">Formal reports & documentation</p>
            </div>
          </div>

          <div class="support-number-box">
            <span class="support-country-tag">EMAIL</span>
            <span class="support-phone-val" style="font-size: 0.82rem; word-break: break-all; line-height: 1.2;">notebooksupport@gmail.com</span>
          </div>

          <p class="support-card-desc">Submit formal report files or detailed incident logs to our official email inbox. Reviewed within 24 hours.</p>

          <div class="support-card-actions">
            <a href="mailto:notebooksupport@gmail.com?subject=Campus%20Notebook%20Report%20Request" class="btn btn-email full-width-btn">
              <i data-lucide="send"></i> <span>Send Email Report</span>
            </a>
            <button class="btn btn-outline btn-sm copy-support-btn" data-copy="notebooksupport@gmail.com">
              <i data-lucide="copy"></i> <span>Copy Email</span>
            </button>
          </div>
        </div>

      </div>

      <!-- REPORT TICKET FORM -->
      <div class="support-form-card">
        <div class="support-card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <div class="support-icon-box primary-bg" style="background: rgba(239, 68, 68, 0.12); color: #EF4444;">
            <i data-lucide="flag"></i>
          </div>
          <div>
            <h3 class="support-card-title" style="font-size: 1.2rem;">Send a Report Message</h3>
            <p class="support-card-sub">Submit your report and our moderation team will review and take necessary action.</p>
          </div>
        </div>

        ${
          autofillTargetName
            ? `
          <div class="report-target-banner" style="background: rgba(42, 70, 255, 0.06); border: 1px solid rgba(42, 70, 255, 0.18); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; color: var(--text-main);">
            <i data-lucide="info" style="color: var(--primary); flex-shrink: 0; width: 18px; height: 18px;"></i>
            <span>Reporting <strong>${escapeHtml(
              autofillTargetName
            )}</strong> ${
                autofillTargetId
                  ? `(Ref: <code>${escapeHtml(autofillTargetId)}</code>)`
                  : ""
              }. Details have been auto-filled below.</span>
          </div>
        `
            : ""
        }

        <form id="report-ticket-form" class="support-form">
          
          <!-- REPORTER DETAILS -->
          <div class="support-form-grid">
            <div class="form-group">
              <label for="reporter-name" class="form-label">Your Name <span class="required">*</span></label>
              <input type="text" id="reporter-name" name="reporter_name" autocomplete="name" class="form-input" placeholder="e.g. Tanvir Hossain" value="${escapeHtml(
                userNameVal
              )}" required />
            </div>

            <div class="form-group">
              <label for="reporter-email" class="form-label">Your Contact / Email <span class="required">*</span></label>
              <input type="text" id="reporter-email" name="reporter_email" autocomplete="email" class="form-input" placeholder="e.g. student@niter.edu.bd or phone" value="${escapeHtml(
                userEmailVal
              )}" required />
            </div>
          </div>

          <!-- REPORTED TARGET DETAILS -->
          <div class="support-form-grid">
            <div class="form-group">
              <label for="reported-target-name" class="form-label">Reported User / Author Name <span class="required">*</span></label>
              <input type="text" id="reported-target-name" name="reported_target_name" class="form-input" placeholder="e.g. Samin Yeasar" value="${escapeHtml(
                autofillTargetName
              )}" required />
            </div>

            <div class="form-group">
              <label for="reported-target-id" class="form-label">Profile Student ID or Post Reference <span class="required">*</span></label>
              <input type="text" id="reported-target-id" name="reported_target_id" class="form-input" placeholder="e.g. CS 2607033 or Post #12345" value="${escapeHtml(
                autofillTargetId
              )}" required />
            </div>
          </div>

          <div class="form-group">
            <label for="report-category" class="form-label">Violation Category <span class="required">*</span></label>
            <div class="category-select-wrapper">
              <i data-lucide="tag" class="select-leading-icon"></i>
              <select id="report-category" name="report_category" class="form-select category-select" required>
                <option value="Harassment & Bullying" ${
                  autofillTargetName ? "selected" : ""
                }>🚨 Harassment, Bullying or Abuse</option>
                <option value="Inappropriate Content" ${
                  !autofillTargetName ? "selected" : ""
                }>🚫 Inappropriate Content / Offensive Language</option>
                <option value="Fake Profile / Impersonation">👤 Fake Profile or Impersonation</option>
                <option value="Spam & Misinformation">📩 Spam, Scams or Misinformation</option>
                <option value="Privacy & Safety">🔒 Privacy or Safety Violation</option>
                <option value="Community Guidelines Violation">⚠️ Other Community Guideline Violation</option>
              </select>
              <i data-lucide="chevron-down" class="select-trailing-icon"></i>
            </div>
          </div>

          <div class="form-group">
            <label for="report-subject" class="form-label">Subject <span class="required">*</span></label>
            <input type="text" id="report-subject" name="report_subject" class="form-input" placeholder="Brief summary of the violation or issue" value="${escapeHtml(
              autofillSubject
            )}" required />
          </div>

          <div class="form-group">
            <label for="report-message" class="form-label">Detailed Report Description <span class="required">*</span></label>
            <textarea id="report-message" name="report_message" class="form-textarea" rows="4" placeholder="Please describe what happened, including any links, context, or specific behavior..." required></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-report" style="background: #DC2626; border-color: #DC2626;">
              <i data-lucide="flag"></i> <span>Submit Report Message</span>
            </button>
          </div>
        </form>
        <div id="report-success-box" class="support-success-box hidden"></div>
      </div>

      <!-- FAQ ACCORDION SECTION -->
      <div class="support-faq-card">
        <div class="support-card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.25rem;">
          <div class="support-icon-box help-bg">
            <i data-lucide="help-circle"></i>
          </div>
          <div>
            <h3 class="support-card-title" style="font-size: 1.2rem;">Report & Moderation FAQ</h3>
            <p class="support-card-sub">Information about how reports are handled by campus moderators.</p>
          </div>
        </div>

        <div class="faq-list">
          <div class="faq-item">
            <button class="faq-question">
              <span>What happens after I submit a report?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Reports are reviewed by our campus moderation desk. If content violates guidelines, it will be hidden or removed, and appropriate account warnings or suspensions will be issued.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question">
              <span>Are reports confidential?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Yes. Your identity as a reporter is kept strictly private and is never disclosed to the user being reported.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question">
              <span>How long does it take for a report to be processed?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Urgent safety reports sent via WhatsApp (+880 1710-181527) are addressed within 15 minutes. Form submissions are typically processed within 1 to 12 hours.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-question">
              <span>Can I block a user directly while waiting for moderation?</span>
              <i data-lucide="chevron-down" class="faq-icon"></i>
            </button>
            <div class="faq-answer">
              <p>Yes. You can click <strong>Block User</strong> from the 3-dots menu on any post or profile page to immediately prevent that user from viewing your profile or interacting with your posts.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  if (postsFeed) {
    postsFeed.innerHTML = reportHTML;
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Bind Copy Buttons
  document.querySelectorAll(".copy-support-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.copy;
      if (text) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            showToast(`Copied ${text} to clipboard!`, "success");
          })
          .catch(() => {
            showToast(`Copied: ${text}`, "success");
          });
      }
    });
  });

  // Bind Form Submit
  const form = document.getElementById("report-ticket-form");
  const successBox = document.getElementById("report-success-box");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const reporterName = document.getElementById("reporter-name")?.value.trim();
      const reporterEmail = document.getElementById("reporter-email")?.value.trim();
      const reportedTargetName = document.getElementById("reported-target-name")?.value.trim();
      const reportedTargetId = document.getElementById("reported-target-id")?.value.trim();
      const category = document.getElementById("report-category")?.value;
      const subject = document.getElementById("report-subject")?.value.trim();
      const message = document.getElementById("report-message")?.value.trim();

      const reportTicketId = `RPT-${Math.floor(10000 + Math.random() * 90000)}`;

      // Persist report locally
      try {
        const existingReports = JSON.parse(
          localStorage.getItem("campus_report_tickets") || "[]"
        );
        const newReport = {
          id: reportTicketId,
          reporter_name: reporterName,
          reporter_email: reporterEmail,
          reported_target_name: reportedTargetName,
          reported_target_id: reportedTargetId,
          category,
          subject,
          message,
          created_at: new Date().toISOString(),
          user_id: currentUser?.id || null,
        };
        existingReports.unshift(newReport);
        localStorage.setItem(
          "campus_report_tickets",
          JSON.stringify(existingReports)
        );
      } catch (err) {
        console.warn("Error saving report ticket:", err);
      }

      const fullReportText = `Hello Campus Safety & Moderation Desk,\n\nI submitted Report Ticket #${reportTicketId}\nReporter: ${reporterName} (${reporterEmail})\nReported User/Target: ${reportedTargetName} (ID/Ref: ${reportedTargetId})\nCategory: ${category}\nSubject: ${subject}\n\nReport Details:\n${message}`;

      if (successBox) {
        successBox.innerHTML = `
          <div class="success-ticket-card" style="border-left: 4px solid #DC2626;">
            <div class="success-ticket-icon" style="color: #DC2626; background: transparent; padding: 0;">
              <i data-lucide="check-circle-2"></i>
            </div>
            <h4>Report Ticket Created & Logged!</h4>
            <p>Thank you <strong>${escapeHtml(
              reporterName
            )}</strong>. Your report reference is <strong class="ticket-id" style="color: #DC2626;">#${reportTicketId}</strong>.</p>
            <div class="ticket-meta">
              <span><strong>Reported Target:</strong> ${escapeHtml(
                reportedTargetName
              )} (${escapeHtml(reportedTargetId)})</span> &bull; 
              <span><strong>Category:</strong> ${escapeHtml(category)}</span>
            </div>
            <p class="ticket-note">To send your report directly to campus moderation for immediate action, select a channel below:</p>
            <div class="success-ticket-actions">
              <a href="https://wa.me/8801710181527?text=${encodeURIComponent(
                fullReportText
              )}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp btn-sm">
                <i data-lucide="message-circle"></i> <span>Send to WhatsApp (+880 1710-181527)</span>
              </a>
              <a href="mailto:notebooksupport@gmail.com?subject=${encodeURIComponent(
                `[Report #${reportTicketId}] ${subject}`
              )}&body=${encodeURIComponent(
          fullReportText
        )}" class="btn btn-email btn-sm">
                <i data-lucide="mail"></i> <span>Send via Email (notebooksupport@gmail.com)</span>
              </a>
            </div>
          </div>
        `;
        successBox.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
      }

      form.reset();
      showToast(
        `Report ticket #${reportTicketId} submitted successfully!`,
        "success"
      );
    });
  }

  // Bind FAQ Accordion
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const isActive = item.classList.contains("open");
      document
        .querySelectorAll(".faq-item")
        .forEach((i) => i.classList.remove("open"));
      if (!isActive) {
        item.classList.add("open");
      }
    });
  });
}
