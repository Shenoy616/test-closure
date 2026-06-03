# Test Closure

A single-page form for test closure sign-off, with **shared team upload** to Google Drive.

## Run locally

```bash
cd "/Users/gopalakrishnashenoy/Desktop/Projects/Test Closure "
python3 -m http.server 8891
```

Open [http://localhost:8891/Test%20Closure.html](http://localhost:8891/Test%20Closure.html)

---

## Shared Google Drive (everyone can upload)

One person on the team sets this up **once**. After that, anyone using the app can click **Upload to team Drive** — no OAuth client ID per user, no individual sign-in.

Files land in one shared folder (PDF + JSON per submission).

### Step 1 — Create the team folder

1. In [Google Drive](https://drive.google.com), create a folder (e.g. **Test Closures**).
2. **Share** it with everyone who should upload or view:
   - **Contributor** or **Content manager** — can upload via the app (files are created by the script owner).
   - **Viewer** — can only read files.
3. Copy the **folder ID** from the URL:  
   `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### Step 2 — Deploy the upload script (admin, ~10 min)

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Paste the contents of `google-apps-script/Code.gs` into `Code.gs`.
3. **Project settings** (gear) → **Script properties** → Add:

   | Property | Value |
   |----------|--------|
   | `UPLOAD_FOLDER_ID` | Your folder ID from Step 1 |

4. **Run** `createTeamFolder` once if you prefer the script to create the folder (optional — then set `UPLOAD_FOLDER_ID` from the execution log).
5. **Authorize** the script when prompted (Drive access).
6. **Deploy** → **New deployment** → type **Web app**:
   - **Execute as:** Me (your account — files are saved to the shared folder you own/manage)
   - **Who has access:**  
     - **Anyone within [your company]** — recommended for internal teams  
     - or **Anyone** — if the HTML app is hosted where all users can reach it
7. Copy the **Web app URL** (ends with `/exec`).

### Step 3 — Configure the HTML app

Edit `drive-config.js`:

```javascript
window.TEST_CLOSURE_DRIVE = {
  uploadUrl: 'https://script.google.com/macros/s/xxxx/exec',
  folderViewUrl: 'https://drive.google.com/drive/folders/YOUR_FOLDER_ID',
  folderName: 'Test Closures folder'
};
```

Share the whole project folder (or at least `drive-config.js` with the URL filled in) with the team.

### Step 4 — Use the app

1. Fill out the form.
2. Click **Upload to team Drive**.
3. PDF and JSON are saved with a timestamp, e.g. `Test-Closure-2026-06-03-143052.pdf`.

**Download** still saves a PDF only on the user’s computer.

---

## Hosting for the whole team

The HTML app must be served over **http/https** (not `file://`) so uploads work. Options:

- Internal static host (S3, GitHub Pages, company intranet)
- Keep using `python3 -m http.server` on a shared machine (dev only)
- Add your production URL to Apps Script if you restrict deployment to your domain

---

## Files

| File | Purpose |
|------|---------|
| `Test Closure.html` | Main app |
| `drive.js` | Upload to team Drive via Apps Script |
| `drive-config.js` | Team upload URL + folder link |
| `google-apps-script/Code.gs` | Backend that writes to the shared folder |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Team Drive not configured” | Set `uploadUrl` in `drive-config.js` |
| Upload fails / invalid response | Redeploy Apps Script; use the latest `/exec` URL |
| Permission denied | Re-authorize the script; check `UPLOAD_FOLDER_ID` |
| Users can’t see files | Share the Drive folder with them (Viewer or above) |
