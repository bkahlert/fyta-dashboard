const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('HA_TOKEN not set'); process.exit(1); }

// ── Template prefix expressions ───────────────────────────────────────────────
// PFX_MT: uses the Jinja2 `entity` variable (available in mushroom template card/chip fields)
const PFX_MT = `entity.split('.')[1].split('_moisture')[0]`;

// ── RGB color literals (mushroom wraps icon_color in rgb(...)) ───────────────
const C = {
  error:   '219,68,55',
  warning: '255,166,0',
  success: '67,160,71',
  info:    '3,155,229',
  muted:   'var(--rgb-secondary-text-color)',
};

const stateColor = (s) =>
  `{{ '${C.error}' if ${s} in ['too_low','too_high'] else '${C.warning}' if ${s} in ['low','high'] else '${C.success}' }}`;

// ── Cards ─────────────────────────────────────────────────────────────────────

// 1. Benutzerbild — full-width cover via button-card (supports JS background-image template).
// Derives image.{slug}_benutzerbild from the moisture sensor's friendly_name device prefix.
// The Pflanzenbild (image.{sensor_prefix}) is kept as the circular avatar in the mushroom card.
const benutzerbildSlug = `
  if (!entity || !entity.attributes) return 'none';
  var dn = entity.attributes.friendly_name.split(' ').slice(0,-1).join('_').toLowerCase()
    .split('ü').join('u').split('ö').join('o').split('ä').join('a').split('ß').join('ss');
  var img = states['image.' + dn + '_benutzerbild'];
  return img ? 'url(' + img.attributes.entity_picture + ')' : 'none';
`;
const buttonCard = {
  type: 'custom:button-card',
  entity: 'this.entity_id',
  aspect_ratio: '3/2',
  show_name: false,
  show_icon: false,
  show_state: false,
  tap_action: { action: 'more-info' },
  styles: {
    card: [
      { 'background-image': `[[[${benutzerbildSlug}]]]` },
      { 'background-size': 'cover' },
      { 'background-position': 'center' },
      { 'padding': '0' },
    ],
  },
};

// 2. Mushroom template card (picture, name, scientific name, moisture state badge)
const mushroomCard = {
  type: 'custom:mushroom-template-card',
  entity: 'this.entity_id',
  primary:   `{%- set p = ${PFX_MT} -%} {{ device_attr(device_id(entity), 'name') }}`,
  secondary: `{%- set p = ${PFX_MT} -%} {{ states('sensor.' + p + '_scientific_name') }}`,
  icon: 'mdi:leaf',
  picture:     `{%- set p = ${PFX_MT} -%} {{ state_attr('image.' + p, 'entity_picture') }}`,
  icon_color:  `{%- set p = ${PFX_MT} -%}{%- set ms = states('sensor.' + p + '_moisture_state') -%}${stateColor('ms')}`,
  badge_icon:  `{%- set p = ${PFX_MT} -%}{%- set ms = states('sensor.' + p + '_moisture_state') -%}{% if ms == 'too_low' %}mdi:water-off{% elif ms == 'low' %}mdi:water-minus{% elif ms == 'too_high' %}mdi:water-plus{% elif ms == 'high' %}mdi:water-alert{% else %}mdi:water-check{% endif %}`,
  badge_color: `{%- set p = ${PFX_MT} -%}{%- set ms = states('sensor.' + p + '_moisture_state') -%}${stateColor('ms')}`,
};

// 4. Moisture sensor graph (7 days)
const sensorGraph = {
  type: 'sensor',
  entity: 'this.entity_id',
  name: 'Moisture',
  graph: 'line',
  hours_to_show: 336,
  limits: { min: 0, max: 100 },
};

// 5. Status chips
// Mushroom template chip evaluates icon/icon_color/content as Jinja2, but NOT entity —
// entity is a static HA entity ID. tap_action: more-info uses the chip's entity.
// With auto-entities the only dynamic token is this.entity_id (the moisture sensor),
// so all chip taps open the moisture more-info dialog. That's the best achievable here.
const MORE_INFO = { tap_action: { action: 'more-info' } };

function stateChip(suffix, icon) {
  return {
    type: 'template',
    entity: 'this.entity_id',
    icon,
    icon_color: `{%- set p = ${PFX_MT} -%}{%- set s = states('sensor.' + p + '_${suffix}') -%}${stateColor('s')}`,
    content: `{%- set p = ${PFX_MT} -%}{%- set s = states('sensor.' + p + '_${suffix}') -%}{{ '' if s == 'perfect' else state_translated('sensor.' + p + '_${suffix}') }}`,
    ...MORE_INFO,
  };
}

const batteryChip = {
  type: 'template',
  entity: 'this.entity_id',
  icon: 'mdi:battery-alert',
  icon_color: `{%- set p = ${PFX_MT} -%}{{ '${C.error}' if states('sensor.' + p + '_battery') | int(100) < 20 else '${C.success}' }}`,
  content: `{%- set p = ${PFX_MT} -%}{%- set pct = states('sensor.' + p + '_battery') | int(100) -%}{{ pct ~ '%' if pct < 20 else '' }}`,
  ...MORE_INFO,
};

const fertChip = (() => {
  const daysCalc =
    `{%- set p = ${PFX_MT} -%}` +
    `{%- set fert = states('sensor.' + p + '_next_fertilization') -%}` +
    `{%- set days = ((as_timestamp(fert) - as_timestamp(now())) / 86400) | int if fert not in ['unavailable','unknown','none',''] else 999 -%}`;
  const nutrientsColor =
    `{%- set p = ${PFX_MT} -%}{%- set ns = states('sensor.' + p + '_nutrients_state') -%}` +
    stateColor('ns');
  return {
    type: 'template',
    entity: 'this.entity_id',
    icon: 'mdi:sprout',
    icon_color: nutrientsColor,
    content:    daysCalc + `{{ '' if days > 14 else days | string + 'd' }}`,
    ...MORE_INFO,
  };
})();

const updateChip = (() => {
  const calc =
    `{%- set p = ${PFX_MT} -%}` +
    `{%- set bs = 'binary_sensor.' + p + '_update' -%}`;
  return {
    type: 'template',
    entity: 'this.entity_id',
    icon: 'mdi:update',
    icon_color: calc + `{{ '${C.info}' if is_state(bs, 'on') else '${C.muted}' }}`,
    content:    calc + `{{ relative_time(states[bs].last_changed) if bs in states else '' }}`,
    ...MORE_INFO,
  };
})();

const statusChips = {
  type: 'custom:mushroom-chips-card',
  chips: [
    stateChip('temperature_state', 'mdi:thermometer'),
    stateChip('light_state', 'mdi:white-balance-sunny'),
    fertChip,
    { type: 'spacer' },
    batteryChip,
    updateChip,
  ],
};

// ── Plant card (vertical stack) ───────────────────────────────────────────────
const plantCardOptions = {
  type: 'vertical-stack',
  cards: [ buttonCard, mushroomCard, sensorGraph, statusChips ],
};

// ── Dev view ──────────────────────────────────────────────────────────────────
// No panel/type field — the user sets panel mode on views via the HA UI.
// Reading from backup preserves the existing view-level settings we don't control here.
const devView = {
  title: 'Dev',
  cards: [{
    type: 'custom:auto-entities',
    card: {
      type: 'custom:layout-card',
      layout_type: 'custom:grid-layout',
      layout: {
        'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
        'grid-gap': '16px',
      },
    },
    card_param: 'cards',
    filter: {
      include: [{
        entity_id: 'sensor.count_plantula_moisture',
        options: plantCardOptions,
      }],
    },
  }],
};

// ── Read current config, patch Dev view, write back ──────────────────────────
const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
ws.onerror = (err) => { console.error('✘ WebSocket error:', err.message); process.exit(1); };
function send(obj) { ws.send(JSON.stringify(obj)); }

let msgId = 1;

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'auth_required') {
    send({ type: 'auth', access_token: TOKEN });

  } else if (msg.type === 'auth_ok') {
    send({ id: msgId++, type: 'lovelace/config', url_path: 'plants-dashboard' });

  } else if (msg.type === 'result' && msg.result?.views) {
    const config = msg.result;
    const devIdx = config.views.findIndex(v => v.title === 'Dev');
    if (devIdx >= 0) {
      config.views.splice(devIdx, 1);
      console.log(`✔ Removed Dev view (was index ${devIdx})`);
    } else {
      console.log('ℹ No Dev view found — nothing to remove');
    }
    send({ id: msgId++, type: 'lovelace/config/save', url_path: 'plants-dashboard', config });

  } else if (msg.type === 'result') {
    // Second result: the save response
    if (msg.success) {
      console.log('✔ Dashboard config saved successfully');
    } else {
      console.error('✘ Save failed:', JSON.stringify(msg.error));
      ws.close();
      process.exit(1);
    }
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => { console.error('✘ Timeout'); process.exit(1); }, 8000);
