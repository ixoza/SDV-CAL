const ttCountEl = document.getElementById("ttCount");
const ttPercentEl = document.getElementById("ttPercent");
const syncStatusEl = document.getElementById("syncStatus");
const monthLabelEl = document.getElementById("monthLabel");
const calendarGridEl = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const today = new Date();
const CURRENT_YEAR = today.getFullYear();
const TOTAL_TRAINING_DAYS = 64;
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let ttDays = new Set();

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateCount() {
  const ttDaysCurrentYear = [...ttDays].filter((iso) => iso.startsWith(`${CURRENT_YEAR}-`)).length;
  const percentage = (ttDaysCurrentYear / TOTAL_TRAINING_DAYS) * 100;

  ttCountEl.textContent = String(ttDaysCurrentYear);
  ttPercentEl.textContent = `${percentage.toFixed(1)}% sur ${TOTAL_TRAINING_DAYS} jours de formation (année en cours)`;
}

function setSyncStatus(text, isError = false) {
  syncStatusEl.textContent = text;
  syncStatusEl.classList.toggle("error", isError);
}

async function readJsonResponse(response, fallbackMessage) {
  if (response.status === 401) {
    throw new Error("Déploiement protégé (401): désactive la protection Vercel pour ce domaine.");
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(fallbackMessage);
    }
    return {};
  }

  if (!response.ok) {
    const details = payload && typeof payload.error === "string" ? payload.error : fallbackMessage;
    throw new Error(details);
  }

  return payload;
}

async function fetchSharedDays() {
  const response = await fetch("/api/tt-days");
  const payload = await readJsonResponse(response, "Impossible de charger les jours TT partages");
  const days = Array.isArray(payload.days) ? payload.days : [];
  ttDays = new Set(days);
}

async function toggleSharedDay(isoDate) {
  const response = await fetch("/api/tt-days/toggle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ date: isoDate })
  });

  const payload = await readJsonResponse(response, "Impossible de synchroniser ce jour");
  const days = Array.isArray(payload.days) ? payload.days : [];
  ttDays = new Set(days);
}

function createDayButton(date, isCurrentMonth) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "day";

  if (!isCurrentMonth) {
    btn.classList.add("muted");
  }

  const iso = toISODate(date);

  if (iso === toISODate(today)) {
    btn.classList.add("today");
  }

  if (ttDays.has(iso)) {
    btn.classList.add("tt");
  }

  btn.textContent = String(date.getDate());
  btn.setAttribute("data-date", iso);
  btn.setAttribute("aria-label", `Jour ${date.toLocaleDateString("fr-FR")}`);

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    setSyncStatus("Synchronisation en cours...");

    try {
      await toggleSharedDay(iso);
      updateCount();
      renderCalendar(currentYear, currentMonth);
      setSyncStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de synchronisation. Reessaie dans un instant.";
      setSyncStatus(message, true);
    } finally {
      btn.disabled = false;
    }
  });

  return btn;
}

function renderCalendar(year, month) {
  calendarGridEl.textContent = "";

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  const mondayBasedStart = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((mondayBasedStart + lastOfMonth.getDate()) / 7) * 7;

  const startDate = new Date(year, month, 1 - mondayBasedStart);

  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const isCurrentMonth = date.getMonth() === month;
    const dayBtn = createDayButton(date, isCurrentMonth);
    calendarGridEl.appendChild(dayBtn);
  }

  monthLabelEl.textContent = new Date(year, month, 1).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric"
  });
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth -= 1;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear -= 1;
  }
  renderCalendar(currentYear, currentMonth);
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth += 1;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear += 1;
  }
  renderCalendar(currentYear, currentMonth);
});

async function init() {
  setSyncStatus("Chargement des donnees partagees...");

  try {
    await fetchSharedDays();
    updateCount();
    renderCalendar(currentYear, currentMonth);
    setSyncStatus("");
  } catch (error) {
    updateCount();
    renderCalendar(currentYear, currentMonth);
    const message = error instanceof Error ? error.message : "Mode degrade: le serveur est inaccessible.";
    setSyncStatus(message, true);
  }
}

init();
