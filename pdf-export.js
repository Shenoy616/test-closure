/**
 * Test Closure — PDF via visible section screenshots (one page each).
 */
(function () {
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

  function showOverlay(text) {
    let el = document.getElementById('pdf-gen-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pdf-gen-overlay';
      el.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:999999',
        'background:rgba(247,246,243,0.97)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'font-family:DM Sans,sans-serif', 'font-size:15px', 'font-weight:600',
        'color:#1A1917'
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.display = 'flex';
  }

  function hideOverlay() {
    const el = document.getElementById('pdf-gen-overlay');
    if (el) el.style.display = 'none';
  }

  function expandAllSections() {
    document.querySelectorAll('.section-body').forEach(b => b.classList.add('open'));
    document.querySelectorAll('.sec-chevron').forEach(c => c.classList.add('open'));
  }

  function saveSectionState() {
    return Array.from(document.querySelectorAll('.section-body')).map(b => b.classList.contains('open'));
  }

  function restoreSectionState(wasOpen) {
    document.querySelectorAll('.section-body').forEach((b, i) => {
      if (!wasOpen[i]) b.classList.remove('open');
    });
    document.querySelectorAll('.sec-chevron').forEach((c, i) => {
      if (!wasOpen[i]) c.classList.remove('open');
    });
  }

  function isCanvasBlank(canvas) {
    if (!canvas.width || !canvas.height) return true;
    const ctx = canvas.getContext('2d');
    const w = Math.min(80, canvas.width);
    const h = Math.min(80, canvas.height);
    const data = ctx.getImageData(0, 0, w, h).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 10) return false;
    }
    return true;
  }

  async function screenshot(el) {
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    await delay(200);

    const canvas = await getHtml2Canvas()(el, {
      scale: SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY
    });

    if (isCanvasBlank(canvas)) {
      throw new Error('Screenshot was blank. Please try again.');
    }
    return canvas;
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
    doc.addImage(
      img,
      'JPEG',
      PAGE_MARGIN + (maxW - w) / 2,
      PAGE_MARGIN + (maxH - h) / 2,
      w,
      h
    );
  }

  function insertCoverBlock() {
    const pageWrap = document.querySelector('.page-wrap');
    const block = document.createElement('div');
    block.id = 'pdf-cover-temp';
    block.style.cssText = 'padding:48px 24px 40px;text-align:center;background:#F7F6F3;';

    const logo = document.querySelector('.app-logo');
    const header = document.querySelector('.app-header-text');
    if (logo) block.appendChild(logo.cloneNode(true));
    if (header) block.appendChild(header.cloneNode(true));

    pageWrap.insertBefore(block, pageWrap.firstChild);
    return block;
  }

  function getCaptureTargets() {
    const pageWrap = document.querySelector('.page-wrap');
    const cover = document.getElementById('pdf-cover-temp');
    const sections = pageWrap.querySelectorAll('.section-card');
    return cover ? [cover, ...sections] : [...sections];
  }

  async function generateTestClosurePdf() {
    const wasOpen = saveSectionState();
    const actionBar = document.getElementById('action-bar');
    const savedDisplay = actionBar?.style.display ?? '';

    showOverlay('Generating PDF…');
    expandAllSections();
    await delay(400);

    if (actionBar) actionBar.style.display = 'none';

    const coverBlock = insertCoverBlock();
    await delay(150);

    const doc = new (getJsPDF())({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const targets = getCaptureTargets();
    let firstPage = true;

    try {
      for (let i = 0; i < targets.length; i++) {
        showOverlay('Generating PDF… (' + (i + 1) + '/' + targets.length + ')');
        const canvas = await screenshot(targets[i]);
        addCanvasPage(doc, canvas, firstPage);
        firstPage = false;
      }
      return doc.output('blob');
    } finally {
      coverBlock.remove();
      if (actionBar) actionBar.style.display = savedDisplay;
      restoreSectionState(wasOpen);
      hideOverlay();
      window.scrollTo(0, 0);
    }
  }

  window.generateTestClosurePdf = generateTestClosurePdf;
})();
