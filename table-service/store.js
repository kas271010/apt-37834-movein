// ─────────────────────────────────────────────────────────────────────────────
//  store.js — the live data layer shared by the guest and staff pages.
//
//  Exposes one small API regardless of backend:
//
//    store.addRequest(data)            -> Promise<id>     (guest sends a request)
//    store.updateRequest(id, patch)    -> Promise<void>   (staff acts on it)
//    store.subscribeOpen(cb)           -> unsubscribe()    (staff dashboard feed)
//    store.subscribeOne(id, cb)        -> unsubscribe()    (guest watches status)
//    store.mode                        -> "firebase" | "local"
//
//  Two implementations sit behind that API:
//    • FirebaseStore — Cloud Firestore real-time listeners (true cross-device).
//    • LocalStore    — localStorage + BroadcastChannel (live across tabs on one
//                      device) so the app works before Firebase is configured.
//
//  A request document looks like:
//    { id, venue, table, seat, section, msg, voice,
//      status: "open"|"otw"|"done", staffReply, createdAt, updatedAt }
// ─────────────────────────────────────────────────────────────────────────────

import { firebaseConfig, VENUE_ID, isFirebaseConfigured } from "./config.js";

// ── Firebase-backed store ────────────────────────────────────────────────────
async function makeFirebaseStore() {
  const { initializeApp } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"
  );
  const {
    getFirestore, collection, doc, addDoc, updateDoc, onSnapshot,
    query, orderBy, serverTimestamp,
  } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
  );

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const col = collection(db, "venues", VENUE_ID, "requests");

  // serverTimestamp() is null on the local echo of a just-written doc, so we
  // normalise to a millisecond number (falling back to "now") for the UI.
  const ms = (ts) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : Date.now());
  const shape = (d) => {
    const v = d.data();
    return {
      id: d.id, venue: VENUE_ID,
      table: v.table, seat: v.seat, section: v.section || "",
      msg: v.msg, voice: !!v.voice,
      status: v.status || "open", staffReply: v.staffReply || "",
      createdAt: ms(v.createdAt), updatedAt: ms(v.updatedAt),
    };
  };

  return {
    mode: "firebase",
    async addRequest(data) {
      const ref = await addDoc(col, {
        ...data, status: "open", staffReply: "",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    async updateRequest(id, patch) {
      await updateDoc(doc(col, id), { ...patch, updatedAt: serverTimestamp() });
    },
    subscribeOpen(cb) {
      const q = query(col, orderBy("createdAt", "desc"));
      return onSnapshot(q, (snap) => {
        cb(snap.docs.map(shape).filter((r) => r.status !== "done"));
      });
    },
    subscribeOne(id, cb) {
      return onSnapshot(doc(col, id), (d) => cb(d.exists() ? shape(d) : null));
    },
  };
}

// ── Local fallback store (live across tabs on one device) ────────────────────
function makeLocalStore() {
  const KEY = `tend:${VENUE_ID}:requests`;
  const chan = "BroadcastChannel" in window
    ? new BroadcastChannel(`tend:${VENUE_ID}`)
    : null;

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };
  const write = (rows) => {
    localStorage.setItem(KEY, JSON.stringify(rows));
    chan && chan.postMessage("changed"); // wake other tabs instantly
  };

  const openSubs = new Set();   // staff feeds
  const oneSubs = new Map();    // id -> Set(cb)

  const emit = () => {
    const rows = read();
    const open = rows
      .filter((r) => r.status !== "done")
      .sort((a, b) => b.createdAt - a.createdAt);
    openSubs.forEach((cb) => cb(open));
    oneSubs.forEach((cbs, id) => {
      const r = rows.find((x) => x.id === id) || null;
      cbs.forEach((cb) => cb(r));
    });
  };

  // React to changes coming from other tabs/windows.
  chan && (chan.onmessage = emit);
  window.addEventListener("storage", (e) => { if (e.key === KEY) emit(); });

  const uid = () =>
    "r-" + Date.now().toString(36) + "-" + Math.floor(performance.now() * 1000).toString(36);

  return {
    mode: "local",
    async addRequest(data) {
      const id = uid();
      const now = Date.now();
      const rows = read();
      rows.push({
        id, venue: VENUE_ID, ...data,
        status: "open", staffReply: "", createdAt: now, updatedAt: now,
      });
      write(rows);
      emit();
      return id;
    },
    async updateRequest(id, patch) {
      const rows = read();
      const r = rows.find((x) => x.id === id);
      if (r) { Object.assign(r, patch, { updatedAt: Date.now() }); write(rows); emit(); }
    },
    subscribeOpen(cb) {
      openSubs.add(cb);
      cb(read().filter((r) => r.status !== "done").sort((a, b) => b.createdAt - a.createdAt));
      return () => openSubs.delete(cb);
    },
    subscribeOne(id, cb) {
      if (!oneSubs.has(id)) oneSubs.set(id, new Set());
      oneSubs.get(id).add(cb);
      cb(read().find((x) => x.id === id) || null);
      return () => { const s = oneSubs.get(id); s && s.delete(cb); };
    },
  };
}

// ── Pick a backend (fall back to local if Firebase fails to load) ────────────
export const storeReady = (async () => {
  if (isFirebaseConfigured) {
    try { return await makeFirebaseStore(); }
    catch (e) { console.warn("[tend] Firebase init failed, using local mode:", e); }
  }
  return makeLocalStore();
})();
