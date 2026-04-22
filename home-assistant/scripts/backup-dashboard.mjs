import { writeFileSync, mkdirSync } from "fs";

const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) {
  console.error("HA_TOKEN not set");
  process.exit(1);
}

const ws = new WebSocket("ws://homeassistant.local:8123/api/websocket");
ws.onerror = (err) => {
  console.error("WebSocket error:", err.message);
  process.exit(1);
};
function send(obj) {
  ws.send(JSON.stringify(obj));
}

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "auth_required") {
    send({ type: "auth", access_token: TOKEN });
  } else if (msg.type === "auth_ok") {
    send({ id: 1, type: "lovelace/config", url_path: "plants-dashboard" });
  } else if (msg.type === "result") {
    if (!msg.success) {
      console.error("Failed to fetch dashboard config:", msg.error);
      process.exit(1);
    }
    mkdirSync("backups", { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const path = `backups/plants-dashboard-${date}.json`;
    writeFileSync(path, JSON.stringify(msg.result, null, 2));
    console.log(`Backup written to ${path}`);
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => {
  console.error("Timeout");
  process.exit(1);
}, 8000);
