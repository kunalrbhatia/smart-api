# 🚀 Hosting Multiple Algos on Oracle Cloud (Side-by-Side)

This guide explains how to host the **smart-api** algorithm on the same Oracle Cloud instance as your existing algorithms without conflicts.

---

## 🛠️ 1. Unique Port Configuration
Since this project is an Express API server, it needs its own network port.

1.  **Clone and Build**:
    ```bash
    git clone <your-repo-url> ~/smart-api
    cd ~/smart-api
    npm install
    npm run build
    ```
2.  **Assign Unique Port**:
    Create a `.env` file and set a port different from your other apps (e.g., `8001`).
    ```bash
    nano .env
    ```
    Add:
    ```env
    PORT=8001
    NODE_ENV=production
    # Add other required credentials...
    ```

---

## 🔄 2. Process Management (PM2)
Use **PM2** to keep the API server running in the background.

1.  **Install PM2**:
    ```bash
    sudo npm install -g pm2
    ```
2.  **Start the Server**:
    ```bash
    pm2 start dist/server.js --name smart-api
    ```
3.  **Ensure Auto-Restart on Reboot**:
    ```bash
    pm2 startup
    pm2 save
    ```

---

## 🔓 3. Open Port in Oracle Cloud (OCI)
You must allow traffic on the new port in both the OCI Console and the server's local firewall.

### OCI Console Setup
1.  **Navigate**: Compute > Instances > [Your Instance] > **Subnet** > **Security List**.
2.  **Add Ingress Rule**:
    *   **Source CIDR**: `0.0.0.0/0`
    *   **IP Protocol**: `TCP`
    *   **Destination Port Range**: `8001`

### Local Server Firewall (Ubuntu)
```bash
# For UFW:
sudo ufw allow 8001

# OR for iptables (Standard Oracle Ubuntu):
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8001 -j ACCEPT
sudo netfilter-persistent save
```

---

## 📅 4. Scheduling Trades (Cron)
Since the algo is an API, you trigger it by sending a `POST` request.

Open crontab: `crontab -e`

Add these examples (adjust times to your strategy):
```cron
# 1. Warmup at 9:16 AM IST (03:46 AM UTC)
46 03 * * * curl -X POST http://localhost:8001/api/warmup -H "Content-Type: application/json" -d '{"api_key":"your_key","client_code":"your_code","client_pin":"your_pin","client_totp_pin":"your_totp_secret"}' >> ~/smart-api/logs/warmup.log 2>&1

# 2. Run Algo at 9:20 AM IST (03:50 AM UTC)
50 03 * * * curl -X POST http://localhost:8001/algo/run-short-straddle -H "Content-Type: application/json" -d '{"api_key":"your_key","client_code":"your_code","client_pin":"your_pin","client_totp_pin":"your_totp_secret","lots":1,"loss_per_lot":3500}' >> ~/smart-api/logs/algo_run.log 2>&1
```

---

## 🔐 5. Angel One Whitelisting
1.  **Get Public IP**: Run `curl ifconfig.me` on your server.
2.  **Whitelist**: Log in to the [SmartAPI Portal](https://smartapi.angelbroking.com/) and add this IP to the **Whitelisted IPs** for the specific App you are using for this algo.

---
**Note:** Both algos will now run independently. You can monitor this one using `pm2 logs smart-api`.
