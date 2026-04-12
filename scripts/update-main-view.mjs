const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('HA_TOKEN not set'); process.exit(1); }

// ── RGB color literals (mushroom wraps icon_color in rgb(...)) ───────────────
const C = {
  error:   '219,68,55',
  warning: '255,166,0',
  success: '67,160,71',
  info:    '3,155,229',
  muted:   'var(--rgb-secondary-text-color)',
};

const stateColor = (s) =>
  `{{ '${C.error}' if ${s} == 'too_low' else '${C.warning}' if ${s} == 'low' else '${C.info}' if ${s} == 'too_high' else '${C.success}' }}`;

// ── Template prefix expression ────────────────────────────────────────────────
// PFX_M: strips the _moisture suffix (9 chars) from a sensor.*_moisture entity ID.
// Used in Jinja2 templates to reconstruct the FYTA plant prefix for sibling lookups.
// Uses [:-9] (suffix strip) rather than split('_moisture')[0] to avoid truncation
// if a plant slug ever contains the substring '_moisture'.
const PFX_M = `entity.split('.')[1][:-9]`;

// ── Cards ─────────────────────────────────────────────────────────────────────

// Benutzerbild — full-width cover via button-card (supports JS background-image template).
// entity IS sensor.*_moisture, so its friendly_name already has the device-name prefix
// (e.g. "Wand Zebra Feuchtigkeit"). Strip the last word to get the image slug.
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

// Mushroom template card (picture, name, scientific name, moisture state badge)
const mushroomCard = {
  type: 'custom:mushroom-template-card',
  entity: 'this.entity_id',
  primary:     `{{ device_attr(device_id(entity), 'name') }}`,
  secondary:   `{%- set p = ${PFX_M} -%}{{ states('sensor.' + p + '_scientific_name') }}`,
  icon: 'mdi:leaf',
  picture:     `{%- set p = ${PFX_M} -%}{{ state_attr('image.' + p, 'entity_picture') }}`,
  icon_color:  `{%- set p = ${PFX_M} -%}{%- set ms = states('sensor.' + p + '_moisture_state') -%}${stateColor('ms')}`,
  badge_icon:  `{%- set p = ${PFX_M} -%}{%- set ms = states('sensor.' + p + '_moisture_state') -%}{% if ms == 'too_low' %}mdi:water-off{% elif ms == 'low' %}mdi:water-minus{% elif ms == 'too_high' %}mdi:water-plus{% elif ms == 'high' %}mdi:water-alert{% else %}mdi:water-check{% endif %}`,
  badge_color: `{%- set p = ${PFX_M} -%}{%- set ms = states('sensor.' + p + '_moisture_state') -%}${stateColor('ms')}`,
};

// Moisture numeric line graph (14 days)
const sensorGraph = {
  type: 'sensor',
  entity: 'this.entity_id',
  name: 'Moisture',
  graph: 'line',
  hours_to_show: 336,
  limits: { min: 0, max: 100 },
};

// Status chips
const MORE_INFO = { tap_action: { action: 'more-info' } };

function stateChip(suffix, icon) {
  return {
    type: 'template',
    entity: 'this.entity_id',
    icon,
    icon_color: `{%- set p = ${PFX_M} -%}{%- set s = states('sensor.' + p + '_${suffix}') -%}${stateColor('s')}`,
    content: `{%- set p = ${PFX_M} -%}{%- set s = states('sensor.' + p + '_${suffix}') -%}{{ '' if s == 'perfect' else state_translated('sensor.' + p + '_${suffix}') }}`,
    ...MORE_INFO,
  };
}

const batteryChip = {
  type: 'template',
  entity: 'this.entity_id',
  icon: 'mdi:battery-alert',
  icon_color: `{%- set p = ${PFX_M} -%}{{ '${C.error}' if states('sensor.' + p + '_battery') | int(100) < 20 else '${C.success}' }}`,
  content: `{%- set p = ${PFX_M} -%}{%- set pct = states('sensor.' + p + '_battery') | int(100) -%}{{ pct ~ '%' if pct < 20 else '' }}`,
  ...MORE_INFO,
};

const fertChip = (() => {
  const daysCalc =
    `{%- set p = ${PFX_M} -%}` +
    `{%- set fert = states('sensor.' + p + '_next_fertilization') -%}` +
    `{%- set days = ((as_timestamp(fert) - as_timestamp(now())) / 86400) | int if fert not in ['unavailable','unknown','none',''] else 999 -%}`;
  const nutrientsColor =
    `{%- set p = ${PFX_M} -%}{%- set ns = states('sensor.' + p + '_nutrients_state') -%}` +
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

const freshnessChip = {
  type: 'template',
  entity: 'this.entity_id',
  icon: 'mdi:update',
  icon_color: `{%- set age = ((as_timestamp(now()) - as_timestamp(states[entity].last_updated)) / 3600) | float -%}{{ '${C.success}' if age <= 24 else '${C.warning}' if age <= 48 else '${C.error}' }}`,
  content: `{{ relative_time(states[entity].last_updated) }}`,
  tap_action: { action: 'more-info' },
};

const statusChips = {
  type: 'custom:mushroom-chips-card',
  chips: [
    stateChip('temperature_state', 'mdi:thermometer'),
    stateChip('light_state', 'mdi:white-balance-sunny'),
    fertChip,
    { type: 'spacer' },
    batteryChip,
    freshnessChip,
  ],
};

const plantCardOptions = {
  type: 'vertical-stack',
  cards: [ buttonCard, mushroomCard, sensorGraph, statusChips ],
};

// ── Read current config, patch main view auto-entities options, write back ────
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

    // Main view = first view that isn't the Dev view
    const mainView = config.views.find(v => v.title !== 'Dev');
    if (!mainView) { console.error('✘ Main view not found'); process.exit(1); }

    const autoEntities = mainView.cards.find(c => c.type === 'custom:auto-entities');
    if (!autoEntities) { console.error('✘ auto-entities card not found in main view'); process.exit(1); }

    // Filter on native FYTA moisture sensors; sort numerically ascending (thirstiest first).
    // sensor.*_moisture entities are created dynamically by the FYTA integration —
    // no static bridge YAML needed.
    autoEntities.filter.include = [{
      entity_id: 'sensor.*_moisture',
      options: plantCardOptions,
    }];
    autoEntities.sort = { method: 'state', numeric: true, reverse: false };
    console.log('✔ Rebuilt filter: sensor.*_moisture, numeric sort ascending (thirstiest first)');

    send({ id: msgId++, type: 'lovelace/config/save', url_path: 'plants-dashboard', config });

  } else if (msg.type === 'result') {
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
