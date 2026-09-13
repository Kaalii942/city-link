# EIPMS Windows Installation & Deployment Guide

This guide details steps to install, configure, and host the **Enterprise Inventory & Procurement Management System (EIPMS)** offline on a Local Office Windows Server and client stations.

---

## 🖥️ Server Installation & Database Setup

### Step 1: Install SQL Server 2022 on the Host Server
1. Download **SQL Server 2022 Express** or standard edition.
2. Run the installer and choose **Custom Installation**.
3. Set the instance name to `MSSQLSERVER` (default instance) or `SQLEXPRESS`.
4. Under **Authentication Mode**, choose **Mixed Mode**.
   - Set a strong password for the system administrator (`sa`) account (e.g. `SecurePassword123!`).
5. Complete installation.

### Step 2: Configure SQL Server Network Configuration for LAN access
To allow office client stations to connect over the LAN network:
1. Open the **SQL Server Configuration Manager**.
2. Expand **SQL Server Network Configuration** &rarr; **Protocols for MSSQLSERVER**.
3. Double-click **TCP/IP** and set it to **Enabled**.
4. Right-click TCP/IP and open **Properties**. Under the **IP Addresses** tab:
   - Scroll down to the **IPAll** section.
   - Set the **TCP Port** to `1433`.
   - Click OK.
5. Go to **SQL Server Services** and restart the **SQL Server** service.

### Step 3: Configure Windows Firewall
To permit network traffic to the SQL Server port:
1. Open **Windows Defender Firewall with Advanced Security**.
2. Click **Inbound Rules** &rarr; **New Rule**.
3. Select **Port** and click Next.
4. Choose **TCP** and specify port `1433`.
5. Select **Allow the connection**.
6. Check Domain, Private, and Public options. Name the rule `SQL Server LAN Access` and click Finish.

---

## 🚀 API Server Deployment on Windows Server

To run the Node.js API server as a background Windows Service:

### Step 1: Install Node.js on the Server
- Download and install Node.js `v22` (LTS) on the host Windows Server.

### Step 2: Deploy Backend Code and Configure Environment
1. Copy the backend folders (`apps/backend`, `packages/*`, `package.json`, `tsconfig.json`) to the server directory (e.g. `C:\EIPMS_Server`).
2. Run `npm install --omit=dev` inside the root directory.
3. Create a `.env` file inside `C:\EIPMS_Server` and configure variables:
   ```env
   PORT=5000
   NODE_ENV=production
   DATABASE_URL="sqlserver://localhost:1433;database=eipms;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true;"
   JWT_SECRET="generate-a-long-secure-random-secret-key-32-chars"
   JWT_REFRESH_SECRET="generate-another-long-secure-random-refresh-secret-key"
   BACKUP_DIR="C:\EIPMS_Backups"
   UPLOAD_DIR="C:\EIPMS_Uploads"
   LOG_LEVEL=info
   ```
4. Run migrations and seed tables:
   ```bash
   npm run build:packages
   npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
   npx prisma db seed --schema=packages/database/prisma/schema.prisma
   ```

### Step 3: Register API Server as a Windows Service
To ensure the backend starts automatically when the Windows Server boots, use **PM2** and **pm2-windows-service**:
```bash
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Register PM2 startup script
pm2-startup install

# Start Express server via PM2
pm2 start apps/backend/dist/server.js --name "eipms-api"

# Save PM2 state
pm2 save
```

---

## 💻 Client Stations Installation

For employee computers to run the system:

### Option A: Distribute Desktop Installer (Recommended)
1. Run the electron-builder packaging on a developer machine:
   ```bash
   npm run dist --workspace=apps/desktop
   ```
2. Distribute the generated `EIPMS Enterprise Setup.exe` from `apps/desktop/dist/` to employees.
3. Run the installer on each computer. It installs the app and creates a desktop shortcut.

### Option B: Local Environment Configuration
On launch, the client app needs to resolve the API server's LAN IP address:
1. In the installer bundle or config environment on client computers, set the proxy target or direct request URL (e.g., edit the hosts file or direct requests to `http://<server-lan-ip>:5000`).
2. Alternatively, compile the React frontend with the server URL hardcoded:
   - Edit `apps/frontend/src/utils/api.ts` to replace relative paths with `http://<server-lan-ip>:5000`.
   - Compile and package the client desktop app.
