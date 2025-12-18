// ================= CONFIG =================
const SHEETDB_API = "https://sheetdb.io/api/v1/08x1bxbiwbkmv";

// ================= GLOBALS =================
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
let enabledAfterSchoolDays = ["Wednesday"]; // Wednesday always enabled

const qs = (id) => document.getElementById(id);

// ================= POPUP =================
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
  await fetch(
    `${SHEETDB_API}/name/${encodeURIComponent(name)}/day/${day}/session/${session}`,
    { method: "DELETE" }
  );
}

// ================= AFTER SCHOOL PERSIST =================
async function getAfterSchoolDays() {
  const data = await fetchAll();
  return data
    .filter(r => r.name === "__AFTER__" && r.session === "ENABLED")
    .map(r => r.day);
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

  const exists = (session) =>
    data.some(r => r.name === name && r.day === day && r.session === session);

  if (ep1 && exists("EP1")) return showPopup("Already signed up for EP1.");
  if (ep2 && exists("EP2")) return showPopup("Already signed up for EP2.");
  if (after && exists("After")) return showPopup("Already signed up for After School.");

  // EP1 auto-add EP2 if fewer than 5 tutors
  if (ep1 && !ep2) {
    const ep2Count = data.filter(r => r.day === day && r.session === "EP2").length;
    if (ep2Count < 5) {
      const ok = confirm(
        "There are not enough tutors for EP2. By signing up for EP1 today, " +
        "you will automatically be signed up for EP2. You can remove yourself later.\n\nContinue?"
      );
      if (!ok) return;
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

// ================= REMOVE (FIXED) =================
async function removeFromDays() {
  const name = qs("removeName")?.value.trim();
  if (!name) return showPopup("Enter your name.");

  const selectedDays = Array.from(
    document.querySelectorAll(".removeDayCheck:checked")
  ).map(b => b.value);

  if (!selectedDays.length)
    return showPopup("Select at least one day.");

  if (!confirm("Are you sure you want to remove yourself from the selected days?"))
    return;

  const data = await fetchAll();

  for (const day of selectedDays) {
    const rows = data.filter(r => r.name === name && r.day === day);
    for (const r of rows) {
      await deleteRow(name, day, r.session);
    }
  }

  clearRemoveForm();
  await renderCalendar();
  populateRemovePage();
  showPopup("Removed from selected days.");
}

// ================= CALENDAR =================
async function renderCalendar() {
  const table = qs("calendarTable");
  if (!table) return;

  const data = await fetchAll();
  enabledAfterSchoolDays = await getAfterSchoolDays();

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
  const day = document.querySelector("input[name='day']:checked")?.value;
  const afterLabel = qs("afterSchoolLabel");
  const ep1 = qs("ep1Checkbox");
  const ep2 = qs("ep2Checkbox");

  if (!day) return;

  const showAfter = day === "Wednesday" || enabledAfterSchoolDays.includes(day);
  if (afterLabel) afterLabel.style.display = showAfter ? "" : "none";

  if (day === "Wednesday") {
    ep1.parentElement.style.display = "none";
    ep2.parentElement.style.display = "none";
    ep1.checked = false;
    ep2.checked = false;
  } else {
    ep1.parentElement.style.display = "";
    ep2.parentElement.style.display = "";
    qs("afterCheckbox").checked = false;
  }
}

function clearSignupForm() {
  qs("nameInput").value = "";
  document.querySelectorAll("input[name='day']").forEach(r => r.checked = false);
  ["ep1Checkbox", "ep2Checkbox", "afterCheckbox"].forEach(id => qs(id).checked = false);
}

function clearRemoveForm() {
  qs("removeName").value = "";
  document.querySelectorAll(".removeDayCheck").forEach(c => c.checked = false);
}

// ================= DEBUG MENU (FIXED) =================
document.addEventListener("keydown", (e) => {
  window.debugBuffer = (window.debugBuffer || "") + e.key;
  if (window.debugBuffer.includes("debug123")) {
    qs("debugMenu")?.classList.add("open");
    window.debugBuffer = "";
  }
  if (window.debugBuffer.length > 30) window.debugBuffer = "";
});

function closeDebugMenu() {
  qs("debugMenu")?.classList.remove("open");
}

async function debugEnableAfterSchool() {
  const sel = qs("afterSchoolDaySelect");
  if (!sel) return showPopup("No selector found.");
  const day = sel.value;

  const existing = await getAfterSchoolDays();
  if (existing.includes(day))
    return showPopup("After School already enabled for " + day + ".");

  await addRow({ name: "__AFTER__", day, session: "ENABLED" });

  enabledAfterSchoolDays.push(day);
  updateAfterSchoolCheckbox();
  showPopup("After School enabled for " + day + ".");
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
  populateDaySelectArea();
  populateRemovePage();
  await renderCalendar();

  document.addEventListener("change", (e) => {
    if (e.target.name === "day") updateAfterSchoolCheckbox();
  });
});
