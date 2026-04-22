# Zod API Schemas + Deploy Folder Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Zod v4 schemas covering every documented FYTA API field, relocate all deployment artefacts (Dockerfile, server.py, entrypoint.sh, probe-api.sh, config.example.js) to `deploy/`, and verify the Storybook + Tailwind v4 integration.

**Architecture:** A single `src/api/schemas.ts` file owns all Zod schemas and re-exports inferred types. The `deploy/` folder becomes the canonical home for everything Docker/server-related; the Dockerfile COPY paths are updated accordingly. `index.html` stays at the project root — Vite requires it there. The Storybook Tailwind config is already correct and needs no changes.

**Dependency:** This plan is independent of `2026-04-22-ts-migration-linting.md` but should run **after** that plan completes, because Task 1 of this plan extends the types defined there. If running concurrently, complete Task 2 (deploy reorganisation) first — it has no overlap.

**Tech Stack:** Zod 4 (`zod`), TypeScript, Vite 8, Docker multi-stage build.

---

## File Map

| Action | Path | Responsibility |
| ------ | ---- | -------------- |
| Create | `src/api/schemas.ts` | All Zod schemas + inferred types for FYTA API |
| Move   | `Dockerfile` → `deploy/Dockerfile` | Multi-stage Docker build |
| Move   | `server.py` → `deploy/server.py` | Python proxy + static server |
| Move   | `entrypoint.sh` → `deploy/entrypoint.sh` | Container entrypoint |
| Move   | `probe-api.sh` → `deploy/probe-api.sh` | API diagnostic script |
| Move   | `config.example.js` → `deploy/config.example.js` | Token setup instructions |
| Keep   | `.dockerignore` (at root) | Must stay at build-context root |
| Keep   | `index.html` (at root) | Vite entry point — cannot be in `public/` |
| Verify | `.storybook/main.ts` | Already correct — no change |

---

## Background: index.html and public/

`index.html` **cannot** be moved to `public/`. In Vite, `public/` is for static assets that are copied verbatim to `dist/` without processing (images, fonts, robots.txt). Vite must find `index.html` at the configured `root` (default: project root) so it can inject the `<script>` module entry point and run the full asset pipeline. Moving it would break the build. It stays where it is.

---

## Background: Storybook Tailwind

`.storybook/main.ts` is already configured correctly. `@tailwindcss/vite` uses ESM imports at build time that conflict with Storybook 10's Rolldown-based Node loader. The `viteFinal` hook strips the Vite plugin and replaces it with `@tailwindcss/postcss` — this is the documented workaround for Storybook 10 + Tailwind v4. No changes needed.

---

## Task 1: Create Zod schemas for the FYTA API

**Context:** Zod is already installed (`npm install zod` done). `src/api/` directory already created.

**API Endpoints Documented:**
- `POST /api/auth/login` → `LoginRequest` / `LoginResponse`
- `GET  /api/user-plant` → `UserPlantsResponse` (gardens + plants summary)
- `GET  /api/user-plant/[id]` → `PlantDetailResponse` (full plant + measurements)
- `POST /api/user-plant/measurements/[id]` → `PlantMeasurementsResponse`

**Files:**
- Create: `src/api/schemas.ts`

- [ ] **Step 1: Create `src/api/schemas.ts`**

```typescript
import { z } from "zod";

// ── Status Enums ────────────────────────────────────────────────────────────
// Source: https://fyta-io.notion.site/FYTA-Public-API-d2f4c30306f74504924c9a40402a3afd

export const UserPlantStatus = z.union([
  z.literal(0), // deleted
  z.literal(1), // good
  z.literal(2), // bad
  z.literal(3), // no sensor
]);

export const MeasurementStatus = z.union([
  z.literal(0), // no data
  z.literal(1), // too low
  z.literal(2), // low
  z.literal(3), // perfect
  z.literal(4), // high
  z.literal(5), // too high
]);

export const SensorStatus = z.union([
  z.literal(0), // none — plant has no sensor
  z.literal(1), // correct — last reading ≤ 1.5 h ago
  z.literal(2), // error — reading missing or > 1.5 h ago
]);

export const HubStatus = z.union([
  z.literal(1), // correct — last reading received ≤ 1.5 h ago
  z.literal(2), // error — last reading received > 1.5 h ago
]);

export const WifiStatus = z.union([
  z.null(),      // never connected / no hub / no sensor
  z.literal(0), // lost connection to all previously connected hubs
  z.literal(1), // connected to at least one hub
  z.literal(2), // error connecting hub OR connection lost within a specific time range
]);

export const TemperatureUnit = z.union([
  z.literal(1), // Celsius
  z.literal(2), // Fahrenheit
]);

export const MeasurementsTimeline = z.enum(["hour", "day", "week", "month"]);

// ── Shared Building Blocks ──────────────────────────────────────────────────

const AbsoluteValues = z.object({
  min: z.string(),
  max: z.string(),
  minText: z.string(),
  maxText: z.string(),
});

const RangeValues = z.object({
  min_good: z.string(),
  max_good: z.string(),
  min_acceptable: z.string(),
  max_acceptable: z.string(),
  current: z.string().nullable(),
  currentFormatted: z.string().nullable(),
});

const SensorSchema = z.object({
  id: z.string(),
  has_sensor: z.boolean(),
  status: SensorStatus,
  uuid_android: z.string().nullable(),
  uuid_ios: z.string().nullable(),
  version: z.string(),
  is_battery_low: z.boolean(),
  received_data_at: z.string().nullable(),
});

const HubSchema = z.object({
  id: z.number(),
  hub_id: z.string(),
  status: HubStatus,
  received_data_at: z.string().nullable(),
  reached_hub_at: z.string().nullable(),
});

// ── Auth API ────────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

// ── GET /api/user-plant ─────────────────────────────────────────────────────

export const GardenSummarySchema = z.object({
  id: z.number(),
  garden_name: z.string(),
  origin_path: z.string().nullable(),
  thumb_path: z.string().nullable(),
  mac_address: z.string().nullable(),
});

export const PlantSummarySchema = z.object({
  garden: z.object({ id: z.number() }),
  sensor: SensorSchema,
  hub: HubSchema,
  // Fields documented in the list response but absent from the field table:
  id: z.number().optional(),
  nickname: z.string().nullable().optional(),
  scientific_name: z.string().nullable().optional(),
  common_name: z.string().nullable().optional(),
  status: UserPlantStatus.optional(),
  plant_id: z.number().nullable().optional(),
  thumb_path: z.string().nullable().optional(),
  plant_thumb_path: z.string().nullable().optional(),
  origin_path: z.string().nullable().optional(),
  wifi_status: WifiStatus.optional(),
  // Sensor status fields returned inline on list items (undocumented but observed):
  moisture_status: MeasurementStatus.optional(),
  light_status: MeasurementStatus.optional(),
  temperature_status: MeasurementStatus.optional(),
  salinity_status: MeasurementStatus.optional(),
  nutrients_status: MeasurementStatus.optional(),
});

export const UserPlantsResponseSchema = z.object({
  gardens: z.array(GardenSummarySchema),
  plants: z.array(PlantSummarySchema),
});

// ── GET /api/user-plant/[plantID] ───────────────────────────────────────────

const PhMeasurementSchema = z.object({
  status: MeasurementStatus.nullable(),
  values: z.object({
    min: z.string(),
    max: z.string(),
    current: z.string().nullable(),
  }),
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

const TemperatureMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues.extend({ optimal_hours: z.number() }),
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

const LightMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues.extend({ optimal_hours: z.number() }),
  dli_values: z.object({
    min_good: z.string(),
    max_good: z.string(),
    min_acceptable: z.string(),
    max_acceptable: z.string(),
  }),
  unit: z.string(),
  dli_unit: z.string(),
  absolute_values: AbsoluteValues,
});

const MoistureMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues,
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

const SalinityMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues,
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

export const PlantDetailSchema = z.object({
  id: z.number(),
  nickname: z.string().nullable(),
  scientific_name: z.string().nullable(),
  genus: z.string().nullable(),
  status: UserPlantStatus,
  plant_id: z.number().nullable(),
  family_id: z.number().nullable(),
  thumb_path: z.string().nullable(),
  origin_path: z.string().nullable(),
  plant_thumb_path: z.string().nullable(),
  plant_origin_path: z.string().nullable(),
  received_data_at: z.string().nullable(),
  gathering_data: z.boolean(),
  is_illegal: z.boolean(),
  not_supported: z.boolean(),
  sensor_update_available: z.boolean(),
  garden: z.object({ id: z.number(), name: z.string() }),
  sensor: SensorSchema.extend({ created_at: z.string().nullable() }),
  hub: HubSchema,
  measurements: z.object({
    ph: PhMeasurementSchema,
    temperature: TemperatureMeasurementSchema,
    light: LightMeasurementSchema,
    moisture: MoistureMeasurementSchema,
    salinity: SalinityMeasurementSchema,
    battery: z.string().nullable(),
  }),
  temperature_unit: TemperatureUnit,
  know_hows: z.array(z.unknown()),
});

export const PlantDetailResponseSchema = z.object({
  plant: PlantDetailSchema,
});

// ── POST /api/user-plant/measurements/[plantID] ──────────────────────────────

export const MeasurementsRequestSchema = z.object({
  search: z.object({
    timeline: MeasurementsTimeline,
  }),
});

const TimeseriesAbsoluteValues = z.object({
  min: z.string(),
  minText: z.string(),
  max: z.string(),
  maxText: z.string(),
});

export const PlantMeasurementsResponseSchema = z.object({
  measurements: z.array(
    z.object({
      light: z.number(),
      temperature: z.number(),
      soil_moisture: z.number(),
      soil_moisture_anomaly: z.boolean(),
      soil_fertility: z.number(),
      soil_fertility_anomaly: z.boolean(),
      date_utc: z.string(),
    }),
  ),
  dli_light: z.array(
    z.object({
      dli_light: z.number(),
      date_utc: z.string(),
    }),
  ),
  absolute_values: z.object({
    light: TimeseriesAbsoluteValues,
    dli_light: TimeseriesAbsoluteValues,
    temperature: TimeseriesAbsoluteValues,
    soil_moisture: TimeseriesAbsoluteValues,
    soil_fertility: TimeseriesAbsoluteValues,
  }),
  thresholds: z.object({
    ph_min: z.number(),
    ph_max: z.number(),
    temperature_min_good: z.number(),
    temperature_max_good: z.number(),
    temperature_min_acceptable: z.number(),
    temperature_max_acceptable: z.number(),
    light_min_good: z.number(),
    light_max_good: z.number(),
    light_min_acceptable: z.number(),
    light_max_acceptable: z.number(),
    dli_light_min_good: z.number(),
    dli_light_max_good: z.number(),
    dli_light_min_acceptable: z.number(),
    dli_light_max_acceptable: z.number(),
    moisture_min_good: z.number(),
    moisture_max_good: z.number(),
    moisture_min_acceptable: z.number(),
    moisture_max_acceptable: z.number(),
    salinity_min_good: z.number(),
    salinity_max_good: z.number(),
    salinity_min_acceptable: z.number(),
    salinity_max_acceptable: z.number(),
  }),
});

// ── Inferred Types ──────────────────────────────────────────────────────────

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type GardenSummary = z.infer<typeof GardenSummarySchema>;
export type PlantSummary = z.infer<typeof PlantSummarySchema>;
export type UserPlantsResponse = z.infer<typeof UserPlantsResponseSchema>;
export type PlantDetail = z.infer<typeof PlantDetailSchema>;
export type PlantDetailResponse = z.infer<typeof PlantDetailResponseSchema>;
export type MeasurementsTimeline = z.infer<typeof MeasurementsTimeline>;
export type PlantMeasurementsResponse = z.infer<typeof PlantMeasurementsResponseSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles the schema file**

```bash
npx tsc --noEmit --moduleResolution bundler --module ESNext --target ES2020 --strict src/api/schemas.ts 2>&1
```

Expected: no output (zero errors). If `zod` types are not found, run `npm install zod` first.

- [ ] **Step 3: Commit**

```bash
git add src/api/schemas.ts
git commit -m "feat: add Zod schemas for full FYTA API surface"
```

---

## Task 2: Reorganise deployment artefacts into deploy/

**Context:** The root directory mixes app source with Docker/server artefacts. Moving them to `deploy/` makes the project root cleaner. `.dockerignore` stays at root — Docker uses the build-context root regardless of where `-f` points.

**Files:**
- Move: `Dockerfile` → `deploy/Dockerfile`
- Move: `server.py` → `deploy/server.py`
- Move: `entrypoint.sh` → `deploy/entrypoint.sh`
- Move: `probe-api.sh` → `deploy/probe-api.sh`
- Move: `config.example.js` → `deploy/config.example.js`
- Keep: `.dockerignore` at root

- [ ] **Step 1: Move files**

```bash
cd /path/to/fyta-dashboard   # your project root
git mv Dockerfile deploy/Dockerfile
git mv server.py deploy/server.py
git mv entrypoint.sh deploy/entrypoint.sh
git mv probe-api.sh deploy/probe-api.sh
git mv config.example.js deploy/config.example.js
```

Expected: `git status` shows five renames, no deletions.

- [ ] **Step 2: Update Dockerfile COPY paths in the runtime stage**

Edit `deploy/Dockerfile`. The builder stage (`COPY . .`) picks up `deploy/` automatically. Only the runtime stage `COPY` lines need updating:

Find this block (currently near line 21):
```dockerfile
COPY --from=builder /app/dist ./dist
COPY server.py entrypoint.sh ./
```

Replace with:
```dockerfile
COPY --from=builder /app/dist ./dist
COPY deploy/server.py deploy/entrypoint.sh ./
```

`server.py` uses `os.path.dirname(os.path.abspath(__file__))` to locate `dist/`. In the container, both files land at `/app/` and `/app/dist/` exists — so DIST_DIR resolves correctly.

- [ ] **Step 3: Update entrypoint reference in deploy/entrypoint.sh**

`entrypoint.sh` calls `exec python3 server.py`. In the container, both files are at `/app/`, so no path change is needed. Verify the file still looks correct:

```bash
cat deploy/entrypoint.sh
```

Expected output:
```bash
#!/usr/bin/env bash
# Validates FYTA_API_TOKEN and launches the dashboard server.

set -euo pipefail

if [[ -z "${FYTA_API_TOKEN:-}" ]]; then
    printf '\033[1;31mϟ\033[0m FYTA_API_TOKEN is required but not set\n' >&2
    exit 1
fi

exec python3 server.py
```

No changes needed.

- [ ] **Step 4: Verify Docker build still works (dry-run)**

```bash
docker build -f deploy/Dockerfile . --no-cache --progress=plain 2>&1 | tail -20
```

Expected: build completes, last line is `Successfully built <hash>` or `exporting to image`.

- [ ] **Step 5: Commit**

```bash
git add deploy/ .dockerignore
git commit -m "chore: move deployment artefacts to deploy/"
```

---

## Task 3: Verify Storybook builds and app runs

**Context:** Confirms nothing broke, and satisfies the browser-testing requirement.

- [ ] **Step 1: Start dev server**

```bash
npm run dev 2>&1 &
DEV_PID=$!
sleep 4
```

Expected: `VITE vX ready in Xms ➜ Local: http://localhost:5173/`

- [ ] **Step 2: Open in browser and check console**

Navigate to `http://localhost:5173`. Open DevTools → Console. Verify:
- No red errors
- Network tab: `/api/user-plant` returns 200 or 401 (token missing is OK; a 401 proves the proxy is wired)

- [ ] **Step 3: Stop dev server**

```bash
kill $DEV_PID 2>/dev/null; wait $DEV_PID 2>/dev/null || true
```

- [ ] **Step 4: Run production build**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in Xms` with no errors or warnings.

- [ ] **Step 5: Run Storybook build**

```bash
npm run build-storybook 2>&1 | tail -5
```

Expected: `Storybook build completed successfully`.

- [ ] **Step 6: Run type-check**

```bash
npm run type-check 2>&1
```

Expected: exits 0, no output.

- [ ] **Step 7: Commit if anything changed**

```bash
git status
# If clean, nothing to commit. Otherwise:
git add -A
git commit -m "chore: verify all builds and scripts pass"
```

---

## Self-Review

**Spec coverage:**
- ✅ Zod schemas for all four documented endpoints
- ✅ All status enums (`UserPlantStatus`, `MeasurementStatus`, `SensorStatus`, `HubStatus`, `WifiStatus`, `TemperatureUnit`)
- ✅ All documented response fields including nested objects (`measurements.*`, `absolute_values`, `thresholds`)
- ✅ Undocumented but observed fields on `PlantSummary` marked optional
- ✅ Inferred TypeScript types re-exported from schemas
- ✅ `deploy/` folder contains all deployment artefacts
- ✅ Dockerfile COPY paths updated
- ✅ `index.html` stays at root (documented why)
- ✅ Storybook Tailwind config verified correct (documented why no change needed)
- ✅ Dev server, build, Storybook build, type-check all verified

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:**
- `MeasurementStatus` used for `moisture_status`, `light_status`, `temperature_status`, `salinity_status`, `nutrients_status` throughout — consistent with existing `SensorStatus = 0 | 1 | 2 | 3 | 4 | 5` in the TS migration plan (that type will be superseded by `MeasurementStatus` from schemas once this plan runs).
- `SensorStatus` here is `0 | 1 | 2` (sensor-level status) — distinct from `MeasurementStatus` `0–5`. The TS migration plan conflated these as a single `SensorStatus = 0|1|2|3|4|5`; after this plan runs, importers should prefer `MeasurementStatus` from `src/api/schemas.ts`.
