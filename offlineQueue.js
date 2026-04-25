// ─── session.js ──────────────────────────────────────────────────────────────

const Session = (() => {

  let _sessionId = null;
  let _clientName = '';

  function _dateStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10); // 2026-04-20
  }

  function _randomId(len = 4) {
    return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
  }

  // Tworzy nową sesję i zwraca obiekt sesji
  function create(clientName) {
    _clientName = clientName.trim() || 'Klient';
    const safe = _clientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
    _sessionId = `${_dateStr()}_${safe}_${_randomId()}`;

    const sessionData = {
      sessionId: _sessionId,
      clientName: _clientName,
      createdAt: new Date().toISOString(),
    };

    // Zapisz lokalnie na wypadek odświeżenia
    try {
      localStorage.setItem('pm_session', JSON.stringify(sessionData));
    } catch (e) {
      console.warn('localStorage niedostępny', e);
    }

    return sessionData;
  }

  // Przywraca sesję po odświeżeniu strony
  function restore() {
    try {
      const raw = localStorage.getItem('pm_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      _sessionId = data.sessionId;
      _clientName = data.clientName;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clear() {
    _sessionId = null;
    _clientName = '';
    try { localStorage.removeItem('pm_session'); } catch (e) {}
  }

  function getSessionId() { return _sessionId; }
  function getClientName() { return _clientName; }

  // Buduje URL do formularza z pre-wypełnionym sessionId
  function buildFormUrl() {
    if (!_sessionId) throw new Error('Brak aktywnej sesji');
    const base = CONFIG.FORM_URL;
    const params = new URLSearchParams({
      [CONFIG.FIELD_SESSION_ID]: _sessionId,
      [CONFIG.FIELD_DESCRIPTION]: 'ogolne',
    });
    return `${base}?${params.toString()}`;
  }

  // Generuje QR kod do elementu <canvas> lub <img>
  // Wymaga biblioteki qrcode.min.js (CDN)
  async function renderQR(targetEl, size = 220) {
    const url = buildFormUrl();

    if (typeof QRCode === 'undefined') {
      console.error('Brak biblioteki QRCode — dodaj <script src="qrcode.min.js">');
      return;
    }

    // Wyczyść poprzedni QR
    targetEl.innerHTML = '';

    new QRCode(targetEl, {
      text: url,
      width: size,
      height: size,
      colorDark: '#1A1A18',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M,
    });

    return url;
  }

  return { create, restore, clear, getSessionId, getClientName, buildFormUrl, renderQR };
})();
