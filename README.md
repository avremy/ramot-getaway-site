# Ramot Getaway

Static GitHub Pages website served from the repository root. No production build step.

## Tests

Requires Node.js 20.19+ (or a supported newer Node version).

```sh
npm ci --ignore-scripts
npm test
node --check script.js
git diff --check
```

Tests run the actual page JavaScript in jsdom using Node's built-in test runner. EmailJS is replaced with a **controlled simulation**, including success, rejection, missing SDK and initialization failure; external resources are not loaded and no real form/email requests are sent. These tests do **not** verify email delivery, inbox receipt or live EmailJS template configuration. A host-authorized manual delivery test of both forms is required separately before declaring live delivery verified. The existing EmailJS browser public key and service/template IDs are public integration configuration, not server secrets.

For local visual review, run `python3 -m http.server 8000` and visit `http://localhost:8000`. Do not submit real forms during visual review unless explicitly authorized; block or mock EmailJS for browser QA.

Manual browser checks: Tab/Enter/Space menu operation, Escape focus return, mobile closed menu excluded from tab order, desktop resize, focus outlines, photo modal, responsive layout and inline status announcements.

## Design and SEO

- Fonts: Fraunces (display) and Manrope (body) from Google Fonts. Icons are an inline SVG sprite (Lucide, ISC; brand marks from Simple Icons, CC0), so Font Awesome is no longer loaded.
- Parallax: elements with `data-parallax="<speed>"` move relative to their parent as it crosses the viewport; gallery and hero photos with `data-parallax-img` drift inside their frames; the hero copy (`data-parallax-fade`) lifts and fades. Everything is transform-only, rAF-throttled and switched off under `prefers-reduced-motion`.
- SEO: title/description, canonical, robots, Open Graph/Twitter cards, `LodgingBusiness` + `Suite` + `FAQPage` JSON-LD, a visible FAQ, an image sitemap, favicons and a web manifest. When the street address or map coordinates are confirmed, add them to the JSON-LD `address`/`geo`.
- The gallery shows the five Airbnb listing photos only; the four older photos in `images/` were lower-resolution duplicates of the same shots and are kept on disk but not shown.

## Booking and contact behavior

Both forms show an inline sending status and restore their submit buttons after success or failure. Failed requests retain the guest's entries. The booking fallback is an explicit WhatsApp link containing an encoded draft; the page never opens WhatsApp or sends a WhatsApp message automatically. A successful email request is still not a confirmed reservation. Date validation rejects missing, past and reversed dates; calendar dates are preserved in email parameters and WhatsApp drafts.

Public contact links use the host-confirmed number and email. The Airbnb button opens listing `615293478807650528`. The gallery includes the five photos retrieved from that listing alongside the original site photos. The two host-confirmed testimonials are labelled Guest feedback; selected Airbnb excerpts link to the full listing reviews.

Children's sleeping arrangements, crib availability and occupancy including a crib still require host confirmation. Do not infer beds or relax occupancy rules from the selectors. Current cancellation terms should be checked on the Airbnb listing.
