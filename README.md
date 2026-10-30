# SaveWise: Smart Finance & Budget Planner (APK & Mobile)

A modern, offline-first personal finance application, automated SMS expense tracker, and smart savings advisor built for Android (native APK) and mobile browsers.

---

## 🌟 Key Features

### 1. ⚡ Automatic SMS Banking & Wallet Tracking *(New)*
- **Real-Time On-Device Detection**: Listens for incoming transaction messages via Android's `SmsReceiver` and updates your financial records in real time.
- **Trusted Senders Whitelist**: Automatically recognizes bank & mobile wallet notifications from **bKash**, **Nagad**, **Rocket**, **Upay**, **CellFin**, **BRAC Bank**, **City Bank**, **EBL**, **DBBL**, **Standard Chartered (SCB)**, **HSBC**, **Islami Bank**, **UCB**, **Prime Bank**, **MTB**, and more.
- **Smart Regex Parser**:
  - Automatically identifies transaction type (**Credit/Income** vs. **Debit/Expense**).
  - Accurately parses transaction amount (e.g. `Tk 25,000`, `৳5,600`, `$50.00`), sender/merchant, TrxID, and remaining balance.
  - Automatically categorizes entries (e.g. `Salary`, `Housing & Rent`, `Groceries`, `Other Expense`).
- **OTP & Privacy Filtering**: Verification codes and OTP messages (e.g. *"Your OTP is..."*) are strictly ignored and never saved.
- **Pending Review Screen**: Detected transactions appear in an unobtrusive review queue with a notification badge on the top bar. You can inspect the SMS snippet, tap **✓ Add** to commit to your budget, or **✕** to dismiss.
- **Duplicate Prevention**: Tracks unique `TrxID` identifiers to prevent double-logging if an SMS is re-read.
- **Missed SMS Inbox Scanner**: When you open or return to the app, the background scanner checks your SMS inbox for transactions received while the app was closed or device was offline.
- **Battery Optimization Guide**: Built-in instructions and direct settings shortcut for OEM devices (Xiaomi/MIUI, Oppo, Vivo, Samsung, OnePlus) to ensure background tracking remains active.
- **100% Private & Zero-Cloud**: All SMS parsing and transaction records are stored entirely on your device inside the sandboxed app database. No data is ever uploaded to any third-party server.

### 2. 💵 Earnings & Income Tracking
- Log income streams: **Salary**, **Freelance / Contract**, **Business**, **Investments**, **Rental**, **Gifts**, etc.
- Record date, payment mode (Bank Transfer, Mobile Banking/bKash/Nagad, Cash, Cards), and descriptions.
- Automatically calculates monthly earnings, total expenses, and your real-time net savings rate indicator.

### 3. 🔻 Daily Cost & Expense Tracking
- Categorized expense tracking: **Groceries**, **Dining Out**, **Housing & Rent**, **Transport & Fuel**, **Utilities & Bills**, **Shopping**, **Health**, **Education**, **Subscriptions**, etc.
- **Daily Budget Meter**: Set a custom daily spending cap (e.g. $25/day or ৳500/day) with live remaining allowance tracking.
- **1-Tap Quick Logging**: One-touch chips for frequent daily expenses (Coffee/Tea, Lunch, Bus Fare, Snacks).
- Full Search & Filter: Filter by date range (Today, Last 7 Days, This Month, Last Month) and category.
- Export transactions directly to **CSV** or backup/restore to **JSON**.

### 4. 🧠 Smart AI Savings Engine & Advisory
- **50/30/20 Budget Health Evaluation**: Automatically splits your spending into **Needs (50%)**, **Wants (30%)**, and **Savings (20%)**, warning you if lifestyle spending creeps above 30%.
- **Latte Factor / Micro-Expense Detection**: Identifies repeated small purchases (< $5 / ৳300) that quietly drain your budget annually.
- **Category Overspending Insights**: Identifies your highest spending category and calculates exact amounts you can save by adjusting specific habits.
- **Daily Burn Rate & Month-End Run Rate**: Forecasts your month-end savings based on current daily spending pace.
- **Interactive "What-If" Savings Simulator**: Live sliders to simulate cutting 10%-50% from Dining or Shopping to see instant projected monthly and annual bank growth.

### 5. 🎯 Savings Goals Tracker
- Create customized savings targets (e.g., Emergency Fund, Tech Upgrade, Vacation).
- Set target amount, deadlines, and track visual progress bars.
- 1-click quick allocation to any goal.

### 6. 📱 Android APK & Mobile Ready
- **Official Brand Design**: Custom fintech identity (Vault Shield, Upward Growth Trendline, Golden Savings Coin, AI Sparkle Star).
- **Material Design 3**: Android 14/15 styling with dark & light themes, bottom navigation bar, floating action button (+), and sound synthesizer.
- **Multi-Currency Support**: USD ($), BDT (৳), INR (₹), EUR (€), GBP (£), PKR (₨), CAD, AUD, AED.
- **100% Offline-First**: Works without an internet connection using sandboxed local storage and service workers.

---

## 🚀 How to Run the App Locally

The project includes an embedded, zero-dependency Node.js server:

1. **Launch the app**:
   - Double-click `start.bat` **OR** run in PowerShell/Terminal:

     ```powershell
     cd D:\Apps
     node server.js
     ```

2. **Open in Browser**:
   - On PC: [http://localhost:5050](http://localhost:5050)
   - On Phone (connected to the same Wi-Fi network):
     `http://192.168.10.141:5050` *(or the IP shown in your console)*

---

## 📲 How to Install the Android APK on Your Phone

The pre-compiled APK is located at:
📂 `android/app/build/outputs/apk/debug/app-debug.apk`

### Method 1: Send APK Directly to Your Phone (Easiest)
1. Send `app-debug.apk` to your phone using **WhatsApp Web**, **Telegram**, or **Google Drive**.
2. Tap the file on your phone to install.
3. Allow *"Install unknown apps"* if prompted by Android.

### Method 2: Direct Install via USB Cable
1. Enable **USB Debugging** in your phone's *Developer options*.
2. Connect your phone with a USB cable.
3. In Android Studio or PowerShell, run:
   ```powershell
   adb -d install -r "D:\Apps\android\app\build\outputs\apk\debug\app-debug.apk"
   ```

### Method 3: Compile via Android Studio
1. Open **Android Studio** and choose `D:\Apps\android`.
2. Select your device or emulator from the device menu.
3. Click the green **Run (▶)** button (or `Shift + F10`) to build, deploy, and launch.

---

## 📁 Project Structure

```text
Apps/
├── www/                                # Mobile web application & UI
│   ├── index.html                      # Semantic HTML5 & Material 3 structure
│   ├── styles.css                      # Material Design 3 CSS & dark/light theme
│   ├── app.js                          # State controller, SMS sync UI, CRUD, charts
│   ├── advisory.js                     # 50/30/20 Smart Savings & What-If Simulator
│   ├── manifest.json                   # Android Web App Manifest
│   ├── sw.js                           # Offline-caching Service Worker
│   └── icons/                          # Logo SVG, 192px and 512px app icons
├── android/                            # Native Android Studio Project
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml # Permissions (RECEIVE_SMS, READ_SMS) & receiver
│   │   ├── src/main/java/com/savewise/app/
│   │   │   ├── MainActivity.java       # WebView shell, runtime permissions, bridges
│   │   │   ├── SmsReceiver.java        # BroadcastReceiver for real-time incoming SMS
│   │   │   ├── SmsParser.java          # Regex extractor for bKash, Nagad & bank SMS
│   │   │   ├── SmsQueue.java           # SharedPreferences queue for pending transactions
│   │   │   ├── SmsScanner.java         # Scans SMS inbox for missed messages
│   │   │   └── SmsJsBridge.java        # @JavascriptInterface bridge to WebView UI
│   │   ├── src/main/assets/            # Offline-packaged app bundle & icons
│   │   ├── src/main/res/               # Launcher mipmap icons, colors, styles
│   │   └── build.gradle                # AGP 9 build configuration
│   ├── build.gradle                    # Root build script
│   ├── settings.gradle
│   └── gradle.properties
├── server.js                           # Zero-dependency local development server
├── start.bat                           # 1-click launcher
├── .gitignore                          # Git ignore configuration
└── README.md                           # Documentation
```
