# moviemovie 🎬

A niche social network for film & TV lovers. Discover movies and series, build your personal library, write reviews, follow other cinephiles, and share your taste with the community.

**Github repository:** https://github.com/hyunahparc/supcontent-final-project

---

## 📖 Overview

**moviemovie** is the SUPINFO final project for Culture Connect's *SUPCONTENT* brief. The project focuses on one media theme, **cinema and TV series**, and uses the **TMDB API** as the external metadata source.

The application is split into three independent bricks:

- **Backend API**: Node.js / Express REST API with all business logic.
- **Web client**: React / Vite application.
- **Mobile client**: React Native / Expo application.

Both clients communicate only with the backend. They do not call TMDB directly.

---

## 🌐 Live Demo

**Web app** (responsive desktop, mobile browsers) 
→ **https://moviemovie.space** 

Deployment summary:

- The web client is hosted on Vercel (custom domain `moviemovie.space`) and proxies every `/api/*` request to the backend hosted on Railway, which connects to a managed PostgreSQL database on Supabase.

---

## 🔌 Other Services

These are deployed services or local-only clients — not part of the interactive demo.

| Service | Access |
|---------|--------|
| Backend API | https://moviemovie.up.railway.app |
| Swagger API docs | https://moviemovie.up.railway.app/api-docs |
| Mobile app | Not publicly distributed — run locally with **Expo Go** (see [Getting Started](#-getting-started)) |

---

## 🌠 Features

### 👤 Customer (User) features

#### Authentication
- Email / password **registration** with field validation (email format, password complexity).
- **Login** with error handling for bad credentials.
- **Google OAuth2** login with one-time authorization-code exchange and automatic local account creation on first login.
- Secure **logout** with server-side refresh-token revocation.
- **Refresh-token rotation**: access tokens auto-refresh on `401`, expired sessions auto-redirect to login.
- **Guest browsing**: visitors can consult all public content without an account (no interactions).

#### Discovery & Search (TMDB)
- **Global search bar** querying TMDB in real time with dynamic results and infinite scroll.
- Results displayed as a grid/list with posters and key info.
- **Advanced search** with filtering and sorting (genre, year, popularity, release date).

#### Media Detail Page
- **Full media page** — all metadata from TMDB: poster, backdrop, synopsis, release date, runtime, genres, rating, cast, director, trailer, and similar recommendations.
- Combines TMDB metadata with moviemovie's own social data (ratings, reviews, likes, comments) and quick collection / list actions on the same page.
- **Smart caching**: recently-loaded media is served from our DB (7-day TTL) to avoid redundant TMDB calls and latency.

#### Personal Collection & Lists
- Quick status actions on any movie or series: **To watch**, **Watching**, **Completed**, **Dropped**.
- View your own collection filtered by status.
- **Custom thematic lists** (e.g. "Halloween horror") with add/remove titles, rename and delete.
- **Privacy flag** per list: private (only you) or public (shown on your profile).
- **Dashboard** with collection statistics (counts per status, etc.).

#### Social & Reviews
- **Rate** a movie or series (stars) and write a textual **review**; edit or delete your own.
- See other users' reviews on a media page, **like** reviews, and post **comments** (discussion thread).
- **Follow / unfollow** other users; followers & following lists visible on profiles.
- **Activity feed**: reverse-chronological aggregation of followed users' actions (ratings, reviews, collection entries).
- **Private messaging**: simple chat between users who follow each other mutually (polling-based).
- **Report content** (spoilers, insults) for moderation.

#### Notifications
- Real-time-ish **notifications** (polling) for new likes, comments, and followers.
- Read / unread visual marking.

#### Settings & Profile
- Editable profile: **avatar** (uploaded to Supabase Storage), biography, website link.
- **Theme** (light / dark) and **interface language** (FR / EN) preferences.
- **Personal data export** (CSV / JSON) for GDPR compliance.

### 🛡️ Administrator features

- **Role-based access** enforced by an admin-only auth middleware on the backend.
- **Moderation dashboard** listing reported reviews/content.
- **Remove inappropriate content** flagged by the community.
- Manage moderation reports end-to-end (review → action).

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express 5** — REST API
- **PostgreSQL** — relational database
- **Passport** — auth (local + Google OAuth2)
- **JWT** — access tokens + refresh-token rotation
- **bcrypt** — password hashing
- **Swagger UI** — API documentation

### Frontend Web
- **React 19** + **Vite 7**
- **React Router**
- **Axios** — API client

### Frontend Mobile
- **React Native** + **Expo**
- **Expo Router** — navigation

### Third-party API
- **TMDB** (The Movie Database) — film & TV metadata

### Infrastructure
- **Docker** + **docker-compose** (db + backend + web)
- **Vercel** (web) · **Railway** (backend) · **Supabase** (PostgreSQL + avatar storage)

Web and backend auto-deploy from GitHub via Vercel and Railway; Docker Compose is for one-command local setup.

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Web client    │     │  Mobile client  │
│ React + Vite    │     │ React Native /  │
│                 │     │ Expo            │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
         └──────────────┬────────┘
                        ▼
              ┌───────────────────────┐       ┌──────────────┐
              │   Backend (Express)   │──────▶│   TMDB API  │
              │                       │       │              │
              └───────────┬───────────┘       └──────────────┘
                          ▼
                  ┌──────────────────────┐
                  │     PostgreSQL       │  
                  │ (Supabase / local    │  
                  │  Docker container)   │  
                  └──────────────────────┘   
```

**Three distinct bricks**:

1. **Server** — REST API holding all business logic; the only component that calls TMDB.
2. **Two clients** (web + mobile) — interact *only* with our server, never with TMDB directly.
3. **Database** — PostgreSQL for all local data (users, collections, lists, reviews, follows, feed, notifications, messages, moderation).

Backend flow: **routes → middleware (auth / validation / rate-limit) → controllers → services (TMDB, notifications, activity, refresh tokens) → DB**.

---

## 🚀 Getting Started

There are two ways to run the project: **Docker** (one command, recommended for evaluation) and **Local** (run each part by hand for development). The mobile app always runs separately via Expo in both cases.

### Environment files at a glance

Each runtime reads its own `.env`. Copy each `.env.example` to `.env` and fill in your values — the real `.env` files are gitignored.

| File | Used by | When |
|------|---------|------|
| **`.env`** (project root) | `docker-compose.yml` (variable substitution for all 3 services) | **Docker only** |
| **`supcontent-backend/.env`** | Backend (`npm run dev`, via dotenv) | **Local backend** |
| **`supcontent-mobile/.env`** | Expo (`EXPO_PUBLIC_API_URL`) | **Mobile (always)** |

### Prerequisites
- For Docker: Docker & Docker Compose.
- For local dev: Node.js 20+, a PostgreSQL 16 instance, and Expo Go on your phone for mobile.
- A **TMDB API key** — create a free account at [themoviedb.org](https://www.themoviedb.org/) → Settings → API.
- (Optional) Supabase project (URL + service key) — required for avatar uploads (the rest of the app runs without it).
- (Optional) Google OAuth2 credentials — required for Google login (email/password works without them). In the [Google Cloud Console](https://console.cloud.google.com/), create an OAuth client to get your **Client ID / Client Secret** and register the redirect URIs you use. Then put these values in the root and backend `.env` (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, plus the callbacks below):
  - **Web** → `<backend-url>/api/auth/google/callback` (e.g. `http://localhost:3000/...`) as `GOOGLE_CALLBACK_URL`.
  - **Mobile** (Docker *or* local) → a **public HTTPS** `<public-backend>/api/auth/google/callback` (deployed backend or an ngrok tunnel — the phone and Google can't use `localhost`) as `GOOGLE_MOBILE_CALLBACK_URL`.

---

### Option A — Run with Docker (recommended)

Uses the **root `.env`** only. Spins up the database, backend and web client together.

```bash
git clone https://github.com/hyunahparc/supcontent-final-project.git
cd supcontent-final-project

cp .env.example .env      # then fill in TMDB_API_KEY, JWT_SECRET, POSTGRES_*, ...

docker compose up         # build + start all three services
```

This launches three services and initializes the DB schema automatically from [`supcontent-backend/db/cine.sql`](supcontent-backend/db/cine.sql):

| Service | URL / Port |
|---------|------------|
| `db` (PostgreSQL) | 5432 (internal) |
| `backend` (Express API) | http://localhost:3000 |
| `web` (React via Nginx) | **http://localhost:5173** ← open this |

Open **http://localhost:5173** and the app works end-to-end. 
API docs: http://localhost:3000/api-docs.

---

### Option B — Run locally for development

Run each part by hand. Each uses its **own** `.env` (not the root one).

**1. Backend** — uses `supcontent-backend/.env`

Pick a database and set `DATABASE_URL` accordingly:

- Local PostgreSQL — install Postgres, create a database, load the schema (`psql -d supcontent -f db/cine.sql`), then use `DATABASE_URL=postgresql://user:pass@localhost:5432/supcontent` with `PGSSLMODE=disable`.
- Your own Supabase project (what we used in dev) — create a free project at [supabase.com](https://supabase.com/), paste its connection string into `DATABASE_URL` (SSL is on by default, so leave `PGSSLMODE` unset).

```bash
cd supcontent-backend
npm install
cp .env.example .env       # set DATABASE_URL (see above), JWT_SECRET, TMDB_API_KEY, ...
npm run dev                # → http://localhost:3000  (nodemon)
```

**2. Web** — no `.env` needed (Vite dev server proxies `/api` to the backend)

```bash
cd supcontent-web
npm install
npm run dev                # → http://localhost:5173
```

---

### Mobile app (Expo) — for both Docker and local

The mobile client always runs via Expo and talks to whichever backend you started above (Docker **or** local). It uses `supcontent-mobile/.env`.

```bash
cd supcontent-mobile
npm install
cp .env.example .env       # set EXPO_PUBLIC_API_URL (see the two cases below)
npx expo start             # scan the QR code with Expo Go (iOS/Android)
```

Set `EXPO_PUBLIC_API_URL` (must end with `/api`) depending on whether you need **mobile Google login**:

- With Google login → use a **public backend URL** (deployed backend or ngrok tunnel), e.g. `https://your-public-host/api`. (Set the matching `GOOGLE_MOBILE_CALLBACK_URL` and register it in the Google Cloud Console — see [Prerequisites](#prerequisites).)
- Without Google login (email/password is enough) → use your machine's **Wi-Fi LAN IP** so Expo Go can reach the backend, e.g. `http://<your-wifi-ip>:3000/api`. Google login won't work this way.

---

## 📁 Project Structure

```
supcontent-final-project/
├── docker-compose.yml          # 3-service stack: db + backend + web
├── docs/                       # Technical documentation & user manual
│
├── supcontent-backend/         # REST API (Node.js / Express)
│   ├── server.js
│   ├── swagger.yaml            # OpenAPI spec
│   ├── db/                     # cine.sql schema
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       ├── validations/
│       └── utils/
│
├── supcontent-web/             # Web client (React + Vite)
│   ├── Dockerfile · nginx.conf · vercel.json
│   └── src/
│       ├── api/
│       ├── context/
│       ├── components/
│       └── pages/
│
└── supcontent-mobile/          # Mobile client (React Native + Expo)
    ├── app/                    # Expo Router (file-based screens)
    └── src/
        ├── api/
        ├── context/
        ├── components/
        ├── screens/
        └── theme/
```

---

## 👥 Authors & Roles

*Every member worked full-stack: each owned a set of features end-to-end — backend API + web client.*

| Author | Role | Main contributions |
|--------|------|--------------------|
| **Hyunah** ([@hyunahparc](https://github.com/hyunahparc)) | Full-stack & Mobile / Team lead | Backend core & DB schema, authentication (login/register/Google OAuth2, refresh-token rotation), media detail (TMDB/cache, review/comment/likes), collections & custom lists, follow system, activity feed, notifications, private messaging, header, mobile app, deployment (Vercel/Railway), UI/UX polish, branding |
| **Ismail** ([@33ISM](https://github.com/33ISM)) | Full-stack / Containerization | Advanced search (media search), header search bar, profile dashboard, profile settings, admin & moderation, docker containerization |
| **Ylian** ([@Ylianb](https://github.com/Ylianb)) | Full-stack / Documentation | Homepage, users/lists search, dark/light theme, FR/EN i18n, footer, 404 page, statistics dashboard, CSV/JSON data export, technical documentation & user manual |

---

## 📚 Documentation

Full technical documentation and the user manual live in [`docs/`](docs/), including installation & prerequisites (how to obtain a TMDB API key), deployment guide, technology-choice justification, UML diagrams (use cases, TMDB interaction sequence) and the database schema.

---

## 📝 License

Academic project — SUPINFO final project for *Culture Connect / SUPCONTENT*. Not licensed for redistribution.
