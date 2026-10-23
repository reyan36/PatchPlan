// Loaded with `import("@/lib/lazyFirestore")` by code in the root layout (workspace context,
// navbar), so Firestore downloads only once someone is signed in, never for public visitors.
export { db } from "./firebase";
export { doc, collection, query, where, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
