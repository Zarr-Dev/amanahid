<div align="center">
  <img src="assets/amanah-logo.png" alt="Amanah.id logo" width="100" />
  <h1>Amanah.id</h1>
  <p><strong>Web-Based Student Attendance System</strong></p>
  <p>Face Verification · GPS Geofencing · Server-Side Validation</p>
  <p><a href="https://amanahid.vercel.app">Production website: amanahid.vercel.app</a></p>
</div>

---

## 1. Project Overview

Amanah.id is a web-based student attendance system designed for Al-Fityan School Tangerang. The project explores a more structured attendance process by combining face verification with GPS geofencing, while using the camera, GPS sensor, and internet connection already available on common smartphones or computers.

The research focuses on three practical goals:

- Evaluate whether the system can make attendance recording more efficient than the existing manual process.
- Evaluate the functionality and reliability of face and location verification.
- Improve attendance accountability through centralized records and role-based access.

Amanah.id is a research prototype. Automated face matching and basic liveness checks are not guarantees against every form of impersonation. Ambiguous or failed checks must be handled carefully, with an appropriate school review or alternative attendance procedure.

## 2. Research Scope and Main Capabilities

- **Unified access:** Admin, teachers (Guru), and students (Siswa) use a shared sign-in flow. The server resolves the account role from the active account records.
- **Face verification:** Browser-side face detection and descriptor extraction are followed by server-side comparison with registered reference descriptors.
- **GPS geofencing:** The system checks the device location against the school's configured attendance area.
- **Attendance records:** The backend validates attendance requirements and prevents duplicate attendance for the same student and school date.
- **Administration:** Authorized staff can manage student records, review attendance data, and configure supported school settings.
- **WhatsApp notification:** The backend includes an integration point for Fonnte. Delivery depends on a configured provider token and a connected WhatsApp device.
- **Responsive web interface:** The application is designed for smartphones, tablets, and desktop browsers.

## 3. System Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | HTML5, CSS3, JavaScript (ES6+) | User interface, camera access, browser geolocation, and interaction |
| Computer vision | face-api.js / TensorFlow.js | Face detection, landmark estimation, and 128-dimensional descriptor extraction |
| Backend | Node.js on Vercel Serverless Functions | Authentication, authorization, validation, matching, attendance processing, and notifications |
| Database | Supabase PostgreSQL | Student, teacher, admin, attendance, settings, and audit records |
| Database security | PostgreSQL Row Level Security (RLS) | Restrict direct client access to protected tables |
| Mapping | Leaflet.js and OpenStreetMap | Display the school geofence and location context |
| Notifications | Fonnte WhatsApp API | Optional attendance notifications to parents |
| Version control | Git and GitHub | Source management, reviews, and change history |

The production application is hosted at **https://amanahid.vercel.app**. The repository is **Zarr-Dev/amanahid**. The production deployment must be checked independently from preview deployments.

## 4. Face Verification

The browser uses the following face-api.js models:

- `TinyFaceDetector` to locate faces in a camera frame.
- `FaceLandmark68Net` to estimate 68 facial landmark points.
- `FaceRecognitionNet` to extract a 128-dimensional face descriptor.

The descriptor is sent to the Node.js backend. The backend compares it with registered reference descriptors using Euclidean distance. The current configured matching threshold is **0.42**. The backend also applies an ambiguity check and can reject a result when more than one registered identity is too close to the best candidate.

A simple head-movement check is used as a basic liveness prompt. It is **not** an advanced Presentation Attack Detection (PAD) system and must not be described as proof that photo, screen, mask, or other presentation attacks are impossible. It is also not a guarantee that identical twins or visually similar people can always be distinguished.

Face verification results should be evaluated using consent-based, appropriately governed testing. The project must not claim a field accuracy, False Acceptance Rate (FAR), or False Rejection Rate (FRR) until a real and documented evaluation has been completed. Provide a human review or alternative attendance path for ambiguous cases.

The system stores face descriptors for matching rather than treating a browser image as a permanent identity record. Biometric data must be protected, access-limited, retained only as necessary, and processed with appropriate school authorization and informed consent.

## 5. GPS Geofencing

The browser obtains location information through the Geolocation API. The backend independently checks the submitted location against the school's configured coordinates using the Haversine Formula.

Current documented school settings:

| Setting | Value |
|---|---:|
| Geofence radius | 50 metres |
| Maximum accepted reported GPS accuracy | 35 metres |
| School time zone | Asia/Jakarta |
| Distance calculation | Haversine Formula |

The server-side validation includes checks for GPS accuracy, timestamp freshness, implausible movement speed, and uncertainty near the geofence boundary. A location near the boundary may be rejected when the reported uncertainty overlaps the outside area. The server, not the browser interface, makes the final attendance decision.

Unit tests with mocked coordinates are useful for checking boundary logic, but they are not a substitute for field tests using real devices at several measured points around the school.

## 6. Attendance Workflow

1. The user signs in through the shared login form.
2. The backend validates the account and resolves its role.
3. The browser requests location permission and obtains a GPS reading.
4. The backend validates the geofence conditions.
5. The camera detects a face and presents the basic liveness prompt.
6. The browser extracts a face descriptor and sends it to the backend.
7. The backend compares the descriptor, checks ambiguity, and issues a short-lived proof when the match is accepted.
8. The attendance endpoint validates the required conditions and prevents duplicate attendance for the same student and date.
9. The attendance record is stored in Supabase.
10. If Fonnte is configured and available, the system can attempt to notify the parent or guardian.

A failed or ambiguous verification must not be silently converted into a successful attendance record.

## 7. Testing and Research Data

The research should separate **automated software tests**, **controlled experiments**, and **real-world field tests**. Each result must include its test method, sample size, date, device or environment, and limitations.

### 7.1 Face verification test record

| Field | Description |
|---|---|
| Test ID | Unique, non-identifying test reference |
| Test category | Genuine-user attempt or impostor attempt |
| Capture condition | Lighting, camera/device category, and capture quality |
| Expected result | Accept or reject, based on the approved test protocol |
| Actual result | System decision |
| Outcome | True accept, false reject, false accept, or true reject |
| Notes | Non-identifying technical observations |

Do not place student names, NISN, raw face images, or face descriptors in public reports or repository examples.

### 7.2 Metrics

Use the following definitions and report the numerator and denominator with every percentage:

- **False Acceptance Rate (FAR):** false accepts divided by all impostor attempts.
- **False Rejection Rate (FRR):** false rejects divided by all genuine-user attempts.
- **True Acceptance Rate (TAR):** genuine attempts correctly accepted divided by all genuine-user attempts.
- **Attendance time reduction:** compare manual and digital attendance duration under comparable conditions. Report the sample size and both mean and median where appropriate.

A single overall “accuracy” percentage can hide important differences between genuine-user and impostor tests. Report FAR and FRR separately, include the confusion matrix, and explain the test protocol.

### 7.3 GPS field test record

| Field | Description |
|---|---|
| Test ID | Non-identifying reference |
| Test point | Measured distance category or approved test point |
| Device category | Phone/tablet model category, without personal identifiers |
| Reported GPS accuracy | Accuracy value in metres |
| Expected geofence result | Inside, outside, or uncertain |
| Actual server result | Accepted or rejected |
| Notes | Signal, timestamp, or environmental limitations |

Test points should cover locations clearly inside the 50 m radius, clearly outside it, and near the boundary. Record GPS accuracy and do not treat a mocked unit test as a real GPS measurement.

### 7.4 Attendance time comparison

Record the start and end time for each manual and digital attendance session. Compare equivalent class sizes and similar operating conditions. Report the number of observations, mean duration, median duration, range, and percentage change. Do not estimate or invent missing measurements.

### 7.5 Recommended charts and tables for the research report

Generate visual summaries only from verified test records:

1. **Bar chart:** mean and median attendance duration for manual versus digital attendance.
2. **Bar chart:** FAR and FRR, shown separately with their sample counts.
3. **Confusion matrix:** genuine/impostor attempts against accepted/rejected decisions.
4. **Scatter plot:** measured distance from the school against reported GPS accuracy and server decision.
5. **Line chart:** verification response time across repeated test sessions.
6. **Summary table:** test objective, method, sample size, result, and limitation.

Every chart must show units, sample size, test conditions, and a clear title. If a dataset is empty or incomplete, show “Not yet measured” rather than creating illustrative values that could be mistaken for research findings.

## 8. Current Production Snapshot

The following is a technical snapshot checked on **1 November 2026**. It describes the connected production services at the time of inspection and may change as the project develops.

| Component | Observed status |
|---|---|
| Production website | HTTP 200 |
| Vercel production deployment | READY |
| API readiness endpoint | HTTP 200 |
| API configuration check | OK |
| Supabase database check | OK |
| Fonnte WhatsApp | Not configured |
| Student records | 0 |
| Teacher records | 1 |
| Admin records | 2 |
| Attendance records | 0 |
| Absence requests | 0 |
| School settings | 1 |
| System settings | 1 |
| Audit log records | 34 |

The database currently has eight main public tables with RLS enabled. Supabase Security Advisor reports that `absence_requests` and `system_settings` have RLS enabled but no explicit policies. These findings require a deliberate access-policy review; do not remove RLS or add broad public policies as a shortcut.

Because there are currently no student or attendance records, this snapshot does not establish real-world face verification performance or attendance-time improvements. Those research outcomes remain pending field data collection.

## 9. Local Development

Requirements:

- Node.js 24.x
- npm
- A Supabase project for an isolated development or staging environment

Clone the repository:

```bash
git clone https://github.com/Zarr-Dev/amanahid.git
cd amanahid
npm ci
```

Run the build checks and automated tests:

```bash
npm run build
npm test
```

The build script runs the repository's build validation and automated Node.js tests.

## 10. Deployment Configuration

The official production target is **https://amanahid.vercel.app** and the GitHub repository is **Zarr-Dev/amanahid**.

Configure the following environment variables in the intended Vercel project:

| Variable | Purpose |
|---|---|
| `APP_ORIGIN` | Exact production origin, without a trailing slash |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Server-side Supabase secret; never expose it in browser code |
| `SESSION_SECRET` | Random session-signing secret with at least 32 characters |
| `FONNTE_TOKEN` | Optional provider token for WhatsApp delivery |

Use Vercel's sensitive environment-variable storage for secrets. Never commit secret values to GitHub or expose them in frontend JavaScript. Redeploy after changing environment variables.

For a new isolated database, apply `supabase-schema.sql` in the Supabase SQL Editor. Apply any additional migration scripts only after reviewing their scope and confirming the target environment. Demo accounts, if used, belong only in an isolated staging database and must never be seeded into the real school production database.

## 11. Privacy, Security, and Responsible Use

- Keep server-side secrets out of client-side code and Git history.
- Validate roles and permissions on the backend; do not trust browser-supplied role labels.
- Keep protected tables behind RLS and review every table's policies.
- Restrict access to biometric descriptors and attendance records.
- Use informed consent and an approved retention policy for student biometric data.
- Keep an alternative attendance process for students who cannot complete face or GPS verification.
- Log security-relevant events without placing raw biometric data or unnecessary personal information in logs.
- Treat automated test results, simulated data, preview deployments, and production field results as separate evidence categories.

## 12. Research Limitations and Next Steps

The current production snapshot confirms that the website, API configuration, and database connectivity are available. It does not establish that every feature has passed a real school-day trial.

Priority next steps:

1. Complete a privacy and consent review before collecting student biometric samples.
2. Populate authorized student test records and perform controlled face-verification trials.
3. Conduct GPS field measurements at several points around the 50 m geofence.
4. Compare manual and digital attendance durations using the same observation protocol.
5. Configure and test Fonnte in a controlled environment before claiming successful production delivery.
6. Review the RLS policies for `absence_requests` and `system_settings`.
7. Document test results, sample sizes, failure cases, and limitations in the research report.

Amanah.id should be evaluated using measured evidence. Features that are implemented in code, tests that pass in a simulated environment, and functions verified in real production use must be reported separately.
