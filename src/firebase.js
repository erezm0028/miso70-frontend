import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBq8GJ-LjRUCdebdwfVhx9eY31UH6Ee1K0",
  authDomain: "miso70-679bb.firebaseapp.com",
  projectId: "miso70-679bb",
  storageBucket: "miso70-679bb.firebasestorage.app",
  messagingSenderId: "273265478454",
  appId: "1:273265478454:web:4248d4ff48d57375af8197",
  measurementId: "G-X3M7VNSZVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore database
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app; 