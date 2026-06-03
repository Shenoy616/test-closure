/**
 * Test Closure — styled PDF report (vector, clickable links, one section per page).
 */
(function () {
  const M = 18;
  const PW = 210;
  const PH = 297;
  const CW = PW - M * 2;

  const C = {
    bg: [247, 246, 243],
    card: [255, 255, 255],
    muted: [242, 241, 238],
    border: [225, 224, 220],
    text: [26, 25, 23],
    text2: [107, 106, 102],
    text3: [156, 155, 151],
    accent: [24, 95, 165],
    accentLight: [230, 241, 251],
    accentDark: [12, 68, 124],
    success: [59, 109, 17],
    successBg: [234, 243, 222],
    successBorder: [151, 196, 89],
    yesBg: [234, 243, 222],
    noBg: [252, 235, 220],
    noText: [133, 79, 11],
    link: [24, 95, 165]
  };

  let logoDataUrl = null;

  function getJsPDF() {
    const Ctor = window.jspdf?.jsPDF;
    if (!Ctor) throw new Error('PDF engine not loaded. Refresh the page.');
    return Ctor;
  }

  async function loadLogo() {
    if (logoDataUrl) return logoDataUrl;
    try {
      const res = await fetch('Unifize.svg');
      const svg = await res.text();
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      logoDataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 208;
          c.height = 48;
          c.getContext('2d').drawImage(img, 0, 0, 208, 48);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch {
      logoDataUrl = null;
    }
    return logoDataUrl;
  }

  function collectData() {
    const checklistKeys = ['backward', 'forward', 'proof', 'regression', 'migration'];
    const checklistLabels = {
      backward: 'Backward compatibility check',
      forward: 'Forward compatibility check',
      proof: 'Proof of testing attached for Testomata',
      regression: 'Regression suite executed',
      migration: 'Data migration check'
    };

    const checklist = checklistKeys.map(key => ({
      label: checklistLabels[key],
      checked: !!window.checkBoxState?.[key],
      answer: window.checkState?.[key] || ''
    }));

    const signoff = [
      { name: 'Gopalakrishna Shenoy', initials: 'GS', signed: !!window.checkBoxState?.['signoff-0'] },
      { name: 'Shuchi Trivedi', initials: 'ST', signed: !!window.checkBoxState?.['signoff-1'] },
      { name: 'Saransh Ramaiya', initials: 'SR', signed: !!window.checkBoxState?.['signoff-2'] },
      { name: 'Varun Srinivasan', initials: 'VS', signed: !!window.checkBoxState?.['signoff-3'] },
      { name: 'Prasad Helaskar', initials: 'PH', signed: !!window.checkBoxState?.['signoff-4'] }
    ];

    const dateRanges = [];
    document.querySelectorAll('#meta-date-ranges .date-range').forEach((block, i) => {
      dateRanges.push({
        iteration: i + 1,
        start: block.querySelector('.meta-start-date')?.value || '',
        end: block.querySelector('.meta-end-date')?.value || ''
      });
    });

    const defectsRaw = document.getElementById('defects-notes')?.value || '';
    const defectsLines = defectsRaw.split('\n').map(l => l.trim()).filter(Boolean);

    return {
      links: {
        shortcut: document.getElementById('shortcut-link')?.value?.trim() || '',
        pr: document.getElementById('pr-link')?.value?.trim() || '',
        testomata: document.getElementById('testomata-link')?.value?.trim() || '',
        defects: defectsLines
      },
      checklist,
      risksText: window.riskQuill ? window.riskQuill.getText().trim() : '',
      environment: {
        browser: document.getElementById('env-browser')?.value || '',
        device: document.getElementById('env-device')?.value?.trim() || '',
        platform: document.getElementById('env-platform')?.value?.trim() || ''
      },
      dateRanges,
      signoff
    };
  }

  function setFill(doc, rgb) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setDraw(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
  function setText(doc, rgb) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

  function drawPageBackground(doc) {
    setFill(doc, C.bg);
    doc.rect(0, 0, PW, PH, 'F');
  }

  function drawFooter(doc, pageNum, total) {
    setDraw(doc, C.border);
    doc.setLineWidth(0.2);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setText(doc, C.text3);
    doc.text('Test Closure', M, PH - 8);
    doc.text('Page ' + pageNum + ' of ' + total, PW - M, PH - 8, { align: 'right' });
  }

  function drawCover(doc, logo) {
    drawPageBackground(doc);

    const cardY = 52;
    const cardH = 118;
    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, cardY, CW, cardH, 4, 4, 'FD');

    setFill(doc, C.accent);
    doc.rect(M, cardY, CW, 3, 'F');

    let y = cardY + 22;
    if (logo) {
      doc.addImage(logo, 'PNG', PW / 2 - 26, y, 52, 12);
      y += 22;
    } else {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      setText(doc, C.accent);
      doc.text('unifize', PW / 2, y + 4, { align: 'center' });
      y += 16;
    }

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    setText(doc, C.text);
    doc.text('Test Closure', PW / 2, y, { align: 'center' });
    y += 12;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    setText(doc, C.text2);
    const sub = doc.splitTextToSize('Go through all sections and sign-off before closure', CW - 24);
    doc.text(sub, PW / 2, y, { align: 'center' });
    y += sub.length * 5 + 10;

    const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const badgeW = doc.getTextWidth(dateStr) + 14;
    const badgeX = (PW - badgeW) / 2;
    setFill(doc, C.accentLight);
    doc.roundedRect(badgeX, y - 5, badgeW, 9, 3, 3, 'F');
    doc.setFontSize(9);
    setText(doc, C.accentDark);
    doc.text(dateStr, PW / 2, y, { align: 'center' });
  }

  function drawSectionHeader(doc, num, title, y) {
    const barH = 14;
    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, barH, 3, 3, 'FD');

    setFill(doc, C.accent);
    doc.rect(M, y, 3, barH, 'F');

    setFill(doc, C.muted);
    doc.roundedRect(M + 10, y + 3.5, 12, 7, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    setText(doc, C.text3);
    doc.text(num, M + 16, y + 8.2, { align: 'center' });

    doc.setFontSize(13);
    setText(doc, C.text);
    doc.text(title, M + 26, y + 9.5);

    return y + barH + 8;
  }

  function drawField(doc, label, value, y, opts) {
    opts = opts || {};
    const isLink = opts.link && value && /^https?:\/\//i.test(value);
    const display = value || '—';
    const valueLines = doc.splitTextToSize(display, CW - 16);
    const blockH = 10 + valueLines.length * 5.2 + 6;

    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(M, y, CW, blockH, 2.5, 2.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setText(doc, C.text2);
    doc.text(label.toUpperCase(), M + 8, y + 7);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', isLink ? 'normal' : 'normal');
    let vy = y + 14;
    if (isLink) {
      setText(doc, C.link);
      valueLines.forEach(line => {
        doc.textWithLink(line, M + 8, vy, { url: value });
        vy += 5.2;
      });
    } else {
      setText(doc, value ? C.text : C.text3);
      doc.text(valueLines, M + 8, vy);
    }

    return y + blockH + 5;
  }

  function drawTextArea(doc, label, text, y) {
    const lines = doc.splitTextToSize(text || '—', CW - 16);
    const blockH = 10 + Math.max(lines.length * 5.2, 8) + 6;

    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(M, y, CW, blockH, 2.5, 2.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setText(doc, C.text2);
    doc.text(label.toUpperCase(), M + 8, y + 7);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    setText(doc, text ? C.text : C.text3);
    doc.text(lines, M + 8, y + 14);

    return y + blockH + 5;
  }

  function drawDefectsField(doc, lines, y) {
    if (!lines.length) return drawTextArea(doc, 'Defects link', '', y);

    const inner = [];
    lines.forEach(line => inner.push(line));
    const blockH = 10 + lines.length * 6.5 + 8;

    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.roundedRect(M, y, CW, blockH, 2.5, 2.5, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    setText(doc, C.text2);
    doc.text('DEFECTS LINK', M + 8, y + 7);

    let cy = y + 14;
    doc.setFontSize(10);
    lines.forEach(line => {
      const m = line.match(/(https?:\/\/[^\s]+)/i);
      if (m) {
        setText(doc, C.link);
        const wrapped = doc.splitTextToSize(line, CW - 16);
        wrapped.forEach(w => {
          doc.textWithLink(w, M + 8, cy, { url: m[1] });
          cy += 5.2;
        });
      } else {
        setText(doc, C.text);
        doc.text(doc.splitTextToSize(line, CW - 16), M + 8, cy);
        cy += 5.2;
      }
      cy += 1.2;
    });

    return y + blockH + 5;
  }

  function drawCheckRow(doc, item, y) {
    const rowH = 12;
    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.roundedRect(M, y, CW, rowH, 2, 2, 'FD');

    const cx = M + 10;
    const cy = y + 6;
    if (item.checked) {
      setFill(doc, C.success);
      doc.circle(cx, cy, 2.8, 'F');
      doc.setFontSize(7);
      setText(doc, [255, 255, 255]);
      doc.text('✓', cx, cy + 0.8, { align: 'center' });
    } else {
      setDraw(doc, C.border);
      doc.setLineWidth(0.4);
      doc.circle(cx, cy, 2.8, 'S');
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    setText(doc, C.text);
    doc.text(item.label, M + 18, y + 7.8);

    if (item.answer) {
      const yes = item.answer === 'yes';
      const pill = yes ? 'Yes' : 'No';
      const pw = doc.getTextWidth(pill) + 8;
      const px = PW - M - pw - 4;
      setFill(doc, yes ? C.yesBg : C.noBg);
      doc.roundedRect(px, y + 3, pw, 6, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setText(doc, yes ? C.success : C.noText);
      doc.text(pill, px + pw / 2, y + 7.2, { align: 'center' });
    }

    return y + rowH + 4;
  }

  function drawSignoffRow(doc, person, y) {
    const rowH = 14;
    setFill(doc, C.card);
    setDraw(doc, C.border);
    doc.roundedRect(M, y, CW, rowH, 2, 2, 'FD');

    setFill(doc, C.accentLight);
    doc.circle(M + 12, y + 7, 5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    setText(doc, C.accentDark);
    doc.text(person.initials, M + 12, y + 8.2, { align: 'center' });

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    setText(doc, C.text);
    doc.text(person.name, M + 22, y + 8.5);

    const status = person.signed ? 'Signed' : 'Pending';
    const sw = doc.getTextWidth(status) + 10;
    const sx = PW - M - sw - 4;
    if (person.signed) {
      setFill(doc, C.successBg);
      setDraw(doc, C.successBorder);
      doc.setLineWidth(0.2);
      setText(doc, C.success);
    } else {
      setFill(doc, C.muted);
      setDraw(doc, C.border);
      setText(doc, C.text3);
    }
    doc.roundedRect(sx, y + 4, sw, 6, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text(status, sx + sw / 2, y + 8.2, { align: 'center' });

    return y + rowH + 4;
  }

  function drawTwoColDates(doc, start, end, y) {
    const colW = (CW - 6) / 2;
    const h = 22;
    [[start, 'Testing start date', M], [end, 'Testing end date', M + colW + 6]].forEach(([val, lbl, x]) => {
      setFill(doc, C.card);
      setDraw(doc, C.border);
      doc.roundedRect(x, y, colW, h, 2, 2, 'FD');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      setText(doc, C.text2);
      doc.text(lbl.toUpperCase(), x + 6, y + 7);
      doc.setFontSize(10);
      setText(doc, val ? C.text : C.text3);
      doc.text(val || '—', x + 6, y + 15);
    });
    return y + h + 5;
  }

  function renderSectionPage(doc, num, title, renderContent) {
    drawPageBackground(doc);
    let y = 22;
    y = drawSectionHeader(doc, num, title, y);
    renderContent(doc, y);
  }

  async function generateTestClosurePdf() {
    const data = collectData();
    const logo = await loadLogo();
    const doc = new (getJsPDF())({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const total = 7;

    drawCover(doc, logo);
    drawFooter(doc, 1, total);

    const sections = [
      {
        num: '01',
        title: 'Links',
        render(doc, y) {
          y = drawField(doc, 'Shortcut ticket link', data.links.shortcut, y, { link: true });
          y = drawField(doc, 'PR link', data.links.pr, y, { link: true });
          y = drawField(doc, 'Testomata execution link', data.links.testomata, y, { link: true });
          drawDefectsField(doc, data.links.defects, y);
        }
      },
      {
        num: '02',
        title: 'Checklist',
        render(doc, y) {
          data.checklist.forEach(item => { y = drawCheckRow(doc, item, y); });
        }
      },
      {
        num: '03',
        title: 'Risk & known issues',
        render(doc, y) {
          drawTextArea(doc, 'Notes', data.risksText, y);
        }
      },
      {
        num: '04',
        title: 'Environment & configuration',
        render(doc, y) {
          y = drawField(doc, 'Browser', data.environment.browser, y);
          y = drawField(doc, 'Device', data.environment.device, y);
          drawField(doc, 'Browser / platform', data.environment.platform, y);
        }
      },
      {
        num: '05',
        title: 'Timestamps & metadata',
        render(doc, y) {
          data.dateRanges.forEach(dr => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            setText(doc, C.text);
            doc.text('Iteration ' + dr.iteration, M, y + 4);
            y += 10;
            y = drawTwoColDates(doc, dr.start, dr.end, y);
          });
        }
      },
      {
        num: '06',
        title: 'Test closure sign-off',
        render(doc, y) {
          data.signoff.forEach(p => { y = drawSignoffRow(doc, p, y); });
        }
      }
    ];

    sections.forEach((sec, i) => {
      doc.addPage();
      renderSectionPage(doc, sec.num, sec.title, sec.render);
      drawFooter(doc, i + 2, total);
    });

    return doc.output('blob');
  }

  window.generateTestClosurePdf = generateTestClosurePdf;
})();
