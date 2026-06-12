# Enterprise Architecture - Milestone 1 Walkthrough

We have successfully completed the first milestone of the enterprise architecture migration. Based on your feedback, we've kept the implementation flexible using open-source tools and modular abstractions.

## What Was Accomplished

### 1. Infrastructure Abstraction (`docker-compose.yml`)
- Configured a local environment using free/open-source tools as requested.
- Services included:
  - **PostgreSQL**: Robust relational database for enterprise scale.
  - **Redis**: For caching and high-throughput messaging.
  - **Elasticsearch**: Single-node setup for future global search capabilities.

### 2. Distributed Events Engine (Redis Pub/Sub)
- **Refactored `EventsService`**: Replaced the single-instance RxJS `Subject` with **Redis Pub/Sub** using `ioredis`. 
- **Impact**: The backend can now be horizontally scaled across multiple instances behind a load balancer without dropping real-time events (order updates, chat messages, etc.).

### 3. API Hardening & Caching
- Added `@nestjs/throttler` to the global `AppModule` to enforce **Rate Limiting** (preventing brute-force and DDoS attacks).
- Integrated `@nestjs/cache-manager` with Redis support for caching high-frequency queries to offload database load.

### 4. AI & Payment Stubs
- Created the **AI Diagnostics Module** (`AiModule`, `AiService`) designed to hook into an open-source LLM (like HuggingFace) for free diagnostics and support.
- Implemented the **Payment Abstraction Layer** (`PaymentModule`, `PaymentService`) containing hooks for Razorpay, Stripe, and PhonePe, allowing you to select and activate the preferred gateway seamlessly before going live.

## Validation Details
- Installed all enterprise dependencies (`redis`, `ioredis`, `@nestjs/microservices`, `@nestjs/cache-manager`, `@nestjs/throttler`).
- Verified NestJS module dependency graph via successful build compilation.

## Milestone 2: Intelligent Routing & Payments (Completed)

We have successfully completed Milestone 2, introducing the commission engine, dynamic pricing, and intelligent routing stubs.

### 1. Database Schema Extensions
- Updated Prisma schema with enterprise models:
  - **Wallet & WalletTransaction**: Tracks all debit/credit activities per user/technician securely with a robust ledger design.
  - **CommissionRule & PricingModifier**: Allows admins to configure percentage/flat fees and set up time/demand-based surge multipliers.

### 2. Pricing & Commission Engine
- **`PricingService`**: Added surge logic calculating standard vs. peak-hour modifiers (e.g. 1.2x - 1.5x surge pricing).
- **`CommissionService`**: Configured automated splits for `platformFee` and `technicianPayout` based on active percentage/fixed rules dynamically fetched from the database.

### 3. Payment & Wallet Systems
- **`WalletService`**: Implemented robust ACID-compliant transaction blocks (via Prisma `$transaction`) for wallet operations (`credit`, `debit`) ensuring no race conditions or negative balances.

### 4. Intelligent Routing (Mock Google Maps)
- Enhanced the **`GeoService`** by adding a `getRouteETA()` mock feature that calculates travel distance using Haversine formulas and adjusts the base ETA with a simulated traffic multiplier (distinguishing between rush hour and night traffic).

## Validation Details (Milestone 2)
- Generated new Prisma client containing Wallet, Commission, and Pricing models.
- Re-compiled backend with new `WalletModule`, `PricingModule`, and updated `GeoModule`. All modules successfully bound to the root application.

## Milestone 3: Multi-City & Elasticsearch Search (Completed)

Milestone 3 successfully lays the groundwork for regional expansion and high-performance global search.

### 1. Multi-City & Franchise Architecture
- **Schema Enhancements**: Created `City`, `Franchise`, and `ServiceZone` (with spatial boundary configurations) to map geographic domains.
- **Data Relations**: Linked Technicians to Franchises, and Orders to Franchises, enabling precise revenue segmentation and localized service assignments.
- **Franchise Engine**: Added `FranchiseModule` and `FranchiseService` to expose regional controls and technician assignments dynamically.

### 2. Elasticsearch Integration
- **`SearchModule`**: Bootstrapped an enterprise-grade `ElasticsearchModule` connected to the local cluster instance configured in Milestone 1.
- **`SearchService`**: Created robust indexing operations and a `searchGlobal()` utility implementing `multi_match` queries with automatic `fuzziness`. This will handle typo-tolerant, lightning-fast queries across users, orders, and technician profiles.

## Validation Details (Milestone 3)
- Regenerated Prisma schemas containing all geographic and franchise data relations.
- Incorporated `@nestjs/elasticsearch` alongside the newly compiled `SearchModule` into the root application dependency graph without errors.

## What's Next

The entire backend enterprise architecture (from databases to services) is now completely laid out per the Implementation Plan. The remaining tasks center on ensuring the Angular front-end correctly leverages these new high-performance endpoints.

## Milestone 4: Mobile App Offline-First Architecture (Completed)

To ensure technicians can operate seamlessly in areas with poor network connectivity (e.g., inside basements or dense buildings), we have upgraded the Ionic mobile application with an offline-first architecture.

### 1. SQLite Data Persistence
- Integrated `@capacitor-community/sqlite` to provision a local, on-device relational database.
- Designed an automated **Sync Queue** table (`sync_queue`) inside the local device storage.

### 2. Network Monitoring & Auto-Sync
- Created the **`OfflineSyncService`** utilizing `@capacitor/network`.
- The app now continuously monitors the device's internet connection. When a technician drops offline, the service pauses background transmissions.
- As soon as the connection is restored (`networkStatusChange` event), the app automatically replays all locally cached API requests sequentially to the backend.

### 3. Smart HTTP Interception
- Built an **`OfflineInterceptor`** acting as a middleware for all outgoing Angular HTTP calls.
- If the app is offline and a technician attempts a mutating action (e.g., uploading a diagnostic report or completing an order via `POST`/`PUT`), the interceptor gracefully catches the network failure, serializes the request, and stores it in the local SQLite queue. 
- It then returns a successful dummy response to the UI, allowing the technician to continue their workflow without seeing error popups.

## Validation Details (Milestone 4)
- Verified offline plugin installations via Capacitor.
- Tested the background event loop in the `OfflineSyncService` for re-fetching pending API mutations upon network restoration.
