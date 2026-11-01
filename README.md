# NestOps

A modern, full-stack society management solution designed to streamline the handling of complaints, common area issues, and service requests (like ironing) between residents, workers, and administrators. 

SocietySync is divided into two primary parts:
1. **Admin Dashboard (Next.js)** – A robust web portal for society management committees to track metrics, oversee unresolved complaints, manage residents and workers, and configure society settings.
2. **Mobile Application (Flutter)** – A sleek, user-friendly app for residents to log complaints/issues, track the status of their requests, and manage ironing bills, and for workers to view and update their assigned tasks.

## 🚀 Key Features

### For Residents (Mobile App)
- **Complaint Logging:** Easily raise a maintenance request for your flat with a preferred visit time.
- **Society Issue Reporting:** Report issues in common areas (e.g., broken streetlights, gym equipment).
- **Image Attachments:** Take photos directly from the camera or upload from the gallery to provide visual context for issues.
- **Ironing Bills:** Request ironing services and track your running bills transparently.
- **Hall Bookings:** Request to reserve common amenities like community halls for events and gatherings.
- **Real-Time Tracking:** Receive push notifications and track the progress of complaints from 'Queued' to 'Resolved'.

### For Workers (Mobile App)
- **Task Management:** View assigned complaints grouped by priority (Emergency vs. Routine).
- **Status Updates:** Update ticket statuses on the go (e.g., "Need Tools", "Visited", "Resolved").
- **Notes:** Leave specific notes on complaints for residents to see (e.g., "Waiting for spare parts").
- **Leave/Pause Requests:** Request time off or pause shifts directly through the app.

### For Administrators (Web Dashboard)
- **High-Level Analytics:** View Key Performance Indicators (KPIs) like SLA breach rates, total open complaints, and ironing revenue.
- **Resident & Worker Management:** Maintain a directory of flats and registered workers, along with onboarding controls. Manage worker profiles, assignments, and leave requests.
- **Hall Bookings:** Review, approve, or reject resident requests to book common amenities.
- **Escalation Management:** Track complaints that have breached SLAs or required emergency attention.

## 🛠 Tech Stack

### Mobile App
- **Framework:** Flutter / Dart
- **State Management:** Riverpod
- **Routing:** GoRouter
- **Authentication:** Firebase Auth (Phone Authentication)

### Admin Dashboard
- **Framework:** Next.js (React)
- **Styling:** Vanilla CSS with custom theming (Neon aesthetics, Glassmorphism). Fully responsive for desktop, tablet, and mobile viewing.
- **Authentication:** Firebase Auth (SMS OTP with secure role-based bypasses for testing)

### Backend & Cloud
- **Database:** Firebase Firestore (NoSQL) with strict Security Rules
- **Storage:** Firebase Cloud Storage (for image attachments)
- **Hosting:** Firebase Hosting (for the Admin Dashboard)

## 📖 Documentation
Detailed guides can be found in the `docs` folder:
- [iOS Setup Guide](./docs/ios_setup_guide.md) (Read this if building for iPhone/iPad)
- [User Guide](./docs/user_guide.md)
- [Frequently Asked Questions (FAQ)](./docs/faq.md)
- [Privacy Policy](./docs/privacy_policy.md)
- [Terms of Agreement](./docs/terms_of_agreement.md)

## ⚙️ Getting Started (Development)

### Prerequisites
- Flutter SDK (latest stable)
- Node.js (v18+)
- Firebase CLI (`npm install -g firebase-tools`)

### Running the Mobile App
```bash
cd society_mobile_app
flutter pub get
flutter run
```
> **Note:** If you are building for a physical iOS device, please follow the [iOS Setup Guide](./docs/ios_setup_guide.md) to configure your Apple Developer Certificate and Firebase integration in Xcode.

### Running the Admin Dashboard
```bash
cd admin-dashboard
npm install
npm run dev
```

## 🔒 Security
The platform utilizes Firebase Firestore Security Rules (`firestore.rules`) to ensure that:
- Residents can only read/write data associated with their own flat.
- Workers can only update the status of their assigned tasks.
- Only authenticated Administrators have elevated write privileges to oversee all society operations.
