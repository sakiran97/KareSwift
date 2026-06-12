# Doorstep Mobile Device Service App – Refined Implementation Plan

## Goal Description

Create a **mobile‑first web application** (packaged as an Android APK) that lets users request on‑site repair or service for their mobile devices. The flow mirrors on‑demand platforms like Swiggy, Zomato, Blinkit, and BigBasket, but focuses on **device diagnosis, service booking, real‑time tracking, and post‑service feedback**.

The stack will be **Angular + Ionic + Capacitor** for the front‑end (leveraging your Angular expertise) and a **NestJS** backend with **PostgreSQL** (via **Prisma ORM**) for data persistence. Real‑time status updates will be powered by **WebSocket (Socket.IO)** and **push notifications** (Firebase Cloud Messaging). Authentication will use **JWT** with optional social login (Google/Facebook).

---

## User Review Required

> [!IMPORTANT]
> Confirm the following decisions before we start coding:
> - **Backend language/framework**: NestJS (Node + TypeScript) – approved?
> - **Database**: PostgreSQL + Prisma – approved?
> - **Real‑time tracking**: Socket.IO + FCM – approved?
> - **Payment integration**: Stripe (or Razorpay) – needed now or later?
> - **Admin dashboard**: Separate Angular app or integrated admin view?
> - **Hosting provider**: Render, Fly.io, or AWS? (affects CI/CD setup)
> - **Authentication**: Email/password + JWT, plus optional OAuth?
> - **Deployment target**: Android APK via Capacitor (and optional web PWA) – approved?
>
> Please confirm or adjust any of the above.

---

## Open Questions

1. **Core service categories** – e.g., screen replacement, battery swap, software fix, etc.
2. **Geolocation** – Should we match users with nearby technicians automatically?
3. **Pricing model** – Fixed per service, dynamic quotes, or both?
4. **Technician onboarding** – Separate portal for technicians?
5. **Feedback loop** – Rating (1‑5 stars) + optional comment?
6. **Compliance** – Any data‑privacy regulations (GDPR, Indian PDPA)?
7. **Third‑party integrations** – Payment gateway, SMS/WhatsApp notifications?
8. **MVP scope** – Which features are essential for launch (e.g., login, service request, tracking, feedback) and which can be phased out?

---

## Proposed Architecture & Technology Stack

### Front‑end (User App)
- **Angular 16** (TypeScript) – core framework.
- **Ionic Framework** – UI components, responsive design, and native integrations.
- **Capacitor** – builds Android APK, handles native permissions, push notifications.
- **State Management** – NgRx (store) for predictable state, especially for tracking.
- **Styling** – CSS custom properties, dark mode, glass‑morphism UI (premium look).
- **Realtime** – Socket.IO client for live status updates.
- **Push Notifications** – Firebase Cloud Messaging (FCM) integration.

### Backend (API Server)
- **NestJS** (Node + TypeScript) – modular, aligns with Angular.
- **Prisma ORM** – type‑safe DB access.
- **PostgreSQL** – relational DB for users, orders, technicians, logs.
- **Authentication** – JWT with refresh tokens; optional OAuth2 (Google/Facebook).
- **Realtime** – Socket.IO server for order status streams.
- **Payment** – Stripe SDK (optional for MVP, can be stubbed).
- **Email/SMS** – SendGrid or Twilio for notifications (optional).
- **Docker** – containerised dev environment (frontend, backend, DB).

### Admin Dashboard (Optional MVP)
- Re‑use same Angular codebase with a protected admin route.
- Manage technicians, view orders, analytics.

### CI/CD & Deployment
- **GitHub Actions**:
  - Lint, unit tests (Jest for Nest, Karma/Jasmine for Angular).
  - Docker build & push.
  - On push to `main`, automatically build APK and upload to a **Google Play internal test track** (or Firebase App Distribution).
- **Hosting**:
  - Backend on **Render.com** (free tier) or **Fly.io** for low‑latency edge.
  - Static front‑end assets on **Vercel** or **Firebase Hosting** (fallback for web PWAs).

---

## Roadmap (Phased Development)

### Phase 1 – Foundations (Setup & Tooling)
1. Initialise **Monorepo** using **Nx** (optional) or separate repos.
2. Scaffold **Angular + Ionic** project (`ng new mobile-service --style=scss && ng add @ionic/angular`).
3. Scaffold **NestJS** API (`nest new backend`).
4. Add **Prisma** schema, generate client, run Docker Compose with PostgreSQL.
5. Configure **GitHub Actions** for lint & test.

### Phase 2 – Core MVP Features
| Feature | Front‑end | Back‑end |
|---|---|---|
| User Auth (signup/login) | Angular forms, JWT storage | NestJS Auth module, JWT issuance |
| Device & Model selection | Dropdowns populated from DB | API endpoint `/devices` |
| Service request form | Problem description, image upload | Order creation, price estimation stub |
| Estimated time display | UI modal with ETA | Simple algorithm based on service type |
| Real‑time order tracking | Socket.IO client, progress UI | Socket.IO server, status updates |
| Feedback & rating | Rating component, comment box | POST `/feedback` endpoint |
| Basic admin view | Protected route, order list | Role‑based guard, CRUD ops |

### Phase 3 – Enhancements
- Geolocation & technician matching.
- Payment integration (Stripe).
- Push notifications (FCM).
- Email/SMS alerts.
- Advanced analytics dashboard.

### Phase 4 – Production Ready
- Comprehensive test suite (unit, integration, e2e with Cypress & Appium).
- Logging (Winston) + monitoring (Prometheus/Grafana or Sentry).
- CI pipeline for signed APK generation.
- Deployment to Google Play (beta) and cloud hosting.

---

## Verification Plan

### Automated
- `npm run test` for both Angular and Nest projects.
- End‑to‑end Cypress tests for web flow; Appium tests for mobile UI.
- Lint passes (ESLint, Stylelint).

### Manual
- Install generated APK on Android device – verify login, request flow, real‑time tracking, feedback.
- Test push notification receipt.
- Verify admin dashboard operations.
- Perform a smoke test of payment flow (if integrated).

---

## Next Steps
1. **Answer the Open Questions** above (service categories, pricing, geolocation, etc.).
2. **Approve the proposed tech stack & roadmap** (or suggest alternatives).
3. Once approved, I will create the project skeleton (Phase 1) and commit the initial code.

*Feel free to use the `/grill-me` slash command if you’d like a guided interview to flesh out any remaining details.*
