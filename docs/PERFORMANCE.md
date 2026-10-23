# Performance

Measured on a production build (`next build` + `next start`) with headless Chrome, cold cache, median of 3 runs. "Phone" is a mid-range phone on 4G: 4× slower CPU, 150 ms latency, 1.6 Mbps.

## What changed

- **Firebase loads only where it's needed.** Firestore and Auth were in the root layout, so every page (landing, changelog, status, public pages) downloaded about 130 KB (gzipped) of Firebase before showing anything. Auth now loads after the page is interactive, and Firestore only once someone is signed in.
- **Heavy parts load on demand:** the task editor (opens with a task), the sign-in card (only for signed-out visitors) and the dashboard widgets (never for landing visitors).
- **Landing page without an animation library.** The hero grid is one canvas instead of 384 animated elements, and it pauses off-screen. The intro and scroll reveals are CSS. The page no longer downloads GSAP.
- **Public pages are cached on the server.** The roadmap is rendered on the server and cached for 60 s (visitors' browsers no longer talk to Firestore). News data is cached for 60 s and the subscribe page for 5 minutes.
- **Status API** is cached at the edge for 60 s, so polling visitors cost about one run per minute.

## Results

### Phone

| Page | Server response | Main content shown (LCP) | Main-thread blocking | JavaScript | Firebase requests |
| --- | --- | --- | --- | --- | --- |
| Landing | 4 ms → 4 ms | 4.44 s → **3.34 s** | 1.90 s → **40 ms** | 345 → **194 KB** | 0 → 0 |
| Public roadmap | 63 ms → 5 ms | 6.00 s → **0.98 s** | 7 → 33 ms | 254 → **160 KB** | 20 → **0** |
| Subscribe | 2.84 s → **60 ms** | 3.56 s → **0.96 s** | 1 → 35 ms | 251 → **157 KB** | 0 → 0 |
| Public news | 748 ms → **27 ms** | 1.57 s → **1.06 s** | 1 → 35 ms | 251 → **157 KB** | 0 → 0 |
| Changelog | 4 ms → 6 ms | 2.39 s → **1.93 s** | 5 → 64 ms | 267 → **168 KB** | 0 → 0 |
| Status | 4 ms → 5 ms | 2.44 s → **2.01 s** | 21 → 98 ms | 279 → **180 KB** | 0 → 0 |
| Board (signed out) | 4 ms → 5 ms | 828 → 908 ms | 604 ms → 1.01 s | 428 → **328 KB** | 0 → 0 |

### Desktop

| Page | Server response | Main content shown (LCP) | JavaScript |
| --- | --- | --- | --- |
| Landing | 5 → 5 ms | 964 → 964 ms | 348 → **197 KB** |
| Public roadmap | 59 → 7 ms | 1.78 s → **120 ms** | 254 → **160 KB** |
| Subscribe | 2.90 s → **52 ms** | 2.96 s → **140 ms** | 251 → **157 KB** |
| Public news | 893 → **34 ms** | 980 → **148 ms** | 251 → **157 KB** |

### JavaScript per page (gzipped)

| Page | Before | After |
| --- | --- | --- |
| Landing | 325 KB | **145 KB** (−55%) |
| Home | 258 KB | **124 KB** (−52%) |
| Changelog / Status | 244 / 253 KB | **115 / 124 KB** (−53% / −51%) |
| Public news / roadmap / subscribe | ~245 KB | **~118 KB** (−52%) |
| Board | 387 KB | **255 KB** (−34%) |
| Inbox | 382 KB | **249 KB** (−35%) |
| Beta (owner) | 300 KB | **171 KB** (−43%) |
| Other app pages | 285–311 KB | 251–278 KB (−11 to −13%) |

## Known trade-offs

- **Changelog and Status on a phone:** blocking time rose by 60–80 ms, because Firebase Auth now initializes just after the page appears instead of with it. The pages appear sooner overall.
- **App pages opened while signed out** block for longer on a phone, because of the sign-in card's animated pixel grid (`PatchGrid`, still on GSAP). Converting it to a canvas like the landing grid would fix this.
- Signed-in pages couldn't be timed here without a test account. Their JavaScript sizes above are exact.
