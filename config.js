// ─── PomiaryPro — konfiguracja ───────────────────────────────────────────────

const CONFIG = {

  // ── Google Forms ────────────────────────────────────────────────────────────
  FORM_ID: '1XKr9pWrtYRSd_cZU6RU9XcXnfA67lIn7gNpcaxPGHkI',

  FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfAookZ_qj_hwnsTkLJZIFa4eGHdAK1vuBlEfFUUBb9gu78oA/viewform',

  FIELD_SESSION_ID:  'entry.881758193',
  FIELD_DESCRIPTION: 'entry.1355767498',

  // ── Google Sheets ───────────────────────────────────────────────────────────
  SHEET_ID: '1jP5k6F0sQmOs9t7J2ItjVcHbdImADYIBo-bAUpYrmmg',

  SHEETS_API_KEY: 'AIzaSyCNCyb6W1eXhsSpL3RTOdB48MR93MjBh9Q',

  // ── Kolumny w arkuszu (0-indexed) ───────────────────────────────────────────
  COL_TIMESTAMP:   0,
  COL_SESSION_ID:  1,
  COL_DESCRIPTION: 2,
  COL_DRIVE_URL:   3,

  // ── Polling ─────────────────────────────────────────────────────────────────
  POLL_INTERVAL_MS: 8000,

};

if (typeof module !== 'undefined') module.exports = CONFIG;
