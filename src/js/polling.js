// polling.js
const Polling = (() => {
  let _interval = null;
  let _known = new Set();
  let _onNew = null;
  let _sessionId = null;

  async function _poll() {
    if (!_sessionId) return;
    try {
      // Pobierz nazwe zakladki dynamicznie
      var metaUrl = 'https://sheets.googleapis.com/v4/spreadsheets/'
        + CONFIG.SHEET_ID + '?key=' + CONFIG.SHEETS_API_KEY
        + '&fields=sheets.properties.title';
      var metaRes = await fetch(metaUrl);
      var metaData = await metaRes.json();
      var sheetTitle = 'Sheet1';
      if (metaData.sheets && metaData.sheets.length > 0) {
        sheetTitle = metaData.sheets[0].properties.title;
      }

      var url = 'https://sheets.googleapis.com/v4/spreadsheets/'
        + CONFIG.SHEET_ID + '/values/'
        + encodeURIComponent(sheetTitle) + '!A:E'
        + '?key=' + CONFIG.SHEETS_API_KEY;

      var res = await fetch(url);
      if (!res.ok) throw new Error('Sheets API ' + res.status);
      var data = await res.json();
      var rows = (data.values || []).slice(1);

      var newPhotos = rows.filter(function(row) {
        var ts = row[CONFIG.COL_TIMESTAMP] || '';
        var sid = row[CONFIG.COL_SESSION_ID] || '';
        return sid === _sessionId && ts && !_known.has(ts);
      }).map(function(row) {
        var ts = row[CONFIG.COL_TIMESTAMP] || '';
        _known.add(ts);
        return {
          timestamp: ts,
          description: row[CONFIG.COL_DESCRIPTION] || 'zdjecie',
          driveUrl: row[CONFIG.COL_DRIVE_URL] || ''
        };
      });

      if (newPhotos.length > 0 && typeof _onNew === 'function') {
        _onNew(newPhotos);
      }
    } catch(e) {
      console.warn('Polling error:', e.message);
    }
  }

  function start(sessionId, onNew) {
    if (_interval) stop();
    _sessionId = sessionId;
    _onNew = onNew;
    _known.clear();
    _poll();
    _interval = setInterval(_poll, CONFIG.POLL_INTERVAL_MS);
    console.log('Polling started:', sessionId);
  }

  function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
  }

  function reset() { stop(); _known.clear(); _sessionId = null; }

  return { start, stop, reset };
})();
