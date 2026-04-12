# Plant Sensor Bridge — Design Spec

**Date:** 2026-04-12
**Status:** Approved

## Goal

Resolve the tension between categorical sort order and numeric moisture graph in the plants-dashboard, and replace the broken firmware-update chip with a meaningful data-freshness indicator. Implemented in three sequential phases.

---

## Phase 1 — Minimal template sensor bridge

### Problem

`custom:auto-entities` drives both the sort and `this.entity_id` for card content from a single matched entity. Sorting by `sensor.*_moisture_state` (text state) gives the right categorical order but breaks the `type: sensor` line graph, which requires a numeric entity state. Sorting by `sensor.*_moisture` (numeric) restores the graph but loses the categorical order.

### Solution

Create one HA template sensor per plant that exposes:

| Field | Value | Purpose |
|---|---|---|
| `state` | numeric moisture `%` (float) | drives `type: sensor` `graph: line` |
| `unit_of_measurement` | `%` | |
| `device_class` | `moisture` | |
| `state_class` | `measurement` | |
| `attribute: moisture_state` | e.g. `too_low` | auto-entities attribute filter |

**Entity ID pattern:** `sensor.{prefix}_plant` (e.g. `sensor.count_plantula_plant`)

**Template definition (per plant):**
```yaml
template:
  - sensor:
      - name: "{Friendly Name} Plant"
        unique_id: {prefix}_plant
        state: "{{ states('sensor.{prefix}_moisture') | float(0) }}"
        unit_of_measurement: "%"
        device_class: moisture
        state_class: measurement
        attributes:
          moisture_state: "{{ states('sensor.{prefix}_moisture_state') }}"
```

### auto-entities filter change

Replace the current single include rule (matching `sensor.*_moisture_state`, sorted numerically) with five ordered include rules, each filtering by `moisture_state` attribute value. Entity order is determined by rule sequence — no `sort` key needed.

```yaml
filter:
  include:
    - entity_id: sensor.*_plant
      attributes: { moisture_state: too_low }
      options: <plantCardOptions>
    - entity_id: sensor.*_plant
      attributes: { moisture_state: low }
      options: <plantCardOptions>
    - entity_id: sensor.*_plant
      attributes: { moisture_state: too_high }
      options: <plantCardOptions>
    - entity_id: sensor.*_plant
      attributes: { moisture_state: high }
      options: <plantCardOptions>
    - entity_id: sensor.*_plant
      attributes: { moisture_state: perfect }
      options: <plantCardOptions>
```

### PFX_MT update

```js
const PFX_MT = `entity.split('.')[1].split('_plant')[0]`;
```

Strips `_plant` from `sensor.count_plantula_plant` → `count_plantula`. All existing Jinja2 templates in mushroom cards and chips are unchanged.

### Sensor graph

Restored to the original `type: sensor` with `graph: line`:

```js
const sensorGraph = {
  type: 'sensor',
  entity: 'this.entity_id',  // sensor.*_plant — numeric state
  name: 'Moisture',
  graph: 'line',
  hours_to_show: 336,
  limits: { min: 0, max: 100 },
};
```

### Delivery

1. **`scripts/generate-plant-sensors.mjs`** — connects to HA via WebSocket, fetches all `sensor.*_moisture_state` entities to discover plant prefixes, generates YAML template sensor definitions, writes to `config/fyta_plant_sensors.yaml` locally.
2. User places the generated file in their HA config (e.g. as `packages/fyta_plant_sensors.yaml`, with `homeassistant: packages: !include_dir_named packages` in `configuration.yaml` if not already present).
3. **`scripts/reload-templates.mjs`** — calls `homeassistant.reload_template_entities` via WebSocket. No HA restart required.
4. **`scripts/update-main-view.mjs`** — updated to use the new entity pattern, attribute-filtered include rules, updated PFX_MT, and restored sensor graph.

---

## Phase 2 — Freshness chip

### Problem

The current chip references `binary_sensor.{p}_update` (firmware update availability), which was the wrong concept. The user wants to see when the FYTA sensor device last pushed a reading — equivalent to HA's "Letzte Aktualisierung" shown in the more-info dialog.

### Solution

After Phase 1, `this.entity_id` is the template sensor (`sensor.*_plant`), whose `last_updated` timestamp mirrors the underlying moisture sensor's last measurement. No PFX_MT derivation needed.

```js
const freshnessChip = {
  type: 'template',
  entity: 'this.entity_id',
  icon: 'mdi:update',
  icon_color: `
    {%- set age = ((as_timestamp(now()) - as_timestamp(states[entity].last_updated)) / 3600) | float -%}
    {{ '${C.success}' if age <= 24 else '${C.warning}' if age <= 48 else '${C.error}' }}
  `,
  content: `{{ relative_time(states[entity].last_updated) }}`,
  tap_action: { action: 'more-info' },
};
```

| Age | Color |
|---|---|
| ≤ 24 h | green |
| ≤ 48 h | orange |
| > 48 h | red |

Content is always visible (no conditional suppression). Replaces the `updateChip` in `statusChips`.

Delivered as part of the same `update-main-view.mjs` update as Phase 1.

---

## Phase 3 — Comprehensive template sensor (deferred)

### Prerequisite

Take a dated dashboard backup before starting Phase 3.

### Goal

Expand the `sensor.*_plant` template sensor to carry all displayed plant attributes, eliminating the need for PFX_MT sibling-entity derivations in Jinja2 templates.

**Additional attributes to include:**

| Attribute | Source |
|---|---|
| `temperature_state` | `sensor.{p}_temperature_state` |
| `light_state` | `sensor.{p}_light_state` |
| `nutrients_state` | `sensor.{p}_nutrients_state` |
| `battery` | `sensor.{p}_battery` |
| `next_fertilization` | `sensor.{p}_next_fertilization` |
| `scientific_name` | `sensor.{p}_scientific_name` |

After expanding the template sensor, Jinja2 templates in the mushroom card and chips are simplified to read directly from `state_attr(entity, 'attribute_name')` instead of constructing sibling entity IDs. PFX_MT becomes unnecessary.

### Delivery

- Updated `scripts/generate-plant-sensors.mjs` with full attribute block
- Reload templates
- Updated `scripts/update-main-view.mjs` with simplified Jinja2 (no PFX_MT)

---

## Non-goals

- Replacing or removing existing FYTA sensor entities — they remain the source of truth
- Graphing any attribute other than moisture `%`
- Changing the visual card layout
