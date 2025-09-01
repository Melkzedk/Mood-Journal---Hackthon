// Mood Journal frontend (mock mode).
// Flip CONFIG.USE_LOCAL_ONLY = false when your Flask API is ready.
const CONFIG = {
  USE_LOCAL_ONLY: true,
  API_BASE: "http://localhost:5000"
};
document.getElementById("modeLabel").textContent = CONFIG.USE_LOCAL_ONLY
  ? "Mock (LocalStorage)"
  : `API (${CONFIG.API_BASE})`;

const statusEl = document.getElementById("status");
const entryText = document.getElementById("entryText");
const form = document.getElementById("entryForm");
const clearBtn = document.getElementById("clearAll");
const tableBody = document.querySelector("#entriesTable tbody");
let chart;

// ---- LocalStorage helpers ----
const STORAGE_KEY = "mj_entries";
function loadLocalEntries(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }catch{ return [] }
}
function saveLocalEntries(entries){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
function addLocalEntry(entry){
  const entries = loadLocalEntries();
  entries.unshift(entry); // newest first
  saveLocalEntries(entries);
  return entries;
}

// ---- Very naive sentiment for demo only ----
const POS = ["good","great","happy","joy","love","excited","awesome","amazing","calm","relaxed"];
const NEG = ["bad","sad","angry","anxious","tired","awful","terrible","upset","stressed"];
function simpleSentiment(text){
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  let pos=0, neg=0;
  for (const w of words){
    if (POS.includes(w)) pos++;
    if (NEG.includes(w)) neg++;
  }
  const total = pos + neg;
  if (total === 0) return { label: "neutral", score: 0.5 };
  const score = Math.min(1, Math.max(0, (pos - neg + total) / (2*total)));
  const label = score > 0.6 ? "positive" : score < 0.4 ? "negative" : "neutral";
  return { label, score: Number(score.toFixed(2)) };
}

// ---- API wrappers ----
async function createEntry(text){
  if (CONFIG.USE_LOCAL_ONLY){
    const s = simpleSentiment(text);
    const entry = {
      id: Date.now(),
      text,
      emotion: s.label,
      score: s.score,
      created_at: new Date().toISOString()
    };
    const all = addLocalEntry(entry);
    return { ok: true, data: entry, all };
  } else {
    const res = await fetch(`${CONFIG.API_BASE}/entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return { ok: true, data };
  }
}
async function fetchEntries(){
  if (CONFIG.USE_LOCAL_ONLY){
    return loadLocalEntries();
  } else {
    const res = await fetch(`${CONFIG.API_BASE}/entries`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    return data;
  }
}

// ---- UI rendering ----
function renderTable(entries){
  tableBody.innerHTML = "";
  for (const e of entries){
    const tr = document.createElement("tr");
    const dt = new Date(e.created_at || e.timestamp || Date.now());
    const dateTd = `<td>${dt.toLocaleString()}</td>`;
    const textTd = `<td>${escapeHtml(e.text).slice(0, 120)}${e.text.length>120?"…":""}</td>`;
    const badge = `<span class="badge ${e.emotion}">${e.emotion}</span>`;
    const emoTd = `<td>${badge}</td>`;
    const scoreTd = `<td>${(e.score ?? 0).toFixed(2)}</td>`;
    tr.innerHTML = dateTd + textTd + emoTd + scoreTd;
    tableBody.appendChild(tr);
  }
}
function escapeHtml(str){
  return str.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[m]);
}

// ---- Chart ----
function renderChart(entries){
  const labels = entries.map(e => new Date(e.created_at || e.timestamp || Date.now()).toLocaleString()).reverse();
  const scores = entries.map(e => e.score ?? 0.5).reverse();
  const ctx = document.getElementById("moodChart");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Mood score (0–1)",
        data: scores,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 1 }
      }
    }
  });
}

// ---- Event handlers ----
form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const text = entryText.value.trim();
  if (!text) return;
  setStatus("Analyzing…");
  try{
    const res = await createEntry(text);
    entryText.value = "";
    setStatus("Saved ✔");
    const entries = await fetchEntries();
    renderTable(entries);
    renderChart(entries);
  }catch(err){
    console.error(err);
    setStatus("Failed to save entry. Check console.", true);
  }
});
clearBtn.addEventListener("click", ()=>{
  if (!CONFIG.USE_LOCAL_ONLY){
    alert("Clear All works only in local mock mode.");
    return;
  }
  if (confirm("Delete ALL local entries? This cannot be undone.")){
    localStorage.removeItem(STORAGE_KEY);
    renderTable([]);
    renderChart([]);
    setStatus("Local entries cleared.");
  }
});

function setStatus(msg, isError=false){
  statusEl.textContent = msg;
  statusEl.style.color = isError ? "#fca5a5" : "";
}

// ---- Initial load ----
(async function init(){
  const entries = await fetchEntries();
  renderTable(entries);
  renderChart(entries);
})();
