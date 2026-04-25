// session.js
const Session = (() => {
  let _sessionId = null;
  let _clientName = '';

  function _dateStr() {
    return new Date().toISOString().slice(0, 10);
  }
  function _randomId() {
    return Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function create(clientName) {
    _clientName = (clientName || 'Klient').trim();
    var safe = _clientName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    _sessionId = _dateStr() + '_' + safe + '_' + _randomId();
    var data = { sessionId: _sessionId, clientName: _clientName, createdAt: Date.now() };
    try { localStorage.setItem('pm_session', JSON.stringify(data)); } catch(e) {}
    return data;
  }

  function restore() {
    try {
      var raw = localStorage.getItem('pm_session');
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (Date.now() - data.createdAt > 12 * 60 * 60 * 1000) {
        localStorage.removeItem('pm_session');
        return null;
      }
      _sessionId = data.sessionId;
      _clientName = data.clientName;
      return data;
    } catch(e) { return null; }
  }

  function clear() {
    _sessionId = null; _clientName = '';
    try { localStorage.removeItem('pm_session'); } catch(e) {}
  }

  function getSessionId() { return _sessionId; }
  function getClientName() { return _clientName; }

  function buildFormUrl() {
    if (!_sessionId) throw new Error('Brak sesji');
    return CONFIG.FORM_URL
      + '?' + CONFIG.FIELD_SESSION_ID + '=' + encodeURIComponent(_sessionId)
      + '&' + CONFIG.FIELD_DESCRIPTION + '=' + encodeURIComponent('zdjecie');
  }

  function renderQR(targetEl, size) {
    var url = buildFormUrl();
    targetEl.innerHTML = '';
    if (typeof QRCode === 'undefined') { targetEl.textContent = 'Brak QRCode'; return url; }
    new QRCode(targetEl, {
      text: url, width: size || 220, height: size || 220,
      colorDark: '#1A1A18', colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
    return url;
  }

  return { create, restore, clear, getSessionId, getClientName, buildFormUrl, renderQR };
})();
