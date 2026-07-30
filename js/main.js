// main.js
// Logik untuk borang Rekod Usher (main.html)

import {
  db,
  collection,
  addDoc,
  Timestamp,
  serverTimestamp,
  REKOD_COLLECTION
} from "./firebase-config.js";

const form = document.getElementById("rekodForm");
const jemaatInput = document.getElementById("jemaat");
const rockEssenceInput = document.getElementById("rockEssence");
const totalInput = document.getElementById("total");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

// Kira jumlah keseluruhan secara automatik
function kiraTotal() {
  const jemaat = parseInt(jemaatInput.value) || 0;
  const rockEssence = parseInt(rockEssenceInput.value) || 0;
  totalInput.value = jemaat + rockEssence;
}

jemaatInput.addEventListener("input", kiraTotal);
rockEssenceInput.addEventListener("input", kiraTotal);

function papar(mesej, jenis) {
  statusMessage.textContent = mesej;
  statusMessage.className = "status-message " + jenis;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  papar("Menghantar rekod...", "info");

  try {
    const tarikhValue = document.getElementById("tarikh").value; // "YYYY-MM-DD"
    const [year, month, day] = tarikhValue.split("-").map(Number);
    const tarikhTimestamp = Timestamp.fromDate(new Date(year, month - 1, day));

    const dataRekod = {
      tarikh: tarikhTimestamp,
      acara: document.getElementById("acara").value.trim(),
      sesi: {
        sesi1: document.getElementById("sesi1").checked,
        sesi2: document.getElementById("sesi2").checked
      },
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
  } catch (err) {
    console.error("Ralat menghantar rekod:", err);
    papar("Ralat: Rekod gagal dihantar. Sila cuba lagi.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});