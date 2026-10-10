🇺🇸 [한국어](./README.ko.md)

# Checkup Window (올해검진) — Know which national health checkups you're due this year

Checkup Window (올해검진) is an App-in-Toss mini app that applies Korean national health screening rules to a person's birth year, sex, and insurance type. It shows this year's checklist of eligible items, the days left until December 31, and the next year each item becomes available again. It is built for adults in Korea who want to book their checkups before year-end without digging through the NHIS app or the criteria tables, and all profile and checkup data stays on the device.

## Features

- 🧾 **Profile setup:** Add yourself with name, birth year, sex, and insurance type (employee, non-office employee, regional subscriber, dependent, or medical aid recipient).
- 👨‍👩‍👧 **Family profiles:** Add up to 9 family members (10 profiles in total), each with their own checklist.
- ✅ **Eligibility for 7 checkup items:** General health checkup, stomach, colorectal, breast, cervical, liver, and lung cancer screening, with cycle (annual or biennial) and age/sex rules applied.
- 🩺 **Conditional items:** Liver and lung screening are shown as conditional and are confirmed in a bottom sheet before being marked as applicable.
- 🔄 **Received toggle:** Mark each item as received for the current year; the summary and progress bar update immediately.
- ⏳ **Year-end countdown:** Shows the days remaining until December 31 and the next eligible year for items not due this year.
- 🔔 **Deadline banner:** From July, a banner highlights outstanding items; it turns urgent within 30 days of year-end and can be dismissed for the current month.
- 📅 **Three-year plan:** A three-year schedule for every profile, shown behind a rewarded ad gate that opens automatically if the ad cannot be shown.
- 📤 **Share:** Share your result with a deep link back to the home screen.
- ⭐ **Review prompt:** Asks for an app review once, right after you first mark an item as received.
- 📚 **Criteria and sources:** A sheet lists the rule and legal basis for each checkup item.
- 🗑️ **Reset:** Erase all profiles, records, and banner state after confirmation.

## Tech Stack

- **Framework:** React 18, TypeScript, Vite 6 (static client-side build, no SSR)
- **Routing:** React Router 7 (`BrowserRouter`)
- **UI:** `@toss/tds-mobile` (Toss Design System) components, with `@emotion/react` and `@emotion/styled` as peer dependencies; light layout CSS for flex/grid only; `var(--adaptive*)` CSS variables for dark mode
- **App-in-Toss SDK:** `@apps-in-toss/web-framework` (imperative APIs for share, haptics, ads, analytics, and review)
- **Storage:** Browser `localStorage` with versioned keys (`checkupWindow.*.v1`). There is no server or database.
- **Auth:** None. The app does not use Toss login; it works without an account.
- **Testing:** Vitest, Testing Library, jsdom, and Playwright for visual smoke tests

## Getting Started

```bash
# Install dependencies (npm, not pnpm)
npm install

# Type check
npm run typecheck

# Unit tests
npm run test

# Production bundle (output in dist/)
npx vite build

# Visual smoke tests (first time: npx playwright install chromium)
npm run test:visual
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values issued in the Apps-in-Toss console. Vite replaces these at build time, so rebuild after changing them. An empty value makes that feature degrade quietly.

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SHARE_OG_URL` | Preview image URL attached to shared links. If empty, the link is shared without a preview image. | No |
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID from the console. If empty, the banner ad is not rendered. | No |
| `VITE_TOSS_AD_SLOT_ID` | Rewarded ad slot ID from the console. If empty, the reward gate opens automatically. | No |

`.env.example` also lists `VITE_TOSS_IAP_SKU` and `VITE_TOSS_PROMOTION_CODE`, but no current screen reads them.

## Project Structure

```
src/
├── App.tsx          # Routes (/, /profile/new, /profile/:profileId/edit)
├── main.tsx         # Entry point (TDS provider and router)
├── pages/           # Home (results), ProfileForm (input and edit)
├── components/      # Shared UI (Card, SummaryHero, SubmitFooter, StateView, ...)
│   └── home/        # Home screen sections (deadline banner, checklist rows, locked tier)
├── domain/          # Pure eligibility rules and calculations (no UI or storage)
├── data/            # localStorage repositories and the checkup store provider
├── lib/             # Types, analytics, share, review, and storage helpers
└── __tests__/       # Shared test helpers and tests
e2e/                 # Playwright visual smoke tests
```

## Deployment

Checkup Window is deployed to the Toss CDN as a static bundle.

1. Confirm that `appName` in `apps-in-toss.config.ts` matches the app name registered in the Apps-in-Toss developer console exactly, including case. A mismatch causes a 4031 deploy error.
2. Fill in the console-issued values in `.env` (see Environment Variables). Do not commit `.env`.
3. Build the Toss bundle with `npx ait build`. This produces a `.ait` file.
4. Upload the build through the Apps-in-Toss developer console and submit it for review.
5. Before submitting, check the review criteria: no minors' content, no external navigation, no `console.error` in production, and CORS-safe external requests (none are used today).

## License

MIT
