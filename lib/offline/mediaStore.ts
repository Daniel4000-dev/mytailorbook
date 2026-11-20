/**
 * Offline Media & Photo Store for MyStitchBook.
 *
 * Uses native IndexedDB to persist captured fabric photos and style references
 * when network connection is absent or volatile (e.g. in crowded open markets).
 *
 * Provides instant local blob URLs for immediate zero-latency UI rendering,
 * while allowing background workers to drain and upload to cloud storage
 * when network becomes stable.
 */

const DB_NAME = 'mtb-media-db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_photos';

export interface PendingPhotoRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
  folder: string;
  entityId: string;
  field: 'fabricImage' | 'styleReference' | 'fittingImage';
  clientTimestamp: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retryCount: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable on server'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

/**
 * Saves a compressed image blob to IndexedDB and returns the record with a local object URL.
 */
export async function savePendingPhoto(
  blob: Blob,
  folder: string,
  fileName: string,
  entityId: string,
  field: 'fabricImage' | 'styleReference' | 'fittingImage'
): Promise<{ id: string; localUrl: string }> {
  const db = await getDB();
  const id = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const record: PendingPhotoRecord = {
    id,
    blob,
    mimeType: blob.type || 'image/jpeg',
    fileName,
    folder,
    entityId,
    field,
    clientTimestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => {
      const localUrl = URL.createObjectURL(blob);
      window.dispatchEvent(new CustomEvent('mtb:pending_photos_updated'));
      resolve({ id, localUrl });
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all pending photos awaiting background upload.
 */
export async function getPendingPhotos(): Promise<PendingPhotoRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = req.result as PendingPhotoRecord[];
        resolve(results.filter((p) => p.status !== 'uploaded'));
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Removes a photo from IndexedDB after successful cloud upload.
 */
export async function removePendingPhoto(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => {
        window.dispatchEvent(new CustomEvent('mtb:pending_photos_updated'));
        resolve();
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    // Graceful error ignore
  }
}

