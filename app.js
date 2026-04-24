const map = L.map('map').setView([39.5, -98.35], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let alertLayer;
let seenAlerts = new Set();

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
  const filter = document.getElementById("filter").value;
  const state = document.getElementById("stateSearch").value.toUpperCase();

  if (alertLayer) map.removeLayer(alertLayer);

  const filtered = alerts.filter(a => {
    const event = a.properties.event;
    const area = a.properties.areaDesc.toUpperCase();
    return (filter === "all" || event.includes(filter)) &&
           (state === "" || area.includes(state));
  });

  alertLayer = L.geoJSON(filtered, {
    style: f => ({ color: getColor(f.properties.event) }),
    onEachFeature: (feature, layer) => {
      const p = feature.properties;

      layer.bindPopup(`<b>${p.event}</b><br>${p.headline}<br>${p.areaDesc}`);

      layer.on('click', () => {
        map.fitBounds(layer.getBounds());
      });

      // notifications + sound
      if (!seenAlerts.has(feature.id)) {
        seenAlerts.add(feature.id);

        if (p.event.includes("Tornado") || p.event.includes("Flood")) {
          if (Notification.permission === "granted") {
            new Notification(p.event, { body: p.headline });
          }
          document.getElementById("alertSound").play();
        }
      }
    }
  }).addTo(map);

  document.getElementById("timestamp").innerText =
    "Last updated: " + new Date().toLocaleTimeString();

  // Save to localStorage
  localStorage.setItem("alerts", JSON.stringify(filtered));
}

// clustering (simple)
function loadClusters() {
  if (!alertLayer) return;
}

document.getElementById("filter").addEventListener("change", updateAlerts);
document.getElementById("stateSearch").addEventListener("input", updateAlerts);

if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

updateAlerts();
setInterval(updateAlerts, 60000);
