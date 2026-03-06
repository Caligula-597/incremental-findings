# Incremental Findings

A minimal but standard web architecture for a Nature-style research homepage.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- API routes for submission workflow

## Features
- Public Reader homepage (`/`)
- Author submission portal (`/submit`)
- Editor panel (`/editor`)
- Basic APIs:
  - `GET/POST /api/submissions`
  - `POST /api/submissions/:id/publish`

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Notes
Current version uses in-memory mock data in `lib/submission-repository.ts` for low-cost bootstrap.
You can replace repository functions with Supabase queries without changing UI pages.
