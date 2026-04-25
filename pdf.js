// ─── polling.js ──────────────────────────────────────────────────────────────

const Polling = (() => {

  let _intervalId = null;
  let _knownTimestamps = new Set();
  let _onNewPhotos = null;   // callback(photos[])
  let _onError = null;       // callback(err)
  let _sessionId = null;

  // Pobiera wiersze z arkusza Sheets przez klucz API (tylko odczyt, bez OAuth)
  async function _fetchRows() {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}` +
      `/values/Form_Responses!A:E` +
      `?key=${CONFIG.SHEETS_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return data.values || [];
  }

  async function _poll() {
    if (!_sessionId) return;

    try {
      const rows = await _fetchRows();
      const dataRows = rows.slice(1); // pomiń nagłówek

      const newPhotos = dataRows
        .filter(row => {
          const ts        = row[CONFIG.COL_TIMESTAMP]   || '';
          const sessionId = row[CONFIG.COL_SESSION_ID]  || '';
          return sessionId === _sessionId && !_knownTimestamps.has(ts);
        })
        .map(row => {
          const ts = row[CONFIG.COL_TIMESTAMP] || '';
          _knownTimestamps.add(ts);
          return {
            timestamp:   ts,
            description: row[CONFIG.COL_DESCRIPTION] || 'brak opisu',
            driveUrl:    row[CONFIG.COL_DRIVE_URL]   || '',
          };
        });

      if (newPhotos.length > 0 && typeof _onNewPhotos === 'function') {
        _onNewPhotos(newPhotos);
      }
    } catch (err) {
      console.warn('Polling error:', err.message);
      if (typeof _onError === 'function') _onError(err);
    }
  }

  function start(sessionId, onNewPhotos, onError) {
    if (_intervalId) stop();
    _sessionId = sessionId;
    _onNewPhotos = onNewPhotos;
    _onError = onError || null;
    _knownTimestamps.clear();

    _poll(); // natychmiastowe pierwsze wywołanie
    _intervalId = setInterval(_poll, CONFIG.POLL_INTERVAL_MS);
    console.log(`Polling started — sesja: ${sessionId}`);
  }

  function stop() {
    if (_intervalId) {
      clearInterval(_intervalId);
      _intervalId = null;
      console.log('Polling stopped');
    }
  }

  function reset() {
    stop();
    _knownTimestamps.clear();
    _sessionId = null;
  }

  function isRunning() { return _intervalId !== null; }

  return { start, stop, reset, isRunning };
})();
