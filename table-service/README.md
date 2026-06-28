# tend — live table service for Blu Hookah Lounge

A QR-based table-service app. A guest scans the QR on their table and sends a
request ("Can I get more coals when you get a chance?"). Staff see every request
glow in **live** on a dashboard — and watch it cool from ember to ash the longer
it waits. Tap **On the way** and the guest sees the confirmation instantly.

This version is wired for **real, live, cross-device communication** using
**Cloud Firestore** (Firebase's realtime database), with a no-setup local
fallback so it works the moment you open it.

## Files

| File | What it is |
|------|------------|
| `index.html` | Launcher — links to the dashboard, a guest preview, and the **table manager** where you add/delete tables and mint/regenerate/print their QR codes. |
| `guest.html` | The guest phone view. Opens from a table's QR (`?table=07&section=khalil&server=Khalil`). |
| `staff.html` | The staff dashboard. Live queue of open requests. |
| `store.js` | Shared data layer — Firestore when configured, live cross-tab fallback otherwise. |
| `config.js` | **Where you paste your Firebase keys.** |
| `qrcode.js` | Bundled QR generator (MIT, `qrcode-generator`). No CDN — works offline. |
| `firestore.rules` | Security rules to publish in the Firebase console. |

## Try it right now (no setup)

Open `index.html`, or serve the folder and visit it:

```bash
python3 -m http.server 8000
# http://localhost:8000/table-service/
```

Open **`staff.html`** in one tab and a **`guest.html?table=07`** in another.
Send a request from the guest tab — it appears live on the staff tab; tap **On
the way** and the guest tab updates. (Out of the box this uses a local
same-device sync so you can see the flow. For real phone-to-iPad communication,
turn on Firebase below.)

## Turn on real cross-device sync (Firebase / "cloud fire")

About 5 minutes, free tier is plenty.

1. Go to <https://console.firebase.google.com> → **Add project**.
2. **Build → Firestore Database → Create database** → start in **production mode**.
3. **Project settings (gear) → Your apps → Web (`</>`)** → register an app.
   Firebase shows you a `firebaseConfig = { ... }` object.
4. Copy those values into **`config.js`** (replace the `YOUR_…` placeholders).
5. **Firestore → Rules** tab → paste the contents of **`firestore.rules`** → **Publish**.

That's it. Reload the pages — the banners now say *"Real-time via Firestore"*,
and a guest phone anywhere talks to the staff dashboard anywhere.

> The web config values are **not secrets** — they're meant to ship in the
> browser. Your data is protected by the security rules, not by hiding the keys.
> The demo rules are open so login isn't required; tighten them with Firebase
> Auth before real production use (notes are inline in `firestore.rules`).

## Print the table QR codes

On `index.html`, under **Tables & QR codes**:

- **Add a table** — type a number (or leave blank to auto-increment) plus the
  section/server, and hit **＋ Add table**. **＋ Add range…** mints a batch (e.g.
  `1-10`) in one go.
- **Regenerate** — re-mint a table's QR after you change its section/server.
- **Delete** — remove a table you no longer use.
- **Print all** — every card prints as a fold-into-a-tent QR.

Your table list is saved on the device. Each QR opens the guest page with that
table number already filled in, so a scan drops the guest straight onto the
right table. The QR encodes an absolute URL, so once this is hosted (see below)
the printed codes work from any phone.

## Host it live (GitHub Pages)

This lives in the `table-service/` folder of the repo. Enable
**Settings → Pages → Source: `main` / root**, and it will be live at:

```
https://<your-username>.github.io/<repo-name>/table-service/
```

Generate the QR codes from that hosted URL (not localhost) so the printed codes
point at the public site.

## Data model

`venues/{venue}/requests/{id}`:

```
table     "07"            seat     "Khalil's section"
section   "khalil"        msg      "Can I get more coals…"
voice     false           status   "open" | "otw" | "done"
staffReply "On my way 👍"  createdAt / updatedAt  (server timestamps)
```

Guests write a request and subscribe to its status; the dashboard subscribes to
all non-done requests ordered newest-first. Cooling and "on the way" states are
driven by `createdAt` and `status`.
