# Maharack Heights — Interactive Slice View

A Housing.com-style residential building explorer, live at **https://housing.maharack.com**.

Project View → Building Slice → Floor Selection → Home Selection → Home Details

## Stack

- Next.js (App Router, TypeScript, standalone output)
- Three.js + React Three Fiber + Drei (3D building, floor slicing, camera transitions)
- Framer Motion (UI panels and overlays)
- Tailwind CSS v4
- Deployed on the Maharack server: PM2 + nginx + Let's Encrypt

## Running locally

```bash
npm install
cp .env.example .env   # set ADMIN_PASSWORD
npm run dev            # http://localhost:3000
```

Production build: `npm run build && npm start` (Node ≥ 20.9).

## How it works

- The building is currently **procedurally generated** from the floor/home data —
  no GLB download is needed, so it loads instantly and works as the mock until
  the real architectural models are integrated (see *GLB assets* below).
- Clicking a floor (or using the vertical selector) fades out the floors above,
  keeps the lower floors as context, and tilts the camera to a top-down view of
  the selected floor showing each home as a selectable unit with its label.
- Devices without WebGL automatically get a 2D floor-plan explorer with the
  same data and selection flow.

## Data & privacy model

Internal records live **server-side only** (`src/server/data.ts`, persisted to
`data/store.json` at runtime). The public frontend only ever receives the
payload produced by `src/server/public.ts`, which:

- **never** copies `internalResidentReference`,
- strips configuration, areas, orientation and assets for homes marked `private`,
- resolves display labels according to the resident display mode:

| Mode | Behaviour |
| --- | --- |
| `fictional-demo` (default) | shows the sample residence names from demo data |
| `approved-display-name` | shows a name only when an admin has approved it (`showPublicName`) |
| `hidden` | generic labels — Home A, Home B, Home C |

Verify yourself: `grep -r "internalResidentReference" .next/static` after a
build returns nothing.

## Updating floors, names and home details

Everything is editable from the password-protected admin console at
**`/admin/homes`** (not linked from public navigation; requires
`ADMIN_PASSWORD` env):

- add floors and homes,
- rename homes / set public display names and toggle their visibility,
- set availability (`available` / `reserved` / `sold` / `private` — private
  hides all details publicly),
- edit GLB mesh ID associations,
- upload floor plans and interior images (served from `data/uploads/`),
- switch the resident display mode,
- **Preview draft** (opens `/?preview=1`) before **Publish**.

Edits go to a draft; the public site only changes when you press Publish.
To change the *seed* data (fresh installs), edit `src/server/data.ts` and
delete `data/store.json`.

## GLB assets

When the real architectural models are ready, place them under:

```
public/models/project/
  tower-a.glb              # full building
  tower-a-exterior.glb
  floors/floor-06.glb
  homes/floor-06-home-a.glb
public/images/floor-plans/   # static floor plans (optional; admin uploads also work)
public/images/interiors/
```

Mesh naming contract (already wired into the data and used as `mesh.name` by
the procedural units): `tower-a__floor-06__home-a`. Each home's `meshIds`
array (editable in the admin) maps GLB meshes to that home, so a GLB-based
`Tower` variant can resolve click targets by `mesh.name` without touching the
data layer. The procedural tower in `src/components/scene/Tower.tsx` is the
reference implementation of the selection/slicing behaviour to replicate when
swapping in `useGLTF`.

## Monitoring & analytics

- Client errors are reported to `POST /api/monitor` → `data/errors.jsonl`.
- Floor/home interactions are tracked via `POST /api/analytics` →
  `data/analytics.jsonl` (events: floor-selected, home-selected,
  floor-plan-viewed, interiors-viewed, details-requested).
- Both are viewable in the admin console under *Monitoring*.

## Deployment (current production)

The app runs on the Maharack server (68.183.84.5) as a PM2 app behind nginx:

```bash
# on the server
cd /var/www/housing-maharack
git pull
npm ci && npm run build
pm2 restart housing-maharack
```

- PM2 app `housing-maharack` runs the standalone server (`node .next/standalone/server.js`, port 3015) with Node 22 from `/opt/node22`.
- nginx vhost `/etc/nginx/sites-available/housing.maharack.com` proxies to it; TLS via Let's Encrypt (auto-renew).
- DNS: `housing.maharack.com` → A record `68.183.84.5` (Cloudflare).
