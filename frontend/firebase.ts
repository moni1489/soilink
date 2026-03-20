
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDivBc_CK0LUBuUUQ5D0V_UrjlTQ3NJcmw",
  authDomain: "soilink-c72fc.firebaseapp.com",
  projectId: "soilink-c72fc",
  storageBucket: "soilink-c72fc.firebasestorage.app",
  messagingSenderId: "871514247000",
  appId: "1:871514247000:web:8e537e86eec03de24b5f2d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);