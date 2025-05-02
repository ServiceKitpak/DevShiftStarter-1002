import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD7wgseMuccH0TiszqsyywwLrD6pmLRQJc",
  authDomain: "cc-shiftmanager.firebaseapp.com",
  projectId: "cc-shiftmanager",
  storageBucket: "cc-shiftmanager.firebasestorage.app",
  messagingSenderId: "882693650153",
  appId: "1:882693650153:web:8b5d04cf7a2f63b4032278",
  measurementId: "G-03RE6ZS700"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };