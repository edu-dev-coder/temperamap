#!/bin/bash
set -e

echo "=== TemperaMap Deployment ==="

# 1. System updates
echo "[1/8] Updating system..."
sudo dnf update -y

# 2. Install Node.js 20
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 3. Install pnpm
echo "[3/8] Installing pnpm..."
corepack enable
corepack prepare pnpm@latest --activate

# 4. Install PM2
echo "[4/8] Installing PM2..."
sudo npm install -g pm2

# 5. Install Nginx
echo "[5/8] Installing Nginx..."
sudo dnf install -y nginx

# 6. Clone repo
echo "[6/8] Cloning repo..."
if [ ! -d "/home/opc/temperamap" ]; then
  git clone https://github.com/edu-dev-coder/temperamap.git /home/opc/temperamap
fi

# 7. Install deps and build
echo "[7/8] Building..."
cd /home/opc/temperamap
pnpm install
pnpm build

# 8. Create logs dir and start
echo "[8/8] Starting..."
mkdir -p /home/opc/temperamap/logs
pm2 start ecosystem.config.cjs
pm2 save

# Setup Nginx
sudo cp /home/opc/temperamap/deploy/nginx.conf /etc/nginx/conf.d/temperamap.conf
sudo rm -f /etc/nginx/conf.d/default.conf
sudo systemctl enable nginx
sudo systemctl restart nginx

# Firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

echo ""
echo "=== DONE ==="
echo "Your app is live at: http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "  1. Set secrets: nano /home/opc/temperamap/.env"
echo "  2. Restart: pm2 restart temperamap"
echo "  3. Logs: pm2 logs temperamap"
