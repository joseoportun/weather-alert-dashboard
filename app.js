const map = L.map('map').setView([39.5, -98.35], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let alertLayer;
let layerMap = {};
let seenAlerts = new Set();
let acknowledged = new Set(JSON.parse(localStorage.getItem("acknowledged") || "[]"));

function saveAcknowledged() {
  localStorage.setItem("acknowledged", JSON.stringify([...acknowledged]));
}

async function fetchAlerts() {
  const res = await fetch("https://api.weather.gov/alerts/active");
  const data = await res.json();
  return data.features;
}

function getColor(event) {
  if (event.includes("Tornado")) return "red";
  if (event.includes("Flood")) return "orange";
  return "blue";
}

async function updateAlerts() {
  const alerts = await fetchAlerts();

  if (alertLayer) map.removeLayer(alertLayer);
  layerMap = {};

  const list = document.getElementById("alertList");
  list.innerHTML = "";

  alertLayer = L.geoJSON(alerts, {
    style: f => ({ color: getColor(f.properties.event) }),
    onEachFeature: (feature, layer) => {
      const id = feature.id;
      const p = feature.properties;

      layerMap[id] = layer;

      layer.bindPopup(`<b>${p.event}</b><br>${p.headline}<br>${p.areaDesc}`);

      if (!seenAlerts.has(id)) {
        seenAlerts.add(id);
        if (p.event.includes("Tornado") || p.event.includes("Flood")) {
          if (Notification.permission === "granted") {
            new Notification(p.event, { body: p.headline });
          }
          document.getElementById("alertSound").play();
        }
      }

      const item = document.createElement("div");
      item.className = "alert";

      if (acknowledged.has(id)) item.style.opacity = "0.5";

      item.innerHTML = `
        <b>${p.event}</b><br>
        <small>${p.areaDesc}</small><br>
        <button>Zoom</button>
        <label>
          <input type="checkbox" ${acknowledged.has(id) ? "checked" : ""}>
          Acknowledge
        </label>
      `;

      item.querySelector("button").onclick = () => {
        map.fitBounds(layerMap[id].getBounds());
      };

      item.querySelector("input").onchange = (e) => {
        if (e.target.checked) acknowledged.add(id);
        else acknowledged.delete(id);
        saveAcknowledged();
      };

      list.appendChild(item);
    }
  }).addTo(map);
}

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

updateAlerts();
setInterval(updateAlerts, 60000);
