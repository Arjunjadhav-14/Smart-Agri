import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBC_7gPEXwN9VKb3nIa3NQMCaxOk4tr9ys",
  authDomain: "agrismart-ai-fbb59.firebaseapp.com",
  projectId: "agrismart-ai-fbb59",
  storageBucket: "agrismart-ai-fbb59.firebasestorage.app",
  messagingSenderId: "445067030010",
  appId: "1:445067030010:web:4b85a0b063f5f09b678843"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
