(function () {
  let toastTimer = null;

  function config() {
    return window.TEST_CLOSURE_DRIVE || {};
  }

  function isConfigured() {
    const url = (config().uploadUrl || '').trim();
    return url.length > 0 && url.startsWith('https://script.google.com/');
  }

  function setStatus(text, type) {
    const el = document.getElementById('drive-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'drive-status' + (type ? ' drive-status-' + type : '');
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toastTimer = null;
    }, 2000);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        resolve(String(dataUrl).split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function uploadPdfToTeamDrive() {
    const uploadUrl = config().uploadUrl.trim();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const base = 'Test-Closure-' + new Date().toISOString().slice(0, 10);

    const pdfBlob = await window.generateTestClosurePdf();
    const pdfBase64 = await blobToBase64(pdfBlob);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        filename: base,
        stamp: stamp,
        pdfBase64: pdfBase64
      })
    });

    const text = await res.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error('Invalid response from upload server. Is the Apps Script URL correct?');
    }

    if (!result.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  }

  async function saveToDrive() {
    if (!isConfigured()) {
      alert('Team Drive is not set up yet. An admin must add the Apps Script URL to drive-config.js (see README).');
      return;
    }

    const btn = document.getElementById('drive-save-btn');
    const label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader"></i> Uploading…';

    try {
      await uploadPdfToTeamDrive();
      showToast('Successfully uploaded');
    } catch (err) {
      console.error(err);
      alert('Could not upload PDF: ' + err.message);
      setStatus('Upload failed. Check the Apps Script deployment.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  function initDriveUI() {
    const saveBtn = document.getElementById('drive-save-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', saveToDrive);
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => location.reload());
    }

    if (!isConfigured()) {
      setStatus('Team Drive not configured. Admin: deploy google-apps-script/Code.gs and set uploadUrl in drive-config.js.', 'warn');
      saveBtn.disabled = true;
      return;
    }

    const folderName = config().folderName || 'shared team folder';
    setStatus('Upload the closure PDF to the ' + folderName + ' on Google Drive.', 'ok');
    saveBtn.disabled = false;
  }

  window.initTestClosureDrive = initDriveUI;
  window.showToast = showToast;
})();
