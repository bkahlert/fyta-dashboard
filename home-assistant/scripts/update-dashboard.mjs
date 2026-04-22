import { readFileSync } from "fs";

const TOKEN = process.env.HA_TOKEN;
if (!TOKEN) {
  console.error("HA_TOKEN not set");
  process.exit(1);
}

const backupPath =
  process.argv[2] ??
  `backups/plants-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
const config = JSON.parse(readFileSync(backupPath, "utf8"));

// NOTE: Run this script once against a freshly-captured backup.
// Re-running against a backup that was taken after a previous update
// will apply mutations on top of already-mutated config.

// Mutation 1 — panel mode
config.views[0].panel = true;
console.log("✔ Set panel: true on view 0");

// Mutation 2 — swap grid → layout-card
const autoEntities = config.views[0].cards[0];
autoEntities.card = {
  type: "custom:layout-card",
  layout_type: "custom:grid-layout",
  layout: {
    "grid-template-columns": "repeat(auto-fill, minmax(280px, 1fr))",
    "grid-gap": "8px",
  },
};
console.log("✔ Swapped inner card to custom:layout-card");

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
  if (msg.type === "auth_required") send({ type: "auth", access_token: TOKEN });
  else if (msg.type === "auth_ok")
    send({
      id: 1,
      type: "lovelace/config/save",
      url_path: "plants-dashboard",
      config,
    });
  else if (msg.type === "result") {
    if (!msg.success) {
      console.error("Save failed:", msg.error);
      ws.close();
      process.exit(1);
    }
    console.log("✔ Dashboard config saved successfully");
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => {
  console.error("Timeout");
  process.exit(1);
}, 8000);
