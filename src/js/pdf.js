// ─── pdf.js ──────────────────────────────────────────────────────────────────
// Wymaga: jsPDF (CDN)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js">

const PDFGenerator = (() => {

  function generate({ clientName, date, sessionId, canvasEl, photos }) {
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      console.error('Brak biblioteki jsPDF');
      return;
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, ML = 20, MR = 20, TW = PW - ML - MR; // szerokość treści

    // ── Strona 1: Nagłówek ──────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(26, 26, 24);
    doc.text('PomiaryPro', ML, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 107, 102);
    doc.text('Raport pomiaru', ML, 29);

    // Linia pod nagłówkiem
    doc.setDrawColor(229, 228, 223);
    doc.setLineWidth(0.4);
    doc.line(ML, 33, PW - MR, 33);

    // Dane
    doc.setFontSize(11);
    doc.setTextColor(26, 26, 24);
    const infoY = 42;
    const col2  = 110;

    doc.setFont('helvetica', 'bold');   doc.text('Klient:', ML, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(clientName || '—', ML + 22, infoY);

    doc.setFont('helvetica', 'bold');   doc.text('Data:', col2, infoY);
    doc.setFont('helvetica', 'normal'); doc.text(date || new Date().toLocaleDateString('pl-PL'), col2 + 15, infoY);

    doc.setFont('helvetica', 'bold');   doc.text('Sesja:', ML, infoY + 7);
    doc.setFont('helvetica', 'normal'); doc.text(sessionId || '—', ML + 22, infoY + 7);

    // ── Szkic ────────────────────────────────────────────────────────────────
    if (canvasEl) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(107, 107, 102);
      doc.text('SZKIC', ML, 62);
      doc.line(ML, 64, PW - MR, 64);

      try {
        const imgData = canvasEl.toDataURL('image/png');
        // Skaluj do szerokości kolumny zachowując proporcje
        const ratio    = canvasEl.width / canvasEl.height;
        const imgW     = TW;
        const imgH     = Math.min(imgW / ratio, 120);
        doc.addImage(imgData, 'PNG', ML, 67, imgW, imgH);
      } catch (e) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('(szkic niedostępny)', ML, 80);
      }
    }

    // ── Strona 2: Zdjęcia ────────────────────────────────────────────────────
    if (photos && photos.length > 0) {
      doc.addPage();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(26, 26, 24);
      doc.text('Zdjęcia', ML, 22);

      doc.setDrawColor(229, 228, 223);
      doc.line(ML, 25, PW - MR, 25);

      let y = 34;

      photos.forEach((photo, i) => {
        if (y > 265) { doc.addPage(); y = 20; }

        // Numer i opis
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 26, 24);
        doc.text(`${i + 1}. ${photo.description || 'brak opisu'}`, ML, y);

        // Timestamp
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 107, 102);
        doc.text(photo.timestamp || '', ML, y + 5);

        // Link do Drive
        if (photo.driveUrl) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.textWithLink('Otwórz zdjęcie na Google Drive →', ML, y + 11, { url: photo.driveUrl });
        }

        // Separator
        doc.setDrawColor(240, 240, 238);
        doc.setLineWidth(0.3);
        doc.line(ML, y + 15, PW - MR, y + 15);

        y += 22;
      });
    }

    // ── Stopka na każdej stronie ─────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(173, 173, 170);
      doc.text(
        `PomiaryPro — ${clientName} — strona ${p} z ${pageCount}`,
        PW / 2, 291,
        { align: 'center' }
      );
    }

    // Zapisz
    const fileName = `Raport_${(clientName || 'pomiar').replace(/\s+/g, '_')}_${date || 'brak_daty'}.pdf`;
    doc.save(fileName);
  }

  return { generate };
})();
