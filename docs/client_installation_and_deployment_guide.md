# CITY LINK (Engineering & Services) - Client Installation & Deployment Guide

## 📦 Software Package Information
- **Official Application Name**: CITY LINK (Engineering & Services)
- **Software Version**: v1.0.0
- **Installer Executable**: `release/CITY LINK Setup 1.0.0.exe` (File Size: ~77 MB)
- **Installer Type**: Windows NSIS Installation Wizard (x64)

---

## 🚀 Quick Start Guide for End Clients

### Step 1: Install the Application
1. Double-click **`CITY LINK Setup 1.0.0.exe`**.
2. Select your preferred installation directory (Default: `C:\Program Files\CITY LINK (Engineering & Services)`).
3. Ensure **"Create Desktop Shortcut"** and **"Create Start Menu Shortcut"** are checked.
4. Click **Install**, then click **Finish** to launch the software.

### Step 2: Login
1. Launch **CITY LINK (Engineering & Services)** from the Desktop shortcut.
2. Sign in using the default Super Admin credentials:
   - **Username**: `superadmin`
   - **Password**: `Password123!`

---

## 🌐 Office LAN Architecture & Multi-PC Setup

### Central Server PC (Primary Office Computer)
- Install **`CITY LINK Setup 1.0.0.exe`** on the primary office PC.
- When launched, the application automatically starts the central backend engine and database on port `5000`.
- The main window displays the server's local LAN IP endpoint (e.g. `http://192.168.10.6:5000`).

### Staff / Client PCs on Office Network
- Other authorized staff members can open any web browser (Chrome, Edge) on their PC connected to the office LAN and navigate to:
  `http://<SERVER_IP>:5000`
- Staff members log in with their assigned Operator accounts created by Super Admin in **User Management** (`/users`).

---

## 💾 Persistent Business Data & Backup Management

- **Database Location**: Business data is automatically stored outside temporary installation directories in Windows AppData:
  `%APPDATA%\CITY LINK (Engineering & Services)\data\dev.db`
- **Data Persistence**: Reinstalling, updating, or rebooting the PC will **NEVER** overwrite existing quotations, invoices, purchase orders, or customer records.
- **Automated Backup**: The system runs automatic daily database backups at 12:00 AM stored at:
  `C:\EIPMS_Backups\`
