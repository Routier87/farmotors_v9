
const API_URL_FALLBACK = "http://localhost:3000";
const API = (typeof API_URL !== "undefined" && !API_URL.includes("REMPLACE_PAR")) ? API_URL : API_URL_FALLBACK;

const STAFF_IDS = [
  "1246943697300619405",
  "1246982124419154010",
  "1247188738002386967",
  "946284221150949396"
];

function getDiscordId(){ return localStorage.getItem("discordId") || ""; }
function getDiscordName(){ return localStorage.getItem("discordName") || ""; }
function isStaff(){ return STAFF_IDS.includes(getDiscordId()); }

function protectStaffPage(){
  if(document.body.dataset.protectStaff === "true" && !isStaff()){
    alert("Accès réservé au Patron / Co Patron / Manager / Dev");
    window.location.href = "index.html";
  }
}
function updateMenuVisibility(){
  document.querySelectorAll("[data-staff-only='true']").forEach(el => {
    if(!isStaff()) el.classList.add("hidden");
  });
}
function renderUserBadge(){
  const box = document.getElementById("userBadge");
  if(!box) return;
  if(getDiscordId()){
    box.innerHTML = `<span class="user-badge">Connecté : ${getDiscordName() || "Discord"} (${getDiscordId()})</span>`;
  } else {
    box.innerHTML = `<span class="user-badge">Non connecté</span>`;
  }
}
function setupLoginButtons(){
  const loginBtn = document.getElementById("discordLoginBtn");
  if(loginBtn && typeof DISCORD_OAUTH_URL !== "undefined" && !DISCORD_OAUTH_URL.includes("REMPLACE_PAR")){
    loginBtn.href = DISCORD_OAUTH_URL;
  }
  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("discordId");
      localStorage.removeItem("discordName");
      localStorage.removeItem("discordToken");
      window.location.href = "index.html";
    });
  }
}
async function fetchDiscordUser(){
  const token = localStorage.getItem("discordToken");
  if(!token || getDiscordId()) return;
  try{
    const res = await fetch("https://discord.com/api/users/@me", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if(!res.ok) return;
    const user = await res.json();
    if(user && user.id){
      localStorage.setItem("discordId", String(user.id));
      localStorage.setItem("discordName", user.username || user.global_name || "Discord");
    }
  }catch(e){}
}

/* Convois */
async function loadConvoys(){
  const container = document.getElementById("convoys");
  const last = document.getElementById("lastConvoy");
  const adminConvoys = document.getElementById("adminConvoys");
  if(!container && !last && !adminConvoys) return;

  try{
    const res = await fetch(`${API}/convoys`);
    const convoys = await res.json();

    if(container){
      container.innerHTML = convoys.length ? convoys.map(c => `
        <div class="card">
          <h3>🚛 ${c.depart} ➜ ${c.arrivee}</h3>
          <p class="muted">${c.entrepriseDepart || "-"} ➜ ${c.entrepriseArrivee || "-"}</p>
          <p>📅 ${c.date || "-"} | ⏰ ${c.heure || "-"} | 🖥️ ${c.serveur || "-"}</p>
          <p class="small">👍 ${c.likes || 0} &nbsp; 👎 ${c.dislikes || 0}</p>
          <div class="convoy-actions">
            <button class="btn btn-green" onclick="voteConvoy(${c.id}, 'like')">👍 Stylé</button>
            <button class="btn btn-gold" onclick="voteConvoy(${c.id}, 'dislike')">👎 Pas stylé</button>
            <button class="btn btn-blue" onclick="registerConvoy(${c.id})">📝 S'inscrire</button>
          </div>
        </div>
      `).join("") : `<div class="card">Aucun convoi pour le moment.</div>`;
    }

    if(last){
      if(convoys.length){
        const c = convoys[convoys.length - 1];
        last.innerHTML = `<strong>🚛 ${c.depart} ➜ ${c.arrivee}</strong><br><span class="muted">${c.date} | ${c.heure}</span>`;
      } else {
        last.textContent = "Aucun convoi pour le moment";
      }
    }

    if(adminConvoys){
      adminConvoys.innerHTML = convoys.length ? convoys.map(c => `
        <div class="card">
          <strong>${c.depart} ➜ ${c.arrivee}</strong><br>
          <span class="muted">${c.date} | ${c.heure}</span>
          <div class="admin-actions">
            <button class="btn btn-red" onclick="deleteConvoy(${c.id})">Supprimer le convoi</button>
          </div>
        </div>
      `).join("") : `<div class="card">Aucun convoi.</div>`;
    }
  }catch(e){
    if(container) container.innerHTML = `<div class="card">Impossible de charger les convois.</div>`;
  }
}

async function voteConvoy(convoyId, type){
  const userId = getDiscordId();
  if(!userId){ alert("Connecte-toi à Discord avant de voter"); return; }
  const r = await fetch(`${API}/vote`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ convoyId, userId, type })
  });
  const data = await r.json();
  if(!data.ok) alert("Tu as déjà voté sur ce convoi");
  loadConvoys();
}
async function registerConvoy(convoyId){
  const discordName = getDiscordName();
  if(!discordName){ alert("Connecte-toi à Discord avant de t'inscrire"); return; }
  await fetch(`${API}/register`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ convoyId, name: discordName })
  });
  alert("Inscription envoyée ✅");
}
function convoyFormSetup(){
  const form = document.getElementById("convoyForm");
  if(!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userId = getDiscordId();
    if(!userId){ alert("Connecte-toi à Discord avant de créer un convoi"); return; }

    const body = {
      entrepriseDepart: document.getElementById("entrepriseDepart").value,
      depart: document.getElementById("depart").value,
      entrepriseArrivee: document.getElementById("entrepriseArrivee").value,
      arrivee: document.getElementById("arrivee").value,
      date: document.getElementById("date").value,
      heure: document.getElementById("heure").value,
      serveur: document.getElementById("serveur").value
    };

    const res = await fetch(`${API}/convoys`, {
      method:"POST",
      headers:{ "Content-Type":"application/json", "userId": userId },
      body:JSON.stringify(body)
    });

    if(res.status === 403){ alert("Accès refusé"); return; }
    alert("Convoi créé ✅");
    form.reset();
  });
}
async function deleteConvoy(id){
  const userId = getDiscordId();
  const res = await fetch(`${API}/convoys/${id}`, {
    method:"DELETE",
    headers:{ "userId": userId }
  });
  if(res.status === 403){ alert("Accès refusé"); return; }
  loadConvoys();
}

/* Candidatures */
function appFormSetup(type){
  const form = document.getElementById(`form-${type}`);
  if(!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      discord: document.getElementById(`${type}-discord`).value,
      age: document.getElementById(`${type}-age`).value,
      experience: document.getElementById(`${type}-experience`).value,
      motivation: document.getElementById(`${type}-motivation`).value
    };
    await fetch(`${API}/applications/${type}`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    alert("Candidature envoyée ✅");
    form.reset();
  });
}

async function loadAdminApplications(type){
  const target = document.getElementById(`admin-${type}`);
  if(!target) return;
  const userId = getDiscordId();
  if(!userId){ target.innerHTML = `<div class="card">Connecte-toi à Discord pour accéder au panel admin.</div>`; return; }

  const res = await fetch(`${API}/admin/applications/${type}`, { headers:{ "userId": userId }});
  if(res.status === 403){
    target.innerHTML = `<div class="card">Accès refusé.</div>`;
    return;
  }
  const data = await res.json();
  target.innerHTML = data.length ? data.map(a => `
    <div class="card">
      <strong>${a.discord}</strong><br>
      <span class="muted">Âge: ${a.age || "-"} | Expérience: ${a.experience || "-"}</span><br>
      <span class="muted">Statut: ${a.status}</span>
      <p>${a.motivation || ""}</p>
      <div class="admin-actions">
        <button class="btn btn-green" onclick="adminApplication('${type}', ${a.id}, 'accept')">Valider</button>
        <button class="btn btn-gold" onclick="adminApplication('${type}', ${a.id}, 'reject')">Refuser</button>
        <button class="btn btn-red" onclick="adminApplication('${type}', ${a.id}, 'delete')">Supprimer</button>
      </div>
    </div>
  `).join("") : `<div class="card">Aucune candidature ${type}.</div>`;
}
async function adminApplication(type, id, action){
  const userId = getDiscordId();
  await fetch(`${API}/admin/applications/${type}/${id}/${action}`, {
    method:"POST",
    headers:{ "userId": userId }
  });
  loadAdminApplications(type);
}

(async function init(){
  await fetchDiscordUser();
  protectStaffPage();
  updateMenuVisibility();
  renderUserBadge();
  setupLoginButtons();
  loadConvoys();
  convoyFormSetup();
  appFormSetup("trucky");
  appFormSetup("trucksbook");
  loadAdminApplications("trucky");
  loadAdminApplications("trucksbook");
})();
