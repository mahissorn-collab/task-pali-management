import { firebaseConfig, workspaceId } from "./firebase-config.js";

let firebaseApp = null;
let auth = null;
let db = null;
let firebaseReady = false;

function hasFirebaseConfig() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

export function isFirebaseEnabled() {
  return firebaseReady;
}

export async function initFirebase() {
  if (!hasFirebaseConfig()) return false;
  if (firebaseReady) return true;

  const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
  ]);

  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  firebaseReady = true;
  return true;
}

async function firestoreApi() {
  await initFirebase();
  return import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
}

export async function signInWithEmail(email, password) {
  await initFirebase();
  const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  if (!firebaseReady) return;
  const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
  await signOut(auth);
}

export async function getCurrentUser() {
  await initFirebase();
  return auth?.currentUser || null;
}

export async function loadRemoteState() {
  if (!firebaseReady) return null;
  const { doc, getDoc } = await firestoreApi();
  const snapshot = await getDoc(doc(db, "workspaces", workspaceId));
  return snapshot.exists() ? snapshot.data()?.state || null : null;
}

export async function saveRemoteState(state) {
  if (!firebaseReady || !auth?.currentUser) return;
  const { doc, serverTimestamp, setDoc } = await firestoreApi();
  await setDoc(doc(db, "workspaces", workspaceId), {
    state,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser.email
  }, { merge: true });
}
