# Oracle Cloud Infrastructure (OCI) Always Free Deployment Guide

This guide walks you step-by-step through deploying **VideoSense AI** (Frontend, FastAPI Backend, and PostgreSQL Database) completely **100% Free** on an **Oracle Cloud Ampere A1** Compute instance.

---

## 🌟 Why Oracle Cloud Always Free?

| Resource | Specification | Notes |
| :--- | :--- | :--- |
| **Processor** | 4 OCPU Ampere A1 (ARM64) | High throughput for AI inference |
| **RAM** | 24 GB RAM | Massive headroom for PyTorch, YOLO, and Whisper |
| **Storage** | 200 GB NVMe Block Volume | Permanent storage for videos, models & DB |
| **Network** | 10 TB/month Outbound Bandwidth | Free static IPv4 address included |
| **Cost** | **$0.00 / month forever** | Oracle Always Free Tier |

---

## 📋 Step 1: Create Your Free Ampere A1 Compute Instance

1. Log into your [Oracle Cloud Console](https://cloud.oracle.com).
2. From the navigation hamburger menu (☰), go to:
   **Compute** ➔ **Instances** ➔ Click **Create instance**.
3. **Name your instance**: e.g., `videosense-ai-server`.
4. **Placement**: Leave default Availability Domain.
5. **Image and Shape**:
   - Click **Change image** ➔ Select **Canonical Ubuntu 22.04** or **Ubuntu 24.04**.
   - Click **Change shape** ➔ Select **Ampere (Arm-based processor)**:
     - Shape: `VM.Standard.A1.Flex`
     - OCPUs: **4**
     - Memory: **24 GB**
     - *(Note the green badge saying "Always Free Eligible")*.
6. **Networking**:
   - Select **Create new virtual cloud network (VCN)** (or use existing).
   - Ensure **Assign a public IPv4 address** is set to **Yes**.
7. **Add SSH keys**:
   - Choose **Generate a key pair for me** ➔ Click **Save private key** (save `ssh-key-....key` safely on your laptop).
8. **Boot Volume**:
   - Check **Specify a custom boot volume size** ➔ Enter **200 GB** (the full Always Free allowance).
9. Click **Create**.
   - Your instance will change from *Provisioning* to **Running** in about 1-2 minutes.
   - Note the **Public IP Address** (e.g., `150.136.x.x`).

---

## 🔓 Step 2: Open Firewall Ports in Oracle Cloud VCN

By default, Oracle Cloud blocks incoming traffic on all ports except SSH (Port 22). You must allow HTTP (Port 80) and HTTPS (Port 443):

1. On your Instance Details page, click your **Virtual Cloud Network** link (under *Primary VNIC*).
2. In the VCN details, click **Security Lists** (in the left sidebar) ➔ Click **Default Security List for...**.
3. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80,443,8000`
   - **Description**: `Allow HTTP, HTTPS, and API access`
4. Click **Add Ingress Rules**.

---

## 💻 Step 3: Connect to Your VM via SSH

Open **PowerShell** or **Terminal** on your computer and run:

```bash
# Set proper permissions on your private key (Linux / Mac)
chmod 400 path/to/your-private-key.key

# Connect to your Oracle instance (replace with your private key path and Public IP)
ssh -i "path/to/your-private-key.key" ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

---

## 🚀 Step 4: Clone Repo & Run Automated Deployment

Once connected to your Ubuntu VM, run:

```bash
# 1. Clone your VideoSense AI repository
git clone https://github.com/<YOUR_GITHUB_USERNAME>/VideoSense-AI.git
cd VideoSense-AI

# 2. Make the deployment script executable and run it
chmod +x deployment/deploy_oracle.sh
./deployment/deploy_oracle.sh
```

### What `deploy_oracle.sh` does automatically:
- Installs Docker Engine and Docker Compose.
- Automatically fixes Ubuntu's host `iptables` firewall rules for Port 80 & 443.
- Generates a production `.env` with secure randomized cryptographic secrets.
- Builds and starts all 3 services (`videosense-postgres`, `videosense-backend`, `videosense-frontend`).
- Connects the Nginx reverse proxy so port 80 handles both the SPA frontend and routes `/api/` traffic directly to the backend.

---

## 🌐 Step 5: Access Your Live Application

Once deployment completes, open your browser and navigate to:

- 🖥️ **Web Application (Frontend)**: `http://<YOUR_ORACLE_PUBLIC_IP>`
- 📚 **Swagger API Docs**: `http://<YOUR_ORACLE_PUBLIC_IP>/docs`
- 🩺 **Health Check**: `http://<YOUR_ORACLE_PUBLIC_IP>/health`

---

## 🛠️ Maintenance & Management Commands

### View Live Logs:
```bash
# View backend logs in real-time
docker compose logs -f backend

# View frontend / Nginx access logs
docker compose logs -f frontend

# View database logs
docker compose logs -f postgres
```

### Restart Services:
```bash
# Restart all containers
docker compose restart

# Stop all containers
docker compose down

# Rebuild and restart after pulling new code
git pull origin develop
docker compose up -d --build
```

### Check Resource Usage:
```bash
docker stats
```
*(With 4 OCPUs and 24 GB RAM, your system will run smoothly with ample headroom!)*

