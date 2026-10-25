export const NITER_DEPTS = {
  CS: { name: "Computer Science & Engineering", code: "CSE" },
  TE: { name: "Textile Engineering", code: "TE" },
  EE: { name: "Electrical & Electronic Engineering", code: "EEE" },
  IP: { name: "Industrial & Production Engineering", code: "IPE" },
  FD: { name: "Fashion Design", code: "FD" },
};

export const sidebarData = {
  home: [
    {
      label: "Friends & Network",
      icon: "users",
      submenus: [
        "My Friends",
        "All Classmates",
        "Friend Requests",
        "Blocked List",
      ],
    },
    {
      label: "Saved Posts",
      icon: "bookmark",
      action: "saved",
    },
    {
      label: "Communities",
      icon: "component",
      submenus: ["Study Circles", "Department Clubs", "Sports Forum"],
    },
    {
      label: "Campus Events",
      icon: "calendar",
      submenus: ["Upcoming Events", "Academic Calendar", "Club Workshops"],
    },
    {
      label: "Student Market",
      icon: "shopping-bag",
      submenus: ["Browse Listings", "My Products", "Post New Item"],
    },
  ],
  health: [
    {
      label: "Nearby Hospitals",
      icon: "map-pin",
      submenus: ["Emergency Clinics", "Partner Hospitals", "24/7 Pharmacies"],
    },
    {
      label: "Ambulance Service",
      icon: "phone-call",
      submenus: ["Request Emergency", "Campus First Aid", "Hotline Numbers"],
    },
    {
      label: "Blood Donation",
      icon: "droplet",
      submenus: ["Find Donors", "Register as Donor", "Active Requests"],
    },
    {
      label: "Medical History",
      icon: "clipboard-list",
      submenus: ["Prescriptions", "Vaccination Cards", "Doctor Reports"],
    },
  ],
  transport: [
    {
      label: "Bus Schedule",
      icon: "clock",
      submenus: ["Main Campus Route", "City Express Route", "Weekend Schedule"],
    },
    {
      label: "Shuttle Tracking",
      icon: "navigation",
      submenus: ["Live GPS Map", "Stop Timings", "Route Delays"],
    },
    {
      label: "Ride Sharing",
      icon: "car",
      submenus: ["Available Rides", "Offer a Ride", "My Shared Trips"],
    },
    {
      label: "Parking Spot",
      icon: "square-parking",
      submenus: ["Student Parking", "Faculty Bay", "Visitor Permit"],
    },
  ],
  academic: [
    {
      label: "Courses",
      icon: "book",
      submenus: ["Enrolled Modules", "Course Outlines", "Lecture Materials"],
    },
    {
      label: "Class Routine",
      icon: "calendar-days",
      submenus: ["Weekly Timetable", "Exam Schedule", "Room Allocations"],
    },
    {
      label: "Notices",
      icon: "megaphone",
      submenus: ["Department Notices", "Controller Office", "General Alerts"],
    },
    {
      label: "Assignments",
      icon: "pen-tool",
      submenus: ["Pending Tasks", "Submitted Work", "Graded Reports"],
    },
    {
      label: "Results",
      icon: "graduation-cap",
      submenus: ["Semester Grades", "CGPA Calculator", "Transcript Request"],
    },
  ],
  logistics: [
    {
      label: "Lost & Found",
      icon: "search",
      submenus: ["Recent Claims", "Report Lost Item", "Report Found Item"],
    },
    {
      label: "Maintenance",
      icon: "wrench",
      submenus: ["Hall Repair", "Lab Equipment", "Electrical Requests"],
    },
    {
      label: "Complaints",
      icon: "alert-circle",
      submenus: ["Submit Complaint", "Track Progress", "Resolved Issues"],
    },
    {
      label: "Campus Services",
      icon: "briefcase",
      submenus: ["ID Card Counter", "Printing & Xerox", "Library Clearance"],
    },
  ],
};

export const moduleMeta = {
  home: {
    title: "Campus Social Feed",
    sub: "Connect with students, share updates, and see what's happening around campus.",
    subtitleCards: "Quick Tools & Shortcuts",
    metrics: [
      { label: "Total Users", val: "0" },
      { label: "Feed Status", val: "Live" },
    ],
  },
  health: {
    title: "Campus Health Hub",
    sub: "Medical assistance, blood donor alerts, and emergency care updates.",
    subtitleCards: "Health Services & Tools",
    metrics: [
      { label: "On-Call Doctors", val: "3 Available" },
      { label: "Ambulance", val: "Standby" },
    ],
  },
  transport: {
    title: "Transport & Commute",
    sub: "Live bus tracking, shuttle schedules, and student ride-sharing posts.",
    subtitleCards: "Transport Services & Routes",
    metrics: [
      { label: "Live Shuttles", val: "4 En Route" },
      { label: "Next Departure", val: "12 mins" },
    ],
  },
  academic: {
    title: "Academic Discussions",
    sub: "Course announcements, routine updates, assignment help, and study groups.",
    subtitleCards: "Academic Portals & Resources",
    metrics: [
      { label: "Current Term", val: "Fall 2026" },
      { label: "Due Tasks", val: "2 Pending" },
    ],
  },
  logistics: {
    title: "Campus Logistics & Helpdesk",
    sub: "Lost & found items, hall maintenance requests, and administrative notices.",
    subtitleCards: "Campus Services & Support",
    metrics: [
      { label: "Open Tickets", val: "1 Pending" },
      { label: "Service Desk", val: "Open" },
    ],
  },
};

export const cardData = {
  home: [
    {
      icon: "user",
      title: "My Profile",
      desc: "View and edit your personal profile and published posts.",
      tag: "0 Posts",
    },
    {
      icon: "users",
      title: "Friends & Network",
      desc: "Connect with classmates and campus friends.",
      tag: "0 Friends",
    },
    {
      icon: "bookmark",
      title: "Saved Posts",
      desc: "Access all your bookmarked campus posts and notices.",
      tag: "Saved",
    },
  ],
  health: [
    {
      icon: "map-pin",
      title: "Nearby Hospitals",
      desc: "Find emergency clinics and 24/7 pharmacies.",
      tag: "24/7 Open",
    },
    {
      icon: "phone-call",
      title: "Ambulance Hotline",
      desc: "Instant emergency transport dispatch.",
      tag: "Fast Dispatch",
    },
    {
      icon: "droplet",
      title: "Blood Donors",
      desc: "Register or search active blood donors on campus.",
      tag: "14 Active",
    },
    {
      icon: "clipboard-list",
      title: "Medical History",
      desc: "Keep track of health visits and prescriptions.",
      tag: "Encrypted",
    },
  ],
  transport: [
    {
      icon: "clock",
      title: "Bus Schedule",
      desc: "Departure times for city and campus routes.",
      tag: "On Schedule",
    },
    {
      icon: "navigation",
      title: "Shuttle Tracker",
      desc: "Follow campus shuttles on the GPS map.",
      tag: "Live GPS",
    },
    {
      icon: "car",
      title: "Ride Sharing",
      desc: "Split rides with students heading to Dhaka.",
      tag: "5 Offers",
    },
    {
      icon: "square-parking",
      title: "Parking Spot",
      desc: "Check open parking slots before arriving.",
      tag: "78% Free",
    },
    {
      icon: "ticket",
      title: "Transport Passes",
      desc: "Renew monthly student bus tokens online.",
      tag: "Digital ID",
    },
    {
      icon: "map",
      title: "Route Maps",
      desc: "Explore all campus bus and shuttle routes.",
      tag: "Schedules",
    },
  ],
  academic: [
    {
      icon: "book",
      title: "My Courses",
      desc: "Access enrolled modules, outlines, and slides.",
      tag: "5 Modules",
    },
    {
      icon: "calendar-days",
      title: "Class Routine",
      desc: "Weekly class and lab timetable at a glance.",
      tag: "Updated",
    },
    {
      icon: "megaphone",
      title: "Department Notices",
      desc: "Official updates from the controller office.",
      tag: "1 New",
    },
    {
      icon: "pen-tool",
      title: "Assignments",
      desc: "Track upcoming submission deadlines.",
      tag: "Due Friday",
    },
    {
      icon: "graduation-cap",
      title: "Results & CGPA",
      desc: "View semester transcripts and calculate CGPA.",
      tag: "Term Released",
    },
  ],
  logistics: [
    {
      icon: "search",
      title: "Lost & Found",
      desc: "Search for missing items or report found objects.",
      tag: "6 Found",
    },
    {
      icon: "wrench",
      title: "Maintenance",
      desc: "Report repairs for hall rooms or lab equipment.",
      tag: "Quick Ticket",
    },
    {
      icon: "briefcase",
      title: "Campus Services",
      desc: "ID replacement, printing, and clearances.",
      tag: "Self-Service",
    },
  ],
};
