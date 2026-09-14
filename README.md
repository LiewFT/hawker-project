# Makan Trail — Homepage & Stall Page Prototype

## Pages
- `index.html` — homepage: map, browse filters, latest reviews, process, community
- `stall.html` — stall detail page: gallery, editorial review, reader reviews + submission
- `about.html` — who's behind the site
- `privacy.html` — placeholder privacy policy (needs legal review before publishing)
- `404.html` — custom not-found page

## What's fully working right now (no backend needed)
- Mobile menu, share button, category filter chips, "load more" reviews
- Interactive Singapore map (Leaflet + OpenStreetMap) using real NEA hawker
  centre GPS data, locked to Singapore bounds, with search
- Demo sign-in + review submission flow — fully functional in-browser, but
  **session-only**: reviews you post disappear on page refresh since there's
  no database yet. This is intentional, to demonstrate the full UX without
  needing real infrastructure first.

## What still needs a real backend (your decision needed)
To make reviews permanent and logins real, you need to pick a backend
service tied to your own account — I can't provision one for you. Common
options for a static site like this:
- **Firebase** (Google) — has a generous free tier, built-in Google/Facebook
  login, and a database (Firestore) that's straightforward to wire into a
  static site like this one.
- **Supabase** — similar free tier, open-source, Postgres-based.

Once you pick one and create a project, come back and I can help wire the
real login and review storage into this exact frontend.

## Map data source
The hawker centre map uses **real GPS coordinates** from NEA's official
"Hawker Centres" dataset on data.gov.sg (Open Data Licence — free for
commercial use), rendered with Leaflet.js + OpenStreetMap tiles (no API key
needed, no cost). Currently includes 6 real hawker centres: Chinatown
Complex, Tiong Bahru Market, Maxwell Food Centre, Geylang Serai Market,
51 Old Airport Road Food Centre, and Newton Food Centre.

**Still placeholder:** the individual stall markers inside each hawker
centre. There is no public dataset at the stall level, so these are
demonstration points offset a small distance from the real hawker centre
GPS point. Once the client has a real stall database, each stall marker
should get its own confirmed coordinate.

## Still placeholder / needs real content
- Brand name "Makan Trail" — swap for the client's actual chosen name
- All photos are solid-color placeholders — needs real photos/video
- Privacy Policy text — needs legal review before publishing
- Contact page/form — footer "Contact" link is currently a placeholder
