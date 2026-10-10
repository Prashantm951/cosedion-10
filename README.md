# SentinelX Prototype Tester

Basic Digital Risk Protection prototype for testing brand-input and look-alike detection logic.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://senttinelx.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7a85808c-67d0-46f5-9b95-9a91377f1f8b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Current Scope

- No auth flow.
- No Gmail flow.
- No Supabase/database writes.
- No live social or app-store crawling.
- The dashboard accepts brand details, generates simulated official/look-alike/scam candidates, excludes official assets, scores candidates, and lets you search/filter results.

The main tester lives at `/dashboard`.
