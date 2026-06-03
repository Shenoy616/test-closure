/**
 * Test Closure — shared team upload to Google Drive
 *
 * Deploy as Web app:
 *   Execute as: Me
 *   Who has access: Anyone (or Anyone within your organization)
 *
 * Script property (Project settings → Script properties):
 *   UPLOAD_FOLDER_ID = <Google Drive folder ID>
 */
var PROP_FOLDER = 'UPLOAD_FOLDER_ID';

function doGet() {
  return jsonResponse({ ok: true, service: 'Test Closure team upload' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request body');
    }

    var payload = JSON.parse(e.postData.contents);
    var folderId = PropertiesService.getScriptProperties().getProperty(PROP_FOLDER);
    if (!folderId) {
      throw new Error('Set UPLOAD_FOLDER_ID in Script properties (see README)');
    }

    var folder = DriveApp.getFolderById(folderId);
    var base = sanitizeFilename(payload.filename || 'Test-Closure');
    var stamp = payload.stamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd-HHmmss");
    var unique = base + '-' + stamp;
    var files = [];

    if (!payload.pdfBase64) {
      throw new Error('Missing PDF in upload payload');
    }

    var pdfBytes = Utilities.base64Decode(payload.pdfBase64);
    var pdf = folder.createFile(Utilities.newBlob(pdfBytes, 'application/pdf', unique + '.pdf'));
    files.push({ name: pdf.getName(), id: pdf.getId() });

    return jsonResponse({
      ok: true,
      folderId: folderId,
      files: files
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err.message || err)
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeFilename(name) {
  return String(name).replace(/[^\w.-]+/g, '_').slice(0, 80);
}

/**
 * Run once from the Apps Script editor to create a team folder and log its ID.
 * Copy the logged ID into Script properties as UPLOAD_FOLDER_ID.
 */
function createTeamFolder() {
  var folder = DriveApp.createFolder('Test Closures');
  Logger.log('Created folder. Set UPLOAD_FOLDER_ID to: ' + folder.getId());
  Logger.log('Share this folder with your team (Editor or Contributor).');
  Logger.log('Folder URL: ' + folder.getUrl());
}
