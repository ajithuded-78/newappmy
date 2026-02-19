import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhW63D03tg2b09gd4Jnb_7VJPMulSrVc8",
  authDomain: "rotti-7a088.firebaseapp.com",
  projectId: "rotti-7a088",
  storageBucket: "rotti-7a088.firebasestorage.app",
  messagingSenderId: "208933626297",
  appId: "1:208933626297:web:c099ba3e404ebe4d509668"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };