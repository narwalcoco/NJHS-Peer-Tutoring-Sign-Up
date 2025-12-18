// ================= CONFIG =================
const SHEETDB_API = "https://sheetdb.io/api/v1/08x1bxbiwbkmv";

// ================= HELPERS =================
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const sessions = ["EP1", "EP2", "After"];

const qs = (id) => document.getElementById(id);

function showPopup(msg) {
  const box = qs("alertPopup");
  const text = qs("popupMessage");
  if (box && text) {
    text.innerHTML = msg;
    box.style.display = "block";
  } else alert(msg);
}

function closePopup() {
  const box = qs("alertPopup");
  if (box) box.style.display = "none";
}

// ================= API =================
async function fetchAll() {
  const res = await fetch(SHEETDB_API);
  return await res.json();
}

async function addRow(row) {
  await fetch(SHEETDB_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: row })
  });
}

async function deleteRow(name, day, session) {
  await fetch(`${SHEETDB_API}/name/${encodeURIComponent(name)}/day/${day}/session/${session}`, {
    method: "DELETE"
  });
}

// ================= SIGNUP =================
async function handleSignup() {
  const name = qs("nameInput")?.value.trim();
  const day = document.querySelector("input[name='day']:checked")?.value;
  const ep1 = qs("ep1Checkbox")?.checked;
  const ep2 = qs("ep2Checkbox")?.checked;
  const after = qs("afterCheckbox")?.checked;

  if (!name) return showPopup("Please enter your full name.");
  if (!day) return showPopup("Please select a day.");
  if (!ep1 && !ep2 && !after) return showPopup("Please select at least one session.");

  const data = await fetchAll();

  const exists = (session) => data.some(r => r.name === name && r.day === day && r.session === session);

  if (ep1 && exists("EP1")) return showPopup("You are already signed up for EP1 on this day.");
  if (ep2 && exists("EP2")) return showPopup("You are already signed up for EP2 on this day.");
  if (after && exists("After")) return showPopup("You are already signed up for After School.");

  // EP1 auto-add EP2 if fewer than 5 tutors
  if (ep1 && !ep2) {
    const ep2Count = data.filter(r => r.day === day && r.session === "EP2").length;
    if (ep2Count < 5) {
      const acceptEP2 = confirm(
        "There are not enough tutors for EP2. By signing up for EP1 today, " +
        "you will automatically be signed up for EP2. You can later remove yourself from EP2 if enough people sign up.\n\n" +
        "Do you want to proceed with EP2?"
      );
      if (!acceptEP2) return;
      await addRow({ name, day, session: "EP2" });
    }
  }

  if (ep1) await addRow({ name, day, session: "EP1" });
  if (ep2) await addRow({ name, day, session: "EP2" });
  if (after) await addRow({ name, day, session: "After" });

  clearSignupForm();
  await renderCalendar();
  populateRemovePage();
  showPopup("Signup complete!");
}

// ================= REMOVE =================
async function removeFromDays() {
  const name = qs("removeName")?.value.trim();
  if (!name) return showPopup("Enter your name.");

  const checkedDays = Array.from(document.querySelectorAll(".removeDayCheck:checked")).map(b => b.value);
  if (!checkedDays.length) return showPopup("Select at least one day to remove.");

  if (!confirm("Are you sure you want to remove yourself from the selected days?")) return;

  const data = await fetchAll();

  for (const day of checkedDays) {
    data
      .filter(r => r.name === name && r.day === day)
      .forEach(r => deleteRow(name, day, r.session));
  }

  clearRemoveForm();
  await renderCalendar();
  populateRemovePage();
  showPopup("Removed from all selected days.");
}

// ================= CALENDAR =================
async function renderCalendar() {
  const table = qs("calendarTable");
  if (!table) return;

  const data = await fetchAll();
  const tbody = table.tBodies[0];

  tbody.innerHTML = `
    <tr><td>EP1</td></tr>
    <tr><td>EP2</td></tr>
    <tr><td>After School</td></tr>
  `;

  days.forEach(day => {
    tbody.rows[0].insertCell().innerHTML =
      data.filter(r => r.day === day && r.session === "EP1").map(r => r.name).join("<br>");
    tbody.rows[1].insertCell().innerHTML =
      data.filter(r => r.day === day && r.session === "EP2").map(r => r.name).join("<br>");
    tbody.rows[2].insertCell().innerHTML =
      data.filter(r => r.day === day && r.session === "After").map(r => r.name).join("<br>");
  });

  // update signup forms After School visibility
  updateAfterSchoolCheckbox();
}

// ================= REMOVE PAGE =================
function populateRemovePage() {
  const box = qs("removeDayList");
  if (!box) return;
  box.innerHTML = days.map(d =>
    `<label><input type="checkbox" class="removeDayCheck" value="${d}"> ${d}</label><br>`
  ).join("");
}

// ================= SIGNUP FORM =================
function populateDaySelectArea() {
  const area = qs("daySelectArea");
  if (!area) return;
  area.innerHTML = days.map(d =>
    `<label><input type="radio" name="day" value="${d}"> ${d}</label>`
  ).join(" ");

  updateAfterSchoolCheckbox();
}

function updateAfterSchoolCheckbox() {
  const selectedDay = document.querySelector("input[name='day']:checked")?.value;
  const afterLabel = qs("afterSchoolLabel");
  const ep1El = qs("ep1Checkbox");
  const ep2El = qs("ep2Checkbox");

  if (!selectedDay) return;

  // Show After School only if session enabled or Wednesday
  const showAfter = selectedDay === "Wednesday" || (tutorDataAfterSchool[selectedDay] ?? false);
  if (afterLabel) afterLabel.style.display = showAfter ? "" : "none";

  // Hide EP1/EP2 for After School-only day (Wednesday)
  if (selectedDay === "Wednesday") {
    if (ep1El) ep1El.parentElement.style.display = "none";
    if (ep2El) ep2El.parentElement.style.display = "none";
    if (ep1El) ep1El.checked = false;
    if (ep2El) ep2El.checked = false;
  } else {
    if (ep1El) ep1El.parentElement.style.display = "";
    if (ep2El) ep2El.parentElement.style.display = "";
    if (qs("afterCheckbox")) qs("afterCheckbox").checked = false;
  }
}

function clearSignupForm() {
  qs("nameInput").value = "";
  document.querySelectorAll("input[name='day']").forEach(r => r.checked = false);
  ["ep1Checkbox", "ep2Checkbox", "afterCheckbox"].forEach(id => {
    if (qs(id)) qs(id).checked = false;
  });
  updateAfterSchoolCheckbox();
}

function clearRemoveForm() {
  qs("removeName").value = "";
  document.querySelectorAll(".removeDayCheck").forEach(r => r.checked = false);
}

// ================= DEBUG MENU =================
const tutorDataAfterSchool = { Wednesday: true }; // track After School sessions

document.addEventListener("keydown", e => {
  window.debugBuffer = (window.debugBuffer || "") + e.key;
  if (window.debugBuffer.includes("debug123")) {
    const dbg = qs("debugMenu");
    if (dbg) dbg.classList.add("open");
    window.debugBuffer = "";
  }
  if (window.debugBuffer.length > 30) window.debugBuffer = "";
});

function closeDebugMenu() {
  const dbg = qs("debugMenu");
  if (dbg) dbg.classList.remove("open");
}

function debugEnableAfterSchool() {
  const sel = qs("afterSchoolDaySelect");
  if (!sel) return showPopup("No day selector found.");
  const day = sel.value;
  if (!day) return showPopup("Please pick a day.");

  tutorDataAfterSchool[day] = true;
  showPopup("After School session enabled for " + day + ".");
  updateAfterSchoolCheckbox();
}

function clearAllData() {
  if (!confirm("Are you sure? This will delete all data.")) return;
  // delete all rows from SheetDB
  fetchAll().then(data => {
    data.forEach(r => deleteRow(r.name, r.day, r.session));
  });
  populateRemovePage();
  populateDaySelectArea();
  clearSignupForm();
  renderCalendar();
  showPopup("All data cleared.");
}

// populate debug menu options
function populateDebugMenuDays() {
  const sel = qs("afterSchoolDaySelect");
  if (!sel) return;
  sel.innerHTML = days.map(d => `<option value="${d}">${d}</option>`).join("");
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  populateDaySelectArea();
  populateRemovePage();
  renderCalendar();
  populateDebugMenuDays();

  // listen for day change
  document.addEventListener("change", e => {
    if (e.target && e.target.name === "day") updateAfterSchoolCheckbox();
  });
});
