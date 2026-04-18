# Plant Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the plants-dashboard to use a full-width responsive grid and visually unified per-plant cards (info + graph grouped behind a single border).

**Architecture:** All changes push a single modified Lovelace config object to HA via native Node.js WebSocket. Three targeted mutations on the config: (1) `panel: true` on view 0, (2) swap the inner `grid` card for `custom:layout-card` with a CSS grid layout, (3) add `card_mod` CSS to each `vertical-stack` filter option.

**Tech Stack:** Node.js 21+ native WebSocket, HA Lovelace WebSocket API (`lovelace/config` + `lovelace/config/save`), `custom:layout-card`, `custom:card-mod`

**Token:** All scripts read `process.env.HA_TOKEN`. Run every script as:
```bash
HA_TOKEN=<your-token> node <script>.mjs
```

---

### Task 1: Read current config and write backup

**Files:**
- Create: `backups/plants-dashboard-2026-04-12.json`
- Create: `scripts/backup-dashboard.mjs`

- [ ] **Step 1: Create the backup script**

Create `scripts/backup-dashboard.mjs`:

```js
import { writeFileSync, mkdirSync } from 'fs';

const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('HA_TOKEN not set'); process.exit(1); }

const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
function send(obj) { ws.send(JSON.stringify(obj)); }

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'auth_required') {
    send({ type: 'auth', access_token: TOKEN });
  } else if (msg.type === 'auth_ok') {
    send({ id: 1, type: 'lovelace/config', url_path: 'plants-dashboard' });
  } else if (msg.type === 'result') {
    mkdirSync('backups', { recursive: true });
    const path = 'backups/plants-dashboard-2026-04-12.json';
    writeFileSync(path, JSON.stringify(msg.result, null, 2));
    console.log(`Backup written to ${path}`);
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => { console.error('Timeout'); process.exit(1); }, 8000);
```

- [ ] **Step 2: Run the backup script**

```bash
HA_TOKEN=<your-token> node scripts/backup-dashboard.mjs
```

Expected output:
```
Backup written to backups/plants-dashboard-2026-04-12.json
```

- [ ] **Step 3: Verify the backup file exists and looks sane**

```bash
node -e "const c = JSON.parse(require('fs').readFileSync('backups/plants-dashboard-2026-04-12.json')); console.log('views:', c.views.length, '| first card type:', c.views[0].cards[0].type)"
```

Expected output (roughly):
```
views: 1 | first card type: custom:auto-entities
```

- [ ] **Step 4: Commit the backup**

```bash
git checkout -b feat/plant-card-layout
git add backups/plants-dashboard-2026-04-12.json scripts/backup-dashboard.mjs
git commit -m "chore: backup plants-dashboard config before layout update"
```

---

### Task 2: Apply all three config changes and push

**Files:**
- Create: `scripts/update-dashboard.mjs`

This script reads the backup, applies the three mutations, then pushes to HA.

- [ ] **Step 1: Create the update script**

Create `scripts/update-dashboard.mjs`:

```js
import { readFileSync } from 'fs';

const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('HA_TOKEN not set'); process.exit(1); }

// Load backup as the base config
const config = JSON.parse(readFileSync('backups/plants-dashboard-2026-04-12.json', 'utf8'));

const view = config.views[0];

// ── Mutation 1: panel mode ────────────────────────────────────────────────────
view.panel = true;
console.log('✔ Set panel: true on view 0');

// ── Mutation 2: swap grid → layout-card ──────────────────────────────────────
const autoEntities = view.cards[0]; // custom:auto-entities
autoEntities.card = {
  type: 'custom:layout-card',
  layout_type: 'custom:grid-layout',
  layout: {
    'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
    'grid-gap': '8px',
  },
};
console.log('✔ Swapped inner card to custom:layout-card');

// ── Mutation 3: add card-mod border to each vertical-stack ───────────────────
for (const include of autoEntities.filter.include) {
  if (!include.options) include.options = {};
  include.options.card_mod = {
    style: `ha-card {
  border: 1px solid var(--divider-color);
  border-radius: var(--ha-card-border-radius, 12px);
  background: var(--ha-card-background, var(--card-background-color));
  overflow: hidden;
}`,
  };
}
console.log('✔ Added card-mod style to vertical-stack filter options');

// ── Push ──────────────────────────────────────────────────────────────────────
const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
function send(obj) { ws.send(JSON.stringify(obj)); }

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'auth_required') {
    send({ type: 'auth', access_token: TOKEN });
  } else if (msg.type === 'auth_ok') {
    send({ id: 1, type: 'lovelace/config/save', url_path: 'plants-dashboard', config });
  } else if (msg.type === 'result') {
    if (msg.success) {
      console.log('✔ Dashboard config saved successfully');
    } else {
      console.error('✘ Save failed:', JSON.stringify(msg.error));
      process.exit(1);
    }
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => { console.error('Timeout'); process.exit(1); }, 8000);
```

- [ ] **Step 2: Run the update script**

```bash
HA_TOKEN=<your-token> node scripts/update-dashboard.mjs
```

Expected output:
```
✔ Set panel: true on view 0
✔ Swapped inner card to custom:layout-card
✔ Added card-mod style to vertical-stack filter options
✔ Dashboard config saved successfully
```

- [ ] **Step 3: Verify in browser**

Open `http://homeassistant.local:8123/plants-dashboard/0` and check:

1. The card grid fills the full browser width (no centered column with whitespace on the sides)
2. As you resize the browser window, the number of columns changes (fewer columns when narrow, more when wide)
3. Each plant card has a visible border and rounded corners grouping the info panel and graph together into one visual unit
4. The moisture graph is still visible below the plant info within each card
5. The driest plant (Pila / 0%) still appears first

**If card-mod border does not appear:** The `vertical-stack` shadow DOM may need `:host` instead of `ha-card`. In `scripts/update-dashboard.mjs`, change the style string to:
```js
include.options.card_mod = {
  style: `:host {
  border: 1px solid var(--divider-color);
  border-radius: var(--ha-card-border-radius, 12px);
  background: var(--ha-card-background, var(--card-background-color));
  overflow: hidden;
  display: block;
}`,
};
```
Then re-run the script and verify again.

- [ ] **Step 4: Commit the update script**

```bash
git add scripts/update-dashboard.mjs
git commit -m "feat: full-width responsive grid, unified plant card with border"
```

---

### Restore procedure (if needed)

To roll back to the pre-change config:

```js
// scripts/restore-dashboard.mjs
import { readFileSync } from 'fs';
const TOKEN = process.env.HA_TOKEN;
const config = JSON.parse(readFileSync('backups/plants-dashboard-2026-04-12.json', 'utf8'));
const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
function send(obj) { ws.send(JSON.stringify(obj)); }
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'auth_required') send({ type: 'auth', access_token: TOKEN });
  else if (msg.type === 'auth_ok') send({ id: 1, type: 'lovelace/config/save', url_path: 'plants-dashboard', config });
  else if (msg.type === 'result') { console.log(msg.success ? '✔ Restored' : '✘ Failed'); ws.close(); }
};
ws.onclose = () => process.exit(0);
setTimeout(() => process.exit(1), 8000);
```

```bash
HA_TOKEN=<your-token> node scripts/restore-dashboard.mjs
```
