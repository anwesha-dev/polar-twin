# Architecture

POLAR TWIN is a static single-page app. Everything runs in the browser.

## Data flow

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

Pages read only from `DB` and `STATE`, never from simulator internals. That keeps the render layer independent of where data comes from, so the simulator can later be swapped for a FastAPI / MQTT / WebSocket feed.

## Modules

| Path | Responsibility |
|---|---|
| `core/store.js` | Seeds stations MAITRI and BHARATI, users, assets, alerts; holds UI `STATE`; audit log |
| `simulator/engine.js` | Per-tick telemetry, anomaly detection, cascade risk, fuel forecast/endurance, forward projection for What-If |
| `simulator/scenarios.js` | Scenario definitions and activation |
| `ui/shell.js` | Navigation, sidebar, `render()` dispatch, shared view helpers |
| `pages/*` | One module per dashboard page |
| `twin/digitalTwin.js` | Twin page, hotspot panel, layer switching, R3F mount, Three.js fallback |
| `features/*` | Demo auth and roles, emergency mode, guided demo |

## 3D bridge

`public/vendor/polar-twin-3d.bundle.js` exposes `window.PolarTwin3D` with `mount(container, options)`, `unmount(container)` and `unmountAll()`. `twin/digitalTwin.js` passes station data and a `module(station, id)` accessor so the scene reads live simulated values. If mounting throws, the page falls back to the built-in renderer.

## Module note

Modules import each other circularly (for example `ui/shell.js` ↔ `pages/*`). This is safe here because cross-module use happens inside functions at runtime, not during module evaluation.
