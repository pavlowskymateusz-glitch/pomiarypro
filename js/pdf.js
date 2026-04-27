// pdf.js
const PDFGenerator = (() => {

  // Zamienia polskie znaki na ASCII — jsPDF nie obsługuje UTF-8 natywnie
  function ascii(str) {
    if (!str) return '';
    return str
      .replace(/ą/g,'a').replace(/Ą/g,'A')
      .replace(/ć/g,'c').replace(/Ć/g,'C')
      .replace(/ę/g,'e').replace(/Ę/g,'E')
      .replace(/ł/g,'l').replace(/Ł/g,'L')
      .replace(/ń/g,'n').replace(/Ń/g,'N')
      .replace(/ó/g,'o').replace(/Ó/g,'O')
      .replace(/ś/g,'s').replace(/Ś/g,'S')
      .replace(/ź/g,'z').replace(/Ź/g,'Z')
      .replace(/ż/g,'z').replace(/Ż/g,'Z');
  }

  function generate({ clientName, date, sessionId, canvasEl, photos }) {
    var jsPDFLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFLib) { alert('Brak biblioteki jsPDF'); return; }

    var doc = new jsPDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var PW = 210, ML = 15, MR = 15, TW = PW - ML - MR;

    // ── Nagłówek ─────────────────────────────────────────────────────────────
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

    doc.setFont('helvetica', 'bold');
    doc.text('Klient:', ML, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(ascii(clientName) || '—', ML + 20, 39);

    doc.setFont('helvetica', 'bold');
    doc.text('Data:', 115, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(date || '', 130, 39);

    doc.setFont('helvetica', 'bold');
    doc.text('Sesja:', ML, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(sessionId || '—', ML + 20, 46);

    // ── Szkic ─────────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(107, 107, 102);
    doc.text('SZKIC', ML, 56);
    doc.setDrawColor(229, 228, 223);
    doc.line(ML, 58, PW - MR, 58);

    var sketchBottom = 60; // domyślnie jeśli brak canvas

    if (canvasEl && canvasEl.width > 0 && canvasEl.height > 0) {
      try {
        var cw = canvasEl.width;
        var ch = canvasEl.height;
        var ratio = cw / ch;
        var maxW = TW;
        var maxH = 120; // max wysokość szkicu w mm
        var imgW, imgH;
        if (ratio >= maxW / maxH) {
          imgW = maxW; imgH = maxW / ratio;
        } else {
          imgH = maxH; imgW = maxH * ratio;
        }
        var imgX = ML + (TW - imgW) / 2;
        var imgY = 61;
        doc.addImage(canvasEl.toDataURL('image/png'), 'PNG', imgX, imgY, imgW, imgH);
        sketchBottom = imgY + imgH + 6;
      } catch(e) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('(szkic niedostepny)', ML, 70);
        sketchBottom = 78;
      }
    }

    // ── Zdjęcia — NA TEJ SAMEJ STRONIE co szkic ──────────────────────────────
    if (photos && photos.length > 0) {
      var y = sketchBottom + 4;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(107, 107, 102);
      doc.text('ZDJECIA (' + photos.length + ')', ML, y);
      doc.setDrawColor(229, 228, 223);
      doc.line(ML, y + 2, PW - MR, y + 2);
      y += 8;

      photos.forEach(function(photo, i) {
        // Jeśli brakuje miejsca — nowa strona
        if (y > 272) {
          doc.addPage();
          y = 20;
        }

        // Numer i opis
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(26, 26, 24);
        doc.text((i + 1) + '. ' + ascii(photo.description || 'zdjecie'), ML, y);

        // Timestamp
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 107, 102);
        doc.text(photo.timestamp || '', ML, y + 5);

        // Link — czyste URL bez polskich znaków
        if (photo.driveUrl) {
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.textWithLink('Otworz zdjecie na Google Drive', ML, y + 11, { url: photo.driveUrl });
        }

        doc.setDrawColor(235, 235, 235);
        doc.setLineWidth(0.3);
        doc.line(ML, y + 15, PW - MR, y + 15);

        y += 22;
      });
    } else {
      // Brak zdjęć — krótka informacja
      var ny = sketchBottom + 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(173, 173, 170);
      doc.text('Brak zdiec w tej sesji.', ML, ny);
    }

    // ── Stopka ────────────────────────────────────────────────────────────────
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(173, 173, 170);
      doc.text(
        'PomiaryPro — ' + ascii(clientName || '') + ' — strona ' + p + ' z ' + pageCount,
        PW / 2, 291, { align: 'center' }
      );
    }

    var fileName = 'Raport_' + ascii(clientName || 'pomiar').replace(/\s+/g,'_') + '_' + (date || '').replace(/\./g,'-') + '.pdf';
    doc.save(fileName);
  }

  return { generate };
})();
