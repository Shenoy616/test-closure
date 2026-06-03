/**
 * Test Closure — programmatic PDF (vector text, clickable links, one section per page).
 */
(function () {
  const MARGIN = 16;
  const PAGE_W = 210;
  const PAGE_H = 297;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LINE = 5.5;

  function getJsPDF() {
    const Ctor = window.jspdf?.jsPDF || window.__TCJsPDF;
    if (!Ctor) throw new Error('PDF engine not loaded. Refresh the page.');
    return Ctor;
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

    const signoffNames = [
      'Gopalakrishna Shenoy',
      'Shuchi Trivedi',
      'Saransh Ramaiya',
      'Varun Srinivasan',
      'Prasad Helaskar'
    ];
    const signoff = signoffNames.map((name, i) => ({
      name,
      signed: !!window.checkBoxState?.['signoff-' + i]
    }));

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

    let risksText = '';
    if (window.riskQuill) {
      risksText = window.riskQuill.getText().trim();
    }

    return {
      links: {
        shortcut: document.getElementById('shortcut-link')?.value?.trim() || '',
        pr: document.getElementById('pr-link')?.value?.trim() || '',
        testomata: document.getElementById('testomata-link')?.value?.trim() || '',
        defects: defectsLines
      },
      checklist,
      risksText,
      environment: {
        browser: document.getElementById('env-browser')?.value || '',
        device: document.getElementById('env-device')?.value?.trim() || '',
        platform: document.getElementById('env-platform')?.value?.trim() || ''
      },
      dateRanges,
      signoff
    };
  }

  function createDoc() {
    return new (getJsPDF())({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  }

  function drawFooter(doc, pageNum, total) {
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Test Closure · Unifize', MARGIN, PAGE_H - 8);
    doc.text('Page ' + pageNum + ' of ' + total, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    doc.setTextColor(0);
  }

  function drawSectionTitle(doc, title, y) {
    doc.setFillColor(242, 241, 238);
    doc.rect(MARGIN, y - 5, CONTENT_W, 10, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 25, 23);
    doc.text(title, MARGIN + 3, y + 2);
    doc.setFont('helvetica', 'normal');
    return y + 14;
  }

  function drawLabel(doc, text, y) {
    doc.setFontSize(8);
    doc.setTextColor(107, 106, 102);
    doc.text(text.toUpperCase(), MARGIN, y);
    return y + 4;
  }

  function drawPlain(doc, text, y) {
    doc.setFontSize(11);
    doc.setTextColor(26, 25, 23);
    const lines = doc.splitTextToSize(text || '—', CONTENT_W);
    doc.text(lines, MARGIN, y);
    return y + lines.length * LINE + 4;
  }

  function drawUrl(doc, url, y) {
    doc.setFontSize(11);
    const display = url || '—';
    const lines = doc.splitTextToSize(display, CONTENT_W);
    let cy = y;

    if (url && /^https?:\/\//i.test(url)) {
      doc.setTextColor(24, 95, 165);
      lines.forEach(line => {
        doc.textWithLink(line, MARGIN, cy, { url: url });
        cy += LINE;
      });
    } else {
      doc.setTextColor(26, 25, 23);
      doc.text(lines, MARGIN, cy);
      cy += lines.length * LINE;
    }
    return cy + 4;
  }

  function drawDefects(doc, lines, y) {
    if (!lines.length) return drawPlain(doc, '—', y);
    doc.setFontSize(11);
    let cy = y;
    lines.forEach(line => {
      const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        doc.setTextColor(24, 95, 165);
        doc.textWithLink(line, MARGIN, cy, { url: urlMatch[1] });
        cy += LINE;
      } else {
        doc.setTextColor(26, 25, 23);
        const wrapped = doc.splitTextToSize(line, CONTENT_W);
        doc.text(wrapped, MARGIN, cy);
        cy += wrapped.length * LINE;
      }
    });
    return cy + 4;
  }

  function buildPages(data) {
    const pages = [];

    pages.push({
      render(doc, y) {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 25, 23);
        doc.text('Test Closure', PAGE_W / 2, 55, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 106, 102);
        doc.text('Go through all sections and sign-off before closure', PAGE_W / 2, 68, { align: 'center' });
        doc.setFontSize(10);
        doc.text('Generated ' + new Date().toLocaleString(), PAGE_W / 2, 82, { align: 'center' });
        return y;
      }
    });

    pages.push({
      title: '01 · Links',
      render(doc, y) {
        y = drawSectionTitle(doc, 'Links', y);
        y = drawLabel(doc, 'Shortcut ticket link', y);
        y = drawUrl(doc, data.links.shortcut, y);
        y = drawLabel(doc, 'PR link', y);
        y = drawUrl(doc, data.links.pr, y);
        y = drawLabel(doc, 'Testomata execution link', y);
        y = drawUrl(doc, data.links.testomata, y);
        y = drawLabel(doc, 'Defects link / notes', y);
        y = drawDefects(doc, data.links.defects, y);
        return y;
      }
    });

    pages.push({
      title: '02 · Checklist',
      render(doc, y) {
        y = drawSectionTitle(doc, 'Checklist', y);
        data.checklist.forEach(item => {
          const mark = item.checked ? '[x]' : '[ ]';
          const ans = item.answer ? ' — ' + (item.answer === 'yes' ? 'Yes' : 'No') : '';
          y = drawPlain(doc, mark + ' ' + item.label + ans, y);
        });
        return y;
      }
    });

    pages.push({
      title: '03 · Risk & known issues',
      render(doc, y) {
        y = drawSectionTitle(doc, 'Risk & known issues', y);
        return drawPlain(doc, data.risksText || '—', y);
      }
    });

    pages.push({
      title: '04 · Environment & configuration',
      render(doc, y) {
        y = drawSectionTitle(doc, 'Environment & configuration', y);
        y = drawLabel(doc, 'Browser', y);
        y = drawPlain(doc, data.environment.browser, y);
        y = drawLabel(doc, 'Device', y);
        y = drawPlain(doc, data.environment.device, y);
        y = drawLabel(doc, 'Browser / platform', y);
        y = drawPlain(doc, data.environment.platform, y);
        return y;
      }
    });

    pages.push({
      title: '05 · Timestamps & metadata',
      render(doc, y) {
        y = drawSectionTitle(doc, 'Timestamps & metadata', y);
        data.dateRanges.forEach(dr => {
          y = drawPlain(doc, 'Iteration ' + dr.iteration, y);
          y = drawLabel(doc, 'Testing start date', y);
          y = drawPlain(doc, dr.start || '—', y);
          y = drawLabel(doc, 'Testing end date', y);
          y = drawPlain(doc, dr.end || '—', y);
        });
        return y;
      }
    });

    pages.push({
      title: '06 · Test closure sign-off',
      render(doc, y) {
        y = drawSectionTitle(doc, 'Test closure sign-off', y);
        data.signoff.forEach(s => {
          y = drawPlain(doc, (s.signed ? '[x] ' : '[ ] ') + s.name, y);
        });
        return y;
      }
    });

    return pages;
  }

  async function generateTestClosurePdf() {
    const data = collectData();
    const pages = buildPages(data);
    const doc = createDoc();

    pages.forEach((page, i) => {
      if (i > 0) doc.addPage();
      page.render(doc, MARGIN + 6);
      drawFooter(doc, i + 1, pages.length);
    });

    return doc.output('blob');
  }

  window.generateTestClosurePdf = generateTestClosurePdf;
})();
