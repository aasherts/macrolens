import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDta58Nwp1uYUnpA41ZhRm4aCFXU1UEzC0",
  authDomain: "macrolens-aa56e.firebaseapp.com",
  projectId: "macrolens-aa56e",
  storageBucket: "macrolens-aa56e.firebasestorage.app",
  messagingSenderId: "305266781949",
  appId: "1:305266781949:web:53eaa453e5a4622e8d1894",
  measurementId: "G-73SF4LJ3SD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signOutUser = async () => {
  await signOut(auth);
};