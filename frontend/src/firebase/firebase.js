import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider
} from "firebase/auth";


const firebaseConfig = {

  apiKey: "AIzaSyCmJUjvbQ1drbgrG4I_Q1xDkgiZ3GMnjb4",

  authDomain: "esg-hub-74f40.firebaseapp.com",

  projectId: "esg-hub-74f40",

  storageBucket: "esg-hub-74f40.firebasestorage.app",

  messagingSenderId: "843439390041",

  appId: "1:843439390041:web:51b48add7115d7b5156048",

  measurementId: "G-TP588K5TZS"
};


const app =
  initializeApp(firebaseConfig);

export const auth =
  getAuth(app);

export const provider =
  new GoogleAuthProvider();