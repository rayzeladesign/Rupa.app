import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWnilXxnVDIVfnhXNQaM4MM5n8X9qV32U",
  authDomain: "subrupa-6eaf1.firebaseapp.com",
  projectId: "subrupa-6eaf1",
  storageBucket: "subrupa-6eaf1.firebasestorage.app",
  messagingSenderId: "385602420691",
  appId: "1:385602420691:web:210ab66c13e225199ff926",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
