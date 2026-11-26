# Artisera CRM — Frontend

Next.js 16, React 18, TypeScript, MUI, RTK Query. Requires Node 20.9+ (Node 22 LTS recommended).

## Run locally (mock data, no backend)
```bash
npm install
npm run dev
```
Open http://localhost:3000 — log in as `lakshmi@artisera.com` (Admin), `priya@artisera.com` (RM) or `anita@artisera.com` (Gallery Manager), any password.

## Run with Docker
Real backend (production build, no mock data):
```bash
cp .env.example .env     # set API_URL to your backend
docker compose up --build web
```
Open http://localhost:3000. Without a reachable backend the login shows "Backend is unreachable".

Demo with sample data (no backend needed):
```bash
docker compose --profile demo up --build demo
```
Open http://localhost:3001 — log in as `lakshmi@artisera.com` (Admin), `priya@artisera.com` (RM) or `anita@artisera.com` (Gallery Manager), any password.

## Connect a backend
Set one value: `API_URL`, the backend origin only (for example `http://localhost:4000`). It is read at runtime, so change it and restart; no rebuild.
The browser calls `/api/v1/...` on the Next.js server, which attaches the JWT from an httpOnly cookie and forwards to `API_URL/api/v1/...`.
The contract is `docs/API.md`. Every path lives in one file, `src/core/api/endpoints.ts`.
To develop against the real backend instead of mock data: `NEXT_PUBLIC_USE_MOCKS=false API_URL=http://localhost:4000 npm run dev`.
If a backend path differs from `docs/API.md`, change it in `src/core/api/endpoints.ts` only.

## Scripts
`npm run dev` (mock data) · `npm run build` · `npm start` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run test:api` · `npm run icons` (re-bundle icons after adding a new `mdi:` icon name)

## Docs
`docs/API.md` — what the backend must provide. `docs/COVERAGE_V10.md` — design coverage and assumptions.

## Quality checks

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript strict mode |
| `npm run lint` | ESLint (no `any`, no unused code, hook dependencies) |
| `npm run format:check` | Prettier formatting (`npm run format` fixes it) |
| `npm test` | Unit tests for form logic (Mark as Won) |
| `npm run test:api` | API rules against the mock backend |

## Testing the production path without the backend
`npx tsx --tsconfig tsconfig.json scripts/fake-backend.ts` starts a stand-in API on :4000 (the mock data served over HTTP). Then `npm run build && API_URL=http://localhost:4000 npm start` exercises the real production path: Next server, cookie sessions and the `/api` proxy.

## Production notes
- **Security:** tokens live only in httpOnly, SameSite=Lax cookies (never in JavaScript or localStorage); the cookie `Secure` flag follows the request protocol, so serve the app over HTTPS (terminate TLS at your proxy and forward `X-Forwarded-Proto`). Responses carry a Content-Security-Policy and the usual hardening headers (see `next.config.js`). The post-login `?next=` target is restricted to same-site paths.
- **No external calls from the browser:** icons are bundled (`src/core/ui/icons.generated.ts`), so the UI works offline or behind a firewall. The browser only talks to this app's own origin.
- **Mock data** is compiled out of production builds (`NEXT_PUBLIC_USE_MOCKS=false`, the default).
- **Health check:** the Docker image checks `/login`.
- **Dependencies:** `npm audit --omit=dev` reports 0 known vulnerabilities at hand-off; re-run it before each release.
"# artisera-frontend" 
