# Conductor Central

A contemporary app-launcher dashboard. A grid of app tiles (name + image) that
open in a single shared browser tab. Links are stored **server-side** so every
visitor sees the same set, with full add / edit / delete in the UI.

The page is split into two regions:

- **Projects** — Conductor & project-related work.
- **Bookmarks** — saved links.

Each tile carries a `category` (`project` | `bookmark`) chosen via the **Region**
toggle in the add/edit modal, so items can be (re)classified at any time. Each
region has its own **Add** button that presets the category. Items saved before
this feature default to **Projects**.

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript
- **Storage:** shared JSON file on the server via `GET`/`PUT /api/apps`
  (no database). Images are uploaded inline as data URLs.
- **Tab behaviour:** every link targets one named window (`app-window`), so
  clicking any app reuses that tab instead of piling up new ones.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The page is `src/app/page.tsx`; the storage API is `src/app/api/apps/route.ts`.
Locally the store is written to `./data/apps.json` (gitignored).

---

## Production deployment

The app is deployed to the home server at **192.168.1.92**:

- Next.js runs on **port 4000**, managed by **systemd** (`webmenu` service).
- **Apache** reverse-proxies public **port 80** → `localhost:4000`.
- Shared link data lives at `~/webmenu/data/apps.json` on the server.
- Public URL: **http://192.168.1.92**

### Deploy a change (build → sync → restart)

Run from this workspace on your Mac:

```bash
pnpm build
rsync -az --exclude node_modules --exclude .git --exclude data \
  ./ roconnor@192.168.1.92:~/webmenu/
ssh roconnor@192.168.1.92 'sudo systemctl restart webmenu'
```

> **A restart is mandatory after every deploy.** `next start` loads the build
> into memory at startup; rsync alone updates files on disk but the running
> process keeps serving the old build until restarted. (Skipping this was the
> cause of several "my change didn't show up" issues.)
>
> The `--exclude data` flag protects the live link store from being touched.

### Startup / process management (systemd)

The service auto-starts on boot and restarts on crash.

```bash
sudo systemctl status webmenu      # health + recent logs
sudo systemctl restart webmenu     # apply a new build
journalctl -u webmenu -f           # follow logs
```

Service unit (versioned at `deploy/webmenu.service`):

```ini
[Unit]
Description=App Menu (Next.js)
After=network.target

[Service]
Type=simple
User=roconnor
WorkingDirectory=/home/roconnor/webmenu
Environment=NODE_ENV=production
Environment=NVM_DIR=/home/roconnor/.nvm
ExecStart=/bin/bash -lc "source /home/roconnor/.nvm/nvm.sh && exec npm start -- -p 4000"
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## One-time server setup

Steps already performed on 192.168.1.92; documented for a rebuild.

1. **Node 20+ via nvm** (Next.js 16 requires Node ≥ 20.9; the system Node 18 is
   too old):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   nvm install 20
   ```

2. **App code + dependencies:**
   ```bash
   # from the Mac:
   rsync -az --exclude node_modules --exclude .git ./ roconnor@192.168.1.92:~/webmenu/
   # on the server:
   cd ~/webmenu && npm install --legacy-peer-deps
   ```

3. **systemd service:**
   ```bash
   sudo cp ~/webmenu/deploy/webmenu.service /etc/systemd/system/webmenu.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now webmenu
   ```

4. **Apache reverse proxy** (`/etc/apache2/sites-available/webmenu.conf`):
   ```apache
   <VirtualHost *:80>
       ProxyPreserveHost On
       ProxyPass / http://localhost:4000/
       ProxyPassReverse / http://localhost:4000/
   </VirtualHost>
   ```
   ```bash
   sudo a2enmod proxy proxy_http
   sudo a2ensite webmenu && sudo a2dissite 000-default
   sudo systemctl reload apache2
   ```

5. **Passwordless restart** so deploys don't prompt for a password:
   ```bash
   echo 'roconnor ALL=(root) NOPASSWD: /usr/bin/systemctl restart webmenu' \
     | sudo tee /etc/sudoers.d/webmenu
   ```

---

## Notes

- **No authentication.** Anyone who can reach the page on the LAN can add, edit,
  or delete links. Fine for a home network; lock it down before exposing it.
- **iOS Safari** does not reliably reuse per-app named tabs, which is why all
  links share the single `app-window` target.
