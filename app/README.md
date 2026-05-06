# NEURAL.GYM

Personal-use gym tracker — the React artifact + the 3D holographic body in one app.

## Run

```powershell
cd app
npm install     # only needed once
npm run dev
```

Open <http://localhost:5173>.

## AI workout generator (optional)

To use the "Gerar com IA" button, copy `.env.example` to `.env.local` and put your Anthropic API key there. The Vite dev server proxies the request and injects the header — the key is never sent to the browser.

```
ANTHROPIC_API_KEY=sk-ant-...
```

Templates work without a key.

## Layout

```
app/
├── index.html              entry, loads /src/main.jsx
├── vite.config.js          dev proxy for Anthropic API
├── public/models/anatomy.glb   the 3D body model
└── src/
    ├── main.jsx            React mount
    ├── App.jsx             whole gym app (tabs, planner, agenda, etc.)
    ├── HoloBody3D.jsx      React wrapper around the Three.js engine
    ├── holoEngine.js       refactored from the original holo3d.js
    └── storage.js          localStorage shim (replaces window.storage)
```

The original demo (`Holo Body 3D.html` + `holo3d.js`) at the repo root is preserved as a reference and still works on its own.

## How the SVG hologram was replaced

The artifact's `HoloHumano` SVG is gone. The CORPO tab now renders `<HoloBody3D>`, which mounts the same Three.js engine the demo uses. Force/volume data from the artifact is mapped to hologram zones via `ARTIFACT_TO_HOLO` in `HoloBody3D.jsx`. Click a muscle on the 3D body → the artifact inspector opens with that muscle's PRs.
