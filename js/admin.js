// admin.js
// Logik untuk panel Admin - Rekod Usher (admin.html)

import {
  db,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  REKOD_COLLECTION
} from "./firebase-config.js";

const tableBody = document.getElementById("rekodTableBody");
const adminStatusMessage = document.getElementById("adminStatusMessage");

const filterAcaraInput = document.getElementById("filterAcara");
const filterMulaInput = document.getElementById("filterMula");
const filterHinggaInput = document.getElementById("filterHingga");
const sortOrderSelect = document.getElementById("sortOrder");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const resetFilterBtn = document.getElementById("resetFilterBtn");

const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportXlsxBtn = document.getElementById("exportXlsxBtn");

const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editJemaatInput = document.getElementById("editJemaat");
const editRockEssenceInput = document.getElementById("editRockEssence");
const editTotalInput = document.getElementById("editTotal");
const editSesi1Input = document.getElementById("editSesi1");
const editSesi2Input = document.getElementById("editSesi2");

let semuaRekod = []; // Cache semua rekod dari Firestore
let rekodDipapar = []; // Rekod selepas ditapis/disusun (untuk eksport)

// Benarkan admin batalkan pilihan sesi (klik sekali lagi untuk nyahtanda)
let editSesiSebelumIni = null;
[editSesi1Input, editSesi2Input].forEach((input) => {
  input.addEventListener("click", () => {
    if (editSesiSebelumIni === input.id) {
      input.checked = false;
      editSesiSebelumIni = null;
    } else {
      editSesiSebelumIni = input.id;
    }
  });
});

function papar(mesej, jenis) {
  adminStatusMessage.textContent = mesej;
  adminStatusMessage.className = "status-message " + jenis;
}

function formatTarikh(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatSesi(sesi) {
  if (!sesi) return "-";
  const bits = [];
  if (sesi.sesi1) bits.push("Sesi 1");
  if (sesi.sesi2) bits.push("Sesi 2");
  return bits.length ? bits.join(" & ") : "-";
}

// Muatkan semua rekod dari Firestore
async function muatRekod() {
  papar("Memuatkan rekod...", "info");
  try {
    const q = query(collection(db, REKOD_COLLECTION), orderBy("tarikh", "desc"));
    const snapshot = await getDocs(q);
    semuaRekod = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    papar("", "info");
    terapkanTapisan();
  } catch (err) {
    console.error("Ralat memuatkan rekod:", err);
    papar("Ralat: Gagal memuatkan rekod.", "error");
  }
}

// Tapis dan susun rekod mengikut kriteria semasa
function terapkanTapisan() {
  const acaraFilter = filterAcaraInput.value.trim().toLowerCase();
  const mulaFilter = filterMulaInput.value ? new Date(filterMulaInput.value) : null;
  const hinggaFilter = filterHinggaInput.value ? new Date(filterHinggaInput.value) : null;
  const susunan = sortOrderSelect.value;

  rekodDipapar = semuaRekod.filter(r => {
    if (acaraFilter && !(r.acara || "").toLowerCase().includes(acaraFilter)) {
      return false;
    }
    if (r.tarikh) {
      const tarikhRekod = r.tarikh.toDate();
      if (mulaFilter && tarikhRekod < mulaFilter) return false;
      if (hinggaFilter) {
        const hinggaEnd = new Date(hinggaFilter);
        hinggaEnd.setHours(23, 59, 59, 999);
        if (tarikhRekod > hinggaEnd) return false;
      }
    }
    return true;
  });

  rekodDipapar.sort((a, b) => {
    const ta = a.tarikh ? a.tarikh.toMillis() : 0;
    const tb = b.tarikh ? b.tarikh.toMillis() : 0;
    return susunan === "asc" ? ta - tb : tb - ta;
  });

  paparJadual();
}

// Papar rekod dalam jadual HTML
function paparJadual() {
  tableBody.innerHTML = "";

  if (rekodDipapar.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8" style="text-align:center;">Tiada rekod dijumpai.</td>`;
    tableBody.appendChild(tr);
    return;
  }

  rekodDipapar.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTarikh(r.tarikh)}</td>
      <td>${r.acara || ""}</td>
      <td>${formatSesi(r.sesi)}</td>
      <td>${r.jumlahUsher ?? ""}</td>
      <td>${r.jemaat ?? ""}</td>
      <td>${r.rockEssence ?? ""}</td>
      <td>${r.total ?? ""}</td>
      <td>
        <button class="editBtn" data-id="${r.id}">Edit</button>
        <button class="deleteBtn" data-id="${r.id}">Padam</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  document.querySelectorAll(".editBtn").forEach(btn => {
    btn.addEventListener("click", () => bukaEditModal(btn.dataset.id));
  });
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", () => padamRekod(btn.dataset.id));
  });
}

// --- Edit ---
function bukaEditModal(id) {
  const rekod = semuaRekod.find(r => r.id === id);
  if (!rekod) return;

  document.getElementById("editId").value = rekod.id;

  const d = rekod.tarikh.toDate();
  const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  document.getElementById("editTarikh").value = isoDate;

  document.getElementById("editAcara").value = rekod.acara || "";
  const isSesi1 = !!(rekod.sesi && rekod.sesi.sesi1);
  const isSesi2 = !!(rekod.sesi && rekod.sesi.sesi2);
  editSesi1Input.checked = isSesi1;
  editSesi2Input.checked = isSesi2;
  editSesiSebelumIni = isSesi1 ? "editSesi1" : (isSesi2 ? "editSesi2" : null);
  document.getElementById("editJumlahUsher").value = rekod.jumlahUsher ?? 0;
  editJemaatInput.value = rekod.jemaat ?? 0;
  editRockEssenceInput.value = rekod.rockEssence ?? 0;
  editTotalInput.value = rekod.total ?? 0;

  editModal.classList.remove("hidden");
}

function kiraEditTotal() {
  const jemaat = parseInt(editJemaatInput.value) || 0;
  const rockEssence = parseInt(editRockEssenceInput.value) || 0;
  editTotalInput.value = jemaat + rockEssence;
}
editJemaatInput.addEventListener("input", kiraEditTotal);
editRockEssenceInput.addEventListener("input", kiraEditTotal);

cancelEditBtn.addEventListener("click", () => {
  editModal.classList.add("hidden");
});

editForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("editId").value;

  try {
    const tarikhValue = document.getElementById("editTarikh").value;
    const [year, month, day] = tarikhValue.split("-").map(Number);
    const tarikhTimestamp = Timestamp.fromDate(new Date(year, month - 1, day));

    const dataKemaskini = {
      tarikh: tarikhTimestamp,
      acara: document.getElementById("editAcara").value.trim(),
      sesi: {
        sesi1: document.getElementById("editSesi1").checked,
        sesi2: document.getElementById("editSesi2").checked
      },
      jumlahUsher: parseInt(document.getElementById("editJumlahUsher").value) || 0,
      jemaat: parseInt(editJemaatInput.value) || 0,
      rockEssence: parseInt(editRockEssenceInput.value) || 0,
      total: parseInt(editTotalInput.value) || 0
    };

    await updateDoc(doc(db, REKOD_COLLECTION, id), dataKemaskini);
    editModal.classList.add("hidden");
    papar("Rekod berjaya dikemaskini.", "success");
    muatRekod();
  } catch (err) {
    console.error("Ralat mengemaskini rekod:", err);
    papar("Ralat: Gagal mengemaskini rekod.", "error");
  }
});

// --- Padam ---
async function padamRekod(id) {
  const sahkan = confirm("Adakah anda pasti mahu memadam rekod ini?");
  if (!sahkan) return;

  try {
    await deleteDoc(doc(db, REKOD_COLLECTION, id));
    papar("Rekod berjaya dipadam.", "success");
    muatRekod();
  } catch (err) {
    console.error("Ralat memadam rekod:", err);
    papar("Ralat: Gagal memadam rekod.", "error");
  }
}

// --- Filter events ---
applyFilterBtn.addEventListener("click", terapkanTapisan);
resetFilterBtn.addEventListener("click", () => {
  filterAcaraInput.value = "";
  filterMulaInput.value = "";
  filterHinggaInput.value = "";
  sortOrderSelect.value = "desc";
  terapkanTapisan();
});

// --- Eksport PDF ---
exportPdfBtn.addEventListener("click", () => {
  if (rekodDipapar.length === 0) {
    papar("Tiada rekod untuk dieksport.", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();

  docPdf.setFontSize(16);
  docPdf.text("BEM On The ROCK", 14, 15);
  docPdf.setFontSize(11);
  docPdf.text("Rekod Usher", 14, 22);

  const kolum = ["Tarikh", "Acara", "Sesi", "Jumlah Usher", "Jemaat", "Rock Essence", "Total"];
  const baris = rekodDipapar.map(r => [
    formatTarikh(r.tarikh),
    r.acara || "",
    formatSesi(r.sesi),
    r.jumlahUsher ?? "",
    r.jemaat ?? "",
    r.rockEssence ?? "",
    r.total ?? ""
  ]);

  docPdf.autoTable({
    head: [kolum],
    body: baris,
    startY: 28
  });

  docPdf.save("rekod-usher.pdf");
});

// --- Eksport XLSX ---
exportXlsxBtn.addEventListener("click", () => {
  if (rekodDipapar.length === 0) {
    papar("Tiada rekod untuk dieksport.", "error");
    return;
  }

  const data = rekodDipapar.map(r => ({
    Tarikh: formatTarikh(r.tarikh),
    Acara: r.acara || "",
    Sesi: formatSesi(r.sesi),
    "Jumlah Usher": r.jumlahUsher ?? "",
    Jemaat: r.jemaat ?? "",
    "Rock Essence": r.rockEssence ?? "",
    Total: r.total ?? ""
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekod Usher");
  XLSX.writeFile(wb, "rekod-usher.xlsx");
});

// --- Mula ---
muatRekod();