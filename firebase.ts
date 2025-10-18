import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBKlZ3YJmUAky3EWwRvZXButG2H1R8NSv4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "robo-188e6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "robo-188e6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "robo-188e6.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "730701322416",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:730701322416:web:72d48b1b71269626f28375"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
