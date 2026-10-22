
"use strict";

// School configuration and in-memory state
let SCHOOL_LOCATION = {
    lat: -6.253590517740096,
    lng: 106.60299502682263,
    radius: 35,
    name: "Al Fityan School"
};
const MAX_GPS_ACCURACY_METERS = 35;
const FACE_MATCH_THRESHOLD = 0.45;
const MAX_FACE_SAMPLES = 5;

const ROLE_T = {
    id: {
        roleTeacher: "Guru", roleStudent: "Siswa", teacherDashboard: "Dashboard Guru",
        studentWorkspace: "MENU SISWA", studentAttendance: "Presensi Saya", studentHistory: "Riwayat Saya",
        studentCheckinTitle: "Catat kehadiran Anda",
        studentCheckinDesc: "Pastikan Anda berada di area sekolah. Lokasi akan diperiksa sebelum kamera dinyalakan.",
        studentCameraOff: "Kamera belum aktif",
        studentCameraOffDesc: "Tekan Absen Sekarang untuk memeriksa lokasi dan memulai verifikasi.",
        checkInNow: "Absen Sekarang", studentHistoryTitle: "Riwayat presensi saya",
        studentHistoryDesc: "Hanya catatan presensi akun Anda yang ditampilkan.",
        studentHistoryEmpty: "Riwayat presensi Anda akan tampil di sini.",
        parentWhatsApp: "WhatsApp orang tua",
        whatsappPlaceholder: "08xxxxxxxxxx atau 628xxxxxxxxxx",
        invalidWhatsApp: "Nomor WhatsApp orang tua harus dimulai dengan 08 atau 628 dan berisi nomor yang valid.",
        whatsappSuccess: "Notifikasi WhatsApp berhasil dikirim ke orang tua.",
        whatsappFailed: "Presensi tercatat, tetapi notifikasi WhatsApp gagal dikirim.",
        roleTeacherMismatch: "Akun ini bukan akun guru. Silakan pilih peran Siswa.",
        roleStudentMismatch: "Akun ini bukan akun siswa. Silakan pilih peran Guru.",
        studentNeedsNisn: "Masukkan NISN yang didaftarkan oleh guru.",
        studentUnlinked: "Akun sudah dibuat tetapi belum terhubung dengan data wajah. Minta guru mendaftarkan NISN Anda sebelum presensi.",
        studentMatched: "Data wajah Anda sudah terhubung.",
        studentAlreadyPresent: "Presensi hari ini sudah tercatat untuk Anda.",
        studentAttendanceSuccess: "Presensi berhasil dicatat.",
        gpsAccuracyStatus: "Akurasi GPS ±{accuracy} m",
        studentMissingWa: "Nomor WhatsApp orang tua belum tersedia pada data siswa.",
        parentAttendanceMessage: "Assalamu'alaikum, presensi {name} ({nisn}) tercatat pada {date} pukul {time} di Al Fityan School."
    },
    en: {
        roleTeacher: "Teacher", roleStudent: "Student", teacherDashboard: "Teacher dashboard",
        studentWorkspace: "STUDENT MENU", studentAttendance: "My attendance", studentHistory: "My history",
        studentCheckinTitle: "Record your attendance",
        studentCheckinDesc: "Make sure you are within the school area. Your location is checked before the camera starts.",
        studentCameraOff: "Camera is off",
        studentCameraOffDesc: "Select Check in now to verify your location and start face verification.",
        checkInNow: "Check in now", studentHistoryTitle: "My attendance history",
        studentHistoryDesc: "Only attendance records belonging to your account are shown.",
        studentHistoryEmpty: "Your attendance history will appear here.",
        parentWhatsApp: "Parent's WhatsApp",
        whatsappPlaceholder: "08xxxxxxxxxx or 628xxxxxxxxxx",
        invalidWhatsApp: "The parent's WhatsApp number must start with 08 or 628 and be a valid number.",
        whatsappSuccess: "WhatsApp notification sent to the parent.",
        whatsappFailed: "Attendance was recorded, but the WhatsApp notification could not be sent.",
        roleTeacherMismatch: "This is not a teacher account. Please select Student.",
        roleStudentMismatch: "This is not a student account. Please select Teacher.",
        studentNeedsNisn: "Enter the NISN registered by your teacher.",
        studentUnlinked: "Your account was created but is not linked to a face record. Ask your teacher to register your NISN before checking in.",
        studentMatched: "Your face record is linked.",
        studentAlreadyPresent: "Your attendance has already been recorded today.",
        studentAttendanceSuccess: "Attendance recorded successfully.",
        gpsAccuracyStatus: "GPS accuracy ±{accuracy} m",
        studentMissingWa: "The student record does not have a parent's WhatsApp number.",
        parentAttendanceMessage: "Attendance for {name} ({nisn}) was recorded on {date} at {time} at Al Fityan School."
    },
    ar: {
        roleTeacher: "معلّم", roleStudent: "طالب", teacherDashboard: "لوحة المعلّم",
        studentWorkspace: "قائمة الطالب", studentAttendance: "حضوري", studentHistory: "سجلي",
        studentCheckinTitle: "تسجيل الحضور",
        studentCheckinDesc: "تأكد من وجودك داخل منطقة المدرسة. سيتم التحقق من الموقع قبل تشغيل الكاميرا.",
        studentCameraOff: "الكاميرا متوقفة",
        studentCameraOffDesc: "اضغط على تسجيل الحضور للتحقق من الموقع وبدء التحقق من الوجه.",
        checkInNow: "تسجيل الحضور", studentHistoryTitle: "سجل حضوري",
        studentHistoryDesc: "تظهر هنا سجلات الحضور الخاصة بحسابك فقط.",
        studentHistoryEmpty: "سيظهر سجل حضورك هنا.",
        parentWhatsApp: "واتساب ولي الأمر",
        whatsappPlaceholder: "08xxxxxxxxxx أو 628xxxxxxxxxx",
        invalidWhatsApp: "يجب أن يبدأ رقم واتساب ولي الأمر بـ 08 أو 628 وأن يكون صالحاً.",
        whatsappSuccess: "تم إرسال إشعار واتساب إلى ولي الأمر.",
        whatsappFailed: "تم تسجيل الحضور، لكن تعذر إرسال إشعار واتساب.",
        roleTeacherMismatch: "هذا ليس حساب معلّم. يرجى اختيار الطالب.",
        roleStudentMismatch: "هذا ليس حساب طالب. يرجى اختيار المعلّم.",
        studentNeedsNisn: "أدخل رقم NISN المسجل لدى المعلّم.",
        studentUnlinked: "تم إنشاء الحساب لكنه غير مرتبط ببيانات الوجه. اطلب من المعلّم تسجيل رقم NISN قبل الحضور.",
        studentMatched: "تم ربط بيانات وجهك.",
        studentAlreadyPresent: "تم تسجيل حضورك اليوم بالفعل.",
        studentAttendanceSuccess: "تم تسجيل الحضور بنجاح.",
        gpsAccuracyStatus: "دقة GPS ±{accuracy} م",
        studentMissingWa: "لا يوجد رقم واتساب لولي الأمر في سجل الطالب.",
        parentAttendanceMessage: "تم تسجيل حضور {name} ({nisn}) بتاريخ {date} الساعة {time} في مدرسة الفتيان."
    }
};

const EXTRA_T = {
    id: {
        welcomeTitle: "Presensi sekolah, lebih mudah.",
        welcomeDesc: "Amanah.id mencatat kehadiran dengan verifikasi wajah dan GPS. Tanpa mesin fingerprint atau RFID, dan membantu mencegah titip absen.",
        registeredStudentsHint: "Data wajah terdaftar di Supabase",
        historyDesc: "Riwayat tersimpan di cloud dan dapat diakses lintas perangkat.",
        privacyFirst: "Descriptor wajah, bukan foto",
        privacyDesc: "Descriptor wajah 128 dimensi disimpan di Supabase melalui server. Foto asli tidak disimpan.",
        heroFeatureFaceGps: "Wajah + GPS",
        heroFeatureNoHardware: "Tanpa mesin tambahan",
        heroFeatureLocation: "Lokasi terverifikasi",
        heroCta: "Masuk / Coba demo",
        studentCameraStop: "Matikan kamera",
        studentCameraStarting: "Memeriksa lokasi dan menyalakan kamera...",
        signupRoleHint: "Peran otomatis dari email: gunakan @siswa.id atau @guru.id.",
        signupEmailRoleRequired: "Email signup harus memuat jenis akun pada domain, seperti @siswa.id atau @guru.id.",
        allowedRadius: "Radius diizinkan: {radius} m",
        mapSchoolPopup: "Al Fityan School · Radius {radius} m",
        checkLocation: "Periksa lokasi",
        refreshLocation: "Perbarui lokasi",
        captureSample: "Simpan sampel kamera",
        faceSamplesCount: "{count} sampel wajah",
        faceSampleLimit: "Maksimal 5 sampel wajah per siswa.",
        duplicateFaceSample: "Sampel terlalu mirip. Ubah sudut wajah atau unggah foto lain.",
        locationAccuracyBad: "Akurasi rendah",
        fakeLocation: "Lokasi GPS menunjukkan anomali. Aktifkan lokasi perangkat yang sebenarnya lalu coba lagi.",
        cloudLoadFailed: "Data cloud gagal dimuat. Periksa koneksi lalu coba lagi.",
        cloudSaveFailed: "Data gagal disimpan ke cloud. Periksa koneksi lalu coba lagi.",
        cloudDeleteFailed: "Data gagal dihapus dari cloud. Periksa koneksi lalu coba lagi.",
        attendanceNetworkFailed: "Presensi tidak berhasil dikirim. Periksa koneksi lalu coba lagi.",
        attendanceWhatsappFailed: "Presensi tercatat, tetapi notifikasi WhatsApp gagal dikirim."
    },
    en: {
        welcomeTitle: "School attendance, made simple.",
        welcomeDesc: "Amanah.id records attendance with face and GPS checks. No fingerprint or RFID machines, helping prevent proxy attendance.",
        registeredStudentsHint: "Face data stored in Supabase",
        historyDesc: "Attendance history is stored in the cloud and available across devices.",
        privacyFirst: "Face descriptors, not photos",
        privacyDesc: "128-dimensional face descriptors are stored in Supabase through the server. Original photos are not stored.",
        heroFeatureFaceGps: "Face + GPS",
        heroFeatureNoHardware: "No extra hardware",
        heroFeatureLocation: "Verified location",
        heroCta: "Log in / Try demo",
        studentCameraStop: "Turn camera off",
        studentCameraStarting: "Checking location and starting camera...",
        signupRoleHint: "Your role is detected from email. Use @siswa.id or @guru.id.",
        signupEmailRoleRequired: "Signup email must identify the account role, such as @siswa.id or @guru.id.",
        allowedRadius: "Allowed radius: {radius} m",
        mapSchoolPopup: "Al Fityan School · {radius} m radius",
        checkLocation: "Check location",
        refreshLocation: "Refresh location",
        captureSample: "Save camera sample",
        faceSamplesCount: "{count} face samples",
        faceSampleLimit: "A maximum of 5 face samples is allowed per student.",
        duplicateFaceSample: "This sample is too similar. Change the face angle or upload another photo.",
        locationAccuracyBad: "Low accuracy",
        fakeLocation: "GPS location appears anomalous. Enable the device's actual location and try again.",
        cloudLoadFailed: "Cloud data could not be loaded. Check your connection and try again.",
        cloudSaveFailed: "Data could not be saved to the cloud. Check your connection and try again.",
        cloudDeleteFailed: "Cloud data could not be deleted. Check your connection and try again.",
        attendanceNetworkFailed: "Attendance could not be submitted. Check your connection and try again.",
        attendanceWhatsappFailed: "Attendance was recorded, but the WhatsApp notification failed."
    },
    ar: {
        welcomeTitle: "حضور مدرسي أكثر سهولة.",
        welcomeDesc: "تسجل أمانة.id الحضور بالتحقق من الوجه وGPS. دون أجهزة بصمة أو RFID، وتساعد على منع تسجيل الحضور بالنيابة.",
        registeredStudentsHint: "بيانات الوجه محفوظة في Supabase",
        historyDesc: "يُحفظ سجل الحضور في السحابة ويمكن الوصول إليه من أجهزة متعددة.",
        privacyFirst: "واصفات الوجه، وليس الصور",
        privacyDesc: "تُحفظ واصفات الوجه ذات 128 بُعدًا في Supabase عبر الخادم. لا تُحفظ الصور الأصلية.",
        heroFeatureFaceGps: "الوجه + GPS",
        heroFeatureNoHardware: "دون أجهزة إضافية",
        heroFeatureLocation: "موقع موثّق",
        heroCta: "دخول / تجربة العرض",
        studentCameraStop: "إيقاف الكاميرا",
        studentCameraStarting: "جارٍ التحقق من الموقع وتشغيل الكاميرا...",
        signupRoleHint: "يُحدد الدور من البريد الإلكتروني. استخدم @siswa.id أو @guru.id.",
        signupEmailRoleRequired: "يجب أن يحدد بريد التسجيل الدور، مثل @siswa.id أو @guru.id.",
        allowedRadius: "النطاق المسموح: {radius} م",
        mapSchoolPopup: "مدرسة الفتيان · نطاق {radius} م",
        checkLocation: "تحقق من الموقع",
        refreshLocation: "تحديث الموقع",
        captureSample: "حفظ عينة الكاميرا",
        faceSamplesCount: "{count} عينات وجه",
        faceSampleLimit: "الحد الأقصى 5 عينات وجه لكل طالب.",
        duplicateFaceSample: "العينة مشابهة جدًا. غيّر زاوية الوجه أو ارفع صورة أخرى.",
        locationAccuracyBad: "دقة منخفضة",
        fakeLocation: "يبدو أن موقع GPS غير طبيعي. فعّل الموقع الحقيقي للجهاز ثم أعد المحاولة.",
        cloudLoadFailed: "تعذر تحميل بيانات السحابة. تحقق من الاتصال وحاول مرة أخرى.",
        cloudSaveFailed: "تعذر حفظ البيانات في السحابة. تحقق من الاتصال وحاول مرة أخرى.",
        cloudDeleteFailed: "تعذر حذف بيانات السحابة. تحقق من الاتصال وحاول مرة أخرى.",
        attendanceNetworkFailed: "تعذر إرسال الحضور. تحقق من الاتصال وحاول مرة أخرى.",
        attendanceWhatsappFailed: "تم تسجيل الحضور، لكن تعذر إرسال إشعار واتساب."
    }
};

const $ = id => document.getElementById(id);
const state = {
    lang: "id",
    theme: "light",
    user: null,
    accounts: [
        {
            name: "Admin Amanah", email: "admin@amanahid.sch.id",
            password: "AmanahDemo!2026#ID", role: "guru"
        },
        {
            name: "Siswa Demo", email: "siswa@amanahid.sch.id",
            password: "SiswaDemo!2026#ID", role: "siswa", nisn: "0091234567"
        }
    ],
    students: [],
    attendance: [],
    modelReady: false,
    modelLoading: false,
    modelLoadingPromise: null,
    faceDetectorOptions: null,
    attendanceStream: null,
    attendanceStarting: false,
    attendanceStartToken: 0,
    formStream: null,
    attendanceTimer: null,
    formTimer: null,
    formStartToken: 0,
    attendanceBusy: false,
    formBusy: false,
    faceSamples: [],
    faceCandidate: null,
    lastLocation: null,
    lastGpsFix: null,
    locationCheckBusy: false,
    map: null,
    schoolMarker: null,
    userMarker: null,
    schoolCircle: null,
    toastTimer: null,
    lastNose: null,
    movementFrames: 0,
    attendanceRecorded: false,
    lastFaceMatchAt: 0,
    cloudLoadToken: 0,
    cloudDataPromise: Promise.resolve(),
    schoolSettingsLoaded: false,
    mapEditMode: false,
    mapDraftLocation: null,
    splashTimers: []
};
let authModalTrigger = null;

// Three-language dictionary
const T = {
    id: {
        authEyebrow: "PRESENSI DIGITAL SEKOLAH", welcomeTitle: "Presensi yang lebih aman.", welcomeDesc: "Masuk untuk mengelola presensi dan data siswa.", login: "Masuk", signup: "Daftar", email: "Email", password: "Kata sandi", demoAccount: "Akun demo", fullName: "Nama lengkap", confirmPassword: "Konfirmasi kata sandi", terms: "Saya menyetujui ketentuan penggunaan demo.", workspace: "WORKSPACE", dashboard: "Dashboard", database: "Database", formulir: "Formulir", geofenceEnabled: "GPS geofencing aktif", viewProfile: "Lihat profil", schoolWorkspace: "AL FITYAN SCHOOL", dailyAttendance: "PRESENSI HARIAN", cameraTitle: "Kamera presensi", cameraDesc: "Periksa lokasi sekolah, lalu verifikasi wajah untuk mencatat kehadiran.", viewMap: "Lihat peta", secureCamera: "Kamera presensi", modelLoading: "Memuat AI...", cameraOff: "Kamera belum aktif", cameraOffDesc: "Aktifkan sakelar setelah lokasi terverifikasi.", cameraReady: "Kamera siap", fullscreen: "Layar penuh", locationVerification: "Verifikasi lokasi", locationNotChecked: "Lokasi belum diperiksa", locationPending: "Belum diperiksa", attendanceSwitch: "Sakelar presensi", switchOffHint: "Kamera mati. Lokasi akan diperiksa saat diaktifkan.", off: "MATI", on: "AKTIF", waitingFace: "Menunggu kamera", livenessWaiting: "Verifikasi wajah dan gerakan dimulai setelah lokasi lolos.", recordsCenter: "PUSAT DATA", attendanceDatabase: "Database presensi", databaseDesc: "Cari, saring, dan ekspor riwayat kehadiran serta data siswa.", exportCsv: "Ekspor CSV", registeredStudents: "Siswa terdaftar", registeredStudentsHint: "Data wajah dalam sesi ini", todayAttendance: "Presensi hari ini", todayAttendanceHint: "Catatan kehadiran hari ini", totalRecords: "Total catatan", totalRecordsHint: "Semua catatan dalam sesi ini", attendanceHistory: "Riwayat presensi", historyDesc: "Data demo tersimpan selama halaman ini terbuka.", deleteAll: "Hapus semua data", searchPlaceholder: "Cari nama, NISN, atau kelas...", fromDate: "Dari", toDate: "Sampai", number: "No.", nisn: "NISN", name: "Nama", class: "Kelas", status: "Status", date: "Tanggal", time: "Waktu", method: "Metode", confidence: "Keyakinan", action: "Aksi", noRecords: "Belum ada catatan", noRecordsDesc: "Riwayat presensi muncul di sini setelah verifikasi berhasil.", studentRegistry: "Data siswa", studentRegistryDesc: "Daftar siswa dengan sampel wajah terdaftar.", registeredAt: "Waktu daftar", noStudents: "Belum ada siswa terdaftar", registerFromForm: "Tambahkan siswa melalui menu Formulir.", studentManagement: "MANAJEMEN SISWA", studentRegistration: "Formulir pendaftaran siswa", formDesc: "Daftarkan identitas dan sampel wajah untuk pengenalan presensi.", studentIdentity: "Identitas siswa", studentIdentityDesc: "Isi data dengan benar sebelum menyimpan.", faceSample: "Sampel wajah", faceSampleDesc: "Gunakan kamera atau unggah foto dengan satu wajah yang terlihat jelas.", openCamera: "Buka kamera", closeCamera: "Tutup kamera", uploadPhoto: "Unggah foto wajah", noFaceSample: "Belum ada sampel wajah.", saveStudent: "Simpan siswa", clearFace: "Wajah harus jelas", clearFaceDesc: "Pastikan hanya satu wajah terlihat, pencahayaan cukup, dan wajah tidak tertutup.", privacyFirst: "Data bersifat sementara", privacyDesc: "Demo menyimpan descriptor wajah di memori browser. Data hilang setelah halaman dimuat ulang.", accountSettings: "PENGATURAN AKUN", myProfile: "Profil saya", appearance: "Tampilan", lightTheme: "Terang", darkTheme: "Gelap", language: "Bahasa", saveSettings: "Simpan pengaturan", logout: "Keluar", locationSecurity: "KEAMANAN LOKASI", schoolMap: "Peta area sekolah", mapDesc: "Titik sekolah dan posisi perangkat Anda.", schoolPoint: "Titik sekolah", yourLocation: "Lokasi Anda", allowedRadius: "Radius diizinkan: 50 m", mapLocationPending: "Periksa lokasi untuk menampilkan posisi perangkat.", refreshLocation: "Periksa lokasi lagi", confirmDeleteTitle: "Hapus semua data?", confirmDeleteDesc: "Semua catatan presensi dan siswa dalam sesi ini akan dihapus.", cancel: "Batal", locationChecking: "Memeriksa lokasi...", locationInside: "Di dalam area sekolah", locationOutside: "Di luar area sekolah", locationError: "Lokasi gagal diperiksa", gpsDenied: "Izin lokasi ditolak. Aktifkan izin lokasi/GPS pada browser lalu coba lagi.", gpsUnavailable: "Posisi tidak tersedia. Aktifkan GPS dan pastikan perangkat mendapat sinyal lokasi.", gpsTimeout: "Waktu pemeriksaan lokasi habis. Coba lagi di area dengan sinyal GPS yang lebih baik.", gpsUnsupported: "Browser ini tidak mendukung geolocation. Gunakan browser modern dengan izin lokasi.", gpsFailed: "Lokasi gagal diperiksa. Periksa pengaturan lokasi perangkat lalu coba lagi.", outsideMessage: "Presensi ditolak. Jarak Anda dari sekolah {distance} m, sedangkan radius maksimum yang diizinkan {radius} m.", insideMessage: "Lokasi lolos: {distance} m dari sekolah, akurasi GPS ±{accuracy} m.", accuracyWarning: "Lokasi berada di dalam radius, tetapi akurasi GPS terlalu rendah ({accuracy} m). Coba lagi di area terbuka.", checkingBeforeCamera: "Memeriksa GPS sebelum kamera dinyalakan...", cameraPermission: "Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.", cameraUnavailable: "Kamera tidak tersedia atau sedang digunakan aplikasi lain.", cameraUnsupported: "Browser tidak mendukung akses kamera.", modelFailed: "Model AI gagal dimuat. Periksa koneksi internet lalu tekan muat ulang halaman.", retryModel: "Muat ulang halaman untuk mencoba kembali.", faceNoMatch: "Wajah belum cocok dengan siswa terdaftar.", faceTooMany: "Terdeteksi lebih dari satu wajah. Pastikan hanya satu orang di depan kamera.", faceNotFound: "Wajah tidak terdeteksi. Posisikan wajah di dalam bingkai.", livenessMove: "Gerakkan kepala sedikit agar pemeriksaan keaktifan selesai.", attendanceSuccess: "Presensi berhasil dicatat untuk {name}.", alreadyPresent: "Presensi hari ini sudah tercatat untuk siswa ini.", cameraStopped: "Kamera dimatikan.", locationRequired: "Lokasi belum terverifikasi. Kamera tetap mati.", fullscreenError: "Mode layar penuh tidak tersedia pada perangkat ini.", mapFailed: "Peta gagal dimuat. Periksa koneksi internet.", mapLocationFailed: "Posisi Anda belum tersedia. Periksa lokasi terlebih dahulu.", studentExists: "NISN sudah terdaftar.", invalidNisn: "NISN harus diisi dengan benar.", needFace: "Ambil atau unggah sampel wajah terlebih dahulu.", studentSaved: "Data siswa berhasil didaftarkan.", studentDeleted: "Data siswa berhasil dihapus.", attendanceDeleted: "Catatan presensi berhasil dihapus.", allDeleted: "Semua data presensi dan siswa berhasil dihapus.", settingsSaved: "Pengaturan berhasil disimpan.", loginFailed: "Email atau kata sandi tidak sesuai.", signupSuccess: "Akun demo dibuat. Silakan masuk.", passwordMismatch: "Konfirmasi kata sandi tidak cocok.", termsRequired: "Setujui ketentuan sebelum mendaftar.", emailExists: "Email sudah terdaftar.", loggedOut: "Anda telah keluar.", emptyCsv: "Tidak ada data untuk diekspor.", csvSaved: "File CSV berhasil disiapkan.", cameraFormReady: "Kamera formulir aktif.", cameraFormOff: "Kamera formulir dimatikan.", faceSampleReady: "Sampel wajah siap digunakan.", modelReady: "AI siap", modelLoadingLong: "Menyiapkan model AI...", faceDetected: "Wajah terdeteksi", faceRegistered: "Wajah terdaftar", faceNotRegistered: "Wajah belum terdaftar", attendanceInProgress: "Memverifikasi wajah...", attendanceWaiting: "Menunggu wajah terdaftar...", attendanceReady: "Lokasi terverifikasi. Kamera siap.", methodFaceGps: "Wajah + GPS", delete: "Hapus", recordsCount: "{count} catatan", studentsCount: "{count} siswa", unknownClass: "Belum diisi", mapSchoolPopup: "Al Fityan School · Radius 50 m", mapUserPopup: "Posisi perangkat Anda", mapDistance: "Jarak dari sekolah: {distance} m", mapAccuracy: "Akurasi GPS: ±{accuracy} m", registeredAlready: "NISN tersebut sudah terdaftar.", locationMapReady: "Peta siap. Posisi perangkat akan muncul setelah GPS berhasil diperiksa.", noLocationForMap: "Periksa lokasi terlebih dahulu untuk menampilkan titik perangkat.", faceUploadError: "Foto tidak dapat diproses. Gunakan JPG, PNG, atau WebP yang valid.", faceSampleCapture: "Wajah terdeteksi. Sampel dapat digunakan.", cameraStartFailed: "Kamera gagal dimulai. Periksa izin browser dan koneksi aman HTTPS.", cameraStarting: "Memulai kamera...", locationVerified: "Lokasi terverifikasi.", confidenceLabel: "Keyakinan", student: "Siswa", attendance: "Hadir"
    },
    en: {
        authEyebrow: "SCHOOL DIGITAL ATTENDANCE", welcomeTitle: "Attendance, made safer.", welcomeDesc: "Sign in to manage attendance and student records.", login: "Log in", signup: "Sign up", email: "Email", password: "Password", demoAccount: "Demo account", fullName: "Full name", confirmPassword: "Confirm password", terms: "I agree to the demo terms of use.", workspace: "WORKSPACE", dashboard: "Dashboard", database: "Database", formulir: "Registration", geofenceEnabled: "GPS geofencing active", viewProfile: "View profile", schoolWorkspace: "AL FITYAN SCHOOL", dailyAttendance: "DAILY ATTENDANCE", cameraTitle: "Attendance camera", cameraDesc: "Verify your school location, then verify your face to record attendance.", viewMap: "View map", secureCamera: "Attendance camera", modelLoading: "Loading AI...", cameraOff: "Camera is off", cameraOffDesc: "Enable the switch after your location is verified.", cameraReady: "Camera ready", fullscreen: "Fullscreen", locationVerification: "Location verification", locationNotChecked: "Location not checked", locationPending: "Not checked", attendanceSwitch: "Attendance switch", switchOffHint: "Camera is off. Your location will be checked when enabled.", off: "OFF", on: "ON", waitingFace: "Waiting for camera", livenessWaiting: "Face and movement checks begin after location verification.", recordsCenter: "RECORDS CENTER", attendanceDatabase: "Attendance database", databaseDesc: "Search, filter, and export attendance history and student records.", exportCsv: "Export CSV", registeredStudents: "Registered students", registeredStudentsHint: "Face data in this session", todayAttendance: "Today's attendance", todayAttendanceHint: "Attendance records today", totalRecords: "Total records", totalRecordsHint: "All records in this session", attendanceHistory: "Attendance history", historyDesc: "Demo data stays while this page is open.", deleteAll: "Delete all data", searchPlaceholder: "Search name, NISN, or class...", fromDate: "From", toDate: "To", number: "No.", nisn: "NISN", name: "Name", class: "Class", status: "Status", date: "Date", time: "Time", method: "Method", confidence: "Confidence", action: "Action", noRecords: "No records yet", noRecordsDesc: "Attendance history appears here after successful verification.", studentRegistry: "Student registry", studentRegistryDesc: "Students with registered face samples.", registeredAt: "Registered at", noStudents: "No registered students yet", registerFromForm: "Add students from the Registration menu.", studentManagement: "STUDENT MANAGEMENT", studentRegistration: "Student registration form", formDesc: "Register student details and a face sample for attendance recognition.", studentIdentity: "Student identity", studentIdentityDesc: "Enter the correct information before saving.", faceSample: "Face sample", faceSampleDesc: "Use the camera or upload a photo with one clearly visible face.", openCamera: "Open camera", closeCamera: "Close camera", uploadPhoto: "Upload face photo", noFaceSample: "No face sample yet.", saveStudent: "Save student", clearFace: "Face must be clear", clearFaceDesc: "Ensure only one face is visible, lighting is sufficient, and the face is unobstructed.", privacyFirst: "Temporary data", privacyDesc: "This demo stores face descriptors only in browser memory. Data disappears after reload.", accountSettings: "ACCOUNT SETTINGS", myProfile: "My profile", appearance: "Appearance", lightTheme: "Light", darkTheme: "Dark", language: "Language", saveSettings: "Save settings", logout: "Log out", locationSecurity: "LOCATION SECURITY", schoolMap: "School area map", mapDesc: "School point and your device location.", schoolPoint: "School location", yourLocation: "Your location", allowedRadius: "Allowed radius: 50 m", mapLocationPending: "Check your location to show your device position.", refreshLocation: "Check location again", confirmDeleteTitle: "Delete all data?", confirmDeleteDesc: "All attendance records and registered students in this session will be deleted.", cancel: "Cancel", locationChecking: "Checking location...", locationInside: "Inside school area", locationOutside: "Outside school area", locationError: "Location check failed", gpsDenied: "Location permission was denied. Enable location/GPS permissions in your browser and try again.", gpsUnavailable: "Position unavailable. Enable GPS and ensure your device can receive location signals.", gpsTimeout: "Location check timed out. Try again where GPS reception is better.", gpsUnsupported: "This browser does not support geolocation. Use a modern browser with location permission.", gpsFailed: "Could not check location. Review your device location settings and try again.", outsideMessage: "Attendance denied. You are {distance} m from school; the maximum allowed radius is {radius} m.", insideMessage: "Location accepted: {distance} m from school, GPS accuracy ±{accuracy} m.", accuracyWarning: "You are inside the radius, but GPS accuracy is too low ({accuracy} m). Try again in an open area.", checkingBeforeCamera: "Checking GPS before enabling the camera...", cameraPermission: "Camera permission denied. Allow camera access in your browser settings.", cameraUnavailable: "Camera unavailable or already in use by another app.", cameraUnsupported: "This browser does not support camera access.", modelFailed: "AI model failed to load. Check your internet connection and reload the page.", retryModel: "Reload the page to try again.", faceNoMatch: "Face does not match a registered student.", faceTooMany: "More than one face detected. Ensure only one person is in front of the camera.", faceNotFound: "No face detected. Position your face inside the frame.", livenessMove: "Move your head slightly to complete the liveness check.", attendanceSuccess: "Attendance recorded for {name}.", alreadyPresent: "Attendance is already recorded for this student today.", cameraStopped: "Camera turned off.", locationRequired: "Location is not verified. The camera will remain off.", fullscreenError: "Fullscreen mode is unavailable on this device.", mapFailed: "Map failed to load. Check your internet connection.", mapLocationFailed: "Your position is unavailable. Check your location first.", studentExists: "This NISN is already registered.", invalidNisn: "Enter a valid NISN.", needFace: "Capture or upload a face sample first.", studentSaved: "Student registered successfully.", studentDeleted: "Student deleted successfully.", attendanceDeleted: "Attendance record deleted.", allDeleted: "All attendance and student data deleted.", settingsSaved: "Settings saved.", loginFailed: "Email or password is incorrect.", signupSuccess: "Demo account created. You can now log in.", passwordMismatch: "Password confirmation does not match.", termsRequired: "Accept the terms before signing up.", emailExists: "Email is already registered.", loggedOut: "You have logged out.", emptyCsv: "There is no data to export.", csvSaved: "CSV file prepared successfully.", cameraFormReady: "Registration camera is active.", cameraFormOff: "Registration camera turned off.", faceSampleReady: "Face sample is ready.", modelReady: "AI ready", modelLoadingLong: "Preparing AI models...", faceDetected: "Face detected", faceRegistered: "Face registered", faceNotRegistered: "Face not registered", attendanceInProgress: "Verifying face...", attendanceWaiting: "Waiting for a registered face...", attendanceReady: "Location verified. Camera ready.", methodFaceGps: "Face + GPS", delete: "Delete", recordsCount: "{count} records", studentsCount: "{count} students", unknownClass: "Not provided", mapSchoolPopup: "Al Fityan School · 50 m radius", mapUserPopup: "Your device location", mapDistance: "Distance from school: {distance} m", mapAccuracy: "GPS accuracy: ±{accuracy} m", registeredAlready: "This NISN is already registered.", locationMapReady: "Map ready. Your device position will appear after GPS verification.", noLocationForMap: "Check your location first to display your device marker.", faceUploadError: "Unable to process photo. Use a valid JPG, PNG, or WebP image.", faceSampleCapture: "Face detected. Sample can be used.", cameraStartFailed: "Could not start camera. Check browser permissions and secure HTTPS connection.", cameraStarting: "Starting camera...", locationVerified: "Location verified.", confidenceLabel: "Confidence", student: "Student", attendance: "Present"
    },
    ar: {
        authEyebrow: "الحضور الرقمي المدرسي", welcomeTitle: "حضور أكثر أمانًا.", welcomeDesc: "سجّل الدخول لإدارة الحضور وبيانات الطلاب.", login: "تسجيل الدخول", signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور", demoAccount: "حساب تجريبي", fullName: "الاسم الكامل", confirmPassword: "تأكيد كلمة المرور", terms: "أوافق على شروط استخدام النسخة التجريبية.", workspace: "مساحة العمل", dashboard: "الرئيسية", database: "قاعدة البيانات", formulir: "التسجيل", geofenceEnabled: "تحديد الموقع مفعّل", viewProfile: "عرض الملف الشخصي", schoolWorkspace: "مدرسة الفتيان", dailyAttendance: "الحضور اليومي", cameraTitle: "كاميرا الحضور", cameraDesc: "تحقق من وجودك داخل المدرسة ثم تحقق من الوجه لتسجيل الحضور.", viewMap: "عرض الخريطة", secureCamera: "كاميرا الحضور", modelLoading: "جارٍ تحميل الذكاء الاصطناعي...", cameraOff: "الكاميرا متوقفة", cameraOffDesc: "فعّل المفتاح بعد التحقق من الموقع.", cameraReady: "الكاميرا جاهزة", fullscreen: "ملء الشاشة", locationVerification: "التحقق من الموقع", locationNotChecked: "لم يتم التحقق من الموقع", locationPending: "لم يتم التحقق", attendanceSwitch: "مفتاح الحضور", switchOffHint: "الكاميرا متوقفة. سيتم التحقق من موقعك عند التفعيل.", off: "إيقاف", on: "تشغيل", waitingFace: "بانتظار الكاميرا", livenessWaiting: "يبدأ التحقق من الوجه والحركة بعد التحقق من الموقع.", recordsCenter: "مركز السجلات", attendanceDatabase: "قاعدة بيانات الحضور", databaseDesc: "ابحث عن سجل الحضور وبيانات الطلاب وصفِّها وصدرها.", exportCsv: "تصدير CSV", registeredStudents: "الطلاب المسجلون", registeredStudentsHint: "بيانات الوجه في هذه الجلسة", todayAttendance: "حضور اليوم", todayAttendanceHint: "سجلات الحضور اليوم", totalRecords: "إجمالي السجلات", totalRecordsHint: "جميع سجلات هذه الجلسة", attendanceHistory: "سجل الحضور", historyDesc: "تظل البيانات التجريبية متاحة أثناء فتح الصفحة.", deleteAll: "حذف جميع البيانات", searchPlaceholder: "ابحث بالاسم أو رقم الطالب أو الفصل...", fromDate: "من", toDate: "إلى", number: "رقم", nisn: "رقم الطالب", name: "الاسم", class: "الفصل", status: "الحالة", date: "التاريخ", time: "الوقت", method: "الطريقة", confidence: "نسبة الثقة", action: "الإجراء", noRecords: "لا توجد سجلات بعد", noRecordsDesc: "سيظهر سجل الحضور هنا بعد نجاح التحقق.", studentRegistry: "سجل الطلاب", studentRegistryDesc: "الطلاب الذين لديهم عينات وجه مسجلة.", registeredAt: "تاريخ التسجيل", noStudents: "لا يوجد طلاب مسجلون بعد", registerFromForm: "أضف الطلاب من قائمة التسجيل.", studentManagement: "إدارة الطلاب", studentRegistration: "نموذج تسجيل الطلاب", formDesc: "سجّل بيانات الطالب وعينة الوجه للتعرف على الحضور.", studentIdentity: "بيانات الطالب", studentIdentityDesc: "أدخل المعلومات الصحيحة قبل الحفظ.", faceSample: "عينة الوجه", faceSampleDesc: "استخدم الكاميرا أو ارفع صورة يظهر فيها وجه واحد بوضوح.", openCamera: "فتح الكاميرا", closeCamera: "إغلاق الكاميرا", uploadPhoto: "رفع صورة الوجه", noFaceSample: "لا توجد عينة وجه بعد.", saveStudent: "حفظ الطالب", clearFace: "يجب أن يكون الوجه واضحًا", clearFaceDesc: "تأكد من ظهور وجه واحد فقط ومن الإضاءة الجيدة وعدم تغطية الوجه.", privacyFirst: "بيانات مؤقتة", privacyDesc: "تحفظ هذه النسخة التجريبية بيانات الوجه في ذاكرة المتصفح فقط، وتختفي عند إعادة تحميل الصفحة.", accountSettings: "إعدادات الحساب", myProfile: "ملفي الشخصي", appearance: "المظهر", lightTheme: "فاتح", darkTheme: "داكن", language: "اللغة", saveSettings: "حفظ الإعدادات", logout: "تسجيل الخروج", locationSecurity: "أمان الموقع", schoolMap: "خريطة منطقة المدرسة", mapDesc: "موقع المدرسة وموقع جهازك.", schoolPoint: "موقع المدرسة", yourLocation: "موقعك", allowedRadius: "نطاق السماح: 50 مترًا", mapLocationPending: "تحقق من موقعك لإظهار موقع الجهاز.", refreshLocation: "التحقق من الموقع مجددًا", confirmDeleteTitle: "حذف جميع البيانات؟", confirmDeleteDesc: "سيتم حذف سجلات الحضور والطلاب المسجلين في هذه الجلسة.", cancel: "إلغاء", locationChecking: "جارٍ التحقق من الموقع...", locationInside: "داخل نطاق المدرسة", locationOutside: "خارج نطاق المدرسة", locationError: "فشل التحقق من الموقع", gpsDenied: "تم رفض إذن الموقع. فعّل إذن الموقع أو GPS في المتصفح ثم حاول مجددًا.", gpsUnavailable: "الموقع غير متاح. فعّل GPS وتأكد من استقبال الجهاز لإشارة الموقع.", gpsTimeout: "انتهت مهلة التحقق من الموقع. حاول مجددًا في مكان تكون فيه إشارة GPS أفضل.", gpsUnsupported: "هذا المتصفح لا يدعم تحديد الموقع. استخدم متصفحًا حديثًا مع السماح بالوصول إلى الموقع.", gpsFailed: "تعذر التحقق من الموقع. راجع إعدادات الموقع في جهازك ثم حاول مجددًا.", outsideMessage: "تم رفض الحضور. تبعد عن المدرسة {distance} مترًا، بينما النطاق الأقصى المسموح هو {radius} مترًا.", insideMessage: "تم قبول الموقع: البعد {distance} مترًا، ودقة GPS نحو ±{accuracy} متر.", accuracyWarning: "أنت داخل النطاق لكن دقة GPS منخفضة ({accuracy} متر). حاول مجددًا في مكان مفتوح.", checkingBeforeCamera: "جارٍ التحقق من GPS قبل تشغيل الكاميرا...", cameraPermission: "تم رفض إذن الكاميرا. اسمح للمتصفح باستخدام الكاميرا.", cameraUnavailable: "الكاميرا غير متاحة أو تستخدمها تطبيقات أخرى.", cameraUnsupported: "هذا المتصفح لا يدعم الوصول إلى الكاميرا.", modelFailed: "تعذر تحميل نموذج الذكاء الاصطناعي. تحقق من الإنترنت وأعد تحميل الصفحة.", retryModel: "أعد تحميل الصفحة للمحاولة مجددًا.", faceNoMatch: "الوجه لا يطابق أي طالب مسجل.", faceTooMany: "تم اكتشاف أكثر من وجه. تأكد من وجود شخص واحد أمام الكاميرا.", faceNotFound: "لم يتم اكتشاف وجه. ضع وجهك داخل الإطار.", livenessMove: "حرّك رأسك قليلًا لإكمال التحقق من الحيوية.", attendanceSuccess: "تم تسجيل الحضور للطالب {name}.", alreadyPresent: "تم تسجيل حضور هذا الطالب اليوم بالفعل.", cameraStopped: "تم إيقاف الكاميرا.", locationRequired: "لم يتم التحقق من الموقع. ستظل الكاميرا متوقفة.", fullscreenError: "وضع ملء الشاشة غير متاح على هذا الجهاز.", mapFailed: "تعذر تحميل الخريطة. تحقق من اتصال الإنترنت.", mapLocationFailed: "موقعك غير متاح. تحقق من الموقع أولًا.", studentExists: "رقم الطالب مسجل بالفعل.", invalidNisn: "أدخل رقم طالب صحيحًا.", needFace: "التقط عينة وجه أو ارفعها أولًا.", studentSaved: "تم تسجيل الطالب بنجاح.", studentDeleted: "تم حذف الطالب بنجاح.", attendanceDeleted: "تم حذف سجل الحضور.", allDeleted: "تم حذف جميع بيانات الحضور والطلاب.", settingsSaved: "تم حفظ الإعدادات.", loginFailed: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", signupSuccess: "تم إنشاء الحساب التجريبي. يمكنك تسجيل الدخول الآن.", passwordMismatch: "تأكيد كلمة المرور غير مطابق.", termsRequired: "وافق على الشروط قبل التسجيل.", emailExists: "البريد الإلكتروني مسجل بالفعل.", loggedOut: "تم تسجيل الخروج.", emptyCsv: "لا توجد بيانات لتصديرها.", csvSaved: "تم تجهيز ملف CSV.", cameraFormReady: "كاميرا التسجيل تعمل.", cameraFormOff: "تم إيقاف كاميرا التسجيل.", faceSampleReady: "عينة الوجه جاهزة.", modelReady: "الذكاء الاصطناعي جاهز", modelLoadingLong: "جارٍ تجهيز نماذج الذكاء الاصطناعي...", faceDetected: "تم اكتشاف الوجه", faceRegistered: "الوجه مسجل", faceNotRegistered: "الوجه غير مسجل", attendanceInProgress: "جارٍ التحقق من الوجه...", attendanceWaiting: "بانتظار وجه مسجل...", attendanceReady: "تم التحقق من الموقع. الكاميرا جاهزة.", methodFaceGps: "الوجه + GPS", delete: "حذف", recordsCount: "{count} سجل", studentsCount: "{count} طالب", unknownClass: "غير محدد", mapSchoolPopup: "مدرسة الفتيان · نطاق 50 مترًا", mapUserPopup: "موقع جهازك", mapDistance: "المسافة من المدرسة: {distance} متر", mapAccuracy: "دقة GPS: ±{accuracy} متر", registeredAlready: "رقم الطالب مسجل بالفعل.", locationMapReady: "الخريطة جاهزة. سيظهر موقع جهازك بعد التحقق من GPS.", noLocationForMap: "تحقق من موقعك أولًا لإظهار علامة الجهاز.", faceUploadError: "تعذرت معالجة الصورة. استخدم صورة JPG أو PNG أو WebP صالحة.", faceSampleCapture: "تم اكتشاف الوجه. يمكن استخدام العينة.", cameraStartFailed: "تعذر تشغيل الكاميرا. تحقق من أذونات المتصفح واتصال HTTPS الآمن.", cameraStarting: "جارٍ تشغيل الكاميرا...", locationVerified: "تم التحقق من الموقع.", confidenceLabel: "الثقة", student: "الطالب", attendance: "حاضر"
    }
};

Object.keys(ROLE_T).forEach(lang => Object.assign(T[lang], ROLE_T[lang]));

const LANDING_T = {
    id: {
        brandName: "Amanah.id", splashSubtitle: "Presensi Digital Sekolah",
        heroTitleFirst: "Presensi Sekolah Masa Kini,", heroTitleSecond: "Anti Titip Absen.",
        heroDescription: "Pantau kehadiran siswa secara real-time dengan verifikasi wajah dan lokasi GPS. Tanpa mesin fingerprint atau biaya perangkat keras.",
        heroBenefitsLabel: "Fitur Amanah.id", heroBenefitAccuracy: "Akurasi wajah tingkat tinggi",
        heroBenefitGps: "Mencegah GPS palsu dan titip absen", heroBenefitPhone: "Cukup gunakan ponsel siswa",
        aboutTitle: "Tentang Amanah.id",
        aboutDescription: "Amanah.id membantu sekolah mencatat kehadiran dengan verifikasi wajah dan lokasi.",
        chooseAccess: "Pilih akses", heroDashboardLabel: "Contoh dashboard presensi Amanah.id",
        mockDashboard: "Dashboard Presensi", mockGreeting: "Selamat pagi 👋",
        mockAttendanceLabel: "STATUS KEHADIRAN", mockPresentToday: "Hadir hari ini",
        mockTotalStudents: "Total siswa", mockRegistered: "Terdaftar", mockCheckedIn: "Sudah hadir",
        mockLatestAttendance: "Presensi terbaru", mockViewAll: "Lihat semua",
        heroFaceMatch: "Wajah cocok", heroFaceVerified: "99.8% terverifikasi",
        heroLocationValid: "Lokasi valid", heroSchoolDistance: "15 m dari sekolah",
        heroAttendanceSuccess: "Presensi berhasil", heroRecordedAutomatically: "Tercatat otomatis",
        heroFooter: "© 2026 Amanah.id · Presensi digital sekolah",
        emailPlaceholder: "nama@sekolah.sch.id", passwordPlaceholder: "Masukkan kata sandi",
        nisnExample: "Contoh: 0091234567", classExample: "Contoh: XI IPA 1",
        chooseAuthTab: "Pilih masuk atau daftar", close: "Tutup",
        setSchoolLocation: "Atur titik sekolah", cancelLocationEdit: "Batal mengatur lokasi",
        schoolRadius: "Radius sekolah: {radius} m", saveLocation: "Simpan lokasi",
        locationEditHint: "Pilih titik sekolah pada peta, lalu atur radius.",
        locationSaved: "Lokasi sekolah berhasil disimpan.",
        locationSaveFailed: "Lokasi sekolah gagal disimpan. Periksa koneksi lalu coba lagi.",
        schoolSettingsFailed: "Pengaturan lokasi gagal dimuat. Presensi dinonaktifkan.",
        locationSaving: "Menyimpan lokasi...", interactiveSchoolMap: "Peta sekolah interaktif",
        mainNavigation: "Navigasi utama", studentNavigation: "Navigasi siswa",
        profile: "Profil", toggleAttendanceCamera: "Aktifkan atau matikan kamera presensi"
    },
    en: {
        brandName: "Amanah.id", splashSubtitle: "Digital School Attendance",
        heroTitleFirst: "Modern School Attendance,", heroTitleSecond: "No Proxy Check-ins.",
        heroDescription: "Track student attendance in real time with face and GPS verification. No fingerprint machines or hardware costs.",
        heroBenefitsLabel: "Amanah.id features", heroBenefitAccuracy: "High-accuracy face recognition",
        heroBenefitGps: "Prevents GPS spoofing and proxy check-ins",
        heroBenefitPhone: "Students only need their phones",
        aboutTitle: "About Amanah.id",
        aboutDescription: "Amanah.id helps schools record attendance with face and location verification.",
        chooseAccess: "Choose access", heroDashboardLabel: "Amanah.id attendance dashboard preview",
        mockDashboard: "Attendance dashboard", mockGreeting: "Good morning 👋",
        mockAttendanceLabel: "ATTENDANCE STATUS", mockPresentToday: "Present today",
        mockTotalStudents: "Total students", mockRegistered: "Registered", mockCheckedIn: "Checked in",
        mockLatestAttendance: "Recent attendance", mockViewAll: "View all",
        heroFaceMatch: "Face matched", heroFaceVerified: "99.8% verified",
        heroLocationValid: "Location verified", heroSchoolDistance: "15 m from school",
        heroAttendanceSuccess: "Attendance recorded", heroRecordedAutomatically: "Saved automatically",
        heroFooter: "© 2026 Amanah.id · Digital school attendance",
        emailPlaceholder: "name@school.edu", passwordPlaceholder: "Enter your password",
        nisnExample: "Example: 0091234567", classExample: "Example: Grade 11 Science 1",
        chooseAuthTab: "Choose login or sign up", close: "Close",
        setSchoolLocation: "Set school location", cancelLocationEdit: "Cancel location editing",
        schoolRadius: "School radius: {radius} m", saveLocation: "Save location",
        locationEditHint: "Choose the school point on the map, then set the radius.",
        locationSaved: "School location saved.",
        locationSaveFailed: "Could not save the school location. Check your connection and try again.",
        schoolSettingsFailed: "Could not load location settings. Attendance is disabled.",
        locationSaving: "Saving location...", interactiveSchoolMap: "Interactive school map",
        mainNavigation: "Main navigation", studentNavigation: "Student navigation",
        profile: "Profile", toggleAttendanceCamera: "Toggle attendance camera"
    },
    ar: {
        brandName: "أمانة.id", splashSubtitle: "الحضور المدرسي الرقمي",
        heroTitleFirst: "الحضور المدرسي الحديث،", heroTitleSecond: "لا تسجيل بالنيابة.",
        heroDescription: "تابع حضور الطلاب لحظيًا باستخدام التحقق من الوجه وموقع GPS، دون أجهزة بصمة أو تكاليف معدات.",
        heroBenefitsLabel: "ميزات أمانة.id", heroBenefitAccuracy: "دقة عالية في التحقق من الوجه",
        heroBenefitGps: "منع تزوير GPS وتسجيل الحضور بالنيابة",
        heroBenefitPhone: "يكفي استخدام هاتف الطالب",
        aboutTitle: "عن أمانة.id",
        aboutDescription: "تساعد أمانة.id المدارس على تسجيل الحضور بالتحقق من الوجه والموقع.",
        chooseAccess: "اختر طريقة الدخول", heroDashboardLabel: "معاينة لوحة الحضور في أمانة.id",
        mockDashboard: "لوحة الحضور", mockGreeting: "صباح الخير 👋",
        mockAttendanceLabel: "حالة الحضور", mockPresentToday: "حاضر اليوم",
        mockTotalStudents: "إجمالي الطلاب", mockRegistered: "مسجل", mockCheckedIn: "سجلوا الحضور",
        mockLatestAttendance: "أحدث سجلات الحضور", mockViewAll: "عرض الكل",
        heroFaceMatch: "تم تطابق الوجه", heroFaceVerified: "تم التحقق بنسبة 99.8%",
        heroLocationValid: "الموقع موثّق", heroSchoolDistance: "على بُعد 15 م من المدرسة",
        heroAttendanceSuccess: "تم تسجيل الحضور", heroRecordedAutomatically: "تم الحفظ تلقائيًا",
        heroFooter: "© 2026 أمانة.id · الحضور المدرسي الرقمي",
        emailPlaceholder: "name@school.edu", passwordPlaceholder: "أدخل كلمة المرور",
        nisnExample: "مثال: 0091234567", classExample: "مثال: الصف 11 علوم 1",
        chooseAuthTab: "اختر تسجيل الدخول أو إنشاء حساب", close: "إغلاق",
        setSchoolLocation: "تعيين موقع المدرسة", cancelLocationEdit: "إلغاء تعديل الموقع",
        schoolRadius: "نطاق المدرسة: {radius} م", saveLocation: "حفظ الموقع",
        locationEditHint: "اختر نقطة المدرسة على الخريطة ثم حدد النطاق.",
        locationSaved: "تم حفظ موقع المدرسة.",
        locationSaveFailed: "تعذر حفظ موقع المدرسة. تحقق من الاتصال وحاول مجددًا.",
        schoolSettingsFailed: "تعذر تحميل إعدادات الموقع. تم تعطيل الحضور.",
        locationSaving: "جارٍ حفظ الموقع...", interactiveSchoolMap: "خريطة المدرسة التفاعلية",
        mainNavigation: "التنقل الرئيسي", studentNavigation: "تنقل الطالب",
        profile: "الملف الشخصي", toggleAttendanceCamera: "تشغيل كاميرا الحضور أو إيقافها"
    }
};
Object.keys(LANDING_T).forEach(lang => Object.assign(T[lang], LANDING_T[lang]));

// Text, theme, and basic UI helpers
function tr(key, vars = {}) {
    let text = EXTRA_T[state.lang]?.[key] ?? T[state.lang]?.[key] ??
        EXTRA_T.id[key] ?? T.id[key] ?? key;
    for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
}

function toast(message, type = "info") {
    const el = $("toast");
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
}

function setLanguage(lang) {
    if (!T[lang]) return;
    state.lang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        const text = EXTRA_T[lang]?.[key] ?? T[lang][key];
        if (text !== undefined) {
            el.textContent = ["allowedRadius", "schoolRadius"].includes(key)
                ? tr(key, { radius: SCHOOL_LOCATION.radius })
                : text;
        }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const text = EXTRA_T[lang]?.[key] ?? T[lang][key];
        if (text !== undefined) el.placeholder = text;
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
        const key = el.dataset.i18nTitle;
        const text = EXTRA_T[lang]?.[key] ?? T[lang][key];
        if (text !== undefined) el.title = text;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
        const text = tr(el.dataset.i18nAria);
        if (text) el.setAttribute("aria-label", text);
    });
    document.title = `${tr("brandName")} | ${tr("welcomeTitle")}`;
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    $("profile-language").value = lang;
    $("student-profile-language").value = lang;
    renderLocationBadge();
    renderDatabase();
    renderStudentList();
    updateStats();
    updateCameraTexts();
    renderStudentHistory();
    updateStudentProfile();
    if (state.map) updateMapText();
    updateSchoolLocationEditor();
    fitHeroTitle();
}

function fitHeroTitle() {
    const title = $("auth-hero-title");
    if (!title) return;

    title.style.removeProperty("--hero-fit-size");
    const baseSize = Number.parseFloat(getComputedStyle(title).fontSize);
    const availableWidth = title.clientWidth;
    if (!baseSize || !availableWidth) return;

    const style = getComputedStyle(title);
    const lineWidths = [...title.querySelectorAll("[data-i18n^='heroTitle']")].map(line => {
        const measure = document.createElement("span");
        measure.textContent = line.textContent.trim();
        Object.assign(measure.style, {
            position: "fixed",
            left: "-10000px",
            top: "0",
            width: "max-content",
            whiteSpace: "nowrap",
            visibility: "hidden",
            fontFamily: style.fontFamily,
            fontSize: `${baseSize}px`,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
            direction: document.documentElement.dir
        });
        document.body.append(measure);
        const width = measure.getBoundingClientRect().width;
        measure.remove();
        return width;
    });
    const widestLine = Math.max(0, ...lineWidths);
    const fitSize = widestLine > availableWidth
        ? baseSize * ((availableWidth - 2) / widestLine)
        : baseSize;
    title.style.setProperty("--hero-fit-size", `${Math.max(12, fitSize)}px`);
}

function setMapStatus(key = "") {
    const status = $("map-status");
    if (!status) return;
    if (!key) {
        status.textContent = "";
        delete status.dataset.i18n;
        status.classList.add("hidden");
        return;
    }
    status.dataset.i18n = key;
    status.textContent = tr(key);
    status.classList.remove("hidden");
}

function observeHeroTitleSize() {
    const copy = document.querySelector(".auth-copy");
    if (!copy) return;
    if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(() => fitHeroTitle());
        observer.observe(copy);
    } else {
        window.addEventListener("resize", fitHeroTitle);
    }
    document.fonts?.ready.then(() => fitHeroTitle());
}

function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    $("theme-select").value = state.theme;
    if ($("student-theme-select")) $("student-theme-select").value = state.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = state.theme === "dark" ? "#111827" : "#f5f8ff";
}

// Authentication and single-page role routing
function showView(target) {
    stopAllCameras();

    document.querySelectorAll(".view").forEach(v => {
        v.classList.toggle("active", v.id === target);
        v.classList.toggle("hidden", v.id !== target);
    });
    document.querySelectorAll("#dashboard-guru .nav-link, #dashboard-siswa .nav-link").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.target === target);
    });

    const titles = {
        "view-presensi": "teacherDashboard", "view-database": "database", "view-formulir": "formulir",
        "view-s-presensi": "studentAttendance", "view-s-history": "studentHistory", "view-s-profile": "myProfile"
    };
    if (target.startsWith("view-s-")) $("student-page-title").textContent = tr(titles[target]);
    else $("page-title").textContent = tr(titles[target] || "dashboard");
    if (target === "view-database") {
        renderDatabase();
        renderStudentList();
        updateStats();
        state.cloudDataPromise = loadCloudData();
    }
    if (target === "view-s-history") renderStudentHistory();
}

function showAuth() {
    stopAllCameras();
    cancelSchoolLocationEdit();
    state.schoolSettingsLoaded = false;
    state.cloudLoadToken++;
    $("btn-attendance-switch").disabled = true;
    $("btn-student-attendance").disabled = true;
    closeAuthModal();
    $("login-password").value = "";
    $("dashboard-guru").classList.add("hidden");
    $("dashboard-siswa").classList.add("hidden");
    $("auth-screen").classList.remove("hidden");
    $("profile-modal").classList.add("hidden");
    $("map-modal").classList.add("hidden");
    if (location.hash) history.replaceState(null, "", `${location.pathname}${location.search}`);
}

// Option A (implemented/recommended): one index.html with #guru/#siswa, preserving
// in-memory login state across menu changes. Option B: index.html plus guru.html
// and siswa.html, requiring sessionStorage, role guards, and camera shutdown on navigation.
function handleHashRoute() {
    if (!location.hash) return;
    if (!state.user) {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
        return;
    }
    const expected = state.user.role === "siswa" ? "#siswa" : "#guru";
    if (location.hash !== expected) {
        showAuth();
        state.user = null;
        state.cloudLoadToken++;
    }
}

async function showApp(user) {
    closeAuthModal();
    stopAllCameras();
    state.user = user;
    state.cloudLoadToken++;
    state.schoolSettingsLoaded = false;
    $("btn-attendance-switch").disabled = true;
    $("btn-student-attendance").disabled = true;
    $("auth-screen").classList.add("hidden");
    const isStudent = user.role === "siswa";
    $("dashboard-guru").classList.toggle("hidden", isStudent);
    $("dashboard-siswa").classList.toggle("hidden", !isStudent);
    const initial = user.name.trim().charAt(0).toUpperCase() || (isStudent ? "S" : "A");
    if (isStudent) {
        $("student-header-user").textContent = user.name;
        $("student-header-avatar").textContent = initial;
        $("student-profile-name").textContent = user.name;
        $("student-profile-email").textContent = user.email;
        $("student-profile-avatar").textContent = initial;
        updateStudentProfile();
        location.hash = "siswa";
        showView("view-s-presensi");
    } else {
        $("header-user").textContent = user.name;
        $("header-avatar").textContent = initial;
        $("profile-name").textContent = user.name;
        $("profile-email").textContent = user.email;
        $("profile-modal-avatar").textContent = initial;
        location.hash = "guru";
        showView("view-presensi");
    }
    const settingsLoaded = await loadSchoolSettings();
    if (state.user !== user) return;
    state.schoolSettingsLoaded = settingsLoaded;
    $("btn-attendance-switch").disabled = !settingsLoaded;
    $("btn-student-attendance").disabled = !settingsLoaded;
    if (!settingsLoaded) toast(tr("schoolSettingsFailed"), "error");
    loadModels();
    state.cloudDataPromise = loadCloudData(user);
}

function openProfile() {
    stopAllCameras();
    if (state.user?.role === "siswa") {
        showView("view-s-profile");
    } else {
        $("profile-modal").classList.remove("hidden");
    }
}

function closeProfile() {
    $("profile-modal").classList.add("hidden");
}

function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function localTime(date = new Date()) {
    return date.toLocaleTimeString(state.lang === "ar" ? "ar" : state.lang === "en" ? "en-GB" : "id-ID", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
}

function formatDate(dateString) {
    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString(state.lang === "ar" ? "ar" : state.lang === "en" ? "en-GB" : "id-ID", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}

async function cloudRequest(path, {
    method = "GET", body, role = state.user?.role, nisn = state.user?.nisn, timeoutMs = 15_000
} = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (role) headers["X-Role"] = role;
    if (role === "siswa" && nisn) headers["X-NISN"] = nisn;
    if (role === "guru" && state.user?.email) headers["X-User-Email"] = state.user.email;

    let response;
    let result;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        response = await fetch(path, {
            method,
            headers,
            signal: controller.signal,
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
        result = await response.json();
    } catch (cause) {
        const message = cause?.name === "AbortError"
            ? "Cloud request timed out"
            : cause instanceof SyntaxError ? "Invalid server response" : "Cloud request failed";
        const error = new Error(message);
        error.name = "CloudApiError";
        error.cause = cause;
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
    if (!response.ok) {
        const error = new Error(result.error || `Request failed (${response.status})`);
        error.name = "CloudApiError";
        error.status = response.status;
        throw error;
    }
    return result;
}

async function loadSchoolSettings({ preserveOnError = false } = {}) {
    const requestUser = state.user;
    const previousSettingsLoaded = state.schoolSettingsLoaded;
    if (!preserveOnError) state.schoolSettingsLoaded = false;
    try {
        const settings = await cloudRequest("/api/settings");
        if (state.user !== requestUser) return false;
        if (![settings.lat, settings.lng, settings.radius].every(value =>
            typeof value === "number" && Number.isFinite(value)
        ) || settings.lat < -90 || settings.lat > 90 || settings.lng < -180 ||
            settings.lng > 180 || settings.radius < 10 || settings.radius > 500) {
            throw new Error("Invalid school location settings");
        }
        SCHOOL_LOCATION = { ...SCHOOL_LOCATION, ...settings };
        state.schoolSettingsLoaded = true;
        $("btn-attendance-switch").disabled = false;
        $("btn-student-attendance").disabled = false;
        if (state.schoolMarker && state.schoolCircle) {
            state.schoolMarker.setLatLng([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]);
            state.schoolMarker.setPopupContent(tr("mapSchoolPopup", { radius: SCHOOL_LOCATION.radius }));
            state.schoolCircle.setLatLng([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]);
            state.schoolCircle.setRadius(SCHOOL_LOCATION.radius);
        }
        if (state.map) {
            state.map.setView([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng], state.map.getZoom());
            updateMapText();
        }
        updateSchoolLocationEditor();
        return true;
    } catch (error) {
        console.error("School location settings failed to load:", error);
        state.schoolSettingsLoaded = preserveOnError && previousSettingsLoaded;
        return false;
    }
}

function normalizeCloudStudent(student) {
    const cached = state.students.find(item => item.nisn === student.nisn);
    return {
        id: student.id,
        nisn: student.nisn,
        name: student.name,
        className: student.class_name,
        parentWhatsApp: student.parent_whatsapp || "",
        faceDescriptors: Array.isArray(student.face_descriptors)
            ? student.face_descriptors
            : cached?.faceDescriptors || [],
        registeredDate: student.created_at
            ? new Date(student.created_at).toLocaleString(state.lang === "ar" ? "ar" : state.lang === "en" ? "en-GB" : "id-ID")
            : ""
    };
}

async function loadCloudData(user = state.user) {
    if (!user) return;
    const token = ++state.cloudLoadToken;
    try {
        if (user.role === "guru") {
            await cloudRequest("/api/teachers", {
                method: "POST",
                role: "guru",
                body: { email: user.email, name: user.name }
            });
            if (token !== state.cloudLoadToken || state.user !== user) return;
        }
        const studentsRequest = user.role === "siswa"
            ? cloudRequest(`/api/students?nisn=${encodeURIComponent(user.nisn)}`, {
                role: user.role,
                nisn: user.nisn
            }).then(result => ({ students: result.students, faceStudents: [] }))
            : Promise.all([
                cloudRequest("/api/students", { role: user.role }),
                cloudRequest("/api/students?with_faces=1", { role: user.role })
            ]).then(([result, faces]) => ({ students: result.students, faceStudents: faces.students }));
        const [studentData, attendanceResult] = await Promise.all([
            studentsRequest,
            cloudRequest("/api/attendance", { role: user.role, nisn: user.nisn })
        ]);
        if (token !== state.cloudLoadToken || state.user !== user) return;

        const descriptorsByNisn = new Map(studentData.faceStudents.map(student =>
            [student.nisn, student.face_descriptors]
        ));
        state.students = studentData.students.map(student => normalizeCloudStudent({
            ...student,
            face_descriptors: descriptorsByNisn.get(student.nisn)
        }));
        state.attendance = attendanceResult.attendance;
        renderStudentList();
        renderDatabase();
        renderStudentHistory();
        updateStudentProfile();
        updateStats();
    } catch (error) {
        console.error("Cloud data load failed:", error);
        if (token === state.cloudLoadToken && state.user === user) toast(tr("cloudLoadFailed"), "error");
    }
}

// Teacher database and student-owned history
function updateStats() {
    const today = localDateKey();
    const todayCount = state.attendance.filter(a => a.date === today).length;
    $("stat-history").textContent = state.attendance.length;
    $("db-stat-students").textContent = state.students.length;
    $("db-stat-today").textContent = todayCount;
    $("student-count-badge").textContent = state.students.length;
}

function updateStudentProfile() {
    const user = state.user;
    if (!user || user.role !== "siswa") return;
    const student = state.students.find(item => item.nisn === user.nisn);
    $("student-profile-nisn").textContent = user.nisn || "—";
    $("student-profile-class").textContent = student?.className || "—";
}

function renderStudentHistory() {
    const user = state.user;
    const from = $("student-date-start").value;
    const to = $("student-date-end").value;
    const rows = user?.role === "siswa"
        ? state.attendance.filter(item => item.nisn === user.nisn && (!from || item.date >= from) && (!to || item.date <= to))
        : [];
    $("student-history-tbody").innerHTML = rows.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${safeText(formatDate(item.date))}</td>
            <td>${safeText(item.time)}</td>
            <td><span class="status-pill">${safeText(tr("attendance"))}</span></td>
            <td>${safeText(tr("methodFaceGps"))}</td>
            <td>${Math.round(item.confidence * 100)}%</td>
        </tr>`).join("");
    $("student-history-empty").classList.toggle("hidden", rows.length > 0);
}

function renderDatabase() {
    const query = $("db-search").value.trim().toLocaleLowerCase();
    const from = $("date-start").value;
    const to = $("date-end").value;

    const rows = state.attendance.filter(a => {
        const searchable = `${a.nisn} ${a.name} ${a.className}`.toLocaleLowerCase();
        return searchable.includes(query) && (!from || a.date >= from) && (!to || a.date <= to);
    });

    $("db-tbody").innerHTML = rows.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${safeText(a.nisn)}</td>
      <td>${safeText(a.name)}</td>
      <td>${safeText(a.className)}</td>
      <td><span class="status-pill">${safeText(tr("attendance"))}</span></td>
      <td>${safeText(formatDate(a.date))}</td>
      <td>${safeText(a.time)}</td>
      <td>${safeText(tr("methodFaceGps"))}</td>
      <td>${Math.round(a.confidence * 100)}%</td>
      <td><button class="row-action" type="button" data-delete-attendance="${safeText(a.id)}">${safeText(tr("delete"))}</button></td>
    </tr>`).join("");

    $("db-empty").classList.toggle("hidden", rows.length > 0);
    $("db-count").textContent = tr("recordsCount", { count: rows.length });
    updateStats();
}

function renderStudentList() {
    $("students-tbody").innerHTML = state.students.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${safeText(s.nisn)}</td>
      <td>${safeText(s.name)}</td>
      <td>${safeText(s.className)}</td>
      <td>${safeText(s.parentWhatsApp || "—")}</td>
      <td>${safeText(s.registeredDate)}</td>
      <td><button class="row-action" type="button" data-delete-student="${safeText(s.nisn)}">${safeText(tr("delete"))}</button></td>
    </tr>`).join("");
    $("students-empty").classList.toggle("hidden", state.students.length > 0);
    $("student-count-badge").textContent = state.students.length;
}

function exportCsv() {
    if (!state.attendance.length && !state.students.length) {
        toast(tr("emptyCsv"), "error");
        return;
    }
    const headers = ["NISN", "Nama", "Kelas", "Status", "Tanggal", "Waktu", "Metode", "Keyakinan"];
    const lines = [headers, ...state.attendance.map(a => [
        a.nisn, a.name, a.className, tr("attendance"), a.date, a.time, tr("methodFaceGps"), `${Math.round(a.confidence * 100)}%`
    ])];
    const csv = "\uFEFF" + lines.map(row => row.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `amanahid-presensi-${localDateKey()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(tr("csvSaved"), "success");
}

// GPS geofencing
function calculateDistance(lat1, lng1, lat2, lng2) {
    if (![lat1, lng1, lat2, lng2].every(Number.isFinite) ||
        Math.abs(lat1) > 90 || Math.abs(lat2) > 90 ||
        Math.abs(lng1) > 180 || Math.abs(lng2) > 180) {
        return NaN;
    }
    const earthRadius = 6371000;
    const toRad = degrees => degrees * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    const clamped = Math.min(1, Math.max(0, a));
    return 2 * earthRadius * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));
}

function geolocationErrorKey(error) {
    if (!navigator.geolocation) return "gpsUnsupported";
    if (error?.code === 1) return "gpsDenied";
    if (error?.code === 2) return "gpsUnavailable";
    if (error?.code === 3) return "gpsTimeout";
    return "gpsFailed";
}

async function checkGeofence() {
    if (!("geolocation" in navigator)) {
        return setLocationError("gpsUnsupported");
    }

    return new Promise(resolve => {
        let settled = false;
        const timeoutId = setTimeout(() => {
            finishWithError("gpsTimeout");
        }, 12000);
        const finish = result => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            resolve(result);
        };
        const finishWithError = errorKey => {
            const result = setLocationError(errorKey);
            finish(result);
        };
        const onSuccess = position => {
            if (settled) return;
            try {
                const { latitude, longitude, accuracy } = position.coords;
                const distanceExact = calculateDistance(
                    latitude, longitude, SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng
                );
                const timestamp = Number.isFinite(position.timestamp) ? position.timestamp : Date.now();
                const previousFix = state.lastGpsFix;
                const elapsedSeconds = previousFix ? (timestamp - previousFix.timestamp) / 1000 : 0;
                const estimatedSpeed = previousFix && elapsedSeconds > 0
                    ? calculateDistance(previousFix.lat, previousFix.lng, latitude, longitude) / elapsedSeconds
                    : 0;
                const reportedSpeed = Number.isFinite(position.coords.speed) ? position.coords.speed : 0;
                const fakeLocation = accuracy <= 0 || !Number.isFinite(accuracy) ||
                    !Number.isFinite(distanceExact) || reportedSpeed > 55 ||
                    (elapsedSeconds >= 1 && elapsedSeconds <= 600 && estimatedSpeed > 55);
                state.lastGpsFix = { lat: latitude, lng: longitude, timestamp };
                if (fakeLocation) {
                    const error = tr("fakeLocation");
                    state.lastLocation = { error, errorKey: "fakeLocation", fakeLocation: true, checkedAt: Date.now() };
                    renderLocationBadge();
                    updateMapText();
                    finish({ inside: false, distance: NaN, accuracy, error, fakeLocation: true });
                    return;
                }
                const roundedDistance = Math.round(distanceExact);
                const roundedAccuracy = Math.round(accuracy);
                const inside = distanceExact <= SCHOOL_LOCATION.radius;

                state.lastLocation = {
                    lat: latitude, lng: longitude, accuracy,
                    distance: roundedDistance, inside, checkedAt: Date.now()
                };

                renderLocationBadge();
                updateMapUserMarker();

                updateMapText();
                finish({
                    inside,
                    distance: roundedDistance,
                    accuracy,
                    error: null,
                    fakeLocation: false
                });
            } catch (error) {
                console.error("GPS location processing error:", error);
                finishWithError("gpsFailed");
            }
        };
        try {
            navigator.geolocation.getCurrentPosition(onSuccess, error => {
                if (settled) return;
                finishWithError(geolocationErrorKey(error));
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        } catch (error) {
            console.error("GPS request failed:", error);
            finishWithError("gpsFailed");
        }
    });
}

function setLocationError(errorKey) {
    const error = tr(errorKey);
    state.lastLocation = { error, errorKey, checkedAt: Date.now() };
    renderLocationBadge();
    updateMapText();
    return { inside: false, distance: NaN, accuracy: NaN, error };
}

function renderLocationBadge() {
    const badges = [$("location-badge"), $("student-location-badge")].filter(Boolean);
    const details = [$("location-detail"), $("student-location-detail")].filter(Boolean);
    const setStatus = (className, label, description) => {
        badges.forEach(badge => {
            badge.className = `location-badge ${className}`;
            badge.textContent = label;
        });
        details.forEach(detail => { detail.textContent = description; });
    };

    if (!state.lastLocation) {
        setStatus("pending", tr("locationPending"), tr("locationNotChecked"));
        return;
    }

    if (state.lastLocation.error) {
        setStatus("outside", tr("locationError"),
            state.lastLocation.errorKey ? tr(state.lastLocation.errorKey) : state.lastLocation.error);
        return;
    }

    if (state.lastLocation.checking) {
        setStatus("pending", tr("locationChecking"), tr("checkingBeforeCamera"));
        return;
    }

    const accuracyAccepted = state.lastLocation.accuracy <= MAX_GPS_ACCURACY_METERS;
    const badgeLabel = !accuracyAccepted
        ? `${tr("locationAccuracyBad")} · ±${Math.round(state.lastLocation.accuracy)} m`
        : `${tr(state.lastLocation.inside ? "locationInside" : "locationOutside")} · ${state.lastLocation.distance} m`;
    const description = state.lastLocation.accuracy > MAX_GPS_ACCURACY_METERS
        ? tr("accuracyWarning", { accuracy: Math.round(state.lastLocation.accuracy) })
        : state.lastLocation.inside
            ? tr("insideMessage", {
                distance: state.lastLocation.distance,
                accuracy: Math.round(state.lastLocation.accuracy)
            })
            : tr("outsideMessage", {
                distance: state.lastLocation.distance,
                radius: SCHOOL_LOCATION.radius
            });
    setStatus(state.lastLocation.inside && accuracyAccepted ? "inside" : "outside", badgeLabel, description);
}

// Camera lifecycle and face recognition
function displayModelError(error) {
    console.error("AI model error:", error);
    state.modelReady = false;
    $("model-status").className = "model-badge error";
    $("model-status").textContent = tr("modelFailed");
    $("model-error-text").textContent = tr("modelFailed");
    $("model-error").classList.remove("hidden");
}

function loadModels() {
    if (state.modelReady) return Promise.resolve(true);
    if (state.modelLoadingPromise) return state.modelLoadingPromise;
    state.modelLoading = true;
    $("model-status").className = "model-badge";
    $("model-status").textContent = tr("modelLoadingLong");

    state.modelLoadingPromise = (async () => {
        try {
            if (!window.faceapi) throw new Error("face-api.js unavailable");
            const base = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(base),
                faceapi.nets.faceLandmark68Net.loadFromUri(base),
                faceapi.nets.faceRecognitionNet.loadFromUri(base)
            ]);
            state.modelReady = true;
            $("model-status").className = "model-badge ready";
            $("model-status").textContent = tr("modelReady");
            $("model-error").classList.add("hidden");
            return true;
        } catch (error) {
            displayModelError(error);
            return false;
        } finally {
            state.modelLoading = false;
        }
    })();
    return state.modelLoadingPromise;
}

function updateCameraTexts() {
    if (!state.attendanceStream) {
        $("camera-status").textContent = tr("cameraReady");
        $("switch-hint").textContent = tr("switchOffHint");
        $("status-presensi").textContent = tr("waitingFace");
    }
    $("btn-student-attendance").textContent = state.attendanceStream
        ? tr("studentCameraStop")
        : state.attendanceStarting ? tr("studentCameraStarting") : tr("checkInNow");
    $("model-status").textContent = state.modelReady ? tr("modelReady") : state.modelLoading ? tr("modelLoadingLong") : tr("modelFailed");
}

function setSwitch(on) {
    const button = $("btn-attendance-switch");
    if (!button) return;
    button.setAttribute("aria-checked", String(on));
    const label = button.querySelector(".switch-text");
    if (label) label.textContent = tr(on ? "on" : "off");
}

function attendanceVideo() {
    return $(state.user?.role === "siswa" ? "video-student-attendance" : "video-presensi");
}

function attendanceCanvas() {
    return $(state.user?.role === "siswa" ? "overlay-student-attendance" : "overlay-presensi");
}

function attendancePlaceholder() {
    return $(state.user?.role === "siswa" ? "student-camera-placeholder" : "camera-placeholder");
}

function attendanceViewActive() {
    const viewId = state.user?.role === "siswa" ? "view-s-presensi" : "view-presensi";
    return !$(viewId).classList.contains("hidden") && $(viewId).classList.contains("active");
}

function stopStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => {
        try {
            track.stop();
        } catch (error) {
            console.error("Camera track stop failed:", error);
        }
    });
}

function stopAttendanceCamera() {
    state.attendanceStartToken++;
    state.attendanceStarting = false;
    if (state.attendanceTimer !== null) window.clearTimeout(state.attendanceTimer);
    state.attendanceTimer = null;
    const stream = state.attendanceStream;
    state.attendanceStream = null;
    const stoppedStreams = new Set();
    if (stream) {
        stopStream(stream);
        stoppedStreams.add(stream);
    }
    for (const id of ["video-presensi", "video-student-attendance"]) {
        const video = $(id);
        if (!video) continue;
        if (video.srcObject && !stoppedStreams.has(video.srcObject)) {
            stopStream(video.srcObject);
            stoppedStreams.add(video.srcObject);
        }
        video.pause();
        video.srcObject = null;
    }
    for (const id of ["overlay-presensi", "overlay-student-attendance"]) {
        const canvas = $(id);
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }
    if ($("ai-progress")) $("ai-progress").style.width = "0%";
    if ($("ai-percent")) $("ai-percent").textContent = "0%";
    if ($("status-presensi")) $("status-presensi").textContent = tr("waitingFace");
    if ($("camera-status")) $("camera-status").textContent = tr("cameraReady");
    if ($("liveness-status")) $("liveness-status").textContent = tr("livenessWaiting");
    if ($("student-attendance-status")) $("student-attendance-status").textContent = tr("studentCheckinDesc");
    if ($("btn-student-attendance")) $("btn-student-attendance").textContent = tr("checkInNow");
    $("camera-placeholder")?.classList.remove("hidden");
    $("student-camera-placeholder")?.classList.remove("hidden");
    state.attendanceBusy = false;
    state.attendanceRecorded = false;
    state.lastNose = null;
    state.movementFrames = 0;
    state.lastFaceMatchAt = 0;
    setSwitch(false);
}

function stopFormCamera() {
    state.formStartToken++;
    if (state.formTimer) clearInterval(state.formTimer);
    state.formTimer = null;
    const stream = state.formStream;
    state.formStream = null;
    const video = $("video-formulir");
    const canvas = $("overlay-formulir");
    if (stream) stopStream(stream);
    if (video) {
        if (video.srcObject && video.srcObject !== stream) stopStream(video.srcObject);
        video.pause();
        video.srcObject = null;
    }
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    $("form-camera-placeholder")?.classList.remove("hidden");
}

function stopAllCameras() {
    stopAttendanceCamera();
    stopFormCamera();
}

async function getCameraStream() {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
    }
    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: "user",
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { ideal: 15, max: 20 }
            }
        });
    } catch (error) {
        if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") throw new Error("permission");
        if (error?.name === "NotFoundError" || error?.name === "NotReadableError" || error?.name === "AbortError") throw new Error("unavailable");
        throw new Error("failed");
    }
}

function cameraErrorText(error) {
    if (error.message === "permission") return tr("cameraPermission");
    if (error.message === "unavailable") return tr("cameraUnavailable");
    if (error.message === "unsupported") return tr("cameraUnsupported");
    return tr("cameraStartFailed");
}

async function startAttendanceCamera() {
    if (state.attendanceStream || state.attendanceStarting) return;
    if (!state.user) return;
    if (!state.schoolSettingsLoaded) {
        toast(tr("schoolSettingsFailed"), "error");
        return;
    }
    const requestUser = state.user;
    state.attendanceStarting = true;
    const startToken = ++state.attendanceStartToken;

    try {
        const settingsLoaded = await loadSchoolSettings();
        if (startToken !== state.attendanceStartToken || state.user !== requestUser) return;
        if (!settingsLoaded) {
            $("btn-attendance-switch").disabled = true;
            $("btn-student-attendance").disabled = true;
            toast(tr("schoolSettingsFailed"), "error");
            return;
        }
        if (!attendanceViewActive() || document.hidden) return;
        await state.cloudDataPromise;
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            !attendanceViewActive() || document.hidden) return;

        if (requestUser.role === "siswa" && !state.students.some(student => student.nisn === requestUser.nisn)) {
            toast(tr("studentUnlinked"), "error");
            return;
        }

        state.lastLocation = { checking: true };
        renderLocationBadge();
        if (requestUser.role === "siswa") {
            $("student-attendance-status").textContent = tr("checkingBeforeCamera");
            $("btn-student-attendance").textContent = tr("studentCameraStarting");
        } else {
            $("camera-status").textContent = tr("checkingBeforeCamera");
            $("switch-hint").textContent = tr("checkingBeforeCamera");
            setSwitch(false);
        }

        const result = await checkGeofence();
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            !attendanceViewActive() || document.hidden) return;

        if (!result.inside || result.error) {
            const message = result.error || tr("outsideMessage", {
                distance: result.distance,
                radius: SCHOOL_LOCATION.radius
            });
            stopAttendanceCamera();
            setAttendanceMessage(message);
            toast(message, "error");
            return;
        }

        if (result.accuracy > MAX_GPS_ACCURACY_METERS) {
            const message = tr("accuracyWarning", { accuracy: Math.round(result.accuracy) });
            stopAttendanceCamera();
            setAttendanceMessage(message);
            toast(message, "error");
            return;
        }

        if (!state.modelReady && !(await loadModels())) {
            if (startToken === state.attendanceStartToken) {
                stopAttendanceCamera();
                setAttendanceMessage(tr("modelFailed"));
                toast(tr("modelFailed"), "error");
            }
            return;
        }
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            !attendanceViewActive() || document.hidden) return;

        if (requestUser.role === "siswa") {
            $("student-attendance-status").textContent = tr("cameraStarting");
            $("btn-student-attendance").textContent = tr("studentCameraStarting");
        } else {
            $("camera-status").textContent = tr("cameraStarting");
        }

        const stream = await getCameraStream();
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            !attendanceViewActive() || document.hidden) {
            stopStream(stream);
            return;
        }

        state.attendanceStream = stream;
        stream.getTracks().forEach(track => {
            track.addEventListener("ended", () => {
                if (state.attendanceStream === stream) {
                    stopAttendanceCamera();
                    toast(tr("cameraUnavailable"), "error");
                }
            }, { once: true });
        });
        const video = attendanceVideo();
        video.srcObject = stream;
        await video.play();
        if (startToken !== state.attendanceStartToken || state.attendanceStream !== stream ||
            state.user !== requestUser || !attendanceViewActive() || document.hidden) {
            stopStream(stream);
            if (state.attendanceStream === stream) stopAttendanceCamera();
            return;
        }
        attendancePlaceholder().classList.add("hidden");
        if (requestUser.role === "siswa") {
            $("student-attendance-status").textContent = tr("livenessMove");
            $("btn-student-attendance").textContent = tr("studentCameraStop");
        } else {
            $("camera-status").textContent = tr("attendanceReady");
            $("switch-hint").textContent = tr("attendanceReady");
            $("status-presensi").textContent = tr("attendanceWaiting");
            $("liveness-status").textContent = tr("livenessMove");
            setSwitch(true);
        }
        state.attendanceRecorded = false;
        state.lastNose = null;
        state.movementFrames = 0;

        scheduleAttendanceFrame(stream, startToken);
    } catch (error) {
        if (startToken === state.attendanceStartToken) {
            stopAttendanceCamera();
            const message = error.message === "ai" ? tr("modelFailed") : cameraErrorText(error);
            setAttendanceMessage(message);
            toast(message, "error");
        }
    } finally {
        if (startToken === state.attendanceStartToken) state.attendanceStarting = false;
    }
}

function setAttendanceMessage(message) {
    if (state.user?.role === "siswa") {
        $("student-attendance-status").textContent = message;
    } else {
        $("camera-status").textContent = message;
        $("liveness-status").textContent = message;
        $("switch-hint").textContent = message;
    }
}

function toggleAttendanceCamera() {
    if (state.attendanceStream || state.attendanceStarting) {
        stopAttendanceCamera();
        toast(tr("cameraStopped"), "info");
        return;
    }
    startAttendanceCamera();
}

function resizeOverlay(video, canvas) {
    if (!video.videoWidth || !video.videoHeight) return null;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }
    return canvas.getContext("2d");
}

function drawDetections(video, canvas, detections) {
    const ctx = resizeOverlay(video, canvas);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detections.length) return;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    const resized = faceapi.resizeResults(detections, displaySize);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
}

async function detectFaces(video) {
    if (!state.modelReady || !video.videoWidth || video.readyState < 2) return [];
    state.faceDetectorOptions ||= new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    return faceapi.detectAllFaces(video, state.faceDetectorOptions).withFaceLandmarks().withFaceDescriptors();
}

function getStudentDescriptors(student) {
    const samples = Array.isArray(student.faceDescriptors)
        ? student.faceDescriptors
        : student.descriptor?.length ? [student.descriptor] : [];
    return samples.filter(sample => Array.isArray(sample) && sample.length === 128 &&
        sample.every(Number.isFinite)).map(sample => new Float32Array(sample));
}

function createFaceMatcher(students) {
    const labeledDescriptors = students.map(student => {
        const descriptors = getStudentDescriptors(student);
        return descriptors.length
            ? new faceapi.LabeledFaceDescriptors(student.nisn, descriptors)
            : null;
    }).filter(Boolean);
    return labeledDescriptors.length
        ? new faceapi.FaceMatcher(labeledDescriptors, FACE_MATCH_THRESHOLD)
        : null;
}

function updateFaceSampleCount() {
    $("face-sample-count").textContent = tr("faceSamplesCount", { count: state.faceSamples.length });
    $("btn-capture-face").disabled = !state.faceCandidate || state.faceSamples.length >= MAX_FACE_SAMPLES;
}

function saveFaceSample(descriptor) {
    const values = Array.from(descriptor || []);
    if (values.length !== 128 || !values.every(Number.isFinite)) {
        toast(tr("faceUploadError"), "error");
        return false;
    }
    if (state.faceSamples.length >= MAX_FACE_SAMPLES) {
        toast(tr("faceSampleLimit"), "info");
        return false;
    }
    const descriptorVector = new Float32Array(values);
    if (state.faceSamples.some(sample =>
        faceapi.euclideanDistance(descriptorVector, new Float32Array(sample)) < 0.05
    )) {
        toast(tr("duplicateFaceSample"), "info");
        return false;
    }
    state.faceSamples.push(values);
    updateFaceSampleCount();
    $("form-face-status").textContent = tr("faceSampleReady");
    return true;
}

function updateProgress(percent, label) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    $("ai-progress").style.width = `${value}%`;
    $("ai-percent").textContent = `${value}%`;
    $("status-presensi").textContent = label;
}

async function processAttendanceFrame() {
    if (!state.attendanceStream || state.attendanceBusy || state.attendanceRecorded) return;
    const requestStream = state.attendanceStream;
    const requestUser = state.user;
    if (!requestUser) return;
    state.attendanceBusy = true;

    try {
        const video = attendanceVideo();
        if (!video || video.readyState < 2) return;
        const candidates = requestUser.role === "siswa"
            ? state.students.filter(item => item.nisn === requestUser.nisn)
            : state.students;
        if (requestUser.role === "guru" &&
            !candidates.some(student => getStudentDescriptors(student).length)) {
            setAttendanceMessage(tr("faceNotRegistered"));
            return;
        }
        const detections = await detectFaces(video);
        if (state.attendanceStream !== requestStream || state.user !== requestUser) return;
        drawDetections(video, attendanceCanvas(), detections);

        if (!detections.length) {
            setAttendanceMessage(tr("faceNotFound"));
            if (requestUser.role === "guru") {
                updateProgress(0, tr("faceNotFound"));
            }
            state.lastNose = null;
            state.movementFrames = 0;
            return;
        }

        if (detections.length > 1) {
            setAttendanceMessage(tr("faceTooMany"));
            state.lastNose = null;
            state.movementFrames = 0;
            if (requestUser.role === "guru") {
                updateProgress(0, tr("faceTooMany"));
            }
            return;
        }

        const detection = detections[0];
        const nose = detection.landmarks.getNose()?.[3];
        if (!nose || !Number.isFinite(nose.x) || !Number.isFinite(nose.y)) {
            state.lastNose = null;
            state.movementFrames = 0;
            setAttendanceMessage(tr("faceNotFound"));
            return;
        }
        if (state.lastNose) {
            const delta = Math.hypot(nose.x - state.lastNose.x, nose.y - state.lastNose.y);
            if (delta > 1.2) state.movementFrames++;
        }
        state.lastNose = { x: nose.x, y: nose.y };

        if (requestUser.role === "guru") {
            updateProgress(Math.min(100, 30 + state.movementFrames * 12), tr("attendanceInProgress"));
        }

        if (state.movementFrames < 3) {
            setAttendanceMessage(tr("livenessMove"));
            return;
        }

        let student;
        let confidence;
        if (requestUser.role === "siswa") {
            if (Date.now() - state.lastFaceMatchAt < 1000) return;
            state.lastFaceMatchAt = Date.now();
            const result = await cloudRequest("/api/face-match", {
                method: "POST",
                role: "siswa",
                nisn: requestUser.nisn,
                body: { nisn: requestUser.nisn, descriptor: Array.from(detection.descriptor) }
            });
            if (state.attendanceStream !== requestStream || state.user !== requestUser) return;
            if (!result.registered) {
                setAttendanceMessage(tr("studentUnlinked"));
                return;
            }
            if (!result.match) {
                setAttendanceMessage(tr("faceNoMatch"));
                return;
            }
            student = candidates.find(item => item.nisn === requestUser.nisn);
            confidence = result.confidence;
        } else {
            const matcher = createFaceMatcher(candidates);
            if (!matcher) {
                setAttendanceMessage(tr("faceNotRegistered"));
                return;
            }
            const best = matcher.findBestMatch(detection.descriptor);
            if (best.label === "unknown") {
                setAttendanceMessage(tr("faceNoMatch"));
                updateProgress(0, tr("faceNoMatch"));
                return;
            }
            student = candidates.find(item => item.nisn === best.label);
            confidence = Math.max(0, Math.min(1, 1 - best.distance));
        }
        if (!student) return;

        const location = await checkGeofence();
        if (state.user !== requestUser || state.attendanceStream !== requestStream ||
            !attendanceViewActive() || document.hidden) return;
        if (location.error || !location.inside || location.accuracy > MAX_GPS_ACCURACY_METERS) {
            const message = location.error || (location.accuracy > MAX_GPS_ACCURACY_METERS
                ? tr("accuracyWarning", { accuracy: Math.round(location.accuracy) })
                : tr("outsideMessage", { distance: location.distance, radius: SCHOOL_LOCATION.radius }));
            stopAttendanceCamera();
            setAttendanceMessage(message);
            if (requestUser.role === "guru") {
                updateProgress(0, message);
            }
            toast(message, "error");
            return;
        }

        const today = localDateKey();
        if (state.attendance.some(a => a.nisn === student.nisn && a.date === today)) {
            state.attendanceRecorded = true;
            const message = requestUser.role === "siswa" ? tr("studentAlreadyPresent") : tr("alreadyPresent");
            if (requestUser.role === "siswa") $("student-attendance-status").textContent = message;
            else {
                updateProgress(100, message);
                $("liveness-status").textContent = message;
            }
            toast(message, "info");
            return;
        }

        const saved = await cloudRequest("/api/attendance", {
            method: "POST",
            role: requestUser.role,
            nisn: requestUser.nisn,
            body: {
                nisn: student.nisn,
                lat: location.lat,
                lng: location.lng,
                accuracy: location.accuracy,
                confidence
            }
        });
        if (state.user !== requestUser || state.attendanceStream !== requestStream) return;
        state.attendance = [saved.attendance, ...state.attendance.filter(item => item.id !== saved.attendance.id)];

        state.attendanceRecorded = true;
        const successMessage = requestUser.role === "siswa"
            ? tr("studentAttendanceSuccess")
            : tr("attendanceSuccess", { name: student.name });
        if (requestUser.role === "siswa") $("student-attendance-status").textContent = successMessage;
        else {
            updateProgress(100, successMessage);
            $("liveness-status").textContent = tr("locationVerified");
        }
        renderDatabase();
        renderStudentHistory();
        updateStats();
        toast(successMessage, "success");
        if (requestUser.role === "siswa") {
            stopAttendanceCamera();
            $("student-attendance-status").textContent = successMessage;
        }
        if (saved.whatsapp?.error) toast(tr("attendanceWhatsappFailed"), "error");
    } catch (error) {
        if (state.attendanceStream === requestStream) {
            stopAttendanceCamera();
            if (error.status === 409) {
                setAttendanceMessage(tr("alreadyPresent"));
                toast(tr("alreadyPresent"), "info");
            } else if (error.name === "CloudApiError") {
                console.error("Attendance submission failed:", error);
                setAttendanceMessage(tr("attendanceNetworkFailed"));
                toast(tr("attendanceNetworkFailed"), "error");
            } else {
                displayModelError(error);
                setAttendanceMessage(tr("modelFailed"));
                toast(tr("modelFailed"), "error");
            }
        }
    } finally {
        if (state.attendanceStream === requestStream) {
            state.attendanceBusy = false;
            if (!state.attendanceRecorded) scheduleAttendanceFrame(requestStream, state.attendanceStartToken);
        }
    }
}

function scheduleAttendanceFrame(stream, startToken, delay = 250) {
    if (state.attendanceStream !== stream || state.attendanceRecorded ||
        startToken !== state.attendanceStartToken) return;
    const video = attendanceVideo();
    const nextDelay = video?.readyState < 2 ? 100 : delay;
    state.attendanceTimer = window.setTimeout(() => {
        state.attendanceTimer = null;
        void processAttendanceFrame();
    }, nextDelay);
}

async function startFormCamera() {
    if (state.formStream) return;
    const startToken = ++state.formStartToken;
    try {
        if (!state.modelReady && !(await loadModels())) {
            toast(tr("modelFailed"), "error");
            return;
        }
        if (startToken !== state.formStartToken || !$("view-formulir").classList.contains("active") || document.hidden) return;
        const stream = await getCameraStream();
        if (startToken !== state.formStartToken ||
            !$("view-formulir").classList.contains("active") || document.hidden) {
            stopStream(stream);
            return;
        }
        state.formStream = stream;
        stream.getTracks().forEach(track => {
            track.addEventListener("ended", () => {
                if (state.formStream === stream) {
                    stopFormCamera();
                    toast(tr("cameraUnavailable"), "error");
                }
            }, { once: true });
        });
        $("video-formulir").srcObject = stream;
        await $("video-formulir").play();
        if (startToken !== state.formStartToken || state.formStream !== stream ||
            !$("view-formulir").classList.contains("active") || document.hidden) {
            stopStream(stream);
            if (state.formStream === stream) stopFormCamera();
            return;
        }
        $("form-camera-placeholder").classList.add("hidden");
        state.formTimer = setInterval(() => processFormFrame(), 350);
        toast(tr("cameraFormReady"), "success");
    } catch (error) {
        if (startToken === state.formStartToken) {
            stopFormCamera();
            toast(cameraErrorText(error), "error");
        }
    }
}

async function processFormFrame() {
    if (!state.formStream || state.formBusy) return;
    const requestStream = state.formStream;
    state.formBusy = true;
    try {
        const video = $("video-formulir");
        const detections = await detectFaces(video);
        if (state.formStream !== requestStream) return;
        drawDetections(video, $("overlay-formulir"), detections);
        if (detections.length === 1) {
            state.faceCandidate = Array.from(detections[0].descriptor);
            $("form-face-status").textContent = tr("faceDetected");
        } else if (detections.length > 1) {
            state.faceCandidate = null;
            $("form-face-status").textContent = tr("faceTooMany");
        } else {
            state.faceCandidate = null;
            $("form-face-status").textContent = tr("faceNotFound");
        }
        updateFaceSampleCount();
    } catch (error) {
        displayModelError(error);
        stopFormCamera();
        toast(tr("modelFailed"), "error");
    } finally {
        state.formBusy = false;
    }
}

async function readUploadedFace(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast(tr("faceUploadError"), "error");
        return;
    }
    if (!state.modelReady && !(await loadModels())) {
        toast(tr("modelFailed"), "error");
        return;
    }

    try {
        const image = await faceapi.bufferToImage(file);
        const detections = await faceapi.detectAllFaces(
            image, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptors();

        if (detections.length !== 1) {
            $("form-face-status").textContent = detections.length > 1 ? tr("faceTooMany") : tr("faceNotFound");
            toast(detections.length > 1 ? tr("faceTooMany") : tr("faceNotFound"), "error");
            return;
        }

        if (saveFaceSample(detections[0].descriptor)) toast(tr("faceSampleReady"), "success");
    } catch (error) {
        console.error("Image processing error:", error);
        toast(tr("faceUploadError"), "error");
    }
}

async function readUploadedFaces(files) {
    for (const file of files) {
        if (state.faceSamples.length >= MAX_FACE_SAMPLES) {
            toast(tr("faceSampleLimit"), "info");
            break;
        }
        await readUploadedFace(file);
    }
}

// Teacher student registration and map
async function registerStudent(event) {
    event.preventDefault();
    stopFormCamera();
    const nisn = $("input-nisn").value.trim();
    const name = $("input-nama").value.trim();
    const className = $("input-kelas").value.trim();
    const parentWhatsApp = $("input-parent-wa").value.trim();

    if (!nisn || !name || !className) {
        toast(tr("invalidNisn"), "error");
        return;
    }
    if (!/^\d{8,20}$/.test(nisn) || name.length > 120 || /[\u0000-\u001F\u007F]/.test(name)) {
        toast(tr("invalidNisn"), "error");
        return;
    }
    if (parentWhatsApp && !/^(08|628)\d{8,13}$/.test(parentWhatsApp)) {
        toast(tr("invalidWhatsApp"), "error");
        return;
    }
    if (!state.faceSamples.length) {
        toast(tr("needFace"), "error");
        return;
    }

    try {
        const response = await cloudRequest("/api/students", {
            method: "POST",
            role: "guru",
            body: {
                nisn,
                name,
                class_name: className,
                parent_whatsapp: parentWhatsApp ? parentWhatsApp.replace(/^08/, "628") : null,
                face_descriptors: state.faceSamples.map(sample => [...sample])
            }
        });
        state.students = [
            normalizeCloudStudent(response.student),
            ...state.students.filter(student => student.nisn !== nisn)
        ];
    } catch (error) {
        console.error("Student registration failed:", error);
        toast(error.status === 409 ? tr("studentExists") : tr("cloudSaveFailed"), "error");
        return;
    }

    state.accounts.filter(account => account.role === "siswa" && account.nisn === nisn)
        .forEach(account => { account.linked = true; });

    state.faceSamples = [];
    state.faceCandidate = null;
    $("student-form").reset();
    $("form-face-status").textContent = tr("noFaceSample");
    updateFaceSampleCount();
    renderStudentList();
    renderDatabase();
    updateStudentProfile();
    updateStats();
    toast(tr("studentSaved"), "success");
}

async function removeStudent(nisn) {
    try {
        await cloudRequest(`/api/students?nisn=${encodeURIComponent(nisn)}`, {
            method: "DELETE",
            role: "guru"
        });
    } catch (error) {
        console.error("Student deletion failed:", error);
        toast(tr("cloudDeleteFailed"), "error");
        return;
    }
    state.students = state.students.filter(s => s.nisn !== nisn);
    state.attendance = state.attendance.filter(a => a.nisn !== nisn);
    state.accounts.filter(account => account.role === "siswa" && account.nisn === nisn)
        .forEach(account => { account.linked = false; });
    renderStudentList();
    renderDatabase();
    updateStats();
    toast(tr("studentDeleted"), "success");
}

function openMap() {
    stopAllCameras();
    $("map-modal").classList.remove("hidden");
    setMapStatus();
    $("school-location-editor").classList.toggle("hidden", state.user?.role !== "guru");
    updateMapText();

    if (!window.L) {
        setMapStatus("mapFailed");
        toast(tr("mapFailed"), "error");
        return;
    }

    try {
        if (!state.map) {
            state.map = L.map("school-map", { zoomControl: true }).setView(
                [SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng], 18
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(state.map);

            state.schoolMarker = L.marker([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng], {
                icon: L.divIcon({
                    className: "",
                    html: '<div class="school-marker"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(state.map);

            state.schoolCircle = L.circle([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng], {
                radius: SCHOOL_LOCATION.radius,
                color: "#3978f6",
                weight: 2,
                fillColor: "#3978f6",
                fillOpacity: .18
            }).addTo(state.map);

            state.map.on("click", event => {
                if (!state.mapEditMode || state.user?.role !== "guru") return;
                state.mapDraftLocation = {
                    ...state.mapDraftLocation,
                    lat: event.latlng.lat,
                    lng: event.latlng.lng
                };
                updateSchoolLocationEditor();
            });
        }

        state.schoolMarker.setLatLng([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]);
        state.schoolMarker.bindPopup(tr("mapSchoolPopup", { radius: SCHOOL_LOCATION.radius }));
        state.schoolCircle.setLatLng([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]);
        state.schoolCircle.setRadius(SCHOOL_LOCATION.radius);
        state.map.setView([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng], state.map.getZoom());
        window.setTimeout(() => state.map?.invalidateSize(), 100);
        updateMapUserMarker();
        updateSchoolLocationEditor();
    } catch (error) {
        console.error("School map failed to initialize:", error);
        setMapStatus("mapFailed");
        toast(tr("mapFailed"), "error");
        return;
    }

    if (!state.schoolSettingsLoaded) {
        void loadSchoolSettings({ preserveOnError: true }).then(loaded => {
            if (!loaded && !$("map-modal").classList.contains("hidden")) {
                setMapStatus("schoolSettingsFailed");
                toast(tr("schoolSettingsFailed"), "error");
            }
        });
    }
}

function updateSchoolLocationEditor() {
    const editButton = $("btn-edit-school-location");
    const radiusInput = $("school-radius-slider");
    if (!editButton || !radiusInput) return;
    editButton.dataset.i18n = state.mapEditMode ? "cancelLocationEdit" : "setSchoolLocation";
    editButton.textContent = tr(editButton.dataset.i18n);
    $("school-radius-control").classList.toggle("hidden", !state.mapEditMode);
    if (!state.mapEditMode) return;

    const draft = state.mapDraftLocation || SCHOOL_LOCATION;
    radiusInput.value = String(draft.radius);
    document.querySelector('label[for="school-radius-slider"]').textContent =
        tr("schoolRadius", { radius: draft.radius });
    if (state.schoolMarker && state.schoolCircle) {
        state.schoolMarker.setLatLng([draft.lat, draft.lng]);
        state.schoolCircle.setLatLng([draft.lat, draft.lng]);
        state.schoolCircle.setRadius(draft.radius);
    }
    $("allowed-radius").textContent = tr("allowedRadius", { radius: draft.radius });
    $("school-location-edit-status").textContent = tr("locationEditHint");
    if (state.map) state.map.getContainer().style.cursor = "crosshair";
}

function cancelSchoolLocationEdit() {
    state.mapEditMode = false;
    state.mapDraftLocation = null;
    if (state.map) state.map.getContainer().style.cursor = "";
    if (state.schoolMarker && state.schoolCircle) {
        state.schoolMarker.setLatLng([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]);
        state.schoolCircle.setLatLng([SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng]);
        state.schoolCircle.setRadius(SCHOOL_LOCATION.radius);
    }
    $("allowed-radius").textContent = tr("allowedRadius", { radius: SCHOOL_LOCATION.radius });
    updateMapText();
    updateSchoolLocationEditor();
}

async function saveSchoolLocation() {
    if (!state.mapDraftLocation || state.user?.role !== "guru") return;
    const button = $("btn-save-school-location");
    button.disabled = true;
    $("school-location-edit-status").textContent = tr("locationSaving");
    try {
        const saved = await cloudRequest("/api/settings", {
            method: "PUT",
            role: "guru",
            body: {
                lat: state.mapDraftLocation.lat,
                lng: state.mapDraftLocation.lng,
                radius: state.mapDraftLocation.radius
            }
        });
        SCHOOL_LOCATION = { ...SCHOOL_LOCATION, ...saved };
        state.schoolSettingsLoaded = true;
        cancelSchoolLocationEdit();
        $("allowed-radius").textContent = tr("allowedRadius", { radius: SCHOOL_LOCATION.radius });
        updateMapText();
        renderLocationBadge();
        toast(tr("locationSaved"), "success");
    } catch (error) {
        console.error("School location save failed:", error);
        $("school-location-edit-status").textContent = tr("locationSaveFailed");
        toast(tr("locationSaveFailed"), "error");
    } finally {
        button.disabled = false;
    }
}

function updateMapUserMarker() {
    if (!state.map || !state.lastLocation || state.lastLocation.error || state.lastLocation.checking) return;
    const point = [state.lastLocation.lat, state.lastLocation.lng];

    if (!state.userMarker) {
        state.userMarker = L.marker(point, {
            icon: L.divIcon({
                className: "",
                html: '<div class="user-marker"></div>',
                iconSize: [15, 15],
                iconAnchor: [7.5, 7.5]
            })
        }).addTo(state.map);
    } else {
        state.userMarker.setLatLng(point);
    }

    state.userMarker.bindPopup(
        `${tr("mapUserPopup")}<br>${tr("mapDistance", { distance: state.lastLocation.distance })}<br>${tr("mapAccuracy", { accuracy: Math.round(state.lastLocation.accuracy) })}`
    );
}

function updateMapText() {
    $("map-subtitle").textContent = tr("mapDesc");
    $("map-location-detail").textContent = state.lastLocation && !state.lastLocation.error && !state.lastLocation.checking
        ? state.lastLocation.accuracy > MAX_GPS_ACCURACY_METERS
            ? tr("accuracyWarning", { accuracy: Math.round(state.lastLocation.accuracy) })
            : tr(state.lastLocation.inside ? "insideMessage" : "outsideMessage", {
                distance: state.lastLocation.distance,
                accuracy: Math.round(state.lastLocation.accuracy),
                radius: SCHOOL_LOCATION.radius
            })
        : state.lastLocation?.errorKey ? tr(state.lastLocation.errorKey)
            : state.lastLocation?.error || tr("locationMapReady");

    if (state.schoolMarker) {
        state.schoolMarker.setPopupContent(tr("mapSchoolPopup", { radius: SCHOOL_LOCATION.radius }));
    }
    $("allowed-radius").textContent = tr("allowedRadius", { radius: SCHOOL_LOCATION.radius });
    if (state.userMarker && state.lastLocation && !state.lastLocation.error && !state.lastLocation.checking) {
        state.userMarker.setPopupContent(
            `${tr("mapUserPopup")}<br>${tr("mapDistance", { distance: state.lastLocation.distance })}<br>${tr("mapAccuracy", { accuracy: Math.round(state.lastLocation.accuracy) })}`
        );
    }
}

async function refreshMapLocation() {
    if (state.locationCheckBusy) return;
    state.locationCheckBusy = true;
    $("btn-check-map-location").disabled = true;
    $("btn-refresh-map-location").disabled = true;
    state.lastLocation = { checking: true };
    renderLocationBadge();
    updateMapText();

    try {
        const result = await checkGeofence();
        if (result.error) {
            toast(result.error, "error");
        } else if (result.accuracy > MAX_GPS_ACCURACY_METERS) {
            toast(tr("accuracyWarning", { accuracy: Math.round(result.accuracy) }), "error");
        } else {
            toast(result.inside
                ? tr("insideMessage", { distance: result.distance, accuracy: Math.round(result.accuracy) })
                : tr("outsideMessage", { distance: result.distance, radius: SCHOOL_LOCATION.radius }), result.inside ? "success" : "error");
        }
    } catch (error) {
        console.error("Map location refresh failed:", error);
        toast(tr("gpsFailed"), "error");
    } finally {
        state.locationCheckBusy = false;
        $("btn-check-map-location").disabled = false;
        $("btn-refresh-map-location").disabled = false;
        updateMapText();
    }
}

// Event listener setup
function switchAuthTab(tab) {
    const login = tab === "login";
    $("tab-login").classList.toggle("active", login);
    $("tab-register").classList.toggle("active", !login);
    $("tab-login").setAttribute("aria-selected", String(login));
    $("tab-register").setAttribute("aria-selected", String(!login));
    $("login-form").classList.toggle("hidden", !login);
    $("register-form").classList.toggle("hidden", login);
    document.querySelectorAll("[data-auth-tab]").forEach(button => {
        const selected = button.dataset.authTab === tab;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", String(selected));
    });
    $("auth-modal-title").textContent = login
        ? `${tr("login")} Amanah.id`
        : `${tr("signup")} Amanah.id`;
}

function openAuthModal(tab) {
    authModalTrigger = document.activeElement;
    switchAuthTab(tab);
    $("auth-modal").classList.remove("hidden");
    document.body.classList.add("auth-modal-open");
    requestAnimationFrame(() => {
        $(tab === "login" ? "login-email" : "register-name").focus();
    });
}

function closeAuthModal() {
    const modal = $("auth-modal");
    if (!modal || modal.classList.contains("hidden")) return;
    modal.classList.add("hidden");
    document.body.classList.remove("auth-modal-open");
    if (authModalTrigger?.isConnected && !authModalTrigger.hidden) authModalTrigger.focus();
    authModalTrigger = null;
}

function initSplashScreen() {
    const splash = $("splash-screen");
    if (!splash || splash.classList.contains("hidden")) return;
    splash.classList.add("is-playing");
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const leaveTimer = window.setTimeout(() => {
        if (splash.classList.contains("hidden")) return;
        splash.classList.add("is-leaving");
        const hideTimer = window.setTimeout(() => {
            if (splash.classList.contains("hidden")) return;
            splash.classList.add("hidden");
            splash.setAttribute("aria-hidden", "true");
        }, reducedMotion ? 120 : 500);
        state.splashTimers.push(hideTimer);
    }, reducedMotion ? 350 : 2550);
    state.splashTimers.push(leaveTimer);
}

function clearSplashTimers() {
    state.splashTimers.forEach(timer => window.clearTimeout(timer));
    state.splashTimers = [];
}

function inferRoleFromEmail(email) {
    const [localPart = "", domain = ""] = email.trim().toLowerCase().split("@");
    const tokens = `${localPart}.${domain}`.split(/[.+_-]/);
    const hasStudent = tokens.includes("siswa") || tokens.includes("student");
    const hasTeacher = tokens.includes("guru") || tokens.includes("teacher");
    if (hasStudent === hasTeacher) return null;
    return hasStudent ? "siswa" : "guru";
}

function updateSignupRoleFields() {
    const role = inferRoleFromEmail($("register-email").value);
    const isStudent = role === "siswa";
    $("register-nisn-field").classList.toggle("hidden", role === "guru");
    $("register-nisn").required = isStudent;
}

function setupEvents() {
    $("tab-login").addEventListener("click", () => openAuthModal("login"));
    $("tab-register").addEventListener("click", () => openAuthModal("register"));
    document.querySelectorAll("[data-auth-tab]").forEach(button => {
        button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
    });
    $("close-auth-modal").addEventListener("click", closeAuthModal);
    $("auth-modal").addEventListener("click", event => {
        if (event.target === $("auth-modal")) closeAuthModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !$("auth-modal").classList.contains("hidden")) closeAuthModal();
    });
    $("model-retry").addEventListener("click", () => location.reload());

    $("login-form").addEventListener("submit", async event => {
        event.preventDefault();
        const email = $("login-email").value.trim().toLowerCase();
        const password = $("login-password").value;
        const account = state.accounts.find(a => a.email === email && a.password === password);
        if (!account) {
            toast(tr("loginFailed"), "error");
            return;
        }
        const role = inferRoleFromEmail(email) || account.role;
        showApp({
            name: account.name, email: account.email, role, nisn: account.nisn || ""
        });
    });

    $("terms-reg").addEventListener("change", () => {
        $("btn-register-submit").disabled = !$("terms-reg").checked;
    });
    $("register-email").addEventListener("input", updateSignupRoleFields);

    $("register-form").addEventListener("submit", event => {
        event.preventDefault();
        if (!$("terms-reg").checked) {
            toast(tr("termsRequired"), "error");
            return;
        }
        const name = $("register-name").value.trim();
        const email = $("register-email").value.trim().toLowerCase();
        const password = $("register-password").value;
        const confirm = $("register-confirm").value;
        const nisn = $("register-nisn").value.trim();
        const role = inferRoleFromEmail(email);

        if (password !== confirm) {
            toast(tr("passwordMismatch"), "error");
            return;
        }
        if (!role) {
            toast(tr("signupEmailRoleRequired"), "error");
            return;
        }
        if (role === "siswa" && !nisn) {
            toast(tr("studentNeedsNisn"), "error");
            return;
        }
        if (state.accounts.some(a => a.email === email)) {
            toast(tr("emailExists"), "error");
            return;
        }

        state.accounts.push({ name, email, password, role, ...(role === "siswa" ? { nisn } : {}) });
        $("register-form").reset();
        $("btn-register-submit").disabled = true;
        updateSignupRoleFields();
        switchAuthTab("login");
        closeAuthModal();
        $("login-email").value = email;
        $("login-password").value = "";
        toast(role === "siswa" ? tr("studentUnlinked") : tr("signupSuccess"),
            role === "siswa" ? "info" : "success");
    });

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
    });

    document.querySelectorAll(".nav-link").forEach(btn => {
        btn.addEventListener("click", () => showView(btn.dataset.target));
    });

    $("brand-home").addEventListener("click", event => {
        event.preventDefault();
        showView("view-presensi");
    });
    $("student-brand-home").addEventListener("click", event => {
        event.preventDefault();
        showView("view-s-presensi");
    });

    $("open-profile").addEventListener("click", openProfile);
    $("top-profile").addEventListener("click", openProfile);
    $("close-profile").addEventListener("click", closeProfile);
    $("profile-modal").addEventListener("click", event => {
        if (event.target === $("profile-modal")) closeProfile();
    });

    $("btn-save-profile").addEventListener("click", () => {
        setTheme($("theme-select").value);
        setLanguage($("profile-language").value);
        closeProfile();
        toast(tr("settingsSaved"), "success");
    });

    $("theme-select").addEventListener("change", () => setTheme($("theme-select").value));
    $("profile-language").addEventListener("change", () => setLanguage($("profile-language").value));

    $("btn-logout").addEventListener("click", () => {
        stopAllCameras();
        closeProfile();
        state.user = null;
        showAuth();
        toast(tr("loggedOut"), "info");
    });
    const logoutStudent = () => {
        stopAllCameras();
        state.user = null;
        showAuth();
        toast(tr("loggedOut"), "info");
    };
    $("student-open-profile").addEventListener("click", openProfile);
    $("student-top-profile").addEventListener("click", openProfile);
    $("btn-student-logout").addEventListener("click", logoutStudent);
    $("btn-student-save-profile").addEventListener("click", () => {
        setTheme($("student-theme-select").value);
        setLanguage($("student-profile-language").value);
        toast(tr("settingsSaved"), "success");
    });
    $("student-theme-select").addEventListener("change", () => setTheme($("student-theme-select").value));
    $("student-profile-language").addEventListener("change", () => setLanguage($("student-profile-language").value));
    $("btn-student-attendance").addEventListener("click", toggleAttendanceCamera);
    $("btn-attendance-switch").addEventListener("click", toggleAttendanceCamera);

    $("btn-fullscreen").addEventListener("click", async () => {
        const stage = $("camera-stage");
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (stage.requestFullscreen) {
                await stage.requestFullscreen();
            } else {
                toast(tr("fullscreenError"), "error");
            }
        } catch {
            toast(tr("fullscreenError"), "error");
        }
    });

    $("btn-start-form-camera").addEventListener("click", startFormCamera);
    $("btn-stop-form-camera").addEventListener("click", () => {
        stopFormCamera();
        toast(tr("cameraFormOff"), "info");
    });

    $("btn-capture-face").addEventListener("click", () => {
        if (state.faceCandidate && saveFaceSample(state.faceCandidate)) {
            toast(tr("faceSampleReady"), "success");
        }
    });
    $("photo-upload").addEventListener("change", event => {
        readUploadedFaces(Array.from(event.target.files || []));
        event.target.value = "";
    });

    $("student-form").addEventListener("submit", registerStudent);
    $("input-parent-wa").addEventListener("invalid", event => {
        event.preventDefault();
        toast(tr("invalidWhatsApp"), "error");
    });
    $("db-search").addEventListener("input", renderDatabase);
    $("date-start").addEventListener("change", renderDatabase);
    $("date-end").addEventListener("change", renderDatabase);
    $("student-date-start").addEventListener("change", renderStudentHistory);
    $("student-date-end").addEventListener("change", renderStudentHistory);
    $("btn-export").addEventListener("click", exportCsv);

    $("db-tbody").addEventListener("click", async event => {
        const button = event.target.closest("[data-delete-attendance]");
        if (!button) return;
        try {
            await cloudRequest(`/api/attendance?id=${encodeURIComponent(button.dataset.deleteAttendance)}`, {
                method: "DELETE",
                role: "guru"
            });
        } catch (error) {
            console.error("Attendance deletion failed:", error);
            toast(tr("cloudDeleteFailed"), "error");
            return;
        }
        state.attendance = state.attendance.filter(a => a.id !== button.dataset.deleteAttendance);
        renderDatabase();
        updateStats();
        toast(tr("attendanceDeleted"), "success");
    });

    $("students-tbody").addEventListener("click", event => {
        const button = event.target.closest("[data-delete-student]");
        if (button) removeStudent(button.dataset.deleteStudent);
    });

    $("btn-delete-all").addEventListener("click", () => {
        stopAllCameras();
        $("confirm-dialog").classList.remove("hidden");
    });

    $("cancel-delete").addEventListener("click", () => {
        $("confirm-dialog").classList.add("hidden");
    });

    $("confirm-delete").addEventListener("click", async () => {
        try {
            await cloudRequest("/api/students?all=1", { method: "DELETE", role: "guru" });
        } catch (error) {
            console.error("Bulk data deletion failed:", error);
            toast(tr("cloudDeleteFailed"), "error");
            $("confirm-dialog").classList.add("hidden");
            return;
        }
        state.attendance = [];
        state.students = [];
        state.accounts.filter(account => account.role === "siswa")
            .forEach(account => { account.linked = false; });
        state.faceSamples = [];
        state.faceCandidate = null;
        updateFaceSampleCount();
        $("confirm-dialog").classList.add("hidden");
        renderDatabase();
        renderStudentList();
        updateStats();
        toast(tr("allDeleted"), "success");
    });

    $("confirm-dialog").addEventListener("click", event => {
        if (event.target === $("confirm-dialog")) $("confirm-dialog").classList.add("hidden");
    });

    $("btn-map").addEventListener("click", openMap);
    $("close-map").addEventListener("click", () => {
        cancelSchoolLocationEdit();
        $("map-modal").classList.add("hidden");
    });
    $("map-modal").addEventListener("click", event => {
        if (event.target === $("map-modal")) {
            cancelSchoolLocationEdit();
            $("map-modal").classList.add("hidden");
        }
    });
    $("btn-check-map-location").addEventListener("click", refreshMapLocation);
    $("btn-refresh-map-location").addEventListener("click", refreshMapLocation);
    $("btn-edit-school-location").addEventListener("click", () => {
        if (state.user?.role !== "guru") return;
        if (state.mapEditMode) {
            cancelSchoolLocationEdit();
            return;
        }
        state.mapEditMode = true;
        state.mapDraftLocation = { ...SCHOOL_LOCATION };
        updateSchoolLocationEditor();
    });
    $("school-radius-slider").addEventListener("input", event => {
        if (!state.mapEditMode || !state.mapDraftLocation) return;
        state.mapDraftLocation.radius = Number(event.target.value);
        updateSchoolLocationEditor();
    });
    $("btn-cancel-school-location").addEventListener("click", cancelSchoolLocationEdit);
    $("btn-save-school-location").addEventListener("click", saveSchoolLocation);
    window.addEventListener("pagehide", clearSplashTimers, { once: true });
    window.addEventListener("beforeunload", clearSplashTimers, { once: true });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopAllCameras();
    });
    window.addEventListener("pagehide", stopAllCameras);
    window.addEventListener("beforeunload", stopAllCameras);
    window.addEventListener("hashchange", handleHashRoute);
}

function initialize() {
    initSplashScreen();
    setTheme("light");
    setLanguage("id");
    observeHeroTitleSize();
    showAuth();
    setupEvents();
    renderDatabase();
    renderStudentList();
    renderStudentHistory();
    updateStats();
    setSwitch(false);
    updateFaceSampleCount();
    $("model-status").textContent = tr("modelLoading");
}

initialize();
