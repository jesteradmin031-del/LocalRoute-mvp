# LocalRoute

**Go like a local.** A mobile-first Balasore hackathon MVP built with React, JavaScript, Vite and Lucide icons. No API keys or backend required.

## Run in VS Code

1. Open this `localroute` folder in VS Code (File → Open Folder).
2. Install Node.js 20.19+ or 22.12+ if it is not installed.
3. Open the integrated terminal and run:

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite, normally http://127.0.0.1:5173. On Windows PowerShell, use `npm.cmd` if script policy blocks `npm`.

```sh
npm test          # deterministic routing checks
npm run build    # production files in dist/
npm run preview  # preview production build
```

To try on a phone on your network: `npm run dev -- --host 0.0.0.0` and use your computer's LAN IP. Microphone, clipboard and share APIs generally need HTTPS or localhost; a phone's plain HTTP LAN URL may not support them. Grant microphone permission when prompted. Text entry always works. Google Fonts enhance typography; system fonts remain usable offline.

## Demo walkthrough (3 minutes)

1. Default journey: **Balasore Railway Station → FM College**. Select **Cheapest** to show the demo bus journey via Cinema Chhak: ₹18, 29 min, 460 m walking.
2. Select **Less walking**: the direct shared auto ranks first: ₹40, 18 min, 80 m walking. Select a card to change the schematic map, and expand **View journey**.
3. Type or speak **“Station to FM College, late, fewer transfers and less walking”**. The intent interpreter identifies mapped landmarks and prioritizes late-travel preferences. Try **“Balasore station ru FM College kemiti jibi?”** as typed mixed-language input.
4. Choose **Let's go**, read the guidance, and confirm each landmark manually. Try **Missed my stop**, select **District Hospital**, find an onward route, and use the returned plan.
5. Bookmark a route; open **Saved journeys**. Refresh to demonstrate browser persistence.
6. Submit a route or landmark using **Contribute**. It appears as **Pending review**, stored locally and excluded from routing.
7. Open **Safety & SOS** to save a trusted contact and open the dialer. Use the share icon to share an itinerary snapshot, or **Need a ride instead?** for the optional provider handoff.

## Proposal basis

Implemented from the supplied one-page *LocalRoute — Small-Town Unorganized Bus & Auto Route Finder* proposal: typed and Web Speech API requests, structured local landmarks, multi-leg buses/shared autos, landmark-to-vehicle route cards, estimated fares, mobile UX, and community Add Route/Landmark contributions. The earlier conversation adds the natural-language intent layer, late-travel preference, guided trips, missed-stop recovery, safety tools and optional provider handoff.

**The proposal does not supply field-verified routes or fares.** All 15 landmarks, 24 bidirectional transport links, schematic positions, fares, service hours and review counts are illustrative fixtures for demonstration, not confirmed Balasore services. The UI says so. The `demo-reviewed` confidence value means checked for internal consistency only, never verified in the real world.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/data.js` | Curated demo landmark aliases, schematic positions, service segments, incremental fare, minutes, walking and provenance fields |
| `src/engine.js` | Deterministic graph traversal, same-service leg grouping, fare totals, ranking, intent interpretation and onward-route calculation |
| `src/App.jsx` | Planner, schematic map, speech input, saved journeys, community forms, manual trip guidance and safety dialogs |
| `src/providers.js` | Provider registry and fail-closed public handoff adapter |
| `src/storage.js` | Namespaced localStorage with unavailable-storage fallback |
| `src/styles.css` | Responsive styling, desktop sidebar, mobile navigation and accessible focus states |
| `tests/engine.test.js` | Graph integrity, all-pairs continuity, ranking, intent and recovery checks |

Search accepts the mapped names and aliases from `data.js`. The engine enumerates simple paths of at most five edges and returns the top four. This bound keeps a small demo responsive; larger networks need a shortest-path algorithm supporting constraints. Each reverse edge represents an explicit demo assumption of bidirectional service. Fares are **incremental segment fares**; adjacent edges on the same service merge into one vehicle leg, and do not count as transfers. Walking between distinct vehicles still counts as a transfer. Walking totals include boarding/drop-off approaches encoded on the segment, with no road geometry inference.

Ranking:

- Best match balances duration, fare, vehicle changes and walking.
- Cheapest prioritizes fare; fewer changes prioritizes vehicle changes; less walking prioritizes walking distance.
- Late travel penalizes services ending before 22:00, non-connected demo segments, transfers and walking. This is a preference score, not live availability filtering or a safety guarantee. The app does not infer the user's actual departure time or compute live arrivals.

## AI-style layer and voice limits

`interpret()` is an offline, rule-based intent adapter, **not a hosted LLM**. It recognizes English preference phrases, selected Hindi terms and landmark aliases, including the illustrated Romanized Odia station-to-college request. It never creates graph edges. One matched landmark is treated as the destination unless the request explicitly says “from”. Two matched landmarks are used in mention order, with explicit English from/to clauses taking precedence. Unmapped explicit clauses are rejected. Ambiguous requests need the typed form; unknown requests show help. For multiple preferences, late travel takes priority; otherwise the first recognized preference takes priority, as described in the UI explanation. General conversational Odia/Hindi understanding is not claimed.

Speech input uses browser `SpeechRecognition` / `webkitSpeechRecognition`. English India, Hindi and experimental Odia can be requested, but actual language support depends on the browser/service. Permission denial, unsupported browsers and recognition errors show fallback messages. The browser may send audio to its speech service; recognition is not guaranteed offline. Spoken trip guidance uses `speechSynthesis` with the device's installed voices.

A future LLM should return only a validated intent schema such as `{originId, destinationId, preference}`. Validate IDs against `data.js`, run `findRoutes()`, and render only those returned results. Never accept model-generated edges, fares or service availability. Keep API secrets on a server.

## Safety, sharing and booking scope

- **Manual trip guidance:** user-confirmed progress. No GPS monitoring, geofencing, automatic deviation alerts, true live navigation or automatic arrival detection. Missed-stop recovery recalculates from a user-selected mapped landmark.
- **Trip share:** native Web Share API, then clipboard fallback, then selectable itinerary text. Shares a static plan, never live GPS. Localhost links work only on the hosting computer; deploy the app for remotely accessible links.
- **SOS:** user-configured trusted contact in localStorage and a `tel:` dialer link. No automatic call, emergency dispatch, monitoring, or message delivery. The UI directs users to local emergency services in an emergency without pretending to provide one.
- **Booking:** generic external Uber website handoff and copyable pickup/drop-off text. Local availability is unknown. No booking, destination-prefill promise, private APIs, login or provider prices. Extend this with an approved public deep-link adapter only after verifying provider documentation and terms.
- **Community:** browser-local submissions pending review. They do not become routable automatically. A production service needs authenticated contributions, moderation, corroboration and confirmation timestamps backed by real observations. Current `confirmationCount` fields are fixture examples.
- **Privacy:** saved journeys, trusted contact and contributions stay in this browser. No backend analytics. Browser speech services and any external booking website have their own policies. Clearing site data removes local entries. Do not enter sensitive personal details into this demo.

## Next steps for a real pilot

Replace fixtures with locally confirmed stops, both-direction services, dated fare observations, real service windows and walking connections. Add coordinates separately from schematic positions, a map with attribution, server-backed moderation, live trip sharing with access-controlled expiring tokens, and field testing. Deploy the generated `dist/` folder to an HTTPS static host to enable secure browser features. No paid services are required for the current demo.
