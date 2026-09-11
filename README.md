# Makan Trail — Homepage & Stall Page Prototype

## Map data source
The hawker centre map now uses **real GPS coordinates** from NEA's official
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


A visual draft for the Singapore hawker/restaurant discovery & review site.
Two pages: `index.html` (homepage) and `stall.html` (individual stall detail
page). Shared styling in `styles.css`, shared interactions in `script.js`.

## What's in this draft
- Homepage: hero, category browse chips, latest editorial tastings (client
  team's content), "how we review" 3-step process, reader review examples
- Stall detail page: photo/video gallery, full editorial write-up, at-a-glance
  info card, reader reviews list, working share button, login-gated
  "Write a review" button

## What's placeholder / needs real content
- Brand name "Makan Trail" — swap for the client's actual chosen name
- All photos are solid-color placeholders — needs real photos/video from the
  team's tastings
- Copy (reviews, stall info) is sample text to demonstrate the layout

## What's functional right now
- Mobile menu (open/close, closes on link tap)
- Share button — uses the native share sheet on mobile (includes Instagram
  as a target automatically), falls back to "copy link" on desktop
- "Write a review" reveals a note explaining sign-in is required — this is a
  placeholder; real Google/Facebook login needs to be wired to a backend

## Not yet built (needs backend)
- Actual user accounts / social login
- Review submission form (star picker, text, optional photo upload)
- Search/filter functionality on the browse chips
- CMS for the client's team to publish new stall write-ups
- Database of stalls/restaurants and reviews

## Suggested next step
Once the client reacts to this direction (colors, tone, layout), the next
build phase is picking a stack that supports user accounts and a review
database — this can no longer be a static site like the draft here.
