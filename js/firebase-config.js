// firebase-config.js
// Konfigurasi Firebase untuk Rekod Usher
// GANTIKAN nilai di bawah dengan konfigurasi projek Firebase sebenar anda.
// Fail ini disenaraikan dalam .gitignore supaya tidak dimuat naik ke repo awam.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYL2SqkFihbNkDt5nCTHsHq70mc-Cmeb0",
  authDomain: "rekod-usher.firebaseapp.com",
  projectId: "rekod-usher",
  storageBucket: "rekod-usher.firebasestorage.app",
  messagingSenderId: "897488997972",
  appId: "1:897488997972:web:7d2f4ebd8cb7c2604567c1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Nama koleksi Firestore untuk rekod kehadiran
const REKOD_COLLECTION = "rekod";

export {
  db,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
  REKOD_COLLECTION
};