# 🌐 VideoSense AI - Cloudflare Public Demo Tunnel Guide

This guide explains how to showcase your **VideoSense AI** project live on the internet using a **100% Free Cloudflare Tunnel**. 

> [!IMPORTANT]
> **No credit card, no debit card, no cloud hosting fees, and zero sign-up required.**
> Anyone in the world (professors, evaluators, external examiners, or friends) can open your live project on their mobile phone, tablet, or laptop.

---

## 🚀 Why Cloudflare Tunnel is the Best for College Project Demos

| Cloud Free Tier (Render, HF, etc.) | Cloudflare Tunnel on Your Laptop |
| :--- | :--- |
| ❌ Strict 512 MB RAM limit (crashes with PyTorch / YOLO) | ✅ **Uses your full laptop RAM (8GB / 16GB)** |
| ❌ 50-second cold starts when opening the page | ✅ **Loads instantly with 0ms cold start** |
| ❌ Requires credit/debit card verification | ✅ **100% Free with ZERO card required** |
| ❌ 15-minute idle timeouts | ✅ **Stays alive as long as your demo is running** |

---

## ⚡ How to Start the Live Public Demo

You have two super easy ways to start:

### Option A: Using PowerShell (Recommended)
Open PowerShell in the project directory and run:
```powershell
.\run_tunnel.ps1
```

### Option B: Using Python directly
```bash
python start_app.py --tunnel
```

---

## 📱 What Happens Next?

1. The script automatically launches:
   - **FastAPI Backend** on `http://localhost:8000`
   - **React Vite Frontend** on `http://localhost:5173`
   - **Cloudflare Tunnel** (using the portable binary in `.tools/cloudflared.exe`)
2. Within 5–10 seconds, you will see a highlighted banner in your terminal:

```text
============================================================================
 🎉 VideoSense AI is LIVE & Accessible Worldwide via Cloudflare Tunnel!
============================================================================
  🌐 Public Web App:      https://xxxx-xxxx-xxxx.trycloudflare.com
  📚 API Swagger Docs:    https://xxxx-xxxx-xxxx.trycloudflare.com/docs
  🩺 System Health:       https://xxxx-xxxx-xxxx.trycloudflare.com/api/v1/health/
============================================================================
  Anyone on mobile, tablet, or PC can access your live demo link!
============================================================================
```

3. **Copy the `https://xxxx.trycloudflare.com` URL** and:
   - Open it on your phone browser.
   - Send it to your evaluator, teacher, or team members.
   - Project it on the presentation screen.

---

## 🛑 How to Stop the Tunnel After Your Demo

When your presentation is over, simply press:
```text
Ctrl + C
```
in the terminal. All servers and the public tunnel will shut down cleanly and securely.

---

## 💡 Presentation Tips for College Evaluation

1. **Keep Your Laptop Connected to the Internet:** The tunnel requires an active Wi-Fi connection (college Wi-Fi or mobile hotspot).
2. **Prevent Sleep Mode:** In Windows Settings, set "Screen and Sleep" to "Never" while plugged in so the laptop doesn't go to sleep during your presentation.
3. **Pre-test Before Entering the Exam Hall:** Run `.\run_tunnel.ps1` 5 minutes before your demo, open the link on your mobile phone, and verify that VideoSense AI loads smoothly!
