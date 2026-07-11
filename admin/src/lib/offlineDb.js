// Minimal IndexedDB wrapper for the admin app's offline POS cache. Vanilla
// IndexedDB is used instead of a wrapper library since only a handful of
// small operations are needed (bulk upsert/delete, get-all, key/value meta).
//
// Stores:
//   products            - keyPath "_id", the locally-held product snapshot
//   pendingWalkInOrders  - keyPath "localId", offline-submitted checkouts
//                          awaiting sync: { localId, payload, createdAt,
//                          status: "pending" | "failed", failReason? }
//   meta                 - keyPath "key", small key/value store (e.g.
//                          lastSyncedAt, bootstrapped)

const DB_NAME = "dennan-pos";
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("pendingWalkInOrders")) {
        db.createObjectStore("pendingWalkInOrders", { keyPath: "localId" });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCachedProducts() {
  const store = await tx("products", "readonly");
  return requestToPromise(store.getAll());
}

export async function getMeta(key) {
  const store = await tx("meta", "readonly");
  const row = await requestToPromise(store.get(key));
  return row ? row.value : undefined;
}

export async function setMeta(key, value) {
  const store = await tx("meta", "readwrite");
  store.put({ key, value });
}

// Writes one page of a full-catalog download. Does not touch the
// bootstrapped/lastSyncedAt meta flags - the caller loops this across every
// page of a paginated bootstrap, then calls markBootstrapped() once at the
// very end, so a page that fails partway through doesn't leave the device
// falsely marked as fully bootstrapped.
export async function putProductsBatch(products) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("products", "readwrite");
    const productStore = transaction.objectStore("products");
    for (const product of products) {
      productStore.put(product);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Marks the device as fully bootstrapped - call only after every page of a
// full-catalog download has been written via putProductsBatch.
export async function markBootstrapped() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("meta", "readwrite");
    const metaStore = transaction.objectStore("meta");
    metaStore.put({ key: "bootstrapped", value: true });
    metaStore.put({ key: "lastSyncedAt", value: Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Applies one page of an incremental delta sync: upserts changed products
// (keep: true) and evicts any that are no longer active/kept (keep: false).
// Does not touch lastSyncedAt - the caller loops this across every page of
// a paginated delta, then calls markSynced() once at the very end, so a
// page that fails partway through doesn't advance the sync cursor past
// rows that were never actually applied.
export async function applyProductDeltaBatch(changedProducts) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction("products", "readwrite");
    const productStore = transaction.objectStore("products");
    for (const product of changedProducts) {
      const { keep, ...rest } = product;
      if (keep) {
        productStore.put(rest);
      } else {
        productStore.delete(rest._id);
      }
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Advances the delta-sync cursor - call only after every page of a delta
// sync pass has been applied via applyProductDeltaBatch.
export async function markSynced(timestamp) {
  const store = await tx("meta", "readwrite");
  store.put({ key: "lastSyncedAt", value: timestamp });
}

export async function listPendingOrders() {
  const store = await tx("pendingWalkInOrders", "readonly");
  return requestToPromise(store.getAll());
}

export async function addPendingOrder(payload, localId = crypto.randomUUID()) {
  const entry = { localId, payload, createdAt: Date.now(), status: "pending" };
  const store = await tx("pendingWalkInOrders", "readwrite");
  store.put(entry);
  return entry;
}

export async function removePendingOrder(localId) {
  const store = await tx("pendingWalkInOrders", "readwrite");
  store.delete(localId);
}

export async function markPendingOrderFailed(localId, failReason) {
  const store = await tx("pendingWalkInOrders", "readwrite");
  const existing = await requestToPromise(store.get(localId));
  if (existing) {
    store.put({ ...existing, status: "failed", failReason });
  }
}
