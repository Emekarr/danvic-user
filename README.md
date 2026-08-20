# DANVIC User

This is the static Next.js edition of the DANVIC learner frontend. The UI and learner workflows are browser-rendered, and the browser calls the DANVIC compatibility API at `/api/student/*`. No Node.js or Next.js server is required after the build.

## Local setup

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BACKEND_API_URL` to the public backend origin.
2. Add the frontend origin to the backend's `CORS_ORIGINS` value. The backend must allow credentials because learner sessions use secure HTTP-only cookies.
3. Run `npm install`.
4. Run `npm run dev` for local development or `npm run build` for the deployable export.

The production files are written to `out/`. The included `_redirects` file provides the SPA fallback required by data-driven routes such as `/courses/:courseId`, and `_headers` contains the security and media policies needed by the learner, recording, and live-classroom views.

## Cloudflare Pages

- Framework preset: **Next.js (Static HTML Export)**
- Build command: `npm run build`
- Build output directory: `out`
- Environment variable: `NEXT_PUBLIC_BACKEND_API_URL=https://your-backend.example.com`

The learner API namespace is fixed to `student` by the project configuration. Do not add a
`NEXT_PUBLIC_DANVIC_APP` variable in Cloudflare Pages; stale values such as `user` point to a
backend route that does not exist.

Deploy the contents of `out/`; do not use a Pages Functions or Workers adapter for this project.
