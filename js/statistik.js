// statistik.js
// Logik untuk graf Statistik - Ibadah Raya (statistik.html)

import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  REKOD_COLLECTION
} from "./firebase-config.js";

const statistikStatusMessage = document.getElementById("statistikStatusMessage");
const statistikJenisSelect = document.getElementById("statistikJenis");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportXlsxBtn = document.getElementById("exportXlsxBtn");
const chartCanvas = document.getElementById("statistikChart");

const ACARA_SASARAN = "Ibadah Raya";

const LABEL_JENIS = {
  total: "Jumlah Keseluruhan",
  jemaat: "Jemaat",
  jumlahUsher: "Jumlah Usher",
  rockEssence: "Rock Essence"
};

let rekodIbadahRaya = []; // Rekod Ibadah Raya sahaja, disusun ikut tarikh
let statistikChart = null;

function papar(mesej, jenis) {
  statistikStatusMessage.textContent = mesej;
  statistikStatusMessage.className = "status-message " + jenis;
}

function formatTarikh(timestamp) {
  if (!timestamp) return "";
  const d = timestamp.toDate();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function nilaiMengikutJenis(rekod, jenis) {
  if (jenis === "total") return rekod.total ?? 0;
  if (jenis === "jemaat") return rekod.jemaat ?? 0;
  if (jenis === "jumlahUsher") return rekod.jumlahUsher ?? 0;
  if (jenis === "rockEssence") return rekod.rockEssence ?? 0;
  return 0;
}

// Muatkan rekod "Ibadah Raya" sahaja dari Firestore
async function muatRekod() {
  papar("Memuatkan statistik...", "info");
  try {
    const q = query(collection(db, REKOD_COLLECTION), orderBy("tarikh", "asc"));
    const snapshot = await getDocs(q);
    rekodIbadahRaya = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(r => (r.acara || "").trim() === ACARA_SASARAN);

    papar("", "info");
    lukisGraf();
  } catch (err) {
    console.error("Ralat memuatkan statistik:", err);
    papar("Ralat: Gagal memuatkan statistik.", "error");
  }
}

// Lukis/kemaskini graf mengikut jenis yang dipilih
function lukisGraf() {
  const jenis = statistikJenisSelect.value;
  const labelJenis = LABEL_JENIS[jenis];

  // Kumpulkan tarikh unik sebagai paksi-x
  const tarikhUnik = [];
  const tarikhKunciSet = new Set();
  rekodIbadahRaya.forEach(r => {
    if (!r.tarikh) return;
    const kunci = formatTarikh(r.tarikh);
    if (!tarikhKunciSet.has(kunci)) {
      tarikhKunciSet.add(kunci);
      tarikhUnik.push(kunci);
    }
  });

  const dataSesi1 = tarikhUnik.map(() => null);
  const dataSesi2 = tarikhUnik.map(() => null);

  rekodIbadahRaya.forEach(r => {
    if (!r.tarikh) return;
    const indeks = tarikhUnik.indexOf(formatTarikh(r.tarikh));
    if (indeks === -1) return;

    const nilai = nilaiMengikutJenis(r, jenis);
    if (r.sesi && r.sesi.sesi1) {
      dataSesi1[indeks] = nilai;
    } else if (r.sesi && r.sesi.sesi2) {
      dataSesi2[indeks] = nilai;
    }
  });

  if (statistikChart) {
    statistikChart.destroy();
  }

  statistikChart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: tarikhUnik,
      datasets: [
        {
          label: `Sesi 1 - ${labelJenis}`,
          data: dataSesi1,
          borderColor: "#EAA221",
          backgroundColor: "#EAA221",
          spanGaps: true,
          tension: 0.2
        },
        {
          label: `Sesi 2 - ${labelJenis}`,
          data: dataSesi2,
          borderColor: "#b02a2a",
          backgroundColor: "#b02a2a",
          spanGaps: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Ibadah Raya - ${labelJenis}`
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Tarikh" }
        },
        y: {
          title: { display: true, text: labelJenis },
          beginAtZero: true
        }
      }
    }
  });
}

statistikJenisSelect.addEventListener("change", lukisGraf);

// --- Eksport PDF ---
exportPdfBtn.addEventListener("click", () => {
  if (rekodIbadahRaya.length === 0) {
    papar("Tiada rekod untuk dieksport.", "error");
    return;
  }

  const jenis = statistikJenisSelect.value;
  const labelJenis = LABEL_JENIS[jenis];

  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();

  docPdf.setFontSize(16);
  docPdf.text("BEM On The ROCK", 14, 15);
  docPdf.setFontSize(11);
  docPdf.text(`Statistik - Ibadah Raya (${labelJenis})`, 14, 22);

  const kolum = ["Tarikh", "Sesi", labelJenis];
  const baris = rekodIbadahRaya.map(r => [
    formatTarikh(r.tarikh),
    r.sesi && r.sesi.sesi1 ? "Sesi 1" : (r.sesi && r.sesi.sesi2 ? "Sesi 2" : "-"),
    nilaiMengikutJenis(r, jenis)
  ]);

  docPdf.autoTable({
    head: [kolum],
    body: baris,
    startY: 28
  });

  docPdf.save("statistik-ibadah-raya.pdf");
});

// --- Eksport XLSX ---
exportXlsxBtn.addEventListener("click", () => {
  if (rekodIbadahRaya.length === 0) {
    papar("Tiada rekod untuk dieksport.", "error");
    return;
  }

  const jenis = statistikJenisSelect.value;
  const labelJenis = LABEL_JENIS[jenis];

  const data = rekodIbadahRaya.map(r => ({
    Tarikh: formatTarikh(r.tarikh),
    Sesi: r.sesi && r.sesi.sesi1 ? "Sesi 1" : (r.sesi && r.sesi.sesi2 ? "Sesi 2" : "-"),
    [labelJenis]: nilaiMengikutJenis(r, jenis)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Statistik Ibadah Raya");
  XLSX.writeFile(wb, "statistik-ibadah-raya.xlsx");
});

// --- Mula ---
muatRekod();