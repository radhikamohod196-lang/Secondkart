# SecondKart — Good Things Deserve a Second Life

A beginner-friendly second-hand marketplace built with React, Vite, Express, MongoDB and Mongoose. It includes registration/login, seller listings, filters, image uploads, enquiries, sold status, admin removal, a transparent seller trust score, and a rule-based comparable-listing price advisor.

## Requirements
- Node.js 20 or newer (Node 22 recommended)
- npm
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- VS Code

## Setup on Windows / VS Code
1. Extract/open the `SecondKart` folder in VS Code.
2. Start MongoDB locally, or create a database in MongoDB Atlas.
3. In VS Code Terminal, run `copy backend\.env.example backend\.env` and edit `backend\.env`. Set `MONGODB_URI` to your local URI or Atlas connection string and replace `JWT_SECRET` with a long random value.
4. Run `copy frontend\.env.example frontend\.env` (the default API URL is fine for local development).
5. Install packages from the project root: `npm install`, then `npm run install:all`.
6. In one terminal, run `npm run dev --prefix backend`. In another, run `npm run dev --prefix frontend`.
7. Open `http://localhost:5173`. The API health endpoint is `http://localhost:5000/api/health`.
8. Optional: in a terminal run `npm run seed --prefix backend` to add sample listings. The seed script creates a demo seller account: `seller@secondkart.demo` / `DemoPass123!`. Register another account to test buyer flows.

## Roles
- Buyer: register as Buyer, browse listings, and send enquiries.
- Seller: register as Seller, create/manage listings and view enquiries.
- Admin: admin role is deliberately not selectable during public registration. To promote a trusted account for a college demo, use MongoDB Compass and change that user's `role` field to `admin`. Admin routes are protected on the backend.

## Main API endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/listings` with `search`, `category`, `condition`, `min`, `max`, `sort` query parameters
- `GET /api/listings/:id`, `POST /api/listings`, `PUT /api/listings/:id`, `DELETE /api/listings/:id`, `PUT /api/listings/:id/sold`
- `POST /api/listings/:id/enquiries`, `GET /api/listings/inbox/messages`
- `POST /api/listings/price-advice`, `GET /api/listings/seller/:id/trust`
- `GET /api/listings/admin/all`, `DELETE /api/listings/admin/:id`

## Trust score formula
The backend calculates up to 30 points from account age, 35 points from completed (seller-marked) sales, and 35 points from genuine reviews. It displays “New Seller — Building Trust” if there is not yet enough account activity. This is a simple demonstration signal, not identity verification or a guarantee of safety.

## Smart Price Advisor
The advisor compares the selected category and condition with current available listings in MongoDB and checks title keywords when there are enough matches. It uses the 25th and 75th percentiles to estimate a range and can account for an original price. It reports the comparable count and clearly indicates when there is insufficient data. Sellers still choose their own price.

## Uploads and safety notes
Images are limited to four per listing and 5 MB per image, with JPEG/PNG/WebP MIME-type checks. For a real deployment, also validate image contents, use cloud object storage, rate-limit authentication and enquiry endpoints, add moderation/report workflows, and avoid relying on seller-marked sold status alone as proof of a completed transaction. This project is intended for a college demo.

## Troubleshooting
- `MONGODB_URI is missing`: copy `.env.example` to `.env` and configure it.
- Cannot connect to API: start the backend and check port 5000.
- Cannot connect to MongoDB: ensure MongoDB service is running or Atlas IP/network settings permit the connection.
- Image upload errors: use JPEG, PNG or WebP images under 5 MB.
- Demo listings are database-backed; run the seed command after configuring MongoDB.


## Features added from the Second-Hand Marketplace prototype

- **Checkout and orders** – `/checkout/:id`, `/orders`. Delivery method (courier / local pickup), validated name, 10-digit phone and address. Payment is **simulated**. Placing an order reserves the listing atomically (status `reserved`) so two buyers cannot order the same item. The seller moves an order Pending → Confirmed → Shipped → Delivered (Delivered marks the listing `sold`, which also feeds the trust score). Buyers can cancel before shipping (the listing becomes available again) and rate the seller after delivery (stored as a `Review`).
- **Favorites** – heart on cards and listing pages, `/favorites` page, stored per user.
- **Notifications** – bell with unread count (polled every 30 s) and `/notifications`. Created for orders, status changes, cancellations, ratings, reports, fresh-photo requests and admin review.
- **Profile** – `/profile`: avatar, member-since, phone, college/city, address, change password (bcrypt, 12 rounds).
- **Listing details and edit** – listings now store age, defects and accessories; sellers can edit a listing (`/sell/:id/edit`), remove/add photos, and sold listings are locked.
- **Photo rules and trust review** – admin photo instructions + confirmation checkbox, 3–8 photos (was 0–4). A lightweight server-side metadata check labels listings *Pending Review*, *Inconclusive* (no camera metadata) or *Signal Detected (not proof)* (editing/AI-tool markers found). Buyers can **report** a listing (marks it *Review Recommended*) or **request a fresh photo**. Admins see reports on the Dashboard and can approve a listing (*Approved by Admin*). This is a signal for manual review, not proof of authenticity.
- **OTP verification** – after the password check (and before an account is created on registration) a 6-digit code is required: valid 5 minutes, 3 attempts, resend after 20 s, only a hash is stored. No email/SMS provider is connected, so in `OTP_MODE=demo` the code is shown on screen and printed in the backend terminal. Set `OTP_ENABLED=false` in `backend/.env` for plain password login. Replace `deliverOtp()` in `backend/src/utils/otp.js` with a real provider for production.

### New API endpoints
- `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp` (login/register now answer `202 { otpRequired, challengeId }` when OTP is on)
- `POST /api/orders`, `GET /api/orders/mine`, `GET /api/orders/selling`, `PUT /api/orders/:id/advance`, `PUT /api/orders/:id/cancel`, `POST /api/orders/:id/review`
- `GET /api/account/favorites`, `GET /api/account/favorites/ids`, `PUT /api/account/favorites/:listingId` (toggle)
- `GET /api/account/notifications`, `GET /api/account/notifications/count`, `PUT /api/account/notifications/read-all`
- `PUT /api/account/profile`, `PUT /api/account/password`
- `POST /api/listings/:id/report`, `POST /api/listings/:id/request-photo`, `GET /api/listings/admin/reports`, `PUT /api/listings/admin/:id/review`

No new npm packages are required. Add the two OTP lines from `backend/.env.example` to your `backend/.env` (optional; OTP defaults to on in demo mode).


## Two-way chat (buyer ⇄ seller)

Buyers and sellers can message each other directly about a listing. Nothing else in the app was changed or removed.

- **Where to find it**: the chat icon in the top bar (with an unread badge) opens `/chat`. Open a specific chat at `/chat/:id`.
- **Start a chat**: on a listing page tap **Chat with seller**. Sellers can answer from **Dashboard → Buyer enquiries → Reply in chat**, and either side can tap **Chat with buyer / Chat with seller** on an order in **Orders**.
- **Existing enquiries still work**: the "Send enquiry" box on a listing still saves the enquiry exactly as before and now also drops the message into the chat, so the seller can answer it.
- **How it updates**: the open chat checks for new messages every 3 seconds, the chat list every 6 seconds and the navbar badge every 10 seconds (polling, so no extra packages or ports are needed). Checks pause while the browser tab is hidden.
- **Unread + notifications**: each side has its own unread counter. A bell notification is created when someone who had nothing unread gets a new message, so a long conversation does not flood the notification list.
- **Rules**: only the buyer and the seller of that listing can read or write a conversation (checked on the backend). Messages are trimmed, 1–1000 characters. A seller can only open a chat with someone who enquired about or ordered the item. Chats stay readable after an item is sold or removed.
- **No new packages and no `.env` changes.** The two new MongoDB collections (`conversations`, `messages`) are created automatically on first use.

### Chat API endpoints (all need a logged-in user)
- `GET /api/chat/unread-count`
- `GET /api/chat/conversations`
- `POST /api/chat/start` — body `{ listingId }` (buyer) or `{ listingId, buyerId }` (seller)
- `GET /api/chat/conversations/:id`
- `GET /api/chat/conversations/:id/messages` (optional `?after=<messageId>` for only newer messages; reading marks the chat as read)
- `POST /api/chat/conversations/:id/messages` — body `{ text }`

### Quick chat test
1. Register/log in as a seller and publish a listing (or run `npm run seed --prefix backend` and use `seller@secondkart.demo` / `DemoPass123!`).
2. In a second browser (or a private window) log in as a different user, open the listing and tap **Chat with seller**, then send a message.
3. As the seller, the chat icon shows a badge. Open it, read the message and reply. The buyer's window shows the reply within a few seconds.
