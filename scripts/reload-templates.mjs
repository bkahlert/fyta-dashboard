const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) { console.error('HA_TOKEN not set'); process.exit(1); }

const ws = new WebSocket('ws://homeassistant.local:8123/api/websocket');
ws.onerror = (err) => { console.error('✘ WebSocket error:', err.message); process.exit(1); };
function send(obj) { ws.send(JSON.stringify(obj)); }

let msgId = 1;

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'auth_required') {
    send({ type: 'auth', access_token: TOKEN });

  } else if (msg.type === 'auth_ok') {
    send({
      id: msgId++,
      type: 'call_service',
      domain: 'homeassistant',
      service: 'reload_all',
      service_data: {},
    });

  } else if (msg.type === 'result') {
    if (msg.success) {
      console.log('✔ HA config reloaded');
    } else {
      console.error('✘ Reload failed:', JSON.stringify(msg.error));
      ws.close();
      process.exit(1);
    }
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => { console.error('✘ Timeout'); process.exit(1); }, 10000);
