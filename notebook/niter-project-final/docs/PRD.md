# 📋 Product Requirements Document (PRD)

## Project: **Notebook — Unified Campus Social & Real-Time Information Hub**
* **Document Version:** 1.2 (Hackathon Primary Selection & Mentor Review Edition)
* **Author / Project Lead:** Notebook Engineering & Product Team
* **Target Audience:** Hackathon Evaluation Jury, Academic Mentors, Campus Administrators
* **Pilot Institution:** National Institute of Textile Engineering & Research (NITER) / Multi-Campus Scalable

---

## 1. Executive Summary & Vision

Modern higher-education campuses suffer from extreme digital fragmentation. Academic routines, exam updates, campus transit alerts, emergency blood donor appeals, and lost-and-found notices are dispersed across disconnected WhatsApp groups, Facebook pages, Telegram channels, and physical notice boards.

This chaos leads to **information overload, missed academic deadlines, delayed transit notices, and dangerous bottlenecks during medical emergencies**.

**Notebook** is a purpose-built, offline-capable Progressive Web Application (PWA) and verified campus social platform that unifies all essential student services into a centralized, fast, and accessible digital ecosystem.

### Core Value Proposition
> **"One Campus, One Feed, Zero Lost Notices."**  
> Notebook replaces the noise of unstructured messaging groups with categorized, real-time, searchable, and offline-accessible campus hubs tailored to the student lifestyle.

---

## 2. Competitive Landscape & Benchmark Analysis

| Dimension | WhatsApp / Messenger Groups | Facebook Groups / Pages | Physical Notice Boards | **Notebook (Our Solution)** |
|---|---|---|---|---|
| **Information Structure** | Chaotic chronological chat stream | Algorithmically demoted posts | Static, campus-bound only | **5 Categorized Functional Hubs** |
| **Emergency Blood Requests** | Buried under general chatter | Low reach due to feed algorithms | Ineffective | **Dedicated Health Tag & Urgent Filter** |
| **Offline Accessibility** | Requires active internet | Fails completely offline | Physical only | **PWA Caching & Bottom Toast Alerts** |
| **Campus Identity & Trust** | Random phone numbers / aliases | External unverified accounts | Anonymous | **Department, Year & Student ID Tagging** |
| **Searchability** | Poor search across media | Fragmented keywords | None | **Instant Real-Time Keyword Filter** |
| **Safety & Moderation** | Admin ban only (reactive) | Generic Facebook reporting | None | **Built-in Campus Safety & Report Desk** |

---

## 3. Target User Personas & User Journeys

### 3.1 Detailed User Personas

#### 👤 Persona 1: Tanvir — The Commuting Undergraduate
* **Profile:** 2nd Year Computer Science & Engineering student; commutes 20km daily by campus transport.
* **Core Frustrations:** Misses abrupt bus departure changes, cannot find assignment deadlines when Wi-Fi is spotty in transit.
* **Notebook Solution:** Checks the dedicated **Transport Desk** and reads cached academic posts offline while on the bus.

#### 👤 Persona 2: Sumaiya — The Class Representative (CR)
* **Profile:** 3rd Year CR responsible for 60+ classmates.
* **Core Frustrations:** Spends hours repeating routine changes, room reassignments, and lab schedules on WhatsApp.
* **Notebook Solution:** Publishes official notices under the **Academic Hub** with permanent tags and reference bookmarks.

#### 👤 Persona 3: Dr. Rafiq / Club Volunteer — Campus Health & Red Crescent Lead
* **Profile:** Campus medical volunteer coordinating emergency blood donations.
* **Core Frustrations:** Broadcasts for urgent blood (e.g., O-Negative) go unnoticed or get answered hours too late.
* **Notebook Solution:** Posts directly to the **Emergency Health Hub** with one-tap contact buttons for verified student donors.

#### 👤 Persona 4: Campus Administration & Safety Officer
* **Profile:** Student Affairs coordinator tasked with maintaining student well-being.
* **Core Frustrations:** No structured channel to capture harassment complaints, lost property claims, or feedback.
* **Notebook Solution:** Reviews prioritized tickets via the **Campus Safety & Report Desk**.

---

### 3.2 End-to-End User Journey Map

```
  ┌─────────────────┐        ┌───────────────────┐        ┌───────────────────┐
  │ 1. ONBOARDING   │        │ 2. DISCOVERY      │        │ 3. INTERACTION    │
  │ • Quick Auth    │─────▶ │ • Choose Hub      │───────▶│ • React (Upvote)  │
  │ • Student ID    │        │ • Search & Filter │        │ • Thread Comment  │
  │ • Dept Tagging  │        │ • Read Notices    │        │ • Save / Bookmark │
  └─────────────────┘        └───────────────────┘        └───────────────────┘
                                                                    │
  ┌─────────────────┐       ┌─────────────────┐                     │
  │ 5. RECONNECTION │       │ 4. OFFLINE MODE │                     │
  │ • Sync Updates  │◀─────│ • Cached Posts  │◀────────────────────┘
  │ • Status Toast  │       │ • Local Storage │
  │ • Realtime Pull │       │ • Bottom Alert  │
  └─────────────────┘       └─────────────────┘
```

---

## 4. Comprehensive Functional Requirements (FR)

### Module 1: Authentication, Identity & Recovery
* **FR-1.1 Student Registration & Login:** Email/password authentication integrated via Supabase GoTrue with secure JWT session tokens.
* **FR-1.2 Identity Tagging:** Auto-extracts and records student name, department (CSE, TE, EEE, BBA, etc.), and academic year.
* **FR-1.3 Integrated Password Recovery:** Users can initiate password reset emails directly inside the authentication modal without leaving the app.
* **FR-1.4 Account Re-creation Safeguard:** Handles re-registration workflows cleanly by updating existing records without generating orphaned data.

### Module 2: Categorized Hub Feeds & Search Engine
* **FR-2.1 Five Dedicated Functional Hubs:**
  1. **🏠 Home / General:** Campus-wide discussions, cultural events, sports meets, and club announcements.
  2. **📚 Academic:** Lecture materials, exam schedules, assignment reminders, and CR announcements.
  3. **🚌 Transport:** Campus bus route maps, departure times, traffic delays, and seat queries.
  4. **📦 Logistics:** Canteen daily menus, library notices, hostel guidelines, and lost-and-found listings.
  5. **❤️ Health & Emergency:** Urgent blood donation appeals, medical clinic hours, and first-aid advisories.
* **FR-2.2 Instant Filter & Search:** Real-time client-side substring and category filter with debounce for immediate results.

### Module 3: Post Creation & Media Engine
* **FR-3.1 Rich Post Publishing:** Title, formatted description, category assignment, and topic tags.
* **FR-3.2 Client-Side Image Compression:** Automated image scaling and base64 compression to conserve mobile bandwidth and storage quotas.
* **FR-3.3 Author Identification Badge:** Visual display of author avatar, full name, department chip, and human-readable relative timestamp (e.g., "5m ago").

### Module 4: Community Engagement & Personal Vault
* **FR-4.1 Multi-Sentiment Reactions:** Instant reaction toggles: **Upvote** (endorsement/agreement), **Heart** (appreciation), and **Helpful** (academic utility).
* **FR-4.2 Threaded Comments:** Collapsible peer discussion section under every post with real-time UI updates.
* **FR-4.3 Saved Vault (Bookmarks):** Private one-click bookmarking allowing students to save schedules and notices for rapid access.

### Module 5: Progressive Web App (PWA) & Offline Engine
* **FR-5.1 Installability:** Manifest configuration enabling one-click "Add to Home Screen" on Android, iOS, Windows, and macOS.
* **FR-5.2 Service Worker Caching:** Intelligent caching of CSS, JS bundles, fonts, and assets for instant app boots.
* **FR-5.3 Bottom Offline Notification:** Smooth animated bottom banner notifying the user: *"You are currently offline. Showing cached campus content."* with automatic green reconnection confirmation.

### Module 6: Safety, Reporting & Emergency Support
* **FR-6.1 Community Report Desk:** Structured grievance submission for harassment, spam, misinformation, or academic violations.
* **FR-6.2 Campus Emergency Directory:** One-tap action buttons (WhatsApp, Phone Call, Email) connecting students to campus security, medical centers, and proctorial teams.

---

## 5. Non-Functional Requirements (NFR) & Quality Standards

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                        PERFORMANCE & UX TARGETS                        │
  │                                                                        │
  │   First Contentful Paint (FCP)    ───▶  < 0.8 seconds (4G)             │
  │   Time to Interactive (TTI)       ───▶  < 1.2 seconds                  │
  │   Total Initial Bundle Size       ───▶  < 180 KB (Gzipped)             │
  │   Lighthouse Performance Score    ───▶  95+ / 100                      │
  │   Accessibility Standard          ───▶  WCAG 2.1 Level AA Compliance   │
  │   Uptime & Availability           ───▶  99.9% Cloud SLA                │
  └────────────────────────────────────────────────────────────────────────┘
```

* **NFR-1 Security & Privacy:** All database mutations are protected with PostgreSQL Row-Level Security (RLS). Passwords are cryptographically hashed with bcrypt.
* **NFR-2 Cross-Platform Compatibility:** Fully responsive layout tested across mobile viewports (360px–428px), tablets (768px–1024px), and desktop displays (1280px+).
* **NFR-3 Modularity & Maintainability:** Zero monolithic spaghetti code. Strict modular breakdown separating Auth, Feed, Navigation, Post-Interactions, and Pages.

---

## 6. Risk Analysis & Mitigation Strategy

| Identified Risk | Severity | Probability | Mitigation Strategy |
|---|---|---|---|
| **Low connectivity during campus rush hours** | High | High | Offline Service Worker caching with graceful fallback to cached feed data. |
| **Spam / Misinformation in emergency posts** | High | Medium | Verified department identity tags and instantaneous community report queue. |
| **Storage exhaustion from large image uploads** | Medium | Medium | Client-side compression pipeline limits payloads before transmission. |
| **Database rate limits during hackathon demo** | Medium | Low | Dual-mode data fetching: live Supabase query with automatic local fallback state. |

---

## 7. Phased Product Roadmap

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🚀 PHASE 1: HACKATHON MVP (CURRENT PRODUCTION CANDIDATE)                │
│ • Complete Supabase Auth with Password Recovery & Profile Management    │
│ • 5 Functional Hubs (Academic, Transport, Logistics, Health, General)   │
│ • Real-time Reactions, Threaded Comments, and Saved Bookmarks           │
│ • Offline-First PWA with Smart Bottom Status Banner                     │
│ • Campus Safety Report Desk & Emergency Directory                       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 🌟 PHASE 2: POST-SELECTION SCALE & INTEGRATION                          │
│ • Direct Peer-to-Peer Encrypted Chat & Classmate Messaging              │
│ • Live GPS Campus Shuttle Tracking on Interactive Map                   │
│ • Automated Blood Donor Push Alerts (Matching Blood Group & Location)   │
│ • University Single Sign-On (SSO) & Student Portal API Integration      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏆 PHASE 3: INTER-CAMPUS EXPANSION                                      │
│ • Multi-University Federation (Inter-Campus Academic Contests)          │
│ • AI-Powered Routine & Exam Schedule Extractor from PDFs                │
│ • Campus Marketplace for Used Textbooks & Lab Equipment                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Hackathon Evaluation Rubric Alignment

| Criterion | Weight | How Notebook Excels |
|---|---|---|
| **Innovation & Impact** | 30% | Directly solves the daily campus communication nightmare and life-critical blood donor bottleneck. |
| **Technical Execution** | 25% | PWA offline capability, sub-second performance, modular ES6+ architecture, and Supabase integration. |
| **Design & User Experience** | 25% | Intuitive 5-hub navigation, clean dark/light UI, responsive mobile-first ergonomics, and zero clutter. |
| **Completeness & Viability** | 20% | Fully working prototype with robust error handling, seed resilience, and clear multi-phase roadmap. |
