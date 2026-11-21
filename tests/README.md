# Verification
Use Node.js 24: `npm install` in this tests directory, then `npm test`.
Tests use disposable in-memory PostgreSQL (PGlite) with stub Supabase auth/storage schemas and Happy DOM. They do not connect to a live Supabase project or send email. They cover owner isolation/RLS, publication whitelist, search, UI navigation and study progress. They do not verify browser paint, animation smoothness or email delivery.

Auth tests additionally cover Google signup/login redirect and name metadata, independent password visibility, mismatch rejection before API calls, recovery email redirect, new-password save, expired/cancelled callbacks, and startup race against guest entry. All authentication calls are mocked.

Starter tests validate the seven shared sets, every question image and passage path, an independently transcribed 80-question answer key, choice ordering, starter progress isolation, session filters/limits, all five games and independent copies. Source question crops were visually reviewed; headless Chromium was blocked by host socket permissions.
