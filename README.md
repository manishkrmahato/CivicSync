# CivicSync: Civic Issue Reporting & Resolution Platform

CivicSync is a civic infrastructure platform for municipal governance and public service delivery. Built with React, TypeScript, Vite, Tailwind CSS, shadcn/ui primitives, and Supabase PostgreSQL with PostGIS.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on v24.19)
- npm 9+

### Installation & Local Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure Environment Variables
# Copy the template to .env
cp .env.example .env

# Populate with your Supabase project keys:
# VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# 3. Start Development Server
npm run dev

# 4. Run Test Suite
npm test

# 5. Build for Production
npm run build
```

---

## 2. Project Architecture & Standards

- **Design Philosophy:** Minimalist editorial civic technology, warm neutral backgrounds (`stone-50` canvas), deep forest green accents (`#1B4332`), and monospace tabular numerals (`tabular-nums`).
- **Strict TypeScript:** `noImplicitAny: true` and `strict: true` across all domain models.
- **Row Level Security (RLS):** All data access is strictly governed by PostgreSQL RLS.
- **Zero Mock Data:** If Supabase credentials are missing, the UI gracefully prompts for configuration instead of fabricating fake data or bypassing authentication.

---

## 3. Pre-Configured Demo Accounts

Standard email/password accounts configured in Supabase to test role-based access:

| Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civicsync.org` | `CivicSync@2026` | Citizen Portal (`/citizen`), Issue reporting &amp; community verification |
| **Official** | `official@civicsync.org` | `CivicSync@2026` | Official Operations Console (`/official`), Triage, Duplicate review &amp; routing |
| **Dept Staff** | `roads.dept@civicsync.org` | `CivicSync@2026` | Official Operations Console (`/official`), Field status updates &amp; resolution |

---

## 4. Implementation Phasing

- **Batch 1 (Completed):** Foundation, Editorial Design System & Authentication Layer (`UC-01`).
- **Batch 2 (Next):** Issue Reporting Engine, Leaflet Geolocation & Photographic Evidence (`UC-02`, `UC-03`).
- **Batch 3:** Community Verification, PostGIS Proximity Deduplication & Prioritization (`UC-05`, `UC-06`, `UC-07`).
- **Batch 4:** Official Triage Console, Department Routing & SLA Escalation (`UC-04`, `UC-08`, `UC-09`, `UC-11`).
- **Batch 5:** Public Transparency Dashboard, Recharts Analytics & Production Deployment (`UC-10`).

