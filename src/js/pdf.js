// pdf.js — generowanie PDF z jsPDF
// Szkic 1:1 — canvas skalowany proporcjonalnie do A4

const PDFGenerator = (() => {

  function generate({ clientName, date, sessionId, canvasEl, photos }) {
    var jsPDFLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFLib) { alert('Brak biblioteki jsPDF'); return; }

    var doc = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var PW = 210, ML = 15, MR = 15, TW = PW - ML - MR;

    // ── Nagłówek ──────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(26, 26, 24);
    doc.text('PomiaryPro', ML, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 107, 102);
    doc.text('Raport pomiaru', ML, 27);

    doc.setDrawColor(229, 228, 223);
    doc.setLineWidth(0.4);
    doc.line(ML, 31, PW - MR, 31);

    doc.setFontSize(11);
    doc.setTextColor(26, 26, 24);
    var y = 39;

    doc.setFont('helvetica', 'bold');   doc.text('Klient:', ML, y);
    doc.setFont('helvetica', 'normal'); doc.text(clientName || '—', ML + 20, y);

    doc.setFont('helvetica', 'bold');   doc.text('Data:', 115, y);
    doc.setFont('helvetica', 'normal'); doc.text(date || new Date().toLocaleDateString('pl-PL'), 130, y);

    doc.setFont('helvetica', 'bold');   doc.text('Sesja:', ML, y + 7);
    doc.setFont('helvetica', 'normal'); doc.text(sessionId || '—', ML + 20, y + 7);

    // ── Szkic 1:1 ─────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(107, 107, 102);
    doc.text('SZKIC', ML, 58);
    doc.setDrawColor(229, 228, 223);
    doc.line(ML, 60, PW - MR, 60);

    if (canvasEl && canvasEl.width > 0 && canvasEl.height > 0) {
      try {
        // Zachowaj proporcje 1:1 — canvas -> mm bez rozciągania
        var cw = canvasEl.width;
        var ch = canvasEl.height;
        var ratio = cw / ch;

        // Maksymalna przestrzeń na szkic (do dołu strony zostaw 20mm)
        var maxW = TW;
        var maxH = 200; // mm — od y=63 do y=265

        var imgW, imgH;
        if (ratio >= maxW / maxH) {
          // szeroki — ogranicz szerokość
          imgW = maxW;
          imgH = maxW / ratio;
        } else {
          // wysoki — ogranicz wysokość
          imgH = maxH;
          imgW = maxH * ratio;
        }

        var imgData = canvasEl.toDataURL('image/png');
        // Wyśrodkuj poziomo
        var imgX = ML + (TW - imgW) / 2;
        doc.addImage(imgData, 'PNG', imgX, 63, imgW, imgH);
      } catch(e) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('(szkic niedostępny: ' + e.message + ')', ML, 75);
      }
    }

    // ── Zdjęcia ───────────────────────────────────────────────────────────────
    if (photos && photos.length > 0) {
      doc.addPage();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(26, 26, 24);
      doc.text('Zdjęcia (' + photos.length + ')', ML, 20);

      doc.setDrawColor(229, 228, 223);
      doc.line(ML, 23, PW - MR, 23);

      var py = 32;
      photos.forEach(function(photo, i) {
        if (py > 265) { doc.addPage(); py = 20; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 26, 24);
        doc.text((i + 1) + '. ' + (photo.description || 'brak opisu'), ML, py);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 107, 102);
        doc.text(photo.timestamp || '', ML, py + 5);

        if (photo.driveUrl) {
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.textWithLink('Otwórz zdjęcie na Google Drive \u2192', ML, py + 11, { url: photo.driveUrl });
        }

        doc.setDrawColor(240, 240, 238);
        doc.setLineWidth(0.3);
        doc.line(ML, py + 15, PW - MR, py + 15);
        py += 22;
      });
    }

    // ── Stopka ────────────────────────────────────────────────────────────────
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(173, 173, 170);
      doc.text(
        'PomiaryPro \u2014 ' + (clientName || '') + ' \u2014 strona ' + p + ' z ' + pageCount,
        PW / 2, 291, { align: 'center' }
      );
    }

    var fileName = 'Raport_' + (clientName || 'pomiar').replace(/\s+/g, '_') + '_' + (date || '').replace(/\./g, '-') + '.pdf';
    doc.save(fileName);
  }

  return { generate };
})();
