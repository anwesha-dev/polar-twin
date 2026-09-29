# ❄️ POLAR TWIN

**A digital twin and decision-intelligence dashboard for the Indian Antarctic research stations, Maitri and Bharati.**

Prototype for Smart India Hackathon problem statement **SIH26060**: *Digital Platform for Efficient Remote Management of Indian Antarctic Research Stations* (MoES / NCPOR, theme: Smart Automation).

> ⚠️ **All data is synthetic.** Telemetry comes from an in-browser simulator. Nothing here is sourced from NCPOR, and the 3D models are stylised representations, not surveyed CAD. Not for engineering or operational use.

---

## 1. The problem

Antarctic stations operate in extreme isolation. Fuel, power, water and equipment health all interact, and a fault in one can cascade into others. Comms links are intermittent, resupply windows are fixed, and remote teams need to see what is happening and what will happen next.

## 2. What the prototype does

POLAR TWIN gives operators a single view of both stations and lets them test "what if" situations before they happen.

| Capability | Description |
|---|---|
| **3D Digital Twin** | Interactive 3D model of each station. Orbit, zoom and click hotspots to see live simulated telemetry, health, predicted condition and a recommended action. |
| **Layer switcher** | Toggle the twin between Environmental, Energy, Infrastructure, Logistics, Risk and Operations views. |
| **What-If Simulator** | Inject a scenario and see the projected cascade of affected components plus a recommended response. |
| **AI Risk Intelligence** | Per-station risk score and level, contributing causes, anomaly detection and cascade-risk reasoning. |
| **Predictive forecasts** | Fuel consumption forecast and estimated station endurance in days. |
| **Mission Planner** | Resupply recommendations based on how close each stock item is to its critical threshold. |
| **Emergency Mode** | Full-screen emergency overlay with a scripted restore sequence. |
| **Offline-aware comms** | Simulates satellite link loss, keeps local operations running and queues data for sync on reconnect. |
| **Ops assistant** | Rule-based Q&A over the current structured data (risk causes, generator failure impact, fuel outlook, resupply priority, equipment needing attention). |
| **Role-based demo login** | Five roles, each with a "Your Focus" quick-access navigation set. |
| **Guided demo mode** | An automated walkthrough of the whole story, one step every ~3.4 seconds. |
| **Graceful fallback** | Switches to a built-in canvas renderer if WebGL or the 3D bundle fails to mount. |

### Dashboard pages

Command Center · Station Overview · 3D Digital Twin · Energy · Infrastructure · Logistics · Environment · AI Risk Intelligence · What-If Simulator · Mission Planner · Maintenance · Emergency Mode · Data & Telemetry · Communication · Alert Center · Settings

### What-If scenarios

| Scenario | Effect |
|---|---|
| Extreme Cold | External temperature drops sharply and heating demand spikes. |
| Generator Failure | Generator #2 trips offline and the backup must absorb the load. |
| Fuel Leak | Fuel tank develops a slow leak with an abnormal loss rate. |
| Water Pump Failure | Primary pump degrades and water availability drops. |
| Storm | High winds and temperature swing, with outdoor operations restricted. |
| Resupply Delay | Next flight or vessel is pushed back. |
| Communication Loss | Satellite link drops while local operations continue. |
| Combined Crisis | Extreme cold, generator failure and storm triggered together. |

### Simulated stations

| | Maitri | Bharati |
|---|---|---|
| Coordinates | 70.76°S, 11.73°E | 69.41°S, 76.19°E |
| Baseline temperature | −14 °C | −9 °C |
| Baseline load | 210 kW | 230 kW |
| Starting fuel | 63% | 43% |

Each station models two generators, a fuel farm, six logistics stocks (fuel, food, medical, water, spares, science), key equipment (water pump, HVAC, comms rig) and eight buildings (habitat, lab, generator shed, fuel farm, water plant, power and comms tower, cold storage, emergency shelter).

---

## 3. Tech stack

| Layer | Technology |
|---|---|
| Build tool / dev server | [Vite](https://vitejs.dev) 5 |
| Language | JavaScript (ES modules), no framework for the dashboard |
| 3D twin | React Three Fiber + drei (Three.js r160), shipped as a prebuilt bundle in `public/vendor/` |
| 3D / 2D fallback | Three.js `0.128.0` and a built-in 2D canvas renderer |
| Charts | Chart.js `4.4.4` |
| Styling | Plain CSS with design tokens (`src/styles/main.css`) |
| Data | In-browser synthetic simulator, no backend |
| Hosting | Vercel (static) |

---

## 4. Getting started

Requires **Node.js 18+** (`.nvmrc` pins 20).

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production build to dist/
npm run preview    # serve the build locally
```

### Demo logins

Client-side only, with no backend.

| User ID | Password | Role | Focus pages |
|---|---|---|---|
| `admin` | `admin123` | Admin | Settings, Alerts, Twin, Emergency |
| `engineer` | `engineer123` | Station Engineer | Twin, Energy, Infrastructure, Maintenance, Telemetry |
| `logistics` | `logistics123` | Logistics Officer | Logistics, Mission Planner |
| `scientist` | `scientist123` | Scientist | Environment, Telemetry, Overview |
| `emergency` | `emergency123` | Emergency Officer | Emergency, Alerts, Risk, Comms |

The Admin role can also switch roles from the header. These credentials are for a static prototype. Do not reuse this pattern for real authentication.

### Suggested demo flow

Log in as `admin` and start **Guided Demo**, or step through it manually:

1. Command Center, then each station's overview
2. Open the **3D Digital Twin** and click a hotspot
3. Inject **Extreme Cold** at Bharati and watch Energy, Logistics and Risk respond
4. Push Generator #2 into an anomaly and observe the cascading risk
5. Run **Generator Failure** in the What-If Simulator and read the recommended response
6. Trigger **Communication Loss**, see offline operation, then restore and watch the sync queue drain
7. Open the **Mission Planner** for the resupply recommendation

---

## 5. Architecture

```
simulator/runner.js  (every 3 s)
      │
      ▼
simulator/engine.js ──► core/store.js  (DB, STATE)
                              │
                              ▼
                    ui/shell.js  render()
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
        pages/*.js                      twin/digitalTwin.js
     (HTML string views)          window.PolarTwin3D.mount(...)  → R3F scene
                                   └─ fallback: Three.js / 2D canvas
```

Pages read only from `DB` and `STATE`, never from simulator internals. That keeps the render layer independent of the data source, so the simulator can later be swapped for a real backend feed. More detail is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Project structure

```
polar-twin/
├── index.html                       # App shell + login markup
├── package.json
├── vite.config.js
├── vercel.json                      # Build config + cache headers
├── public/vendor/
│   └── polar-twin-3d.bundle.js      # Prebuilt R3F twin (window.PolarTwin3D)
├── docs/ARCHITECTURE.md
└── src/
    ├── main.js                      # Bootstrap and first tick
    ├── styles/main.css
    ├── utils/helpers.js             # clamp, rand, fmt, $id ...
    ├── core/store.js                # Synthetic DB, STATE, audit log, alerts
    ├── simulator/
    │   ├── engine.js                # Telemetry, anomaly detection, cascade risk, forecasts
    │   ├── scenarios.js             # What-If scenario catalogue
    │   └── runner.js                # 3 s tick timer
    ├── ui/                          # shell, toast, charts, assistant, events
    ├── pages/                       # One file per dashboard page
    ├── twin/
    │   ├── digitalTwin.js           # Twin page, R3F mount, Three.js fallback
    │   └── fallback2d.js            # Canvas fallback renderer
    └── features/                    # auth/roles, emergency, guided demo
```

### 3D bridge

`public/vendor/polar-twin-3d.bundle.js` exposes `window.PolarTwin3D` with `mount(container, options)`, `unmount(container)` and `unmountAll()`. `twin/digitalTwin.js` passes station data and a `module(station, id)` accessor so the scene reads live simulated values. If mounting throws, the page falls back to the built-in renderer.

---

## 6. Deployment (Vercel)

1. Push the repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new). Vite is auto-detected (build `npm run build`, output `dist`, both also set in `vercel.json`).
3. Deploy. No environment variables are required.

CLI alternative: `npm i -g vercel`, then `vercel` (preview) or `vercel --prod`.

---

## 7. Roadmap

- [ ] FastAPI + PostgreSQL backend replacing the simulator (`DB` / `STATE` are already the single read layer)
- [ ] MQTT ingestion and WebSocket live feed
- [ ] Real authentication and role-based access control
- [ ] Offline-first sync (SQLite) for low-bandwidth links
- [ ] ML risk scoring and predictive-maintenance models
- [ ] Rebuild the 3D twin from readable React Three Fiber source

## 8. Known limitations

- Telemetry, alerts and 3D layouts are synthetic and illustrative.
- Login is a client-side demo only; credentials are visible in the source.
- The "AI" features are rule-based and threshold-driven, not trained ML models.
- The 3D twin ships as a prebuilt bundle whose original JSX source is not included.
- State lives in memory and resets on page reload.

