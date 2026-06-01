import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNsKViIrrTnJJisRx5Ow3LYeaQmm0GFHM",
  authDomain: "pinlogue-92255.firebaseapp.com",
  projectId: "pinlogue-92255",
  storageBucket: "pinlogue-92255.firebasestorage.app",
  messagingSenderId: "612346608460",
  appId: "1:612346608460:web:4cdcf776923ba2ef96ade9",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, db };