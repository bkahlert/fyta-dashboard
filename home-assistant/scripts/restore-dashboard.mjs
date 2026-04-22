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
      console.error("Restore failed:", msg.error);
      ws.close();
      process.exit(1);
    }
    console.log("✔ Restored to backup");
    ws.close();
  }
};
ws.onclose = () => process.exit(0);
setTimeout(() => {
  console.error("Timeout");
  process.exit(1);
}, 8000);
