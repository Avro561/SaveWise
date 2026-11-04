# SaveWise: Smart Finance & Budget Planner (APK & Mobile)

A modern, 100% offline-first personal finance application, automated bank/wallet SMS expense tracker, and intelligent savings advisor packaged in a hardened native Android shell (APK) and progressive web app (PWA).

**Package:** `com.savewise.app` | **Target SDK:** 34 | **Java:** 25 / AGP 9.0.1 | **Architecture:** Zero-Cloud, 100% Offline, Privacy-Preserving

---

## 🌟 Comprehensive Feature Set

### 1. ⚡ Automatic SMS Banking & Wallet Tracking (Zero-Cloud)
- **Real-Time On-Device Detection**: Background `SmsReceiver` with `BROADCAST_SMS` system permission intercepts bank and mobile wallet transaction SMS instantly.
- **Trusted Senders Whitelist**: Automatically recognizes notifications from **bKash**, **NAGAD**, **Rocket**, **Upay**, **CellFin**, **16216**, **BRAC Bank**, **City Bank**, **EBL**, **Islami Bank**, and more. The whitelist can be customized live in Settings. Non-whitelisted senders, personal texts, and OTPs are completely ignored.
- **Modular Rule Parser Engine**:
  - Automatically identifies transaction type (**Credit/Income** vs. **Debit/Expense**).
  - Accurately parses transaction amount (e.g. `Tk 25,000`, `৳5,600`, `$50.00`), sender/merchant, TrxID, and remaining balance.
  - Sane amount range validation (`amount > 0` and `<= 50,000,000`).
  - Unparsed message capture: unrecognized formats from trusted senders are stored in an encrypted queue for parser enhancements without data loss.
- **Deduplication Engine**: Uses transaction reference ID (`TrxID`) and 5-minute fuzzy matching (same sender, type, and amount) to prevent duplicate entries.
- **Pending Review Screen**: Detected transactions stage in a local review queue with a real-time badge. Users tap **✓ Add** to commit to their budget (tagged as `"Auto (SMS)"`) or **✕** to discard. Rendered strictly with `textContent` to prevent DOM XSS.
- **Missed SMS Inbox Backfill**: Scans inbox from the last-synced timestamp to catch transactions received while the app was closed or device was offline.
- **Battery Optimization Guide**: In-app guidance and one-tap intent shortcuts for Xiaomi/MIUI, Oppo, Vivo, and Samsung devices (Autostart & "No restrictions").

### 2. 🧮 Dynamic Balance Carry-Over & History Calculation
- **True Historical Ledger**: Opening balance is dynamically computed across all historical transactions prior to the 1st of the selected month:
  $$\text{Opening Balance} = \sum \text{Income}_{\text{past}} - \sum \text{Expense}_{\text{past}}$$
  $$\text{Total Available} = \text{Opening Balance} + \text{Month Income} - \text{Month Expense}$$
- **Timezone-Safe Month Navigation**: Seamlessly inspect past or future months with accurate month-boundary calculations.
- **All-Time Running Total for Goals**: Savings goals evaluate all-time cumulative progress independent of month resets.
- **Non-Destructive Re-evaluation**: Modifying or deleting past entries dynamically cascades into subsequent months without data corruption.

### 3. 🔒 Hardened WebView & App Lock Security
- **Local Asset Loading via `WebViewAssetLoader`**: App loads exclusively via `https://appassets.androidplatform.net/assets/` with `allowFileAccess=false`, `allowContentAccess=false`, and zero mixed content.
- **Navigation Guard**: Blocks all external navigation and external URL interception.
- **Production Debugging Disabled**: `setWebContentsDebuggingEnabled(false)` automatically enforced in release builds.
- **Biometric App Lock & PIN Fallback**: `BiometricPrompt` with device PIN/credential fallback on app open and when resuming from background after 30 seconds.
- **`FLAG_SECURE` Screen Protection**: Blocks screenshots, screen recordings, and hides app contents in Android's Recent Apps task switcher. Configurable via Settings toggle.
- **Strictly Offline**: Zero `INTERNET` permission in AndroidManifest.xml.

### 4. 🛡️ Data Protection & Encrypted Staging
- **Zero Cloud Leakage**: `android:allowBackup="false"` accompanied by strict `data_extraction_rules.xml` (Android 12+) and `backup_rules.xml` to prevent adb backups, cloud syncing, and device-to-device transfers.
- **No Sensitive Logcat Leaks**: Privacy audit completely removed any `Log.*` statements that print SMS bodies, phone numbers, balances, or financial figures.
- **Hardware-Backed Encrypted SMS Queue**: Ephemeral SMS transactions and unparsed messages are encrypted using Android Keystore `MasterKey` (AES-256 GCM) via `EncryptedSharedPreferences`.

### 5. 🔐 Encrypted Backup & Secure Export
- **PBKDF2 + AES-GCM Encrypted JSON Backup**: Backups are encrypted with a user master password using Web Crypto API (`window.crypto.subtle`):
  - Key derivation: 100,000 PBKDF2 iterations with SHA-256 and unique 16-byte random salt.
  - Cipher: AES-256 GCM with 12-byte initialization vector (IV) and 128-bit authentication tag.
  - Decryption error handling: gracefully alerts user if incorrect password or corrupted file is supplied.
- **CSV Export Security Warning**: Pre-export confirmation modal alerts users that CSV files are unencrypted plain text.
- **Explicit Share Sheet**: Uses Android `FileProvider` (`ACTION_SEND`) to share backups and CSV exports directly through native share sheet.

### 6. 🧠 Smart AI Savings Engine & 50/30/20 Advisory
- **50/30/20 Budget Health Split**: Evaluates spending into Needs (50%), Wants (30%), and Savings (20%).
- **Micro-Expense / Latte Factor Detection**: Identifies repeated small purchases that quietly accumulate over time.
- **Interactive "What-If" Simulator**: Live sliders to simulate cutting discretionary categories by 5%-60% to project monthly and 1-year bank balance gains.

### 7. 🚀 Optimized Signed Release Build
- **R8 Code Minification & Resource Shrinking**: Release build size shrunk from ~6.9 MB to **1.36 MB**.
- **ProGuard / R8 Rules**: Configured `proguard-rules.pro` to preserve all `@JavascriptInterface` bridge methods and biometric classes.
- **Isolated Keystore Credentials**: Release signing credentials loaded securely from `keystore.properties` (strictly git-ignored).

---

## 📲 Download & Installation on Your Android Phone

The APK binaries are ready in your workspace:

### 🌟 1. Production Signed Release APK (Recommended: 1.36 MB)
- **Local File Path:** `D:\Apps\android\app\build\outputs\apk\release\app-release.apk`
- Fully minified with R8, dead-code eliminated, resource-shrunk, and signed with release keystore.

### 🛠️ 2. Development Debug APK (6.9 MB)
- **Local File Path:** `D:\Apps\android\app\build\outputs\apk\debug\app-debug.apk`
- Includes live test suites and debugging logs.

---

### Installation Instructions

#### Option A: Direct USB Install via ADB
Connect your phone with USB Debugging enabled and run:
```bash
adb install -r "D:\Apps\android\app\build\outputs\apk\release\app-release.apk"
```

#### Option B: Transfer to Phone
1. Copy `app-release.apk` to your phone via USB cable, Google Drive, WhatsApp, or Telegram.
2. Tap the APK file on your device to install.
3. If prompted, allow *"Install from unknown sources"*.
4. Open **SaveWise** &rarr; Grant SMS permissions when prompted &rarr; Start tracking your finances!

---

## 🔑 Release Build Configuration & Keystore Generation

If you ever need to generate a new signing keystore:

1. **Generate Keystore**:
   ```bash
   keytool -genkeypair -v -keystore android/app/release.jks -alias savewise -keyalg RSA -keysize 2048 -validity 10000
   ```
2. **Create `keystore.properties`** in `android/keystore.properties`:
   ```properties
   storeFile=release.jks
   storePassword=your_keystore_password
   keyAlias=savewise
   keyPassword=your_key_password
   ```
3. **Build Signed Release APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The signed APK will be output to `android/app/build/outputs/apk/release/app-release.apk`.

---

## 🔮 Future Expansion: Read-Only Email Integration Plan

*(Note: SaveWise is currently 100% offline. Adding email sync will require the `INTERNET` permission and changes the zero-cloud guarantee.)*

1. **Option A: Gmail REST API (Recommended)**
   - Use Google Identity Services / Android Credential Manager to obtain an OAuth 2.0 token with restricted scope: `https://www.googleapis.com/auth/gmail.readonly`.
   - Query incoming bank alerts via Gmail query: `from:(bKash OR Nagad OR alerts@yourbank.com) newer_than:7d`.
   - Pass raw message bodies through `SmsParser` engine.
2. **Option B: IMAP with App Password**
   - Connect using JavaMail over SSL (`imap.gmail.com:993`).
   - Store credentials securely in Android Keystore / `EncryptedSharedPreferences`.
3. **Architecture Note**: Implement an in-app toggle with an explicit privacy disclaimer before requesting network access, keeping local SMS parsing as the default offline guarantee.
