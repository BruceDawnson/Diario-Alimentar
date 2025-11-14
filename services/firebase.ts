
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// AVISO: As chaves de API foram fornecidas e inseridas.
// Em um projeto real, considere usar variáveis de ambiente para a máxima segurança.
const firebaseConfig = {
  apiKey: "AIzaSyC0SCzsxNqBsP4FbMlqwTGxpa26fQSssKs",
  authDomain: "dietadiary.firebaseapp.com",
  projectId: "dietadiary",
  storageBucket: "dietadiary.firebasestorage.app",
  messagingSenderId: "810554457821",
  appId: "1:810554457821:web:fa66147d3cf7c69233e534",
  measurementId: "G-M5QM9FNBNQ"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços do Firebase para serem usados em outras partes do aplicativo
export const auth = getAuth(app);
export const db = getFirestore(app);

// Inicializa o Analytics de forma segura, apenas se for suportado pelo ambiente.
isSupported().then(yes => {
  if (yes) {
    getAnalytics(app);
  }
});