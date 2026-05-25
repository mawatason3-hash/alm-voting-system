ALM Voting Frontend

This is a Next.js 14 + TypeScript + Tailwind CSS frontend for the ALM Voting System.

Local dev:

1. Install dependencies

```bash
npm install
```

2. Run dev server

```bash
npm run dev
```

Ensure `NEXT_PUBLIC_API_URL` in `.env.local` points to your backend (e.g. http://localhost:8000).

Deployment: deploy to Netlify and set `NEXT_PUBLIC_API_URL` in your Netlify environment variables to your Railway backend URL.
