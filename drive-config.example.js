// Team Google Drive upload (everyone uses the same shared folder).
// See README.md — one admin deploys the Apps Script once, then shares this config with the team.
window.TEST_CLOSURE_DRIVE = {
  // Web app URL from Apps Script deployment (ends with /exec)
  uploadUrl: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  // Optional: link to open the shared folder after upload
  folderViewUrl: 'https://drive.google.com/drive/folders/YOUR_FOLDER_ID',
  // Optional: label shown in the app
  folderName: 'Test Closures folder'
};
