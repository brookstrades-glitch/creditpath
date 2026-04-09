# CreditPath

A full-stack consumer fintech web application for personal credit report analysis and dispute management, featuring enterprise-grade authentication via **Microsoft Entra ID (Azure AD) OAuth 2.0 + OIDC**.

**Live:** [4nbailey.shop](https://4nbailey.shop)

---

## Authentication Architecture

CreditPath implements a dual authentication system:

### Microsoft Entra ID (Azure AD) — OAuth 2.0 + OIDC
The primary SSO flow follows the **OAuth 2.0 Authorization Code** pattern with OpenID Connect for identity:

```
User clicks "Continue with Microsoft"
        │
        ▼
Backend generates cryptographic state token → stores in httpOnly cookie
        │
        ▼
Redirect to login.microsoftonline.com/common/oauth2/v2.0/authorize
  (scopes: openid email profile)
        │
        ▼
Microsoft authenticates user → redirects to /api/auth/microsoft/callback
        │
        ▼
Backend validates CSRF state → exchanges auth code for ID token
        │
        ▼
Decodes OIDC ID token (JWT) → extracts verified email
        │
        ▼
Upserts user in PostgreSQL → issues CreditPath JWT (30-day)
        │
        ▼
Redirects to frontend /auth/callback → stores token → dashboard
```

**Key implementation details:**
- `common` tenant — supports both personal Microsoft accounts and enterprise org accounts
- CSRF protection via cryptographically random state parameter in signed httpOnly cookie
- ID token decoded locally (trusted — came from Microsoft's token endpoint)
- Microsoft identity discarded after login — app issues its own stateless JWT
- Handles first-time vs returning users transparently (upsert pattern)
- Admin consent flow supported for organizational accounts

### Email / Password — JWT
Standard credential auth as a fallback:
- Passwords hashed with **bcrypt** (cost factor 12)
- Stateless **JWT** tokens (30-day expiry, signed with HS256)
- Token stored in `localStorage`, sent as `Authorization: Bearer` header

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL (Railway) |
| ORM | Prisma with migration files |
| Auth | Microsoft Entra ID OAuth 2.0 / OIDC + JWT + bcrypt |
| Frontend hosting | Netlify (CI/CD from GitHub) |
| Backend hosting | Railway (CI/CD from GitHub, Nixpacks build) |
| Infrastructure | Terraform |
| DNS | Netlify DNS — custom domain |

---

## Project Structure

```
creditpath/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js             # Register / login / me / consent
│   │   │   └── authMicrosoft.js    # Entra ID OAuth flow
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT requireAuth middleware
│   │   └── app.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── nixpacks.toml               # Railway build config
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.jsx # JWT auth state
│   │   ├── pages/
│   │   │   ├── AuthCallbackPage.jsx  # OAuth redirect landing
│   │   │   ├── SignInPage.jsx
│   │   │   ├── SignUpPage.jsx
│   │   │   └── ConsentPage.jsx       # FCRA §604(a)(2) consent
│   │   └── lib/api.js
│   └── vite.config.js
├── terraform/                      # Infrastructure as Code
└── netlify.toml                    # Headers, CSP, redirects
```

---

## Azure App Registration Setup

1. Go to [portal.azure.com](https://portal.azure.com) → **App registrations** → **New registration**
2. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
3. Redirect URI (Web): `https://<your-backend>/api/auth/microsoft/callback`
4. Go to **Certificates & secrets** → create a client secret
5. Set environment variables:

```bash
MICROSOFT_CLIENT_ID=<application client id>
MICROSOFT_CLIENT_SECRET=<secret value>
FRONTEND_URL=https://<your-frontend>
```

---

## Environment Variables

### Backend (Railway)
```
DATABASE_URL=
JWT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=
FRONTEND_URL=
ALLOWED_ORIGINS=
NODE_ENV=production
```

### Frontend (Netlify)
```
VITE_API_URL=https://<backend>/api
```

---

## Local Development

```bash
# Backend
cd backend
cp .env.example .env.local   # fill in values
npm install
npx prisma migrate dev
npm run dev                  # runs on :3001

# Frontend
cd frontend
npm install
npm run dev                  # runs on :5173
```

---

## Key Engineering Decisions

**Why custom JWT instead of a managed auth service?**
After evaluating managed auth providers, the team opted to implement auth directly to maintain full control over the token lifecycle, avoid third-party reliability dependencies, and demonstrate understanding of the underlying OAuth/JWT standards rather than abstracting them away.

**Why Entra ID over Google OAuth for SSO?**
CreditPath's target users include professionals who are likely to have Microsoft accounts. More importantly, Entra ID integration demonstrates enterprise IAM capability — a core skill for cloud engineering roles — given that Entra ID is the dominant identity platform across Azure-based enterprises.

**Why Railway for the backend?**
Railway's Nixpacks builder provides a Heroku-like developer experience with zero Dockerfile maintenance, while still supporting custom build phases (used here for `prisma generate` and `prisma migrate deploy` on each deploy).
