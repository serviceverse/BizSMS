# BizSMS — Commercial Dual-SIM Call Auto-Pilot & SMS CRM

> **Turn your Android phone into an automated, 24/7 customer engagement, missed-call lead recovery, and festival broadcast machine using your direct cellular SIM plan.**

Designed specifically for **busy startup founders, clinic doctors, sweet shops, salons, retail owners, and service professionals** who want direct cellular messaging without paying expensive recurring fees for third-party bulk SMS gateways.

---

## 🌟 Key Features

### 1. 📶 Dual-SIM Routing & Operator Auto-Detection
* **Live Carrier Detection**: Automatically identifies SIM 1 and SIM 2 with operator names (Jio 4G, Airtel, Vodafone Idea, BSNL) via Android `SubscriptionManager`.
* **Physical Slot Mapping & Number Management**: Seamlessly switch active sending SIMs with 1 tap. Set and edit phone numbers directly per physical slot (`SIM 1`, `SIM 2`).
* **1-Tap Operator Balance Checkers**: Instant dialer shortcuts:
  * **Jio**: Dial `1299` (free instant official balance SMS from Jio).
  * **Airtel**: Dial `*121#` (USSD balance menu).
  * **Vi**: Dial `*199#`.
  * **BSNL**: Dial `*123#`.
* **Zero-Discrepancy Assurance**: No confusing internal counter estimations. Customers check their real balance directly in official operator apps (MyJio, Airtel Thanks) without any discrepancies or billing claims.
* **Unrestricted Auto-Pilot Dispatching**: Dispatches are never blocked by internal estimations; auto-replies proceed reliably through your active SIM route as long as you have carrier signal.

### 2. 📞 Call Automation Rules
* **Missed Call Auto-Responder**:
  * Automatically texts callers when you're busy with a patient or client.
  * Curated industry templates (General Business, Doctor / Clinic Consulting, Sweets / Bakery Busy Prep).
* **Post-Call Brand Card & Thank You**:
  * Automatically sends a digital visiting card after completed calls.
  * Embeds Google Maps link, WhatsApp direct link, catalog link, and brand tagline.
* **Smart Safeguards**:
  * **Anti-Spam Cooldown (1h - 48h)**: Ensures a customer never receives duplicate messages within the cooldown window.
  * **Business Operating Hours**: Restrict auto-replies to work hours (e.g., 09:00 – 20:00).
  * **VIP / Family Exclusion**: Contacts marked as "Blocked / VIP" will never receive automated business messages.

### 3. 🎆 Festival & Promotional Broadcast Hub
* **Pre-Built Festive Library**: Ready-to-send templates for Diwali, New Year, Eid, Sweet Shop Fresh Batches, Clinic Health Camps, and Weekend Sales.
* **Audience Multi-Selector**: Search and select multiple contacts with a 1-tap "Select Top 50" helper.
* **Throttled Carrier Delivery**: Safe 1-second interval dispatching to prevent telecom operator spam flags.
* **Technical Segment Calculator**: Shows GSM (160 chars) vs Unicode (70 chars) segments in real-time.

### 4. 📇 Live Digital Visiting Card
* Configure Business Name, Category, Owner Name, WhatsApp number, Google Maps URL, and Website / Catalogue link.
* 1-Tap `+ Use active SIM number` shortcut.
* Interactive card preview and direct customer sharing.

### 5. 📜 Delivery Audit Logs & Instant Retry
* Full history of sent and failed messages with timestamps, slot numbers, and trigger labels (`missed_call`, `call_ended`, `campaign`).
* One-click **"Retry SMS"** button to immediately re-dispatch failed messages.

---

## 🏷️ Dynamic Personalization Tags

You can use these tags in any automation or campaign template:
| Tag | Replaced With |
| :--- | :--- |
| `{name}` | Contact name (falls back to "Valued Customer") |
| `{business_name}` | Your registered business / clinic / store name |
| `{owner_name}` | Proprietor or Doctor name |
| `{phone}` | Business phone number |
| `{whatsapp}` | Direct WhatsApp link or number |
| `{maps_link}` | Google Maps location short link |
| `{catalog_link}` | Digital catalog or website URL |
| `{tagline}` | Brand slogan or greeting |

---

## 🔐 Activation & Security
* Default Activation Key: **`SDMCH723326`**
* Prevents unauthorized staff or device users from altering SIM routing or broadcasting messages.

---

## 🛠️ How to Build the Android APK

### Prerequisites
* JDK 17 (Microsoft OpenJDK 17 or Eclipse Adoptium)
* Android SDK Platform 34+
* Node.js & npm / yarn

### Single-Command Build (From Project Root)
```cmd
cd android && gradlew.bat assembleRelease -x lint -x lintVitalRelease -x extractReleaseAnnotations && cd ..
```

---

## 📦 Output APK Location

Once the build finishes, your installable Android APK is located at:
```
android/app/build/outputs/apk/release/app-release.apk
```
Full absolute path:
```
d:\my\my projects\msg\android\app\build\outputs\apk\release\app-release.apk
```

---

## 📲 How to Install on Any Android Mobile

### Method 1: Direct File Transfer (WhatsApp, USB, or Google Drive)
1. Copy or send `app-release.apk` to your Android phone (via WhatsApp, Google Drive, or USB file transfer).
2. Open the **Files / Downloads** app on your phone and tap `app-release.apk`.
3. If Android prompts *"Blocked by Play Protect"*:
   - Tap **More details** (down arrow at bottom).
   - Tap **Install anyway**.
4. The app installs completely standalone with all bundled JavaScript and Serviceverse assets!

### Method 2: Direct ADB Install (Over USB)
With USB Debugging enabled on your phone:
```cmd
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 App Name & Branding Verification
* **Name Reflected on Mobile Screen**: **`BizSMS`**
* **Source of Truth**: 
  - `android/app/src/main/res/values/strings.xml`: `<string name="app_name">BizSMS</string>`
  - `android/app/src/main/AndroidManifest.xml`: `android:label="@string/app_name"`
* **App Icon**: Modern Adaptive Icon with The Serviceverse circuit emblem on `#00051B` background.
* **Parent Company**: **The Serviceverse** ([theserviceverse.com](https://theserviceverse.com))
* **Product**: **BizSMS**
* **Default Activation License Key**: **`SDMCH723326`**

