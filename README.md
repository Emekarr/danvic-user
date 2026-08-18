# DANVIC User

This is a static, browser-rendered learner workspace. It calls the DANVIC backend through `/api/student/*` and has no application server.

1. Copy `.env.example` to `.env.local` and set the public backend URL.
2. Add the deployed site origin to the backend's `CORS_ORIGINS` setting.
3. Run `npm install` and `npm run build`.
4. Deploy `out/` only.

For Cloudflare Pages, select **Next.js (Static HTML Export)**, use `npx next build`, set `out` as the output directory, and configure `NEXT_PUBLIC_BACKEND_API_URL` and `NEXT_PUBLIC_DANVIC_APP=student`. Do not use `@cloudflare/next-on-pages`.
