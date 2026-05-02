# Deploying to Firebase Hosting

This repo is pre-configured for Firebase Hosting. Follow these steps in
your **local** terminal (the only thing you need to do once is install
the CLI and log in with your Google account).

## 1. One-time setup on your machine

```sh
# install the Firebase CLI globally (or use `npx firebase-tools`)
npm install -g firebase-tools

# sign in with the Google account you want the project under
firebase login
```

`firebase login` opens a browser tab and asks for the Google account
that owns the Firebase project. Use the same account you already use
for other Google services.

## 2. Create a Firebase project (one-off, in the browser)

1. Go to <https://console.firebase.google.com/> and click **Add project**.
2. Name it (e.g. `your-name-apps`). The "project ID" Firebase shows you
   is what you'll paste into `.firebaserc` — it looks like
   `your-name-apps-12ab3` (Firebase usually adds a random suffix).
3. You can decline Google Analytics for a hobby project.

## 3. Wire this repo to your project

Edit `.firebaserc` in the repo root and replace the placeholder:

```json
{
  "projects": {
    "default": "your-name-apps-12ab3"
  }
}
```

(That's the project ID from step 2, not the display name.)

## 4. Deploy

```sh
npm run deploy
```

This is just `npm run build && firebase deploy --only hosting` under
the hood. You'll get back a URL like
`https://your-name-apps-12ab3.web.app/` — that's the live site.

## 5. (Optional) Custom domain

Firebase Console → Hosting → Add custom domain → follow the prompts.
It gives you DNS records (A or CNAME) to paste into your registrar's
DNS panel. SSL is provisioned automatically.

For multiple apps under one domain:

- Subdomains (`hr.yourdomain.com`, `app2.yourdomain.com`):
  ```sh
  firebase hosting:sites:create app2
  # then add a `hosting` array in firebase.json with `site` keys per app
  ```
  See <https://firebase.google.com/docs/hosting/multisites>.

- Subpaths (`yourdomain.com/hr`, `yourdomain.com/app2`): use
  `rewrites` in `firebase.json` to point each path at a different
  site.

## What's in this repo

- `firebase.json` — hosting config: serves `dist/`, sets cache
  headers (no-cache for `index.html`, immutable for hashed assets).
- `.firebaserc` — links the local repo to a Firebase project ID.
  **Edit this once** with your project ID, then commit it.
- `npm run deploy` — build + deploy in one command.
- `.firebase/` and `firebase-debug.log` are gitignored.
