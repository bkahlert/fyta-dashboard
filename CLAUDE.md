# FYTA Dashboard — Claude Notes

## Project context

This repo started as a Vue.js FYTA plant dashboard. The active work is now creating
a **Home Assistant Lovelace dashboard** for the same FYTA plant data.

- HA instance: `http://homeassistant.local:8123`
- Target dashboard: `plants-dashboard` (sidebar label "Pflanzen"), view 0
- URL: `http://homeassistant.local:8123/plants-dashboard/0`

## How to edit the HA dashboard

Use **Node.js native WebSocket** (Node 21+ has it built-in — no extra packages needed).
Auth is via a long-lived access token passed in by the user at session start.

### Read current config

```js
const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
// auth_required → send auth → auth_ok → send command
send({ id: 1, type: 'lovelace/config', url_path: 'plants-dashboard' });
// result.result contains the config object
```

### Save new config

```js
send({ id: 1, type: 'lovelace/config/save', url_path: 'plants-dashboard', config: { /* ... */ } });
// result.success === true on success
```

### Boilerplate (copy-paste)

```js
const TOKEN = '<long-lived-access-token>';
const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
let msgId = 1;
function send(obj) { ws.send(JSON.stringify(obj)); }
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'auth_required') send({ type: 'auth', access_token: TOKEN });
  else if (msg.type === 'auth_ok') {
    /* send your command here */
  } else if (msg.type === 'result') {
    console.log(JSON.stringify(msg, null, 2));
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => process.exit(1), 8000);
```

## Dashboard design decisions

### Dynamic plant enumeration

Use `custom:auto-entities` (already installed via HACS) with `card_param: cards`
to enumerate plants dynamically — no hardcoded plant list.

Filter on `sensor.*_moisture` to get one entity per plant. Sort by `state` numeric
ascending (lowest moisture first = most thirsty plant at the top).

```yaml
type: custom:auto-entities
card:
  type: grid
  columns: 3
  square: false
card_param: cards
filter:
  include:
    - entity_id: sensor.*_moisture
      options:
        type: vertical-stack
        cards:
          - ... (plant info card)
          - ... (history-graph card)
sort:
  method: state
  numeric: true
  reverse: false
```

### `{{entity}}` substitution in auto-entities

`{{entity}}` is substituted by auto-entities recursively into all string values of
the `options` object — including deeply nested positions like
`history-graph.entities[0].entity`. Store it literally in YAML; auto-entities
resolves it at render time.

### Mushroom template card — deriving related sensors

Within `custom:mushroom-template-card`, `entity` is available as a Jinja2 variable
(equals the card's `entity` field). Derive sibling sensors like this:

```yaml
# Plant nickname (strips location prefix and sensor-type suffix from friendly_name)
primary: >
  {% set parts = state_attr(entity, 'friendly_name').split(' ') %}
  {{ parts[1:-1] | join(' ') }}

# Scientific name (entity ID pattern: sensor.{id}_scientific_name)
secondary: >
  {% set base = entity | replace('sensor.', '') | replace('_moisture', '') %}
  {{ states('sensor.' + base + '_scientific_name') }}
```

### Installed custom Lovelace cards (HACS)

| Card | URL fragment | Purpose |
|------|-------------|---------|
| `custom:auto-entities` | `lovelace-auto-entities` | Dynamic entity enumeration |
| `custom:mushroom-*` | `lovelace-mushroom` | Plant info cards |
| `custom:template-entity-row` | `lovelace-template-entity-row` | Template rows |

## Browser verification

Chrome DevTools MCP can navigate to the dashboard but needs HA authentication.
The MCP browser profile is not logged in. Prefer asking the user to verify in
their own browser rather than using Chrome DevTools MCP for visual inspection.
