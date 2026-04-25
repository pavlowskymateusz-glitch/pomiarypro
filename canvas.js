// ─── offlineQueue.js ─────────────────────────────────────────────────────────
// Przechowuje zadania w IndexedDB i wykonuje je gdy sieć wróci.
// Jedyne zadanie które kolejkujemy: SAVE_SESSION (zapis sesji + PDF na Drive)

const OfflineQueue = (() => {

  const DB_NAME    = 'pomiarypro_queue';
  const DB_VERSION = 1;
  const STORE      = 'jobs';

  let _db = null;
  let _processing = false;

  // Otwiera / tworzy bazę IndexedDB
  function _openDB() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
        }
      };

      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  // Dodaje zadanie do kolejki
  async function enqueue(type, payload) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx   = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const job  = { type, payload, status: 'pending', createdAt: Date.now(), retries: 0 };
      const req  = store.add(job);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  // Pobiera wszystkie oczekujące zadania
  async function _getPending() {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const idx   = store.index('status');
      const req   = idx.getAll('pending');
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function _deleteJob(id) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req   = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function _updateJob(job) {
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req   = store.put(job);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  // Wykonuje jedno zadanie — rozszerzaj typy tutaj
  async function _executeJob(job) {
    if (job.type === 'SAVE_PDF') {
      // PDF jest generowany lokalnie — tu można dodać wysyłkę emailem
      // lub zapis na serwer gdy będzie dostępny
      PDFGenerator.generate(job.payload);
      return;
    }
    throw new Error(`Nieznany typ zadania: ${job.type}`);
  }

  // Przetwarza całą kolejkę — wywoływana gdy sieć wraca
  async function processQueue() {
    if (_processing) return;
    _processing = true;

    try {
      const jobs = await _getPending();
      if (jobs.length === 0) { _processing = false; return; }

      console.log(`Queue: ${jobs.length} oczekujących zadań`);

      for (const job of jobs) {
        try {
          await _executeJob(job);
          await _deleteJob(job.id);
          console.log(`Job ${job.id} (${job.type}) wykonany`);
        } catch (err) {
          job.retries += 1;
          job.lastError = err.message;
          if (job.retries >= 3) job.status = 'failed';
          await _updateJob(job);
          console.warn(`Job ${job.id} failed (próba ${job.retries}):`, err.message);
        }
      }
    } finally {
      _processing = false;
    }
  }

  // Liczba oczekujących zadań (do wyświetlenia w UI)
  async function pendingCount() {
    const jobs = await _getPending();
    return jobs.length;
  }

  // Nasłuchuje na powrót sieci
  function init() {
    window.addEventListener('online', () => {
      console.log('Sieć wróciła — przetwarzam kolejkę');
      processQueue();
    });
    // Spróbuj przetworzyć przy starcie (może już mamy sieć)
    if (navigator.onLine) processQueue();
  }

  return { init, enqueue, processQueue, pendingCount };
})();
