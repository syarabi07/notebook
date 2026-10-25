<div align="center">

# 🎓 NOTEBOOK
### Unified Campus Social & Real-Time Information Hub

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Capable-FFA000?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Lighthouse](https://img.shields.io/badge/Lighthouse-98%2F100-brightgreen?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developers.google.com/web/tools/lighthouse)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Bridging the communication gap across university campuses with verified feeds, instant emergency blood requests, transit tracking, and resilient offline capability.</b>
</p>

[Explore Features](#-key-features--hub-architecture) • [Quick Start](#-quick-start-guide) • [Architecture](#-system-architecture) • [Hackathon Demo Flow](#-3-minute-hackathon-pitch-script) • [PRD & Specs](#-documentation-suite)

</div>

---

## 📌 Problem vs. Solution

| The Campus Problem Today | The Notebook Solution |
|---|---|
| 📢 **Buried Academic Notices:** Critical exam and class routine changes get lost under thousands of informal messages in messaging groups. | 📚 **Dedicated Academic Hub:** Clean, categorized academic notices tagged by department and semester with permanent bookmarking. |
| 🩸 **Emergency Blood Bottlenecks:** Life-critical blood requests fail due to missing donor filters and slow broadcast reach. | ❤️ **Emergency Health Hub:** Instant access to blood donor calls, urgent filters, and one-tap volunteer contact actions. |
| 🚌 **Commuter Transit Uncertainty:** Students miss unscheduled bus changes and room relocations while traveling. | 🚌 **Real-Time Transport Desk:** Centralized schedule updates and commuter alerts accessible from any device. |
| 📴 **Unstable Campus Connectivity:** Weak Wi-Fi in auditoriums and dormitories cuts students off from vital information. | 📱 **Offline-First PWA:** Service Worker caching with smooth bottom status alert (*"Showing cached campus content"*). |

---

## ✨ Key Features & Hub Architecture

### 🏛️ 1. Five Specialized Functional Hubs
* **🏠 General / Home:** Inter-departmental highlights, campus events, sports meets, and student club showcases.
* **📚 Academic Hub:** Syllabus notes, assignment briefs, exam routines, and class representative announcements.
* **🚌 Transport Desk:** Real-time campus bus schedules, route notices, and commuter alerts.
* **📦 Logistics & Lost/Found:** Hostel notices, canteen daily menus, library hours, and lost item reports.
* **❤️ Emergency Health & Blood Registry:** Urgent blood donation appeals, on-campus medical center hours, and emergency first-aid contacts.

### 🔐 2. Robust Student Identity & Security
* **Student ID & Department Tagging:** Automatic profile attribution showing student batch, department, and ID.
* **Self-Service Password Reset:** Integrated email-based recovery directly within the login modal.
* **Seamless Account Re-creation:** Safeguards that prevent orphaned or stale user profile records.

### 💬 3. Engagement & Personal Bookmarking
* **Multi-Sentiment Reactions:** Instant reaction toggles: **Upvote** (endorsement/agreement), **Heart** (appreciation), and **Helpful** (academic utility).
* **Threaded Commenting:** Active peer discussions under every post with real-time UI updates.
* **Private Bookmarking (Saved Vault):** One-tap saving of important schedules and notes for fast recall.

### 📱 4. Offline-First PWA Technology
* **Installable on Any Device:** Installable on Android, iOS, Windows, and macOS as a native standalone app.
* **Smart Bottom Offline Banner:** Non-intrusive bottom notification alert indicating cached campus mode when internet connectivity drops.
* **Automatic Background Sync:** Restores live feed queries immediately upon reconnection.

### 🛡️ 5. Campus Safety & Support Desk
* **Community Report System:** Multi-category reporting mechanism for harassment, spam, or false information.
* **One-Tap Emergency Directory:** Direct WhatsApp, phone call, and email shortcuts to campus authorities and medical clubs.

---

## 🏗️ System Architecture

Notebook leverages a modern **Decoupled Client-First Progressive Web Architecture**:

```
 ┌────────────────────────────────────────────────────────────────┐
 │                 Notebook Progressive Web App                   │
 │             (ES6+ Modular JS + Tailwind CSS v4)                │
 └──────────────┬───────────────────────────────┬─────────────────┘
                │ (Offline Cache)               │ (REST / WebSockets)
                ▼                               ▼
     ┌─────────────────────┐        ┌────────────────────────┐
     │   Service Worker    │        │    Supabase Backend    │
     │      (sw.js)        │        │ • PostgreSQL 15 (RLS)  │
     │ • Cache Storage     │        │ • GoTrue Auth (JWT)    │
     │ • Offline Fallback  │        │ • Realtime CDC Engine  │
     └─────────────────────┘        └────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm**, **bun**, or **yarn**

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/notebook-campus-social.git

# Navigate to the project root
cd notebook-campus-social

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (or use default configuration):
```env
VITE_SUPABASE_URL=https://vrkcucdeqavujvfbkqpk.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 4. Build for Production & Linting
```bash
# Verify code quality
npm run lint

# Compile optimized static bundle
npm run build
```
The compiled, minified production assets will be generated in the `/dist` directory.

---

## 📂 Project Directory Structure

```
├── /css                       # Clean modular CSS layer powered by Tailwind CSS v4
│   ├── /base                  # Reset, modern typography, and keyframe animations
│   ├── /components            # Auth modal, cards, create-post widget, PWA toasts
│   ├── /layout                # Top navbar, bottom navigation, and adaptive sidebar
│   └── /pages                 # Page-specific styling (Friends, Profile, Saved, Support)
├── /js                        # Modular ES6+ JavaScript Layer
│   ├── /config                # Supabase client singleton configuration
│   ├── /modules               # Core application engines (Auth, Feed, Comments, Navigation, PWA)
│   ├── /pages                 # Standalone page controllers (Profile, Saved Items, Support, Report Desk)
│   └── main.js                # Main application bootstrap and event orchestration
├── /docs                      # Comprehensive documentation suite
│   ├── PRD.md                 # Product Requirements Document, Personas & Roadmap
│   ├── TECHNOLOGY.md          # Technical Architecture, ERD & Security Documentation
│   └── README.md              # Project overview, quick start & pitch guide
├── /public
│   └── manifest.json          # PWA web manifest configuration
├── index.html                 # Semantic HTML5 root document
└── sw.js                      # Service Worker for offline caching & background sync
```

---

## 🎯 3-Minute Hackathon Pitch Script

| Time | Segment | What to Say & Demonstrate to the Jury |
|---|---|---|
| **0:00 – 0:45** | **The Problem** | *"Judges, university students lose hours every week scrolling through noisy WhatsApp groups trying to find bus schedules, class routines, or urgent blood donors. Notebook solves this by providing a unified, verified campus social network."* (Show Mobile View). |
| **0:45 – 1:45** | **The 5 Hubs & Post Flow** | *"With Notebook, students have 5 dedicated hubs: Academic, Transport, Health, Logistics, and General Life. Watch how easy it is to filter exam notices or publish a post with instant image compression and student ID attribution."* (Create post & react). |
| **1:45 – 2:30** | **Offline Resilience** | *"Campus Wi-Fi often drops in transit or basements. Watch what happens when I switch to Offline mode: Notebook keeps working seamlessly from cached storage and alerts the user with a smooth bottom status toast."* (Toggle Offline mode in DevTools). |
| **2:30 – 3:00** | **Safety & Roadmap** | *"We've also built in a Campus Safety Report Desk and One-Tap Emergency Directory. In Phase 2, we are expanding to GPS shuttle tracking and SMS emergency donor broadcasts. Thank you!"* |

---

## 📚 Documentation Suite

* 📄 **[PRD.md](./PRD.md)** — Complete Product Requirements, User Personas, Feature Matrix & Roadmap.
* 🛠️ **[TECHNOLOGY.md](./TECHNOLOGY.md)** — Technical Architecture, PostgreSQL 15 DDL, Security Posture & Performance Metrics.
* 📖 **[README.md](./README.md)** — Comprehensive Project Overview and Hackathon Evaluation Guide.

---

## 👥 Contributors & Acknowledgements

* **Developer & Project Lead:** Built for the Campus Hackathon Primary Selection.
* **Pilot Campus:** National Institute of Textile Engineering & Research (NITER).
* **Special Thanks:** Campus mentors, student beta testers, and open-source contributors.

---

<div align="center">
  <sub>Built with ❤️ for student communities everywhere.</sub>
</div>
