# SaveWise: Smart Finance & Budget Planner (APK & Mobile)

A modern, offline-first personal finance application and smart savings coach built for Android (APK) and mobile browsers.

---

## 🌟 Key Features

### 1. 💵 Earnings & Income Tracking
- Log income streams: **Salary**, **Freelance / Contract**, **Business**, **Investments**, **Rental**, **Gifts**, etc.
- Record date, payment mode (Bank Transfer, Mobile Banking/bKash/UPI, Cash, Cards), and descriptions.
- Track monthly earnings vs total expenses with a real-time net savings rate indicator.

### 2. 🔻 Daily Cost & Expense Tracking
- Categorized expense tracking: **Groceries**, **Dining Out**, **Housing & Rent**, **Transport & Fuel**, **Utilities & Bills**, **Shopping**, **Health**, **Education**, **Subscriptions**, etc.
- **Daily Budget Meter**: Set a custom daily spending cap (e.g. $25/day) with live remaining allowance tracking.
- **1-Tap Quick Logging**: One-touch chips for frequent daily expenses (Coffee/Tea, Lunch, Bus Fare, Snacks).
- Full Search & Filter: Filter by date range (Today, Last 7 Days, This Month, Last Month) and category.
- Export transactions directly to **CSV** or backup/restore to **JSON**.

### 3. 🧠 Smart AI Savings Engine & Advisory
- **50/30/20 Budget Health Evaluation**: Automatically splits your spending into **Needs (50%)**, **Wants (30%)**, and **Savings (20%)**, warning you if lifestyle spending creeps above 30%.
- **Latte Factor / Micro-Expense Detection**: Identifies repeated small purchases (< $5 / ৳300) that quietly drain hundreds of dollars annually.
- **Category Overspending Insights**: Identifies your highest spending category and calculates exact dollar amounts you can save by adjusting specific habits.
- **Daily Burn Rate & Month-End Run Rate**: Forecasts your month-end savings based on current daily spending pace.
- **Interactive "What-If" Savings Simulator**: Live sliders to simulate cutting 10%-50% from Dining or Shopping to see instant projected monthly and annual bank growth.

### 4. 🎯 Savings Goals Tracker
- Create customized savings targets (e.g., Emergency Fund, Tech Upgrade, Vacation).
- Set target amount, deadlines, and track visual progress bars.
- 1-click quick allocation to any goal.

### 5. 📱 Android APK & Mobile Ready
- **Material Design 3**: Android 14/15 styling with dark & light themes, bottom navigation bar, floating action button (+), and sound synthesizer.
- **Multi-Currency Support**: USD ($), BDT (৳), INR (₹), EUR (€), GBP (£), PKR (₨), CAD, AUD, AED.
- **100% Offline-First**: Works without an internet connection using local storage and service workers.

---

## 🚀 How to Run the App Immediately

The project includes an embedded, zero-dependency Node.js server:

1. **Launch the app**:
   - Double-click `start.bat` **OR** run in PowerShell/Terminal:

     ```powershell
     cd D:\Apps
     node server.js
     ```

2. **Open in Browser**:
   - On PC: [http://localhost:5050](http://localhost:5050)
   - On Android Phone (connected to the same Wi-Fi):
     `http://192.168.10.141:5050` *(or the IP shown in the console)*

---

## 📲 How to Install as an APK on Android

You have 3 easy ways to run this as a native Android APK:

### Method 1: Instant Native Android WebAPK (Recommended - 0 Installs)
1. Open Chrome or Edge on your Android phone and navigate to `http://<YOUR-PC-IP>:5050` (or host it on GitHub Pages / Vercel for free).
2. Tap the Chrome menu (**⋮**) in the top right.
3. Select **"Install app"** (or **"Add to Home screen"**).
4. Android compiles and installs a genuine native **WebAPK** with an app icon on your home screen and app drawer. It launches fullscreen with no browser address bar and works 100% offline!

### Method 2: Cloud 1-Click APK Generator (PWABuilder)
1. Upload this folder to GitHub or deploy it to a free host like Vercel or Netlify.
2. Visit [https://www.pwabuilder.com](https://www.pwabuilder.com).
3. Paste your URL and click **Package for Android**.
4. PWABuilder builds and provides an installable signed `.apk` file ready to transfer to your phone and install!

### Method 3: Full Android Studio Native APK Project
A ready-to-compile Android project is included in `android/`:
1. Open **Android Studio**.
2. Select **Open** and choose `D:\Apps\android`.
3. Wait for Gradle sync to complete.
4. Go to menu: **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
5. Android Studio generates the APK in `android/app/build/outputs/apk/debug/app-debug.apk`!

---

## 📁 Project Structure

```text
Apps/
├── www/                                # Complete mobile web application
│   ├── index.html                      # Semantic HTML5 & Material 3 structure
│   ├── styles.css                      # Material Design 3 CSS & responsive layout
│   ├── app.js                          # State management, CRUD, sound synth, charts
│   ├── advisory.js                     # 50/30/20 Smart Savings & What-If Simulator
│   ├── manifest.json                   # Android Web App Manifest
│   ├── sw.js                           # Offline-caching Service Worker
│   └── icons/                          # 192x192 and 512x512 app icons
├── android/                            # Ready-to-build Android Studio Project
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml
│   │   ├── src/main/java/com/savewise/app/MainActivity.java
│   │   ├── src/main/assets/            # Packaged offline app bundle
│   │   ├── src/main/res/               # Android drawables, colors, styles
│   │   └── build.gradle                # Module build script
│   ├── build.gradle                    # Project build script
│   ├── settings.gradle
│   └── gradle.properties
├── server.js                           # Zero-dependency local development server
├── start.bat                           # 1-click launcher
├── generate_icons.js                   # App icon generator
└── README.md                           # Documentation
```
