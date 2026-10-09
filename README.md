🇺🇸 [한국어](./README.ko.md)

# 올해검진 (checkup-window) — Find out which national health checkups you can get this year

올해검진 is a mini-app for the Toss app (Apps-in-Toss) that tells you which Korean national health checkups you are eligible for in the current year. You enter your name, birth year, sex, and health insurance type for yourself and up to nine family members. The app shows what is due this year, how many days remain until December 31, and what you can expect over the next three years.

## Features

- 🩺 **Eligibility check:** Works out this year's targets for the general health checkup (cycle depends on insurance type) and the cancer screenings: stomach, colorectal, breast, cervical, liver (conditional), and lung (conditional, ages 54–74).
- 👨‍👩‍👧 **Family profiles:** One self profile plus up to nine family profiles, stored on the device.
- ✅ **Received tracking:** Mark each checkup as received for the current year; the result counts update immediately.
- ⏰ **Deadline banner:** From July to December, shows the days left until year-end, turns urgent within 30 days, and can be dismissed for the current month.
- 📅 **Three-year plan:** Lists what each person is due in each of the next three years.
- 🎬 **Reward-ad gate:** The three-year plan and family results sit behind a rewarded ad. If no ad slot is configured, the gate opens without an ad.
- 📢 **Banner ad slot:** Shows a banner ad when an ad group ID is configured.
- 📚 **Rules and sources:** A sheet lists each checkup's age range, cycle, and legal source as encoded in the app.
- 🔗 **Share:** Share your result through a Toss link that opens the home screen directly.
- ⭐ **Review prompt:** Asks for an app review once, right after you first mark a checkup as received.
- 🗑️ **Data reset:** Clears all profiles, records, and banner state after confirmation.
- 🛡️ **Corrupt-data recovery:** If stored data fails validation, the original is kept under a `.corrupt` key and the app starts clean.

## Tech Stack

- **Framework:** React 18 with TypeScript, built with Vite 6 (client-side rendering only; the bundle is served from Toss's CDN)
- **Routing:** React Router 7 (`BrowserRouter`, with `basename` set from `BASE_URL`)
- **UI:** Toss Design System (`@toss/tds-mobile`, `@toss/tds-mobile-ait`) plus plain CSS (`src/styles/`, `src/index.css`)
- **Platform SDK:** `@apps-in-toss/web-framework` for sharing, review requests, haptics, analytics, and ads
- **Storage:** Browser `localStorage` with a versioned envelope (`{ version: 1, data }`). There is no database and no server.
- **Authentication:** None. The app does not log users in and does not call any API.
- **Testing:** Vitest with jsdom and Testing Library; Playwright for visual smoke tests

## Getting Started

Requires Node.js and npm (the project uses `package-lock.json`).

```bash
# Install dependencies
npm install

# Type-check
npx tsc --noEmit

# Run unit tests
npx vitest run

# Production bundle (output in dist/)
npx vite build
```

For the Toss bundle, see [Deployment](#deployment).

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Vite inlines these at build time, so rebuild after changing them. An empty value degrades that feature quietly.

| Variable | Description | Required |
|---|---|---|
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID from the Apps-in-Toss console. When empty, the banner is not rendered. | Yes for `npm run build:release` |
| `VITE_TOSS_AD_SLOT_ID` | Rewarded ad slot ID from the console. When empty, the locked section unlocks without an ad. | Yes for `npm run build:release` |
| `VITE_SHARE_OG_URL` | Preview image URL attached to shared links. When empty, the link is shared without a preview image. | No |

`.env.example` also lists `VITE_TOSS_IAP_SKU` and `VITE_TOSS_PROMOTION_CODE`. The current source does not read them, so they have no effect.

Do not hard-code console-issued IDs in source. The release build fails if the two ad variables are missing (`scripts/check-release-env.mjs`).

## Project Structure

```
src/
├── pages/          # Home (results) and ProfileForm (create/edit a profile)
├── components/     # Shared UI wrappers around TDS; home/ holds the home-screen sections
├── domain/         # Pure eligibility rules, plans, banner logic, and formatting
├── data/           # localStorage repositories and the checkup store provider
├── lib/            # Analytics, review, and share wrappers; shared types; storage helpers
├── styles/         # Global and reward-ad CSS
├── __tests__/      # Vitest suites
└── test/           # Shared test render helpers
e2e/                # Playwright visual smoke tests
scripts/            # Release-env and pre-release checks
```

## Deployment

1. Fill in `.env` with the console-issued ad IDs.
2. Build the Apps-in-Toss bundle with `npx ait build`. The `appName` in `apps-in-toss.config.ts` must match the app name registered in the Apps-in-Toss developer console exactly, or deployment fails with error 4031.
3. Upload the generated `.ait` bundle in the Apps-in-Toss developer console and submit it for review.
4. Before submitting, confirm that no test ad IDs or placeholder values are in the build, and that the review checklist (outbound links, console errors, and the share and review entry points) passes.

The app is a static bundle. It cannot use server-side rendering or API routes.

## License

MIT
