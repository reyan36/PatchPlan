// Loaded with `import("@/lib/lazyAuth")` by AuthProvider, so Firebase Auth downloads in parallel
// after the page is interactive instead of blocking every page's first load.
export { auth } from "./firebase-app";
export { onAuthStateChanged, signOut } from "firebase/auth";
