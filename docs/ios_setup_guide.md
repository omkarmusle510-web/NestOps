# iOS Setup Guide

This guide covers the necessary steps to build and run the SocietySync Flutter application on a physical iOS device using macOS and Xcode.

## Prerequisites
1. **macOS Machine**: You must use a Mac to build iOS apps.
2. **Xcode**: Download and install Xcode from the Mac App Store.
3. **Apple ID**: A free Apple ID is required to digitally sign the app for your physical device.

## Step 1: Open the Project in Xcode
Flutter uses Xcode to compile the iOS portion of the app.
1. Open your terminal.
2. Navigate to the flutter project folder: `cd society_mobile_app`
3. Open the iOS workspace in Xcode:
   ```bash
   open ios/Runner.xcworkspace
   ```

## Step 2: Configure Code Signing
Apple requires apps to be digitally signed before they can be installed on a physical iPhone.
1. In Xcode, click on **Xcode > Settings** in the top menu bar.
2. Go to the **Accounts** tab, click **+**, and sign in with your Apple ID.
3. In the left navigation pane, click the top-level blue **Runner** project icon.
4. In the main window, click **Runner** under the **TARGETS** heading.
5. Go to the **Signing & Capabilities** tab.
6. Check the box for **"Automatically manage signing"**.
7. In the **Team** dropdown, select your Apple ID (Personal Team).

*Note: When building the app, macOS might prompt you saying "codesign wants to access key...". Enter your Mac's computer login password and click **Always Allow**.*

## Step 3: Increase Minimum iOS Deployment Target
Newer Firebase packages require a minimum iOS version of 15.0.
1. With the top-level **Runner** selected in the left pane, click on **Runner** under the **PROJECT** heading.
2. Go to the **Info** tab.
3. Change **iOS Deployment Target** to **15.0**.
4. Now click **Runner** under the **TARGETS** heading.
5. Go to the **General** tab.
6. Under **Minimum Deployments**, change the iOS version to **15.0**.

## Step 4: Link GoogleService-Info.plist
Even if `GoogleService-Info.plist` is in the folder, it must be explicitly linked in Xcode for Firebase to initialize.
1. In the left navigation pane of Xcode, find the yellow **Runner** folder (inside the blue Runner project -> Flutter).
2. Right-click the yellow **Runner** folder and click **Add Files to "Runner"...**
3. Select `GoogleService-Info.plist`.
4. At the bottom of the window, ensure the **Runner** checkbox is ticked under "Add to targets".
5. Click **Add**.

## Step 5: Enable Developer Mode on iPhone
Starting with iOS 16, iPhones require Developer Mode to be turned on to run apps from Xcode.
1. On your iPhone, open **Settings**.
2. Go to **Privacy & Security**.
3. Scroll to the bottom and tap **Developer Mode**.
4. Toggle it **ON** and restart your iPhone when prompted.
5. After restarting, tap **Turn On** in the popup and enter your passcode.

## Step 6: Trust the Developer Certificate
1. Connect your iPhone to your Mac via USB and unlock it.
2. Run the app from your terminal:
   ```bash
   flutter run
   ```
3. The app will install but might give an "Untrusted Developer" error.
4. On your iPhone, go to **Settings > General > VPN & Device Management** (or just Device Management).
5. Tap your Apple ID email under "Developer App" and tap **Trust**.

## Step 7: Enable Push Notifications (Optional but Recommended)
To receive Firebase push notifications on iOS, you must add specific capabilities and link your Apple Developer account:
1. In Xcode, select **Runner** under TARGETS.
2. Go to the **Signing & Capabilities** tab.
3. Click the **+ Capability** button (top left).
4. Double-click **Push Notifications** to add it.
5. Click **+ Capability** again and add **Background Modes**.
6. Under Background Modes, check the box for **Remote notifications**.
7. In your [Apple Developer Account](https://developer.apple.com/account), create a new Key with **Apple Push Notifications service (APNs)** enabled, and download the `.p8` file.
8. Go to your **Firebase Console** > **Project Settings** > **Cloud Messaging**.
9. Under the **Apple app configuration** section, upload your `.p8` file in the **APNs Authentication Key** section (you will need your Apple Team ID and Key ID).

## Step 8: Run the App
You are all set! You can now launch the app from your iPhone's home screen, or run `flutter run` in your terminal to see the live debug logs. For a standalone version that runs without the terminal, use `flutter run --release`.
