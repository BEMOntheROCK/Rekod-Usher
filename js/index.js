// main.js
// Logik untuk borang Rekod Usher (main.html)

import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  serverTimestamp,
  REKOD_COLLECTION
} from "./firebase-config.js";

const form = document.getElementById("rekodForm");
const jumlahUsherInput = document.getElementById("jumlahUsher");
const jemaatInput = document.getElementById("jemaat");
const rockEssenceInput = document.getElementById("rockEssence");
const totalInput = document.getElementById("total");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");
const sesi1Input = document.getElementById("sesi1");
const sesi2Input = document.getElementById("sesi2");
const qrBtn = document.getElementById("qrBtn");
const qrModal = document.getElementById("qrModal");
const closeQrBtn = document.getElementById("closeQrBtn");
const clashModal = document.getElementById("clashModal");
const clashMessage = document.getElementById("clashMessage");
const closeClashBtn = document.getElementById("closeClashBtn");

closeClashBtn.addEventListener("click", () => {
  clashModal.classList.add("hidden");
});

clashModal.addEventListener("click", (e) => {
  if (e.target === clashModal) {
    clashModal.classList.add("hidden");
  }
});

qrBtn.addEventListener("click", () => {
  qrModal.classList.remove("hidden");
});

closeQrBtn.addEventListener("click", () => {
  qrModal.classList.add("hidden");
});

qrModal.addEventListener("click", (e) => {
  if (e.target === qrModal) {
    qrModal.classList.add("hidden");
  }
});

// Benarkan usher batalkan pilihan sesi (klik sekali lagi untuk nyahtanda)
let sesiSebelumIni = null;
[sesi1Input, sesi2Input].forEach((input) => {
  input.addEventListener("click", () => {
    if (sesiSebelumIni === input.id) {
      input.checked = false;
      sesiSebelumIni = null;
    } else {
      sesiSebelumIni = input.id;
    }
  });
});

// Kira jumlah keseluruhan secara automatik
function kiraTotal() {
  const jumlahUsher = parseInt(jumlahUsherInput.value) || 0;
  const jemaat = parseInt(jemaatInput.value) || 0;
  const rockEssence = parseInt(rockEssenceInput.value) || 0;
  totalInput.value = jumlahUsher + jemaat + rockEssence;
}

jumlahUsherInput.addEventListener("input", kiraTotal);
jemaatInput.addEventListener("input", kiraTotal);
rockEssenceInput.addEventListener("input", kiraTotal);

function papar(mesej, jenis) {
  statusMessage.textContent = mesej;
  statusMessage.className = "status-message " + jenis;
}

function formatSesiTeks(sesi) {
  if (sesi && sesi.sesi1) return "Sesi 1";
  if (sesi && sesi.sesi2) return "Sesi 2";
  return "Tiada Sesi";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  papar("Menghantar rekod...", "info");

  try {
    const tarikhValue = document.getElementById("tarikh").value; // "YYYY-MM-DD"
    const [year, month, day] = tarikhValue.split("-").map(Number);
    const tarikhTimestamp = Timestamp.fromDate(new Date(year, month - 1, day));

    const acaraValue = document.getElementById("acara").value.trim();
    const sesiValue = {
      sesi1: document.getElementById("sesi1").checked,
      sesi2: document.getElementById("sesi2").checked
    }; // "Tiada" leaves both false since sesi is now a mutually exclusive radio choice

    // Semak percanggahan: rekod sedia ada dengan tarikh, acara dan sesi yang sama
    const clashQuery = query(
      collection(db, REKOD_COLLECTION),
      where("tarikh", "==", tarikhTimestamp),
      where("acara", "==", acaraValue),
      where("sesi", "==", sesiValue)
    );
    const clashSnapshot = await getDocs(clashQuery);

    if (!clashSnapshot.empty) {
      const rekodSediaAda = clashSnapshot.docs[0].data();
      const namaPengisi = rekodSediaAda.diisiOleh || "seseorang";
      const tarikhTeks = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
      const sesiTeks = formatSesiTeks(sesiValue);
      clashMessage.innerHTML = `Rekod untuk acara: <span class="clash-highlight">${acaraValue}</span> pada <span class="clash-highlight">${tarikhTeks}</span>, <span class="clash-highlight">${sesiTeks}</span> telah pun dihantar oleh ${namaPengisi}.`;
      clashModal.classList.remove("hidden");
      papar("", "");
      return;
    }

    const dataRekod = {
      diisiOleh: document.getElementById("diisiOleh").value.trim(),
      tarikh: tarikhTimestamp,
      acara: acaraValue,
      sesi: sesiValue,
      jumlahUsher: parseInt(document.getElementById("jumlahUsher").value) || 0,
      jemaat: parseInt(jemaatInput.value) || 0,
      rockEssence: parseInt(rockEssenceInput.value) || 0,
      total: parseInt(totalInput.value) || 0,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, REKOD_COLLECTION), dataRekod);

    papar("Rekod berjaya dihantar. Terima kasih!", "success");
    form.reset();
    document.getElementById("acara").value = "Ibadah Raya";
    totalInput.value = "";
    sesiSebelumIni = null;
  } catch (err) {
    console.error("Ralat menghantar rekod:", err);
    papar("Ralat: Rekod gagal dihantar. Sila cuba lagi.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});