# CivicSync
## A Community-Driven Smart Civic Issue Reporting and Resolution System

CivicSync is a responsive classroom demonstration prototype based on the supplied project abstract and the 11 documented use cases. It demonstrates the complete complaint lifecycle through citizen, municipal official and public transparency views.

## What is implemented

| Use case | Demonstration behaviour |
|---|---|
| UC-01 Authenticate User | Demo sign-in, citizen registration, sign-out and role-specific views |
| UC-02 Report Civic Issue | Validated complaint form with title, description and category |
| UC-03 Upload Location and Evidence | Address, ward, coordinates, browser geolocation and optional evidence image |
| UC-04 Manage Complaint | Search, filter, inspect complaints and view activity history |
| UC-05 Verify Civic Issue | One positive or negative verification per demo user; cannot verify own report |
| UC-06 Detect Duplicate Complaint | Same-category reports within 75 metres are flagged for review |
| UC-07 Vote and Prioritize Issue | One active vote per demo user; priority recalculates as votes increase |
| UC-08 Assign Complaint to Department | Category-based department recommendation and official assignment |
| UC-09 Track Deadline and Escalate | Category-based SLA deadline, countdown and overdue escalation simulation |
| UC-10 View Transparency Dashboard | Complaint totals, resolution rate, category breakdown and department performance |
| UC-11 Update Status and Resolve Issue | Status history; resolution requires remarks and a proof photo |

## Run locally

Requirements: Node.js 18+ and npm.

1. Extract the project ZIP.
2. Open a terminal in the project folder.
3. Run:

```bash
npm install
npm run dev
```

4. Open the local URL printed by Vite.

## Demo access

- Citizen: `manish@civicsync.demo` / `Manish@123`
- Municipal official: `official@civicsync.demo` / `Civic@123`
- Public visitor: `public@civicsync.demo` / `Civic@123`

The sign-in screen also provides one-click demo access. New registrations create citizen demo accounts.

## Build for deployment

```bash
npm run build
npm run preview
```

## Important prototype scope

This version is designed for a self-contained classroom demonstration. Demo accounts and complaint records are stored in the current browser's `localStorage`. Changes persist after refresh in that browser, but are not synchronized between different devices or browsers. The public/official/citizen role switch is a demonstration convenience, not production authentication.

The 75-metre duplicate check uses browser-side distance calculation. SLA deadlines and escalations are simulated in the browser. Evidence and resolution images are stored as browser data URLs and are subject to browser storage limits. The prototype does not send data to a municipal server or Supabase.

For production deployment, connect the reviewed Supabase/PostGIS schema, enforce authorization and business rules server-side, configure scheduled escalation, and use private storage policies. Do not use the demo credentials for real users.

## Project team

- L. Manideep
- M. Srikuthi
- M. Manish (Manish Mahato)
