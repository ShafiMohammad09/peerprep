import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKlZ3YJmUAky3EWwRvZXButG2H1R8NSv4",
  authDomain: "robo-188e6.firebaseapp.com",
  projectId: "robo-188e6",
  storageBucket: "robo-188e6.appspot.com",
  messagingSenderId: "730701322416",
  appId: "1:730701322416:web:72d48b1b71269626f28375"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
