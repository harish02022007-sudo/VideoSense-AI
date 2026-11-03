#!/usr/bin/env bash
# ==============================================================================
# VideoSense AI - Automated Oracle Cloud (OCI) Always Free Deployment Script
# Target Architecture: Ubuntu 22.04 / 24.04 LTS on Ampere A1 (ARM64)
# ==============================================================================
set -e

echo "=========================================================="
echo " 🚀 VideoSense AI - Oracle Cloud Deployment Automation"
echo "=========================================================="

# 1. Verify Sudo Permissions
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running directly as root. Sudo user is recommended."
else
    sudo -v
fi

# 2. Update System Packages and Install Docker & Git
echo "📦 [1/6] Installing Docker, Docker Compose, Git and essential utilities..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
    curl \
    git \
    docker.io \
    docker-compose-v2 \
    iptables-persistent \
    netfilter-persistent

# Ensure Docker service is enabled and started
sudo systemctl enable --now docker

# Add current user to docker group if not already added
if ! groups "$USER" | grep &>/dev/null '\bdocker\b'; then
    echo "👤 Adding current user ($USER) to docker group..."
    sudo usermod -aG docker "$USER"
fi

# 3. Configure Host OS Firewall (Oracle Cloud Ubuntu specific)
# Oracle Cloud Ubuntu instances have pre-configured iptables that reject port 80/443 traffic by default!
echo "🛡️  [2/6] Configuring host firewall rules for HTTP (80) & HTTPS (443)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT 2>/dev/null || \
sudo iptables -I INPUT 1 -p tcp --dport 8000 -j ACCEPT

# Persist iptables rules across reboots
sudo netfilter-persistent save 2>/dev/null || true

# 4. Create Runtime Directories
echo "📁 [3/6] Setting up persistent storage and cache directories..."
mkdir -p uploads logs cache storage/embeddings
chmod -R 775 uploads logs cache storage

# 5. Initialize Production .env Configuration
echo "⚙️  [4/6] Checking production environment (.env)..."
if [ ! -f .env ]; then
    echo "Creating secure production .env with generated secrets..."
    
    POSTGRES_PASS=$(openssl rand -hex 16)
    APP_SECRET=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)
    
    cat <<EOF > .env
# VideoSense AI Production Environment Configuration
APP_ENV=production
APP_DEBUG=false
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASS}
POSTGRES_DB=videosense
DATABASE_URL=postgresql://postgres:${POSTGRES_PASS}@postgres:5432/videosense
APP_SECRET_KEY=${APP_SECRET}
VIDEOSENSE_JWT_SECRET=${JWT_SECRET}
PORT=8000
DEVICE=cpu
LOW_MEMORY_MODE=false
TORCH_NUM_THREADS=4
OMP_NUM_THREADS=4

# Optional: Supabase Cloud Storage (Leave empty for local storage)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_BUCKET=videosense
EOF
    echo "✅ Production .env generated successfully."
else
    echo "ℹ️  Existing .env found. Keeping current configuration."
fi

# 6. Build and Deploy Containers
echo "🐳 [5/6] Building and launching multi-container services with Docker Compose..."
# Use docker compose plugin if available, otherwise docker-compose standalone
if docker compose version &>/dev/null; then
    docker compose down --remove-orphans 2>/dev/null || true
    docker compose up -d --build
else
    docker-compose down --remove-orphans 2>/dev/null || true
    docker-compose up -d --build
fi

# 7. Verification and Diagnostics
echo "🔍 [6/6] Checking container health status..."
sleep 10
docker ps

# Resolve Public IP
PUBLIC_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || echo "<YOUR_ORACLE_PUBLIC_IP>")

echo ""
echo "=========================================================="
echo " 🎉 VideoSense AI is Successfully Deployed on Oracle Cloud!"
echo "=========================================================="
echo " 🌐 Web Application (Frontend):  http://${PUBLIC_IP}"
echo " 📚 API Documentation (Swagger): http://${PUBLIC_IP}/docs"
echo " 🩺 Health Check:                http://${PUBLIC_IP}/health"
echo "=========================================================="
echo " 💡 Tip: Make sure Oracle Cloud VCN Ingress Rules allow Port 80 & 443."
echo "         See deployment/ORACLE_CLOUD_SETUP.md for full instructions."
echo "=========================================================="
