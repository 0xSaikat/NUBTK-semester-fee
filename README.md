# NUBTK CSE Payment Portal
![NUBTK CSE](https://img.shields.io/badge/NUBTK--CSE-Payment--Portal-blue) ![License](https://img.shields.io/github/license/0xSaikat/NUBTK-semester-fee)

A modern payment tracking system for students of the **Department of Computer Science & Engineering (CSE)** at **Northern University of Business & Technology Khulna (NUBTK)**. The university only provides payment data in Excel (.xls) sheets — this portal makes it easy to view dues, payments, and summaries.

## Features

- User Authentication (Login / Sign-up)
- Student profile with ID, phone, blood group & photo
- Smart Search by Student ID, Name or Blood Group
- Payment Visualizations with interactive charts (Line, Bar, Doughnut)
- View tuition fee, scholarship, dues, previous dues, and total received
- Custom payment notes for personal tracking
- Auto-loading profile images based on student ID
- Daily rotating background & splash screen animation
- Fully responsive — web & mobile
- Summary statistics with live data reload every 30 mins
- Android APK (WebView wrapper)
- Developed by [0xSaikat](https://www.linkedin.com/in/0xsaikat)

## Tech Stack

- **HTML5** / **CSS3** / **JavaScript**
- **Firebase** (Authentication, Firestore, Storage)
- **Chart.js** for dynamic visualizations
- **Android** (WebView APK in `/android`)

## Why This Project?

The university only provides a raw `.xls` sheet for payment details — not intuitive or accessible. This platform helps CSE students:

- Check semester fees
- Track payments
- View remaining dues
- Access payment summaries interactively

## Usage

```
https://nubtk.qzz.io
```

## Android APK

A WebView wrapper APK is available in the `android/` folder.

### Build from source

1. Install [Android Studio](https://developer.android.com/studio)
2. Open `android/` folder
3. Build > Build APK

Or via terminal:
```bash
export ANDROID_HOME=~/Android/Sdk
cd android
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

## About Me

I am **Sakil Hasan Saikat**, a cybersecurity enthusiast and founder of [HackZar](https://saikat.hackzar.com). I specialize in offensive security, penetration testing, and building automated tools.

Website: [https://saikat.hackzar.com](https://saikat.hackzar.com)

Connect on [LinkedIn](https://www.linkedin.com/in/0xsaikat/)

## HackZar

[HackZar](https://saikat.hackzar.com) is a cybersecurity organization committed to discovering vulnerabilities and making the internet safer.

## License & Credits
- Built with love by [0xSaikat](https://www.linkedin.com/in/0xsaikat) | HackZar
- Profile image fallback uses base64 inline SVG
- Inspired by real student needs in Bangladesh

MIT License - see [LICENSE](LICENSE) for details.

