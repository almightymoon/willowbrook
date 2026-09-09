# Willowbrook

A small, playable third-person town exploration game, built with TypeScript, Vite, and Three.js. All world geometry and audio are generated locally; no paid assets, API keys, or game server are needed. The interface uses local system fonts; the game makes no external asset requests.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`. The `dist/` folder can be hosted on a static web server.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Walk relative to the camera |
| Hold Shift | Run |
| Space | Jump |
| Drag mouse | Orbit the camera |
| Click the town | Capture the mouse for free look |
| Scroll wheel | Camera zoom |
| E | Talk, collect, open or close a nearby door |
| Enter | Continue a conversation |
| J | Field notes and inventory |
| M | Toggle ambient sound |
| ? / slash | Controls |
| Escape | Release mouse or close a menu |

Desktop keyboard and mouse are required for gameplay. The interface adapts to narrow browser windows, but touch movement is not implemented.

## The town

Eight enterable, furnished buildings, including The Honeycomb bakery and Fern & Fable; a fountain square, cobbled lanes, park pond, trees, flower beds, benches, lamps, six residents, and five collectible sunseeds. The three-chapter quest takes you from Mira to Bram to Theo. You can keep exploring after completing it.

Closed doors and walls have collision. Roofs disappear when you enter buildings. The camera zooms inward when a building obstructs its view. Movement includes acceleration, running, gravity, jumping, and landing on low obstacles. The world has bounded edges.

A full day lasts 12 minutes of active play. The settings panel offers morning, golden hour, night, a cycle toggle, graphics quality, and mouse sensitivity. Lamps and windows glow at night. Wind, bird/chirping tones, footsteps, and interaction chimes use Web Audio, enabled by the first user gesture.

Quest progress, collected items, day, and time are stored in browser localStorage. Each visit starts at the welcoming town entrance. Menus and conversations pause the simulation. To start over, clear this site's localStorage.

## Verification

```sh
npx playwright install chromium
npm run test
```

Run `npm run build` and `npm run preview -- --port 4173` first, or set `TOWN_URL` to the running URL with `?test`. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can point to an existing Chromium executable. The test suite uses real browser keyboard, mouse, and UI events to exercise controls, door entry/exit, collisions, every quest stage, persistence, settings, and audio state. Test-only position helpers are enabled with the `?test` URL parameter to travel between cases quickly.

Browser screenshots and the verification report are saved under `tests/`. Sound generation and audio context state are checked programmatically; subjective audio listening is not automated.

## Source

- `src/world.ts`: procedural town assets, buildings, residents, and colliders.
- `src/main.ts`: renderer, controller, camera, quests, interface, minimap, lighting, and persistence.
- `src/audio.ts`: synthesized ambient and interaction audio.
- `src/style.css`: responsive game interface.

Static meshes are merged by material to reduce draw calls. There are no backend services or external 3D models.
