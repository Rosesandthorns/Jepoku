// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1zFQdXY-jTB30pwXPefQBb2wYbNY9LVM",
  authDomain: "shiningshowcase-5e120.firebaseapp.com",
  projectId: "shiningshowcase-5e120",
  storageBucket: "shiningshowcase-5e120.firebasestorage.app",
  messagingSenderId: "443830489093",
  appId: "1:443830489093:web:ca0c17e964862fadd18c6c",
  measurementId: "G-VVP08J86HS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics and get a reference to the service
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app, analytics };
