(function () {
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

  function collectFormData() {
    const dateRanges = [];
    document.querySelectorAll('#meta-date-ranges .date-range').forEach((block, i) => {
      const start = block.querySelector('.meta-start-date');
      const end = block.querySelector('.meta-end-date');
      dateRanges.push({
        iteration: i + 1,
        startDate: start?.value || '',
        endDate: end?.value || ''
      });
    });

    return {
      savedAt: new Date().toISOString(),
      links: {
        shortcut: document.getElementById('shortcut-link')?.value || '',
        pr: document.getElementById('pr-link')?.value || '',
        testomata: document.getElementById('testomata-link')?.value || '',
        defects: document.querySelector('#body-links textarea')?.value || ''
      },
      checklist: { ...(window.checkState || {}) },
      checklistBoxes: { ...(window.checkBoxState || {}) },
      risksHtml: window.riskQuill ? window.riskQuill.root.innerHTML : '',
      environment: {
        browser: document.getElementById('env-browser')?.value || '',
        device: document.getElementById('env-device')?.value || '',
        platform: document.getElementById('env-platform')?.value || ''
      },
      dateRanges,
      signoff: { ...(window.checkBoxState || {}) }
    };
  }

  async function uploadToTeamDrive() {
    const uploadUrl = config().uploadUrl.trim();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const base = 'Test-Closure-' + new Date().toISOString().slice(0, 10);

    const pdfBlob = await window.generateTestClosurePdf();
    const pdfBase64 = await blobToBase64(pdfBlob);
    const json = JSON.stringify(collectFormData(), null, 2);

    const res = await fetch(uploadUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        filename: base,
        stamp: stamp,
        pdfBase64: pdfBase64,
        json: json
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
      const result = await uploadToTeamDrive();
      const names = (result.files || []).map(f => f.name).join(', ');
      setStatus('Uploaded to team Drive: ' + names, 'ok');

      const folderUrl = (config().folderViewUrl || '').trim();
      if (folderUrl) {
        const open = confirm('Uploaded successfully. Open the team folder in Google Drive?');
        if (open) window.open(folderUrl, '_blank', 'noopener');
      }
    } catch (err) {
      console.error(err);
      alert('Could not upload to team Drive: ' + err.message);
      setStatus('Upload failed. Ask your admin to check the Apps Script deployment.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  function initDriveUI() {
    const saveBtn = document.getElementById('drive-save-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', saveToDrive);

    if (!isConfigured()) {
      setStatus('Team Drive not configured. Admin: deploy google-apps-script/Code.gs and set uploadUrl in drive-config.js.', 'warn');
      saveBtn.disabled = true;
      return;
    }

    const folderName = config().folderName || 'shared team folder';
    setStatus('Anyone on the team can upload PDF + data to the ' + folderName + ' on Google Drive.', 'ok');
    saveBtn.disabled = false;
  }

  window.initTestClosureDrive = initDriveUI;
})();
