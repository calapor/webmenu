# App Menu

A personal home-server app launcher. A grid of tiles (name + image) that open
in a single shared browser tab. Links are stored **server-side** in a JSON file
so every visitor on the network sees the same set, with full add / edit / delete
in the UI.

The page is split into two regions:

- **Projects** — work-related links and tools.
- **Bookmarks** — saved sites and services.

Each tile carries a `category` (`project` | `bookmark`) chosen via the **Region**
toggle in the add/edit modal, so items can be (re)classified at any time. Each
region has its own **Add** button that presets the category. Items saved before
this feature default to **Projects**.

## Features

- **Two-region layout** — Projects and Bookmarks with independent Add buttons
- **Full CRUD in the UI** — add, edit, and delete tiles without touching config files
- **Inline image upload** — drag or pick any image (≤ 1.5 MB); stored as a data URL alongside the link
- **Tab reuse** — every link targets the same named window (`app-window`) so clicking any tile reuses one tab instead of opening new ones
- **Server-side shared storage** — all visitors see the same link set; changes are instantly visible to everyone on the network
- **No database** — data lives in a single JSON file, easy to back up or edit by hand

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The page is `src/app/page.tsx`; the storage API is `src/app/api/apps/route.ts`.
Locally the store is written to `./data/apps.json` (gitignored).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATA_DIR` | `<cwd>/data` | Directory where `apps.json` is stored. Override to keep data outside the app directory. |
| `PORT` | `3000` | Port for `next start`. Pass via `-p` flag (e.g. `npm start -- -p 4000`). |

Example — store data in a persistent location:

```bash
DATA_DIR=/var/lib/webmenu/data npm start -- -p 4000
```

---

## Production deployment

Deploy to a home server running Linux with systemd and Apache (or nginx).

- Next.js runs on **port 4000**, managed by **systemd** (`webmenu` service).
- **Apache** reverse-proxies public **port 80** → `localhost:4000`.
- Shared link data lives at `~/webmenu/data/apps.json` on the server.
- Public URL: `http://<your-server-ip>`

### Deploy a change (build → sync → restart)

Run from your Mac:

```bash
pnpm build
rsync -az --exclude node_modules --exclude .git --exclude data \
  ./ <username>@<your-server-ip>:~/webmenu/
ssh <username>@<your-server-ip> 'sudo systemctl restart webmenu'
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

Service unit is at `deploy/webmenu.service` — it is a **template**; replace
`<username>` with your actual Linux username before installing:

```bash
sed 's/<username>/yourname/g' deploy/webmenu.service \
  | sudo tee /etc/systemd/system/webmenu.service
```

---

## One-time server setup

Steps to perform on a fresh server.

1. **Node 20+ via nvm** (Next.js 16 requires Node ≥ 20.9):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   nvm install 20
   ```

2. **App code + dependencies:**
   ```bash
   # from your Mac:
   rsync -az --exclude node_modules --exclude .git ./ <username>@<your-server-ip>:~/webmenu/
   # on the server:
   cd ~/webmenu && npm install --legacy-peer-deps
   ```

3. **systemd service** (substitute your username first — see above):
   ```bash
   sed 's/<username>/yourname/g' ~/webmenu/deploy/webmenu.service \
     | sudo tee /etc/systemd/system/webmenu.service
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
   echo '<username> ALL=(root) NOPASSWD: /usr/bin/systemctl restart webmenu' \
     | sudo tee /etc/sudoers.d/webmenu
   ```

---

## Notes

- **No authentication.** Anyone who can reach the page can add, edit, or delete
  links. Fine for a trusted home network; before exposing it more broadly,
  add a layer such as:
  - Apache/nginx HTTP basic auth
  - VPN-only access (WireGuard, Tailscale)
  - Firewall rules restricting the port to specific IPs
- **iOS Safari** does not reliably reuse per-app named tabs, which is why all
  links share the single `app-window` target.
