# Project Context: Digital Risk Protection Prototype

## Current Goal

This app is a basic frontend tester for the Digital Risk Protection challenge focused on Social & App Monitoring.

The current prototype is intentionally local and simulated. It lets a user enter a brand profile, generate fake look-alike social/app candidates from that input, exclude official assets, score suspicious candidates, and inspect/search the results.

## Current Scope

- Auth is removed for now.
- Gmail/email logic is removed for now.
- Database writes are removed for now.
- Supabase and Drizzle code are removed for now.
- Real social-media and app-store crawling is not implemented yet.
- Candidate generation is simulated and clearly labelled as simulated.

## Core Flow

1. User enters important brand details.
2. The app builds an official baseline from name, aliases, logo, handles, domains, app IDs, and publishers.
3. The app generates fake official, look-alike, benign, scam, and suspicious app candidates.
4. Official assets are excluded before scoring.
5. Remaining candidates are analyzed with identity, logo, scam-content, and account/publisher signals.
6. Each candidate receives an explainable risk score from 0 to 100.
7. The dashboard displays classification, score, reasons, and searchable/filterable results.

## Important Files

- `src/routes/_authenticated/dashboard.tsx`: main tester UI.
- `src/lib/brand.ts`: local brand profile type.
- `src/lib/monitoring.ts`: simulated candidate generation and candidate evaluation.
- `src/lib/scoring.ts`: name normalization, look-alike detection, scam keyword detection, weighted risk score, and severity.
- `src/components/sx/AppShell.tsx`: simple shell around the tester.
- `src/routeTree.gen.ts`: generated TanStack route tree.

## Production Direction

For a real-world implementation, keep this downstream detection flow and replace only the candidate-source layer:

- Use official APIs where available.
- Use approved third-party data providers where platform APIs are restricted.
- Normalize all platform/app-store results into a common candidate format.
- Exclude official assets before scoring.
- Store findings, evidence, reports, analyst decisions, and temporary raw candidates separately.
- Add report/takedown workflows only after persistence and analyst review are implemented.

## What Was Removed

The previous auth, onboarding, Supabase, Drizzle, takedown report, threat detail, graph, settings, and broad UI component files were removed because they are not needed for the current basic prototype tester.
