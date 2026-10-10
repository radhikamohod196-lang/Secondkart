# SecondKart project status

Generated the frontend and backend source files. Backend JavaScript files passed `node --check`, and package.json files are valid JSON. Dependency installation could not be completed in this environment before the command timed out, so the React production build and live MongoDB/API integration have not been verified here. Configure your own MongoDB URI and run the setup commands in README.md.

## Prototype feature merge
- Added checkout/orders with reservation + status tracking, favorites, notifications, profile page, listing edit, age/defects/accessories fields, photo rules (3–8 photos), photo-metadata review badges, report / fresh-photo request, admin reports + approval, and OTP verification. See the README section "Features added from the Second-Hand Marketplace prototype".
- Existing behaviour (auth, filters, price advisor, trust score, enquiries, sold status, admin removal) is unchanged.
- Verified here: all backend files pass `node --check`; every frontend file parses and the whole app bundles with esbuild (imports resolve); the photo-metadata check was unit-tested. NOT verified here: `npm install`, a Vite build and end-to-end MongoDB/browser tests (no network in this environment).
- Not ported: dark theme and the Buyer/Seller mode switch (accounts keep their existing role).

## Test checklist for the new features
1. Register (note the on-screen OTP), then log in again and verify the OTP step.
2. As a seller publish a listing with 3+ photos; check its review badge.
3. As another user: save it (heart), request a fresh photo, report it, then buy it with a simulated payment.
4. Seller: check Notifications, open Orders and mark Confirmed, Shipped, Delivered. The listing becomes Sold.
5. Buyer: rate the seller, then confirm the seller's trust score changes.
6. Admin (set `role` to `admin` in MongoDB): see the report on the Dashboard and approve the listing.


## Two-way chat (added)
- New: `backend/src/models/Conversation.js`, `Message.js`, `utils/chat.js`, `routes/chat.js` (mounted at `/api/chat`); `frontend/src/pages/Chat.jsx`; chat styles appended to `styles.css`.
- Changed (small, additive): `server.js` (mounts chat), `routes/listings.js` (an enquiry is also copied into chat; if that copy fails the enquiry still succeeds), `AuthContext.jsx` (unread-chat counter), `Navbar.jsx` (chat icon + badge), `main.jsx` (`/chat`, `/chat/:id`), `Detail.jsx` (Chat with seller button), `Dashboard.jsx` (Reply in chat), `Orders.jsx` (chat button).
- Updates use polling (3 s open chat / 6 s list / 10 s badge); no new npm packages.
- Verified here: all backend files pass `node --check`; every frontend file parses and the whole app bundles with esbuild (imports resolve); 34 logic checks of the chat routes passed against an in-memory stand-in for MongoDB (permissions, unread counters, notifications, polling with `?after`, enquiry import, sold/removed listings).
- NOT verified here: `npm install`, the Vite build and real MongoDB/browser testing (no network or database in this environment). Run the quick chat test in README.md on your machine.
