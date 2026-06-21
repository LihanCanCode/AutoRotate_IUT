# 📡 AntiWifi — Shared WiFi Account Rotation System

A smart automation tool for shared router environments (like dorms or shared rooms) where multiple people share a single internet connection through ISP-assigned PPPoE accounts. AntiWifi automatically monitors usage and rotates between accounts before hitting data limits.

---

## 🏠 The Problem It Solves

> You and your roommates each have a PPPoE account from your ISP (e.g., `subamoneel`, `tahsanlihan`, `multazam`). Each account has a monthly data cap (e.g., 190GB). The router can only have one account active at a time.

**AntiWifi handles rotation automatically** — when one account is near its limit, it logs into the router and switches to the next available account.

---

## 🚀 Features

- 🔄 **Automatic rotation** — switches PPPoE credentials when usage approaches the threshold
- 🖥️ **Web dashboard** — accessible to all devices on the same WiFi
- 📊 **Usage tracking** — monitors data usage per account
- ✋ **Manual activation** — one-click switch to any account from the dashboard
- 📋 **Log viewer** — see all rotation history in the browser
- 🔒 **Persistent config** — accounts and settings survive server restarts

---

## 🛠️ Requirements

- **Node.js** v18 or higher
- **Windows/Linux/Mac** (runs on the PC connected to the router)
- The PC running this must be on the **same local network** as the TP-Link Archer C64 router (usually `192.168.0.1`)

---

## 📦 Installation (For Each Room's Setup Person)

> One person per room/flat sets this up. Roommates just open a browser link.

### Prerequisites
- Install **[Node.js](https://nodejs.org)** (LTS version) — required only on the host PC

### Step 1 — Download the project
Click **"Download ZIP"** on the GitHub page, extract it anywhere on your PC.

### Step 2 — Run the setup script (Windows)
Double-click **`setup.bat`**

This will automatically:
- Install all dependencies
- Download the browser (~170MB, one-time)

---

## ▶️ Daily Usage

Double-click **`start.bat`**

It will show your PC's IP address and start the server:

```
============================================
  Your IP address (share with roommates):

    http://192.168.0.105:3000

  Dashboard: http://localhost:3000
============================================
```

**Share that link with your roommates** — they just open it in any browser on the same WiFi. No installation needed on their devices.

---

## 🔄 Running invisibly in the background

If you don't want a black command prompt window open all the time:

1. Double-click **`start-silent.vbs`**.
2. The server will run silently in the background.

### 🖥️ Auto-Start on Windows Boot
During `setup.bat`, you will be prompted if you want the project to launch automatically in the background when Windows boots up. If you chose **Yes**, a shortcut was created in your Startup folder.

### 📊 How to stop/check it (Task Manager)
1. Open Windows **Task Manager** (`Ctrl + Shift + Esc`).
2. Look for **Node.js JavaScript Runtime** (under Background Processes).
3. If you ever need to turn it off, right-click **Node.js JavaScript Runtime** and click **End Task**.

---

## 📱 How Roommates Use It

1. Connect to the same WiFi
2. Open a browser → go to `http://<host-PC-IP>:3000`
3. They can see:
   - Who is currently using the connection
   - Each account's data usage
   - Rotation history
4. Optionally, click **Activate** to manually switch to their account

---

## 🗂️ Project Structure

```
AntiWifi/
├── index.js                  # Entry point — starts server and scheduler
├── accounts.json             # Config file (your database)
├── src/
│   ├── router.js             # Puppeteer automation for TP-Link Archer C64
│   ├── scheduler.js          # Automatic rotation scheduler
│   ├── accountManager.js     # Usage tracking and state management
│   └── logger.js             # Winston logger
├── dashboard/
│   ├── server.js             # Express API endpoints
│   ├── index.html            # Dashboard UI
│   ├── app.js                # Dashboard frontend JavaScript
│   └── style.css             # Dashboard styles
├── logs/
│   └── antiwifi.log          # Application logs
└── test_router.js            # Standalone test script for router automation
```

---

## 🔧 Troubleshooting

### Server not reachable from other devices
- Make sure Windows Firewall allows port 3000. Run in PowerShell (as admin):
  ```powershell
  New-NetFirewallRule -DisplayName "AntiWifi" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
  ```

### Router login fails
- Check that the `router.password` in `accounts.json` matches your TP-Link local admin password
- Make sure you can open `http://192.168.0.1` in a browser

### Chrome not found
```bash
npx puppeteer browsers install chrome
```

### Usage not updating
- Trigger a manual check from the dashboard by clicking **Check Now**

---

## ⚠️ Important Notes

- **This tool automates your local router only** — it does not interact with your ISP directly
- Passwords are stored in plain text in `accounts.json` — keep this file private
- The system works only while the host PC is running and connected to the router

---

## 📄 License

MIT — use freely, share with your roommates!
