/* ===========================
   FULL Dashboard Script (fixed SOS feed)
   =========================== */

/* ---------- Validation patterns ---------- */
const stationIdPattern = /^[A-Za-z]{2}[0-9]{6}$/; // e.g., KA123456
const officerIdPattern = /^[0-9]{8}$/; // 8 digits

/* ---------- Data (sample) ---------- */
const tourists = [
  { touristId: "T1001", fullName: "Arjun Mehta", location: "Bengaluru", age: 29, dob: "1996-04-12", purpose: "Tourism", days: 3, itinerary: "Bengaluru Palace → Lalbagh", hotel: "Taj" },
  { touristId: "T5023", fullName: "Sanchita Verma", location: "Mumbai", age: 32, dob: "1993-11-20", purpose: "Business", days: 2, itinerary: "MG Road", hotel: "Residency" },
  { touristId: "T8011", fullName: "Pranav Patil", location: "Pune", age: 24, dob: "2001-01-10", purpose: "Education", days: 1, itinerary: "Majestic", hotel: "Budget Inn" }
];

const aiAlerts = [
  { id: "AI-101", touristId: "T2001", name: "Ankitha D", details: "Not moving for over 3 hours in a red zone.", location: "Kempegowda Circle", time: "2025-09-15 13:45", flag: "Red" },
  { id: "AI-102", touristId: "T2008", name: "Divya Singh", details: "Entered restricted danger zone.", location: "Railway Station Road", time: "2025-09-15 14:10", flag: "Yellow" }
];

const waitingSOSAlerts = [
  { id: "SOS-001", name: "Arjun Mehta", touristId: "T1001", location: "KSR Bengaluru City Junction, Majestic", time: "2025-09-15 14:30", contact: "92384 23829" },
  { id: "SOS-002", name: "Sanchita Verma", touristId: "T5023", location: "Railway Grounds, Majestic", time: "2025-09-15 14:32", contact: "91273 28731" },
  { id: "SOS-003", name: "Pranav Patil", touristId: "T8011", location: "HDFC Bank ATM, Majestic", time: "2025-09-15 14:34", contact: "97382 93021" }
];
let sosFeedIndex = 0;
let sosFeedStarted = false;
let sosActive = [];
let sosIntervalId = null;

/* ---------- FIRs (pre-attached PDF) ---------- */
let firs = [
  { 
    caseId: "FIR-001", 
    name: "Missing: Ankitha D", 
    touristId: "T2001", 
    location: "Kempegowda Circle", 
    time: "2025-09-15 13:45", 
    reason: "Reported missing", 
    status: "Drafted", 
    pdf: "FIR.pdf"
  }
];

/* ---------- Incidents + Dashcams SAMPLE ---------- */
const incidentReports = [
  { id: "INC-01", name: "Pickpocketing", location: "Platform 2", time: "2025-09-14 11:00", description: "Reported pickpocket incident", status: "Review", media: "" },
  { id: "INC-02", name: "Fight Breakout", location: "Near Exit B", time: "2025-09-15 09:20", description: "Minor scuffle resolved", status: "Completed", media: "" }
];

const dashcams = [
  { id: "DC-01", name: "Patrol Car 1", video: "dashcam1.mp4" },
  { id: "DC-02", name: "Patrol Bike 2", video: "dashcam2.mp4" }
];

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);

/* ---------- Screens ---------- */
function showScreen(screenId) {
  ["station-login", "officer-login", "dashboard"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("active", id === screenId);
  });
}

/* ---------- Station login ---------- */
function validateStationLogin() {
  const stationName = $("stationName").value.trim();
  const stationID = $("stationID").value.trim();
  const stationPassword = $("stationPassword").value.trim();

  if (!stationName) return alert("Enter station name");
  if (!stationIdPattern.test(stationID)) return alert("Station ID must be 2 letters + 6 digits");
  if (stationPassword.length < 6) return alert("Station password must be at least 6 characters");

  localStorage.setItem("stationName", stationName);
  localStorage.setItem("stationID", stationID);

  showScreen("officer-login");
}

/* ---------- Officer login ---------- */
function validateOfficerLogin() {
  const officerID = $("officerID").value.trim();
  const officerPassword = $("officerPassword").value.trim();

  if (!officerIdPattern.test(officerID)) return alert("Officer ID must be 8 digits");
  if (officerPassword.length < 6) return alert("Officer password must be at least 6 characters");

  localStorage.setItem("officerID", officerID);
  showScreen("dashboard");

  const stationName = localStorage.getItem("stationName") || "N/A";
  const stationID = localStorage.getItem("stationID") || "N/A";
  $("login-info").innerText = `Officer ${officerID} | Station: ${stationName} (${stationID})`;

  activateTab("tourists");
  renderAllModules();
  startSOSFeed();
}

/* ---------- Logout ---------- */
function logout() {
  localStorage.clear();
  stopSOSFeed();
  showScreen("station-login");
  renderAllModules();
}

/* ---------- Tabs ---------- */
function activateTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.target === tabId));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  $(tabId)?.classList.add("active");

  if (tabId === "firs" && !currentViewingFIR) {
    hideFIRPdfView();
  }
}

document.addEventListener("click", e => {
  const tb = e.target.closest(".tab-btn");
  if (tb) activateTab(tb.dataset.target);
});

/* ---------- Tourists ---------- */
function renderTourists(filter = "") {
  const container = $("touristList");
  container.innerHTML = "";
  const q = filter.trim().toLowerCase();
  const items = tourists.filter(t =>
    !q || t.touristId.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q)
  );
  if (items.length === 0) container.innerHTML = `<div class="card">No tourists found</div>`;
  items.forEach(t => {
    const card = document.createElement("div");
    card.className = "item-card card";
    card.innerHTML = `
      <div class="item-head">
        <div><strong>${t.touristId}</strong> — ${t.fullName}</div>
        <div><button class="small-btn">Details</button></div>
      </div>
      <div class="item-details">
        <div><strong>Location:</strong> ${t.location}</div>
        <div><strong>Age:</strong> ${t.age}</div>
        <div><strong>DOB:</strong> ${t.dob}</div>
        <div><strong>Purpose:</strong> ${t.purpose}</div>
        <div><strong>No. days:</strong> ${t.days}</div>
        <div><strong>Itinerary:</strong> ${t.itinerary}</div>
        <div><strong>Hotel:</strong> ${t.hotel}</div>
      </div>
    `;
    card.querySelector(".item-head").addEventListener("click", () => {
      const d = card.querySelector(".item-details");
      d.style.display = d.style.display === "block" ? "none" : "block";
    });
    container.appendChild(card);
  });
  $("touristSearch")?.addEventListener("input", e => renderTourists(e.target.value));
}

/* ---------- AI Alerts ---------- */
function renderAI() {
  const container = $("aiList");
  container.innerHTML = "";
  if (aiAlerts.length === 0) return container.innerHTML = "<div class='card'>No AI alerts</div>";
  aiAlerts.forEach(a => {
    const card = document.createElement("div");
    card.className = "item-card card";
    card.innerHTML = `
      <div class="item-head"><div><strong>${a.id}</strong> — ${a.name}</div><div>${a.flag}</div></div>
      <div class="item-details">
        <div><strong>Location:</strong> ${a.location}</div>
        <div><strong>Time:</strong> ${a.time}</div>
        <div><strong>Details:</strong> ${a.details}</div>
      </div>
    `;
    card.querySelector(".item-head").addEventListener("click", () => {
      const d = card.querySelector(".item-details");
      d.style.display = d.style.display === "block" ? "none" : "block";
    });
    container.appendChild(card);
  });
}

/* ---------- SOS Alerts ---------- */
function renderSOS() {
  const container = $("sosList");
  container.innerHTML = "";
  if (sosActive.length === 0) return container.innerHTML = "<div class='card'>No active SOS alerts</div>";
  sosActive.forEach(a => {
    const card = document.createElement("div");
    card.className = "item-card card";
    card.innerHTML = `
      <div class="item-head"><div><strong>${a.id}</strong> — ${a.name}</div><div>${a.time}</div></div>
      <div class="item-details"><div><strong>Location:</strong> ${a.location}</div><div><strong>Contact:</strong> ${a.contact}</div></div>
    `;
    card.querySelector(".item-head").addEventListener("click", () => {
      const d = card.querySelector(".item-details");
      d.style.display = d.style.display === "block" ? "none" : "block";
    });
    container.appendChild(card);
  });
}

function startSOSFeed(intervalMs = 30000) {
  if (sosFeedStarted) return;
  sosFeedStarted = true;

  // First alert immediately
  if (sosFeedIndex < waitingSOSAlerts.length) {
    const first = waitingSOSAlerts[sosFeedIndex++];
    sosActive.push(first);
    renderSOS();
    playSOSSound();
  }

  // Subsequent alerts every 30 sec
  sosIntervalId = setInterval(() => {
    if (sosFeedIndex < waitingSOSAlerts.length) {
      const next = waitingSOSAlerts[sosFeedIndex++];
      sosActive.push(next);
      renderSOS();
      playSOSSound();
    } else {
      stopSOSFeed();
    }
  }, intervalMs);
}

function stopSOSFeed() {
  if (sosIntervalId) {
    clearInterval(sosIntervalId);
    sosIntervalId = null;
  }
  sosFeedStarted = false;
  sosFeedIndex = 0;
  sosActive = [];
}

/* ---------- SOS Audio ---------- */
function playSOSSound() {
  const audio = $("alertSound");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(console.warn);
  }
}

/* ---------- FIRs ---------- */
let currentViewingFIR = null;

function renderFIRs() {
  const container = $("firList");
  container.innerHTML = "";
  if (firs.length === 0) {
    container.innerHTML = "<div class='card'>No FIRs</div>";
    hideFIRPdfView();
    return;
  }

  firs.forEach(f => {
    let actionHtml = "";
    if (f.status === "Drafted") {
      actionHtml = `<button class="small-btn" data-action="draft" data-case="${f.caseId}">Draft FIR</button>`;
    } else if (f.status === "Filed") {
      actionHtml = `<button class="small-btn" data-action="view" data-case="${f.caseId}">View FIR</button>`;
    }

    const card = document.createElement("div");
    card.className = "item-card card";
    card.innerHTML = `
      <div class="item-head"><div><strong>${f.caseId}</strong> — ${f.name}</div><div>${f.status}</div></div>
      <div class="item-details">
        <div><strong>Location:</strong> ${f.location}</div>
        <div><strong>Time:</strong> ${f.time}</div>
        <div><strong>Reason:</strong> ${f.reason}</div>
        <div>${actionHtml}</div>
      </div>
    `;
    card.querySelector(".item-details").style.display = "block";
    container.appendChild(card);
  });

  container.querySelectorAll("button[data-action='draft']").forEach(b => {
    b.onclick = () => {
      const fir = firs.find(x => x.caseId === b.dataset.case);
      if (!fir) return;
      fir.status = "Filed";
      renderFIRs();
      currentViewingFIR = null;
      hideFIRPdfView();
    };
  });

  container.querySelectorAll("button[data-action='view']").forEach(b => {
    b.onclick = () => {
      const fir = firs.find(x => x.caseId === b.dataset.case);
      if (!fir) return;
      window.open(fir.pdf, "_blank");
    };
  });
}

function showFIRPdfView(pdfFile) {
  const viewer = $("firPdfViewer");
  const iframe = $("firPdfFrame");
  iframe.src = pdfFile;
  viewer.style.display = "block";
}

function hideFIRPdfView() {
  const viewer = $("firPdfViewer");
  const iframe = $("firPdfFrame");
  iframe.src = "";
  viewer.style.display = "none";
}

/* ---------- Incidents ---------- */
function renderIncidents() {
  const container = $("incidentList");
  container.innerHTML = "";
  if (incidentReports.length === 0) return container.innerHTML = "<div class='card'>No incidents</div>";
  incidentReports.forEach(r => {
    const btnLabel = r.status === "Review" ? "Mark Under Review" : r.status === "Under Review" ? "Mark Completed" : "Completed";
    const actionHtml = r.status === "Completed" ? "✅" : `<button class="small-btn" data-id="${r.id}">${btnLabel}</button>`;
    const card = document.createElement("div");
    card.className = "item-card card";
    card.innerHTML = `
      <div class="item-head"><div><strong>${r.id}</strong> — ${r.name}</div><div>${r.status}</div></div>
      <div class="item-details">
        <div><strong>Location:</strong> ${r.location}</div>
        <div><strong>Time:</strong> ${r.time}</div>
        <div><strong>Description:</strong> ${r.description}</div>
        ${r.media ? `<img src="${r.media}" style="max-width:200px">` : ""}
        ${actionHtml}
      </div>
    `;
    card.querySelector(".item-head").addEventListener("click", () => {
      const d = card.querySelector(".item-details");
      d.style.display = d.style.display === "block" ? "none" : "block";
    });
    container.appendChild(card);
  });
  container.querySelectorAll("button[data-id]").forEach(b => {
    b.onclick = () => {
      const rec = incidentReports.find(x => x.id === b.dataset.id);
      if (rec.status === "Review") rec.status = "Under Review";
      else if (rec.status === "Under Review") rec.status = "Completed";
      renderIncidents();
    };
  });
}

/* ---------- Dashcams ---------- */
function renderDashcams() {
  const container = $("dashcamList");
  container.innerHTML = "";
  if (dashcams.length === 0) return container.innerHTML = "<div class='card'>No dashcams</div>";
  dashcams.forEach(d => {
    const card = document.createElement("div");
    card.className = "item-card card";
    card.innerHTML = `
      <div class="item-head"><div><strong>${d.id}</strong> — ${d.name}</div></div>
      <div class="item-details"><video controls src="${d.video}" style="max-width:100%"></video></div>
    `;
    card.querySelector(".item-head").addEventListener("click", () => {
      const dd = card.querySelector(".item-details");
      dd.style.display = dd.style.display === "block" ? "none" : "block";
    });
    container.appendChild(card);
  });
}

/* ---------- Render All ---------- */
function renderAllModules() {
  renderTourists();
  renderAI();
  renderSOS();
  renderFIRs();
  renderIncidents();
  renderDashcams();
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  showScreen("station-login");
  $("stationNextBtn").onclick = validateStationLogin;
  $("officerLoginBtn").onclick = validateOfficerLogin;
  $("logoutBtn").onclick = () => { logout(); };
  renderAllModules();
});
