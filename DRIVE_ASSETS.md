# Drive assets — files NOT in this repo

Two GLB models exceed GitHub's 100MB limit. They live in your Google Drive.

## What's missing from a fresh clone

| File in Drive | Save to                                                      | Size  |
|---|---|---|
| `blade_of_chaos_-_god_of_war.glb`        | `models/blade_of_chaos_-_god_of_war.glb`        | 222MB |
| `armoured_werewolf_warlord_-_untextured_meshy_6.glb` | `models/armoured_werewolf_warlord_-_untextured_meshy_6.glb` | 122MB |
| `kratos.glb`                             | `app/public/models/kratos.glb`                  | 222MB (same data, renamed copy used by the runtime) |
| `druid.glb`                              | `app/public/models/druid.glb`                   | 122MB (same data, renamed copy used by the runtime) |

The intro **needs** `app/public/models/kratos.glb` and `app/public/models/druid.glb` to start — without them the loader sits at 100% forever. The two `models/` originals are kept as backup / source.

## Quick setup on a fresh machine

```bash
git clone <your-repo-url>
cd handoff/app
npm install
# Then download the 4 GLBs from Drive and drop into the paths above.
npm run dev
```

## Suggested Drive layout

Make a single folder in Drive named `neural-gym-assets` containing both pairs of files, organised exactly like the repo paths so a drag-and-drop into the project root puts everything in place.

```
neural-gym-assets/
├── models/
│   ├── blade_of_chaos_-_god_of_war.glb
│   └── armoured_werewolf_warlord_-_untextured_meshy_6.glb
└── app/
    └── public/
        └── models/
            ├── kratos.glb
            └── druid.glb
```

Then on the new machine, just unzip into `handoff/` (overwriting nothing — these paths are git-ignored so they don't exist yet).

## Long-term option: Draco compress

Both heavy GLBs compress 80–95% with Draco, so you can stop relying on Drive entirely:

```bash
cd app
npx gltf-pipeline -i public/models/kratos.glb -o public/models/kratos.glb -d
npx gltf-pipeline -i public/models/druid.glb  -o public/models/druid.glb  -d
```

After compression both files drop under 30MB and can be tracked in git directly. You'd then remove the lines that ignore them from `.gitignore`.
