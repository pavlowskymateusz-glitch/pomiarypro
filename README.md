# PomiaryPro

Aplikacja do pomiarów dla monterów stolarki. Działa w przeglądarce Chrome — bez instalacji, bez frameworka.

## Struktura plików

```
pomiarypro/
 ├── index.html          ← edytor (tablet)
 ├── upload.html         ← dodawanie zdjęć (telefon)
 ├── config.js           ← klucze API (uzupełnij przed wdrożeniem)
 └── src/js/
      ├── canvas.js       ← rysowanie
      ├── session.js      ← sesja i QR
      ├── polling.js      ← odczyt zdjęć z Sheets
      ├── offlineQueue.js ← kolejka offline (IndexedDB)
      └── pdf.js          ← eksport PDF
```

## Konfiguracja (jednorazowa, ~30 minut)

### 1. Google Forms
1. Wejdź na [forms.google.com](https://forms.google.com) i utwórz nowy formularz
2. Dodaj 3 pola:
   - **ID sesji** — krótka odpowiedź, wymagane
   - **Opis zdjęcia** — krótka odpowiedź, opcjonalne
   - **Zdjęcie** — przesyłanie pliku, wymagane, typy: jpg/png, max 10MB
3. W zakładce **Odpowiedzi** kliknij ikonę Arkusza → **Utwórz arkusz**
4. Skopiuj ID formularza z URL: `https://docs.google.com/forms/d/**FORM_ID**/edit`
5. Skopiuj ID każdego pola: w podglądzie formularza kliknij prawy przycisk → Zbadaj → znajdź `entry.XXXXXXX` w atrybucie `name`

### 2. Google Sheets API key
1. Wejdź na [console.cloud.google.com](https://console.cloud.google.com)
2. Utwórz nowy projekt (np. "PomiaryPro")
3. Włącz **Google Sheets API**
4. Utwórz **Klucz API** → ogranicz do: tylko Sheets API
5. W arkuszu odpowiedzi: Udostępnij → "Każdy z linkiem może wyświetlać"
6. Skopiuj ID arkusza z URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`

### 3. Uzupełnij config.js
```js
const CONFIG = {
  SHEET_ID:        'twój_sheet_id',
  SHEETS_API_KEY:  'twój_api_key',
  FORM_URL:        'https://docs.google.com/forms/d/twój_form_id/viewform',
  FIELD_SESSION_ID: 'entry.111111111',  // ID pola "ID sesji"
  FIELD_DESCRIPTION:'entry.222222222',  // ID pola "Opis zdjęcia"
  // reszta bez zmian
};
```

### 4. Hosting (GitHub Pages)
1. Utwórz repozytorium na GitHub (np. `pomiarypro`)
2. Wgraj wszystkie pliki
3. Settings → Pages → Source: `main` branch → `/root`
4. Link: `https://twoja-nazwa.github.io/pomiarypro/`

## Użytkowanie

### Tablet
1. Otwórz `https://twoja-nazwa.github.io/pomiarypro/` w Chrome
2. Wpisz nazwę klienta
3. Narysuj szkic (prostokąt / koło / linia)
4. Zaznacz element → ustaw wymiary w mm i etykietę w panelu bocznym
5. Kliknij **QR FOTO** → pokaż kod monterowi

### Telefon (monter)
1. Zeskanuj QR kod z tabletu
2. Otworzy się strona `upload.html`
3. Kliknij **Dodaj zdjęcia** → wybierz z galerii
4. Zdjęcia trafiają na Google Drive przez Forms

### Zakończenie
1. Na tablecie: **Wyślij raport** → PDF pobiera się lokalnie
2. PDF zawiera: dane klienta, szkic, linki do zdjęć na Drive

## Wymagania
- Chrome na tablecie i telefonie
- Konto Google (wspólne dla monterów: `monter@nazwaFirmy.pl`)
- Internet podczas wysyłania zdjęć i pollingu
- Offline: szkic i wymiary zapisują się lokalnie, PDF generuje się bez sieci
