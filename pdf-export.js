/**
 * Test Closure — PDF via section screenshots (one page per section).
 */
(function () {
  const CAPTURE_W = 780;
  const SCALE = 2;
  const JPEG_QUALITY = 0.92;
  const PAGE_MARGIN = 10;

  function getJsPDF() {
    const Ctor = window.jspdf?.jsPDF;
    if (!Ctor) throw new Error('PDF engine not loaded. Refresh the page.');
    return Ctor;
  }

  function getHtml2Canvas() {
    if (typeof html2canvas !== 'function') {
      throw new Error('Screenshot library not loaded. Refresh the page.');
    }
    return html2canvas;
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function expandAllSections() {
    document.querySelectorAll('.section-body').forEach(b => b.classList.add('open'));
    document.querySelectorAll('.sec-chevron').forEach(c => c.classList.add('open'));
  }

  function saveSectionState() {
    const bodies = document.querySelectorAll('.section-body');
    return Array.from(bodies).map(b => b.classList.contains('open'));
  }

  function restoreSectionState(wasOpen) {
    const bodies = document.querySelectorAll('.section-body');
    const chevrons = document.querySelectorAll('.sec-chevron');
    bodies.forEach((b, i) => {
      if (!wasOpen[i]) b.classList.remove('open');
    });
    chevrons.forEach((c, i) => {
      if (!wasOpen[i]) c.classList.remove('open');
    });
  }

  function mountCaptureNode(node) {
    node.className = (node.className ? node.className + ' ' : '') + 'pdf-capture-node';
    node.style.width = CAPTURE_W + 'px';
    node.style.boxSizing = 'border-box';
    node.style.position = 'fixed';
    node.style.left = '0';
    node.style.top = '0';
    node.style.zIndex = '99998';
    node.style.opacity = '0.01';
    node.style.pointerEvents = 'none';
    node.style.background = '#F7F6F3';
    document.body.appendChild(node);
    return node;
  }

  function buildCoverNode() {
    const wrap = document.createElement('div');
    wrap.style.padding = '40px 32px 48px';
    wrap.style.textAlign = 'center';
    wrap.style.background = '#F7F6F3';

    const logo = document.querySelector('.app-logo');
    const header = document.querySelector('.app-header-text');
    if (logo) wrap.appendChild(logo.cloneNode(true));
    if (header) wrap.appendChild(header.cloneNode(true));

    return mountCaptureNode(wrap);
  }

  function cloneSectionForCapture(card) {
    const clone = card.cloneNode(true);
    const origFields = card.querySelectorAll('input, textarea, select');
    const cloneFields = clone.querySelectorAll('input, textarea, select');
    origFields.forEach((orig, i) => {
      const field = cloneFields[i];
      if (!field || orig.tagName !== field.tagName) return;
      if (field.type === 'checkbox') field.checked = orig.checked;
      else field.value = orig.value;
    });

    const body = clone.querySelector('.section-body');
    if (body) body.classList.add('open');
    const chev = clone.querySelector('.sec-chevron');
    if (chev) chev.classList.add('open');
    const head = clone.querySelector('.section-head');
    if (head) head.removeAttribute('onclick');

    clone.querySelectorAll('.ql-toolbar').forEach(t => { t.style.display = 'none'; });
    if (clone.querySelector('#risk-editor') && window.riskQuill) {
      const editorHtml = document.querySelector('#risk-editor .ql-editor')?.innerHTML;
      const slot = clone.querySelector('#risk-editor');
      if (editorHtml && slot) {
        const box = document.createElement('div');
        box.className = 'pdf-risk-snapshot';
        box.style.cssText = 'font-size:13px;line-height:1.6;padding:8px 0;min-height:60px;';
        box.innerHTML = editorHtml;
        slot.innerHTML = '';
        slot.appendChild(box);
      }
    }

    return mountCaptureNode(clone);
  }

  async function screenshot(el) {
    return getHtml2Canvas()(el, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: CAPTURE_W,
      windowWidth: CAPTURE_W,
      scrollY: -window.scrollY,
      scrollX: 0
    });
  }

  function addCanvasPage(doc, canvas, isFirstPage) {
    const img = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = pageW - PAGE_MARGIN * 2;
    const maxH = pageH - PAGE_MARGIN * 2;

    let w = maxW;
    let h = (canvas.height * w) / canvas.width;
    if (h > maxH) {
      h = maxH;
      w = (canvas.width * h) / canvas.height;
    }

    if (!isFirstPage) doc.addPage();
    const x = PAGE_MARGIN + (maxW - w) / 2;
    const y = PAGE_MARGIN + (maxH - h) / 2;
    doc.addImage(img, 'JPEG', x, y, w, h);
  }

  async function generateTestClosurePdf() {
    const wasOpen = saveSectionState();
    const actionBar = document.getElementById('action-bar');
    const actionBarDisplay = actionBar?.style.display || '';

    expandAllSections();
    await delay(350);

    if (actionBar) actionBar.style.display = 'none';

    const doc = new (getJsPDF())({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const tempNodes = [];
    let firstPage = true;

    try {
      const cover = buildCoverNode();
      tempNodes.push(cover);
      await delay(80);
      const coverCanvas = await screenshot(cover);
      addCanvasPage(doc, coverCanvas, firstPage);
      firstPage = false;

      const cards = document.querySelectorAll('.page-wrap .section-card');
      for (const card of cards) {
        const node = cloneSectionForCapture(card);
        tempNodes.push(node);
        await delay(80);
        const canvas = await screenshot(node);
        addCanvasPage(doc, canvas, firstPage);
        firstPage = false;
      }

      return doc.output('blob');
    } finally {
      tempNodes.forEach(n => n.remove());
      if (actionBar) actionBar.style.display = actionBarDisplay;
      restoreSectionState(wasOpen);
    }
  }

  window.generateTestClosurePdf = generateTestClosurePdf;
})();
