
"use strict";

// Shared DOM lookup helper used by all UI initialization and event handlers.
function $(id) {
    return document.getElementById(id);
}

// School configuration and in-memory state
let SCHOOL_LOCATION = {
    lat: -6.253590517740096,
    lng: 106.60299502682263,
    radius: 50,
    name: "Al Fityan School"
};
function isGpsAccuracyAcceptable(accuracy, radius = SCHOOL_LOCATION.radius) {
    const value = Number(accuracy);
    const allowedRadius = Number(radius);
    return Number.isFinite(value) && value > 0 && Number.isFinite(allowedRadius) && allowedRadius >= 10 && value <= allowedRadius;
}
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
        studentUnlinked: "Template wajah belum terdaftar dengan model biometrik terbaru. Hubungi guru untuk melakukan pendaftaran atau pembaruan wajah.",
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
        studentUnlinked: "Your face template is not enrolled with the current biometric model. Ask your teacher to register or update your face before checking in.",
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
        studentUnlinked: "لم يتم تسجيل قالب وجهك باستخدام النموذج الحيوي الحالي. اطلب من المعلّم تسجيل وجهك أو تحديثه قبل الحضور.",
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
        heroHeaderNote: "AL FITYAN SCHOOL · SISTEM PRESENSI DIGITAL",
        heroFactRolesTitle: "3 peran, satu sistem", heroFactRolesDesc: "Admin · Guru · Siswa",
        heroFactChecksTitle: "Verifikasi berlapis", heroFactChecksDesc: "Wajah + lokasi",
        heroFactDevicesTitle: "Akses lintas perangkat", heroFactDevicesDesc: "Ponsel · Tablet · Laptop",
        heroVisualLabel: "PRATINJAU TAMPILAN PRESENSI",
        welcomeTitle: "Presensi sekolah, lebih mudah.",
        welcomeDesc: "Amanah ID mencatat kehadiran dengan verifikasi wajah dan GPS. Tanpa mesin fingerprint atau RFID, dan membantu mencegah titip absen.",
        welcomeDesc: "Amanah ID mencatat kehadiran dengan verifikasi wajah dan GPS. Tanpa mesin fingerprint atau RFID, dan membantu mencegah titip absen.",
        loginAccessNote: "Admin, Guru, dan Siswa masuk dari formulir yang sama. Peran ditentukan otomatis berdasarkan akun resmi yang terdaftar.",
        captchaLabel: "VERIFIKASI SINGKAT", captchaAnswerPlaceholder: "Ketik jawaban",
        captchaHelp: "Selesaikan tantangan singkat ini. Soal dapat diganti dan selalu diperbarui setelah percobaan login.",
        captchaRefresh: "Perbarui tantangan keamanan", captchaLoading: "Memuat tantangan keamanan…",
        captchaUnavailable: "Tantangan keamanan belum tersedia. Periksa koneksi lalu coba lagi.",
        mockTotalStudents: "Peran akun", mockRegistered: "Admin · Guru · Siswa", mockCheckedIn: "Faktor presensi", mockSecurityFactors: "Wajah + GPS",
        mockLatestAttendance: "Alur akses", mockViewAll: "Terintegrasi", mockRoleAdmin: "Administrator",
        mockRoleAdminDesc: "Akun resmi sekolah", mockRolesUsers: "Guru dan Siswa",
        mockRolesUsersDesc: "Satu formulir masuk", mockRoleActive: "Aktif",
        heroFaceVerified: "Pencocokan melalui server", heroSchoolDistance: "GPS geofencing sekolah",
        registeredStudentsHint: "Data wajah terdaftar di Supabase",
        historyDesc: "Riwayat tersimpan di cloud dan dapat diakses lintas perangkat.",
        privacyFirst: "Descriptor wajah, bukan foto",
        privacyDesc: "Descriptor wajah 128 dimensi disimpan di Supabase melalui server. Foto asli tidak disimpan.",
        heroFeatureFaceGps: "Wajah + GPS",
        heroFeatureNoHardware: "Tanpa mesin tambahan",
        heroFeatureLocation: "Lokasi terverifikasi",
        heroCta: "Masuk ke akun",
        studentCameraStop: "Matikan kamera",
        studentCameraStarting: "Memeriksa lokasi dan menyalakan kamera...",
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
        rateLimitWait: "Terlalu banyak percobaan, harap tunggu 1 menit.",
        serverBusyReconnect: "Server sedang sibuk, mencoba menghubungkan ulang...",
        networkReconnecting: "Menghubungkan ulang...",
        attendanceWhatsappFailed: "Presensi tercatat, tetapi notifikasi WhatsApp gagal dikirim.",
        absenceFormNav: "Formulir izin",
        absenceFormKicker: "KETIDAKHADIRAN",
        absenceFormTitle: "Formulir ketidakhadiran",
        absenceFormDesc: "Ajukan izin, sakit, atau catatan ketidakhadiran untuk ditinjau guru.",
        absenceDate: "Tanggal ketidakhadiran",
        absenceType: "Jenis",
        absenceSick: "Sakit",
        absencePermission: "Izin",
        absenceOther: "Lainnya",
        absenceNote: "Catatan",
        absenceNotePlaceholder: "Jelaskan alasan ketidakhadiran secara singkat.",
        absencePrivacyNote: "Jangan masukkan informasi medis yang tidak diperlukan. Pengajuan akan disimpan dan menunggu peninjauan guru.",
        absenceSubmit: "Kirim formulir",
        absenceSending: "Mengirim formulir...",
        absenceSubmitted: "Formulir tersimpan dan menunggu peninjauan guru.",
        absenceRequired: "Lengkapi tanggal dan catatan terlebih dahulu.",
        absenceSubmitFailed: "Formulir tidak dapat dikirim.",
        absenceLoadFailed: "Pengajuan ketidakhadiran gagal dimuat.",
        absenceWhatsappFailed: "Formulir tersimpan, tetapi notifikasi WhatsApp gagal dikirim.",
        absenceRequestsTitle: "Pengajuan ketidakhadiran",
        absenceRequestsDesc: "Permohonan siswa yang tersimpan di database.",
        absenceRequestsEmpty: "Belum ada pengajuan.",
        absenceType_sick: "Sakit",
        absenceType_permission: "Izin",
        absenceType_other: "Lainnya",
        absenceStatus_pending: "Menunggu",
        absenceStatus_approved: "Disetujui",
        absenceStatus_rejected: "Ditolak",
        approveAbsence: "Setujui",
        rejectAbsence: "Tolak",
        absenceReviewSaved: "Status pengajuan diperbarui.",
        absenceReviewFailed: "Status pengajuan gagal diperbarui.",
        faceTurnAngle: "Hadapkan wajah ke depan, lalu ambil sisi kiri, kanan, atas, dan bawah.",
        faceDetectedAngle: "Wajah terdeteksi. Sudut: {angle}. Tahan sebentar.",
        faceAngleAlreadyCaptured: "Sudut {angle} sudah tertangkap. Ubah arah wajah.",
        faceAngleSaved: "Sudut {angle} tersimpan.",
        faceAngle_front: "depan",
        faceAngle_left: "kiri",
        faceAngle_right: "kanan",
        faceAngle_up: "atas",
        faceAngle_down: "bawah",
        faceSampleDesc: "Ambil wajah dari depan, lalu miringkan sedikit ke kiri, kanan, atas, dan bawah. Setiap sudut dikumpulkan otomatis.",
        duplicateImageFile: "File gambar yang sama sudah dipilih.",
        replaceFace: "Ganti wajah",
        faceUpdateMode: "Mode penggantian wajah aktif. Ambil lima sudut wajah.",
        faceUpdateSaved: "Data wajah siswa berhasil diperbarui.",
        faceUpdateFailed: "Data wajah siswa gagal diperbarui.",
        adminTestTools: "Pengujian sistem",
        adminTestToolsTitle: "Laboratorium pengujian",
        adminTestToolsDesc: "Uji kamera, konfigurasi lokasi, dan template notifikasi tanpa mengubah data presensi.",
        testCameraTitle: "Uji deteksi wajah",
        testCameraDesc: "Hanya mendeteksi wajah dari kamera. Tidak mendaftarkan sampel atau menyimpan gambar.",
        testCameraStart: "Mulai tes kamera",
        testCameraStop: "Hentikan tes",
        testCameraStatus: "Kamera belum diuji.",
        testCameraNoFace: "Belum ada wajah yang terdeteksi.",
        testCameraOneFace: "Satu wajah terdeteksi.",
        testCameraMultipleFaces: "Lebih dari satu wajah terdeteksi.",
        testModelLoading: "Memuat model AI...",
        testModelReady: "Model deteksi wajah siap.",
        testModelFailed: "Model AI gagal dimuat.",
        testWhatsappTitle: "Uji notifikasi WhatsApp",
        testWhatsappDesc: "Pratinjau pesan dan uji hanya ke nomor yang disetujui admin.",
        testWhatsappNumber: "Nomor uji WhatsApp",
        testWhatsappTemplate: "Template pesan",
        testWhatsappDefaultTemplate: "Amanah ID: ini adalah pesan uji notifikasi WhatsApp. Tidak ada presensi atau data siswa yang diubah.",
        testWhatsappPreview: "Pratinjau pesan",
        testWhatsappConfirm: "Saya menyetujui pengiriman satu pesan uji ke nomor yang ditampilkan.",
        testWhatsappSend: "Kirim satu pesan uji",
        testWhatsappSending: "Mengirim pesan uji...",
        testWhatsappSent: "Permintaan pesan uji diterima penyedia WhatsApp.",
        testWhatsappFailed: "Pesan uji gagal dikirim.",
        testWhatsappBlocked: "Nomor tidak ada dalam daftar nomor uji yang diizinkan.",
        testGpsTitle: "Uji GPS dan geofence",
        testGpsDesc: "Periksa koordinat perangkat dan jaraknya dari titik sekolah yang tersimpan.",
        testGpsRun: "Uji lokasi saat ini",
        testGpsOpenSettings: "Atur titik GPS sekolah",
        testGpsStatus: "Lokasi belum diuji.",
        testOtherTitle: "Pemeriksaan layanan",
        testOtherRun: "Periksa layanan",
        testOtherStatus: "Pemeriksaan belum dijalankan.",
        testOtherPass: "Layanan merespons.",
        testOtherNotConfigured: "Belum dikonfigurasi.",
        testOtherFail: "Layanan tidak merespons.",
        testPhoneInvalid: "Masukkan nomor uji yang valid dalam format 628xxxxxxxxxx.",
        testWhatsappNoConsent: "Centang persetujuan sebelum mengirim pesan uji.",
        testFonnteConfigured: "Token Fonnte tersedia",
        testFonnteMissing: "Token Fonnte belum dikonfigurasi",
        testAllowlistEmpty: "Belum ada nomor uji yang disetujui Admin",
        testAllowlistLoadFailed: "Gagal memuat daftar nomor uji",
        testGpsChecking: "Memeriksa lokasi perangkat...",
        testGpsInside: "Lokasi berada dalam radius sekolah dan akurasi memenuhi batas.",
        testGpsOutside: "Lokasi di luar radius atau akurasi tidak memenuhi batas.",
        testGpsPermission: "Izin lokasi ditolak.",
        testGpsTimeout: "Pemeriksaan lokasi kehabisan waktu.",
        testGpsFailed: "Lokasi gagal diperiksa.",
        testServiceChecking: "Memeriksa endpoint...",
        testServiceApi: "Vercel API",
        testServiceFonnte: "Konfigurasi Fonnte",
        testMetricModel: "Model AI",
        testMetricFaces: "Wajah",
        testMetricFps: "FPS",
        testMetricLatitude: "Latitude",
        testMetricLongitude: "Longitude",
        testMetricAccuracy: "Akurasi",
        testMetricDistance: "Jarak sekolah",
        testFonnteList: "Nomor uji yang diizinkan:",
        testAllowlistEmpty: "Belum ada nomor uji yang diizinkan Admin.",
        testFonnteConfigHint: "Konfigurasikan FONNTE_TOKEN dan FONNTE_TEST_RECIPIENTS pada environment Production untuk mengaktifkan pengujian.",
        testFonnteStatusUnavailable: "Status konfigurasi WhatsApp tidak dapat diperiksa.",
        faceMatchAmbiguous: "Dua atau lebih profil wajah terlalu mirip untuk diputuskan dengan aman. Minta guru mengulang pemindaian dalam pencahayaan yang lebih baik.",
        faceQualityLow: "Wajah belum cukup jelas. Hadapkan wajah ke kamera, dekatkan secukupnya, dan perbaiki pencahayaan.",
        livenessFaceForward: "Hadapkan wajah lurus ke kamera dan tahan sebentar.",
        livenessTurnLeft: "Gerakkan kepala perlahan ke kiri, lalu tahan sebentar.",
        livenessTurnRight: "Gerakkan kepala perlahan ke kanan, lalu tahan sebentar.",
        livenessReturnFront: "Kembalikan wajah menghadap lurus ke kamera.",
        gpsBoundaryUncertain: "Rentang ketidakpastian GPS bersinggungan dengan batas geofence. Ambil lokasi baru di area terbuka sebelum mencoba lagi.",
        adminMapDeviceTitle: "Diagnostik lokasi perangkat",
        adminMapDeviceDistance: "Jarak perangkat ke sekolah",
        adminMapGpsAccuracy: "Akurasi GPS",
        adminMapSchoolRadius: "Radius sekolah",
        adminMapUpdated: "Pemeriksaan terakhir",
        adminMapNeverChecked: "Lokasi perangkat belum diperiksa. Pemeriksaan hanya dilakukan setelah tombol ditekan.",
        adminMapCheckDeviceLocation: "Periksa lokasi perangkat",
        adminMapCheckingDeviceLocation: "Memeriksa lokasi perangkat…",
        adminMapLocationSuccess: "Lokasi perangkat berhasil diperiksa.",
        adminMapLocationPermission: "Izin lokasi ditolak. Izinkan akses lokasi di browser.",
        adminMapLocationTimeout: "Pemeriksaan lokasi kehabisan waktu. Coba di area yang lebih terbuka.",
        adminMapLocationUnavailable: "Posisi perangkat tidak tersedia.",
        adminMapLocationFailure: "Lokasi perangkat gagal diperiksa.",
        adminMapBadFix: "Data GPS tidak valid. Periksa layanan lokasi perangkat.",
        adminMapLowAccuracy: "Akurasi GPS ±{accuracy} m masih rendah; hasil jarak hanya perkiraan.",
        adminMapInside: "Perangkat berada di dalam radius dengan margin estimasi {margin}.",
        adminMapOutside: "Perangkat berada di luar radius dengan jarak estimasi minimum {margin}.",
        adminMapBoundary: "Belum dapat dipastikan: rentang akurasi GPS memotong batas geofence.",
        adminMapLastFix: "Diperiksa pukul {time}.",
        adminMapPointChanged: "Titik GPS diperbarui. Simpan pengaturan untuk menerapkannya.",
        adminMapSaved: "Pengaturan lokasi sekolah telah disimpan.",
        adminSettingsSaving: "Menyimpan titik GPS dan aturan sekolah…",
        adminSettingsSaved: "Titik GPS, radius, dan aturan sekolah berhasil disimpan."
    },
    en: {
        heroHeaderNote: "AL FITYAN SCHOOL · DIGITAL ATTENDANCE",
        heroFactRolesTitle: "3 roles, one system", heroFactRolesDesc: "Admin · Teacher · Student",
        heroFactChecksTitle: "Layered verification", heroFactChecksDesc: "Face + location",
        heroFactDevicesTitle: "Cross-device access", heroFactDevicesDesc: "Phone · Tablet · Laptop",
        heroVisualLabel: "ATTENDANCE INTERFACE PREVIEW",
        welcomeTitle: "School attendance, made simple.",
        welcomeDesc: "Amanah ID records attendance with face and GPS checks. No fingerprint or RFID machines, helping prevent proxy attendance.",
        welcomeDesc: "Amanah ID records attendance with face and GPS checks. No fingerprint or RFID machines, helping prevent proxy attendance.",
        loginAccessNote: "Admins, Teachers, and Students all use the same sign-in form. The system resolves each role from the registered school account.",
        captchaLabel: "QUICK SECURITY CHECK", captchaAnswerPlaceholder: "Type your answer",
        captchaHelp: "Solve this short challenge. Refresh it any time; a new one is issued after each login attempt.",
        captchaRefresh: "Refresh the security challenge", captchaLoading: "Loading security challenge…",
        captchaUnavailable: "The security challenge is unavailable. Check your connection and try again.",
        mockTotalStudents: "Account roles", mockRegistered: "Admin · Teacher · Student", mockCheckedIn: "Attendance factors", mockSecurityFactors: "Face + GPS",
        mockLatestAttendance: "Access flow", mockViewAll: "Integrated", mockRoleAdmin: "Administrator",
        mockRoleAdminDesc: "Official school account", mockRolesUsers: "Teachers and Students",
        mockRolesUsersDesc: "One sign-in form", mockRoleActive: "Active",
        heroFaceVerified: "Server-verified face matching", heroSchoolDistance: "School GPS geofencing",
        registeredStudentsHint: "Face data stored in Supabase",
        historyDesc: "Attendance history is stored in the cloud and available across devices.",
        privacyFirst: "Face descriptors, not photos",
        privacyDesc: "128-dimensional face descriptors are stored in Supabase through the server. Original photos are not stored.",
        heroFeatureFaceGps: "Face + GPS",
        heroFeatureNoHardware: "No extra hardware",
        heroFeatureLocation: "Verified location",
        heroCta: "Log in",
        studentCameraStop: "Turn camera off",
        studentCameraStarting: "Checking location and starting camera...",
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
        rateLimitWait: "Too many attempts. Please wait 1 minute.",
        serverBusyReconnect: "The server is busy. Reconnecting...",
        networkReconnecting: "Reconnecting...",
        attendanceWhatsappFailed: "Attendance was recorded, but the WhatsApp notification failed.",
        absenceFormNav: "Absence form",
        absenceFormKicker: "ABSENCE REQUEST",
        absenceFormTitle: "Absence request form",
        absenceFormDesc: "Submit a sick leave, permission, or other absence note for teacher review.",
        absenceDate: "Absence date",
        absenceType: "Type",
        absenceSick: "Sick",
        absencePermission: "Permission",
        absenceOther: "Other",
        absenceNote: "Note",
        absenceNotePlaceholder: "Briefly explain the absence.",
        absencePrivacyNote: "Do not include unnecessary medical details. The request will be saved and await teacher review.",
        absenceSubmit: "Submit request",
        absenceSending: "Submitting request...",
        absenceSubmitted: "Request saved and awaiting teacher review.",
        absenceRequired: "Complete the date and note first.",
        absenceSubmitFailed: "The request could not be submitted.",
        absenceLoadFailed: "Absence requests could not be loaded.",
        absenceWhatsappFailed: "The request was saved, but the WhatsApp notification failed.",
        absenceRequestsTitle: "Absence requests",
        absenceRequestsDesc: "Student requests stored in the database.",
        absenceRequestsEmpty: "There are no requests yet.",
        absenceType_sick: "Sick",
        absenceType_permission: "Permission",
        absenceType_other: "Other",
        absenceStatus_pending: "Pending",
        absenceStatus_approved: "Approved",
        absenceStatus_rejected: "Rejected",
        approveAbsence: "Approve",
        rejectAbsence: "Reject",
        absenceReviewSaved: "Request status updated.",
        absenceReviewFailed: "Request status could not be updated.",
        faceTurnAngle: "Face forward, then capture the left, right, up, and down angles.",
        faceDetectedAngle: "Face detected. Angle: {angle}. Hold still briefly.",
        faceAngleAlreadyCaptured: "The {angle} angle is already captured. Turn your face.",
        faceAngleSaved: "The {angle} angle was saved.",
        faceAngle_front: "front",
        faceAngle_left: "left",
        faceAngle_right: "right",
        faceAngle_up: "up",
        faceAngle_down: "down",
        faceSampleDesc: "Capture the face from the front, then turn slightly left, right, up, and down. Each angle is collected automatically.",
        duplicateImageFile: "This exact image file was already selected.",
        replaceFace: "Replace face",
        faceUpdateMode: "Face replacement mode is active. Capture all five face angles.",
        faceUpdateSaved: "Student face data was updated.",
        faceUpdateFailed: "Student face data could not be updated.",
        adminTestTools: "System tests",
        adminTestToolsTitle: "Testing lab",
        adminTestToolsDesc: "Test the camera, location settings, and notification templates without changing attendance records.",
        testCameraTitle: "Face detection test",
        testCameraDesc: "Detects faces from the camera only. It does not enroll samples or save images.",
        testCameraStart: "Start camera test",
        testCameraStop: "Stop test",
        testCameraStatus: "Camera has not been tested.",
        testCameraNoFace: "No face detected yet.",
        testCameraOneFace: "One face detected.",
        testCameraMultipleFaces: "More than one face detected.",
        testModelLoading: "Loading AI model...",
        testModelReady: "Face detection model is ready.",
        testModelFailed: "The AI model could not be loaded.",
        testWhatsappTitle: "WhatsApp notification test",
        testWhatsappDesc: "Preview the message and test only approved numbers.",
        testWhatsappNumber: "Test WhatsApp number",
        testWhatsappTemplate: "Message template",
        testWhatsappDefaultTemplate: "Amanah ID: this is a WhatsApp notification test. No attendance or student data has been changed.",
        testWhatsappPreview: "Message preview",
        testWhatsappConfirm: "I approve sending one test message to the displayed number.",
        testWhatsappSend: "Send one test message",
        testWhatsappSending: "Sending test message...",
        testWhatsappSent: "The WhatsApp provider accepted the test message request.",
        testWhatsappFailed: "The test message could not be sent.",
        testWhatsappBlocked: "This number is not on the approved test-recipient list.",
        testGpsTitle: "GPS and geofence test",
        testGpsDesc: "Check device coordinates and distance from the saved school location.",
        testGpsRun: "Test current location",
        testGpsOpenSettings: "Edit school GPS point",
        testGpsStatus: "Location has not been tested.",
        testOtherTitle: "Service checks",
        testOtherRun: "Check services",
        testOtherStatus: "Checks have not been run.",
        testOtherPass: "Service responded.",
        testOtherNotConfigured: "Not configured.",
        testOtherFail: "Service did not respond.",
        testPhoneInvalid: "Enter a valid test number in 628xxxxxxxxxx format.",
        testWhatsappNoConsent: "Confirm consent before sending the test message.",
        testFonnteConfigured: "Fonnte token is configured",
        testFonnteMissing: "Fonnte token is not configured",
        testAllowlistEmpty: "No approved test numbers configured",
        testAllowlistLoadFailed: "Could not load the test-number list",
        testGpsChecking: "Checking device location...",
        testGpsInside: "Location is within the school radius and accuracy meets the limit.",
        testGpsOutside: "Location is outside the radius or accuracy is insufficient.",
        testGpsPermission: "Location permission was denied.",
        testGpsTimeout: "The location check timed out.",
        testGpsFailed: "Location could not be checked.",
        testServiceChecking: "Checking endpoints...",
        testServiceApi: "Vercel API",
        testServiceFonnte: "Fonnte configuration",
        testMetricModel: "AI model",
        testMetricFaces: "Faces",
        testMetricFps: "FPS",
        testMetricLatitude: "Latitude",
        testMetricLongitude: "Longitude",
        testMetricAccuracy: "Accuracy",
        testMetricDistance: "Distance to school",
        testFonnteList: "Approved test numbers:",
        testAllowlistEmpty: "No Admin-approved test numbers are configured.",
        testFonnteConfigHint: "Set FONNTE_TOKEN and FONNTE_TEST_RECIPIENTS in the Production environment to enable testing.",
        testFonnteStatusUnavailable: "WhatsApp configuration status could not be checked.",
        faceMatchAmbiguous: "Two or more face profiles are too similar to distinguish safely. Ask a teacher to repeat the scan in better lighting.",
        faceQualityLow: "The face is not clear enough. Face the camera, move a little closer, and improve the lighting.",
        livenessFaceForward: "Face the camera directly and hold still briefly.",
        livenessTurnLeft: "Slowly turn your head to the left and hold briefly.",
        livenessTurnRight: "Slowly turn your head to the right and hold briefly.",
        livenessReturnFront: "Turn your face back toward the camera.",
        gpsBoundaryUncertain: "The GPS uncertainty range overlaps the geofence boundary. Refresh the location in an open area before trying again.",
        adminMapDeviceTitle: "Device location diagnostics",
        adminMapDeviceDistance: "Device-to-school distance",
        adminMapGpsAccuracy: "GPS accuracy",
        adminMapSchoolRadius: "School radius",
        adminMapUpdated: "Last check",
        adminMapNeverChecked: "Device location has not been checked. Location is requested only after you press the button.",
        adminMapCheckDeviceLocation: "Check device location",
        adminMapCheckingDeviceLocation: "Checking device location…",
        adminMapLocationSuccess: "Device location was checked successfully.",
        adminMapLocationPermission: "Location permission was denied. Allow location access in your browser.",
        adminMapLocationTimeout: "The location check timed out. Try again in a more open area.",
        adminMapLocationUnavailable: "The device position is unavailable.",
        adminMapLocationFailure: "Could not check the device location.",
        adminMapBadFix: "The GPS fix is invalid. Check your device location service.",
        adminMapLowAccuracy: "GPS accuracy ±{accuracy} m is low; the distance result is only an estimate.",
        adminMapInside: "The device is inside the radius with an estimated margin of {margin}.",
        adminMapOutside: "The device is outside the radius by at least an estimated {margin}.",
        adminMapBoundary: "Uncertain: the GPS accuracy range intersects the geofence boundary.",
        adminMapLastFix: "Checked at {time}.",
        adminMapPointChanged: "The GPS point was updated. Save the settings to apply it.",
        adminMapSaved: "School location settings have been saved.",
        adminSettingsSaving: "Saving the GPS point and school rules…",
        adminSettingsSaved: "The GPS point, radius, and school rules were saved successfully."
    },
    ar: {
        heroHeaderNote: "مدرسة الفتيان · نظام الحضور الرقمي",
        heroFactRolesTitle: "ثلاثة أدوار، نظام واحد", heroFactRolesDesc: "الإدارة · المعلم · الطالب",
        heroFactChecksTitle: "تحقق متعدد العوامل", heroFactChecksDesc: "الوجه + الموقع",
        heroFactDevicesTitle: "استخدام عبر الأجهزة", heroFactDevicesDesc: "الهاتف · اللوحي · الحاسوب",
        heroVisualLabel: "معاينة واجهة الحضور",
        welcomeTitle: "حضور مدرسي أكثر سهولة.",
        welcomeDesc: "تسجل أمانة.id الحضور بالتحقق من الوجه وGPS. دون أجهزة بصمة أو RFID، وتساعد على منع تسجيل الحضور بالنيابة.",
        welcomeDesc: "تسجل أمانة الحضور بالتحقق من الوجه وGPS. دون أجهزة بصمة أو RFID، وتساعد على منع تسجيل الحضور بالنيابة.",
        loginAccessNote: "يستخدم المديرون والمعلمون والطلاب نموذج تسجيل الدخول نفسه. يحدد النظام الدور تلقائيًا من حساب المدرسة المسجل.",
        captchaLabel: "تحقق أمني سريع", captchaAnswerPlaceholder: "اكتب الإجابة",
        captchaHelp: "أكمل التحدي القصير. يمكنك تغييره، ويتم إصدار تحدٍّ جديد بعد كل محاولة دخول.",
        captchaRefresh: "تحديث تحدي الأمان", captchaLoading: "جارٍ تحميل التحدي الأمني…",
        captchaUnavailable: "التحدي الأمني غير متاح. تحقق من الاتصال وحاول مرة أخرى.",
        mockTotalStudents: "أدوار الحساب", mockRegistered: "مدير · معلّم · طالب", mockCheckedIn: "عوامل الحضور", mockSecurityFactors: "الوجه + GPS",
        mockLatestAttendance: "مسار الدخول", mockViewAll: "متكامل", mockRoleAdmin: "المدير",
        mockRoleAdminDesc: "حساب المدرسة الرسمي", mockRolesUsers: "المعلمون والطلاب",
        mockRolesUsersDesc: "نموذج دخول واحد", mockRoleActive: "نشط",
        heroFaceVerified: "مطابقة الوجه عبر الخادم", heroSchoolDistance: "تحديد نطاق المدرسة عبر GPS",
        registeredStudentsHint: "بيانات الوجه محفوظة في Supabase",
        historyDesc: "يُحفظ سجل الحضور في السحابة ويمكن الوصول إليه من أجهزة متعددة.",
        privacyFirst: "واصفات الوجه، وليس الصور",
        privacyDesc: "تُحفظ واصفات الوجه ذات 128 بُعدًا في Supabase عبر الخادم. لا تُحفظ الصور الأصلية.",
        heroFeatureFaceGps: "الوجه + GPS",
        heroFeatureNoHardware: "دون أجهزة إضافية",
        heroFeatureLocation: "موقع موثّق",
        heroCta: "تسجيل الدخول",
        studentCameraStop: "إيقاف الكاميرا",
        studentCameraStarting: "جارٍ التحقق من الموقع وتشغيل الكاميرا...",
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
        rateLimitWait: "محاولات كثيرة جدًا. يرجى الانتظار دقيقة واحدة.",
        serverBusyReconnect: "الخادم مشغول. جارٍ إعادة الاتصال...",
        networkReconnecting: "جارٍ إعادة الاتصال...",
        attendanceWhatsappFailed: "تم تسجيل الحضور، لكن تعذر إرسال إشعار واتساب.",
        absenceFormNav: "نموذج الغياب",
        absenceFormKicker: "طلب غياب",
        absenceFormTitle: "نموذج طلب الغياب",
        absenceFormDesc: "قدّم طلب مرض أو إذن أو ملاحظة غياب لمراجعة المعلم.",
        absenceDate: "تاريخ الغياب",
        absenceType: "النوع",
        absenceSick: "مرض",
        absencePermission: "إذن",
        absenceOther: "أخرى",
        absenceNote: "ملاحظة",
        absenceNotePlaceholder: "اشرح سبب الغياب باختصار.",
        absencePrivacyNote: "لا تُدخل تفاصيل طبية غير ضرورية. سيُحفظ الطلب بانتظار مراجعة المعلم.",
        absenceSubmit: "إرسال الطلب",
        absenceSending: "جارٍ إرسال الطلب...",
        absenceSubmitted: "تم حفظ الطلب وهو بانتظار مراجعة المعلم.",
        absenceRequired: "يرجى إدخال التاريخ والملاحظة أولًا.",
        absenceSubmitFailed: "تعذر إرسال الطلب.",
        absenceLoadFailed: "تعذر تحميل طلبات الغياب.",
        absenceWhatsappFailed: "تم حفظ الطلب، لكن تعذر إرسال إشعار واتساب.",
        absenceRequestsTitle: "طلبات الغياب",
        absenceRequestsDesc: "طلبات الطلاب المحفوظة في قاعدة البيانات.",
        absenceRequestsEmpty: "لا توجد طلبات حتى الآن.",
        absenceType_sick: "مرض",
        absenceType_permission: "إذن",
        absenceType_other: "أخرى",
        absenceStatus_pending: "قيد الانتظار",
        absenceStatus_approved: "مقبول",
        absenceStatus_rejected: "مرفوض",
        approveAbsence: "قبول",
        rejectAbsence: "رفض",
        absenceReviewSaved: "تم تحديث حالة الطلب.",
        absenceReviewFailed: "تعذر تحديث حالة الطلب.",
        faceTurnAngle: "انظر إلى الأمام ثم التقط زوايا الوجه: اليسار واليمين والأعلى والأسفل.",
        faceDetectedAngle: "تم اكتشاف الوجه. الزاوية: {angle}. ابقَ ثابتًا قليلًا.",
        faceAngleAlreadyCaptured: "تم التقاط زاوية {angle} بالفعل. غيّر اتجاه الوجه.",
        faceAngleSaved: "تم حفظ زاوية {angle}.",
        faceAngle_front: "الأمام",
        faceAngle_left: "اليسار",
        faceAngle_right: "اليمين",
        faceAngle_up: "الأعلى",
        faceAngle_down: "الأسفل",
        faceSampleDesc: "التقط الوجه من الأمام ثم أدره قليلًا إلى اليسار واليمين والأعلى والأسفل. تُجمع كل زاوية تلقائيًا.",
        duplicateImageFile: "تم اختيار ملف الصورة نفسه من قبل.",
        replaceFace: "استبدال الوجه",
        faceUpdateMode: "وضع استبدال الوجه نشط. التقط زوايا الوجه الخمس.",
        faceUpdateSaved: "تم تحديث بيانات وجه الطالب.",
        faceUpdateFailed: "تعذر تحديث بيانات وجه الطالب.",
        adminTestTools: "اختبارات النظام",
        adminTestToolsTitle: "مختبر الاختبار",
        adminTestToolsDesc: "اختبر الكاميرا وإعدادات الموقع وقوالب الإشعارات دون تغيير سجلات الحضور.",
        testCameraTitle: "اختبار اكتشاف الوجه",
        testCameraDesc: "يكتشف الوجوه من الكاميرا فقط، ولا يسجل عينات أو يحفظ الصور.",
        testCameraStart: "بدء اختبار الكاميرا",
        testCameraStop: "إيقاف الاختبار",
        testCameraStatus: "لم يتم اختبار الكاميرا بعد.",
        testCameraNoFace: "لم يتم اكتشاف وجه بعد.",
        testCameraOneFace: "تم اكتشاف وجه واحد.",
        testCameraMultipleFaces: "تم اكتشاف أكثر من وجه.",
        testModelLoading: "جارٍ تحميل نموذج الذكاء الاصطناعي...",
        testModelReady: "نموذج اكتشاف الوجه جاهز.",
        testModelFailed: "تعذر تحميل نموذج الذكاء الاصطناعي.",
        testWhatsappTitle: "اختبار إشعارات واتساب",
        testWhatsappDesc: "عاين الرسالة واختبر الأرقام المعتمدة فقط.",
        testWhatsappNumber: "رقم واتساب للاختبار",
        testWhatsappTemplate: "قالب الرسالة",
        testWhatsappDefaultTemplate: "أمانة ID: هذه رسالة اختبار لإشعارات واتساب. لم يتم تغيير أي سجل حضور أو بيانات طالب.",
        testWhatsappPreview: "معاينة الرسالة",
        testWhatsappConfirm: "أوافق على إرسال رسالة اختبار واحدة إلى الرقم المعروض.",
        testWhatsappSend: "إرسال رسالة اختبار واحدة",
        testWhatsappSending: "جارٍ إرسال رسالة الاختبار...",
        testWhatsappSent: "قبل مزود واتساب طلب إرسال رسالة الاختبار.",
        testWhatsappFailed: "تعذر إرسال رسالة الاختبار.",
        testWhatsappBlocked: "هذا الرقم غير موجود في قائمة أرقام الاختبار المعتمدة.",
        testGpsTitle: "اختبار GPS والنطاق الجغرافي",
        testGpsDesc: "تحقق من إحداثيات الجهاز والمسافة عن موقع المدرسة المحفوظ.",
        testGpsRun: "اختبار الموقع الحالي",
        testGpsOpenSettings: "تعديل موقع GPS للمدرسة",
        testGpsStatus: "لم يتم اختبار الموقع بعد.",
        testOtherTitle: "فحوصات الخدمة",
        testOtherRun: "فحص الخدمات",
        testOtherStatus: "لم يتم إجراء الفحوصات بعد.",
        testOtherPass: "استجابت الخدمة.",
        testOtherNotConfigured: "غير مُعدّ.",
        testOtherFail: "لم تستجب الخدمة.",
        testPhoneInvalid: "أدخل رقم اختبار صالحًا بالتنسيق 628xxxxxxxxxx.",
        testWhatsappNoConsent: "أكد الموافقة قبل إرسال رسالة الاختبار.",
        testFonnteConfigured: "رمز Fonnte مُعدّ",
        testFonnteMissing: "لم يتم إعداد رمز Fonnte",
        testAllowlistEmpty: "لم تُضف أرقام اختبار معتمدة",
        testAllowlistLoadFailed: "تعذر تحميل قائمة أرقام الاختبار",
        testGpsChecking: "جارٍ التحقق من موقع الجهاز...",
        testGpsInside: "الموقع داخل نطاق المدرسة والدقة ضمن الحد المسموح.",
        testGpsOutside: "الموقع خارج النطاق أو الدقة غير كافية.",
        testGpsPermission: "تم رفض إذن الموقع.",
        testGpsTimeout: "انتهت مهلة التحقق من الموقع.",
        testGpsFailed: "تعذر التحقق من الموقع.",
        testServiceChecking: "جارٍ فحص نقاط الخدمة...",
        testServiceApi: "واجهة Vercel",
        testServiceFonnte: "إعداد Fonnte",
        testMetricModel: "نموذج الذكاء الاصطناعي",
        testMetricFaces: "الوجوه",
        testMetricFps: "إطار/ثانية",
        testMetricLatitude: "خط العرض",
        testMetricLongitude: "خط الطول",
        testMetricAccuracy: "الدقة",
        testMetricDistance: "المسافة إلى المدرسة",
        testFonnteList: "أرقام الاختبار المعتمدة:",
        testAllowlistEmpty: "لم يتم إعداد أرقام اختبار معتمدة من المسؤول.",
        testFonnteConfigHint: "اضبط FONNTE_TOKEN وFONNTE_TEST_RECIPIENTS في بيئة Production لتفعيل الاختبار.",
        testFonnteStatusUnavailable: "تعذر التحقق من حالة إعداد WhatsApp.",
        faceMatchAmbiguous: "ملفان أو أكثر للوجه متشابهان جدًا ولا يمكن الاختيار بأمان. اطلب من المعلم إعادة المسح في إضاءة أفضل.",
        faceQualityLow: "الوجه غير واضح بما يكفي. واجه الكاميرا واقترب قليلًا وحسّن الإضاءة.",
        livenessFaceForward: "وجّه وجهك مباشرة إلى الكاميرا واثبت قليلًا.",
        livenessTurnLeft: "أدر رأسك ببطء إلى اليسار واثبت قليلًا.",
        livenessTurnRight: "أدر رأسك ببطء إلى اليمين واثبت قليلًا.",
        livenessReturnFront: "أعد توجيه وجهك مباشرة إلى الكاميرا.",
        gpsBoundaryUncertain: "يتداخل نطاق عدم يقين GPS مع حد النطاق الجغرافي. حدّث الموقع في مكان مفتوح قبل المحاولة مرة أخرى.",
        adminMapDeviceTitle: "تشخيص موقع الجهاز",
        adminMapDeviceDistance: "المسافة من الجهاز إلى المدرسة",
        adminMapGpsAccuracy: "دقة GPS",
        adminMapSchoolRadius: "نطاق المدرسة",
        adminMapUpdated: "آخر فحص",
        adminMapNeverChecked: "لم يتم فحص موقع الجهاز. لن يُطلب الموقع إلا بعد الضغط على الزر.",
        adminMapCheckDeviceLocation: "فحص موقع الجهاز",
        adminMapCheckingDeviceLocation: "جارٍ فحص موقع الجهاز…",
        adminMapLocationSuccess: "تم فحص موقع الجهاز بنجاح.",
        adminMapLocationPermission: "تم رفض إذن الموقع. اسمح للمتصفح بالوصول إلى الموقع.",
        adminMapLocationTimeout: "انتهت مهلة فحص الموقع. حاول مجددًا في مكان مفتوح.",
        adminMapLocationUnavailable: "موقع الجهاز غير متاح.",
        adminMapLocationFailure: "تعذر فحص موقع الجهاز.",
        adminMapBadFix: "بيانات GPS غير صالحة. تحقق من خدمة الموقع في الجهاز.",
        adminMapLowAccuracy: "دقة GPS ±{accuracy} م منخفضة؛ المسافة المعروضة تقديرية فقط.",
        adminMapInside: "الجهاز داخل النطاق بهامش تقديري قدره {margin}.",
        adminMapOutside: "الجهاز خارج النطاق بمسافة دنيا تقديرية قدرها {margin}.",
        adminMapBoundary: "غير مؤكد: نطاق دقة GPS يتقاطع مع حد النطاق الجغرافي.",
        adminMapLastFix: "تم الفحص في {time}.",
        adminMapPointChanged: "تم تحديث نقطة GPS. احفظ الإعدادات لتطبيقها.",
        adminMapSaved: "تم حفظ إعدادات موقع المدرسة.",
        adminSettingsSaving: "جارٍ حفظ نقطة GPS وقواعد المدرسة…",
        adminSettingsSaved: "تم حفظ نقطة GPS والنطاق وقواعد المدرسة بنجاح."
    }
};

const state = {
    lang: "id",
    theme: "light",
    user: null,
    students: [],
    attendance: [],
    modelReady: false,
    modelLoading: false,
    modelLoadingPromise: null,
    faceDetectorReady: false,
    faceRecognitionReady: false,
    faceDetectorFailed: false,
    faceRecognitionFailed: false,
    faceDetectorLoadingPromise: null,
    faceRecognitionLoadingPromise: null,
    faceEngine: null,
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
    faceSampleAngles: [],
    faceImageHashes: new Set(),
    faceUpdateNisn: null,
    faceCandidate: null,
    faceCandidateQuality: null,
    formStableFrames: 0,
    lastFormNose: null,
    lastLocation: null,
    lastGpsFix: null,
    locationCheckBusy: false,
    map: null,
    schoolMarker: null,
    userMarker: null,
    schoolCircle: null,
    toastTimer: null,
    loginCaptchaToken: null,
    loginCaptchaRequestId: 0,
    adminSettingsMap: null,
    adminSettingsMarker: null,
    adminSettingsCircle: null,
    adminSettingsDeviceFix: null,
    adminSettingsDeviceMarker: null,
    adminSettingsAccuracyCircle: null,
    livenessChallenge: null,
    adminAllowedWhatsappRecipients: [],
    adminFonnteConfigured: false,
    lastNose: null,
    movementFrames: 0,
    attendanceRecorded: false,
    lastFaceMatchAt: 0,
    attendanceIdempotencyKey: null,
    networkHeartbeatTimer: null,
    networkHeartbeatBusy: false,
    networkHeartbeatFailures: 0,
    cloudLoadToken: 0,
    cloudDataPromise: Promise.resolve(),
    schoolSettingsLoaded: false,
    mapEditMode: false,
    mapDraftLocation: null,
    splashTimers: [],
    absenceSyncTimer: null,
    absenceSyncBusy: false,
    adminTeachers: []
};
let authModalTrigger = null;
let heroTitleMeasure = null;
let heroTitleFrame = 0;

// Three-language dictionary
const T = {
    id: {
        authEyebrow: "PRESENSI TERINTEGRASI · AL FITYAN SCHOOL", welcomeTitle: "Presensi yang lebih aman.", welcomeDesc: "Masuk untuk mengelola presensi dan data siswa.", login: "Masuk", signup: "Daftar", email: "Email", password: "Kata sandi", demoAccount: "Akun demo", fullName: "Nama lengkap", confirmPassword: "Konfirmasi kata sandi", terms: "Saya menyetujui ketentuan penggunaan demo.", workspace: "WORKSPACE", dashboard: "Dashboard", database: "Database", formulir: "Formulir", geofenceEnabled: "GPS geofencing aktif", viewProfile: "Lihat profil", schoolWorkspace: "AL FITYAN SCHOOL", dailyAttendance: "PRESENSI HARIAN", cameraTitle: "Kamera presensi", cameraDesc: "Periksa lokasi sekolah, lalu verifikasi wajah untuk mencatat kehadiran.", viewMap: "Lihat peta", secureCamera: "Kamera presensi", modelLoading: "Memuat AI...", cameraOff: "Kamera belum aktif", cameraOffDesc: "Aktifkan sakelar setelah lokasi terverifikasi.", cameraReady: "Kamera siap", fullscreen: "Layar penuh", locationVerification: "Verifikasi lokasi", locationNotChecked: "Lokasi belum diperiksa", locationPending: "Belum diperiksa", attendanceSwitch: "Sakelar presensi", switchOffHint: "Kamera mati. Lokasi akan diperiksa saat diaktifkan.", off: "MATI", on: "AKTIF", waitingFace: "Menunggu kamera", livenessWaiting: "Verifikasi wajah dan gerakan dimulai setelah lokasi lolos.", recordsCenter: "PUSAT DATA", attendanceDatabase: "Database presensi", databaseDesc: "Cari, saring, dan ekspor riwayat kehadiran serta data siswa.", exportCsv: "Ekspor CSV", registeredStudents: "Siswa terdaftar", registeredStudentsHint: "Data wajah dalam sesi ini", todayAttendance: "Presensi hari ini", todayAttendanceHint: "Catatan kehadiran hari ini", totalRecords: "Total catatan", totalRecordsHint: "Semua catatan dalam sesi ini", attendanceHistory: "Riwayat presensi", historyDesc: "Data demo tersimpan selama halaman ini terbuka.", deleteAll: "Hapus semua data", searchPlaceholder: "Cari nama, NISN, atau kelas...", fromDate: "Dari", toDate: "Sampai", number: "No.", nisn: "NISN", name: "Nama", class: "Kelas", status: "Status", date: "Tanggal", time: "Waktu", method: "Metode", confidence: "Keyakinan", action: "Aksi", noRecords: "Belum ada catatan", noRecordsDesc: "Riwayat presensi muncul di sini setelah verifikasi berhasil.", studentRegistry: "Data siswa", studentRegistryDesc: "Daftar siswa dengan sampel wajah terdaftar.", registeredAt: "Waktu daftar", noStudents: "Belum ada siswa terdaftar", registerFromForm: "Tambahkan siswa melalui menu Formulir.", studentManagement: "MANAJEMEN SISWA", studentRegistration: "Formulir pendaftaran siswa", formDesc: "Daftarkan identitas dan sampel wajah untuk pengenalan presensi.", studentIdentity: "Identitas siswa", studentIdentityDesc: "Isi data dengan benar sebelum menyimpan.", faceSample: "Sampel wajah", faceSampleDesc: "Gunakan kamera atau unggah foto dengan satu wajah yang terlihat jelas.", openCamera: "Buka kamera", closeCamera: "Tutup kamera", uploadPhoto: "Unggah foto wajah", noFaceSample: "Belum ada sampel wajah.", saveStudent: "Simpan siswa", clearFace: "Wajah harus jelas", clearFaceDesc: "Pastikan hanya satu wajah terlihat, pencahayaan cukup, dan wajah tidak tertutup.", privacyFirst: "Data bersifat sementara", privacyDesc: "Demo menyimpan descriptor wajah di memori browser. Data hilang setelah halaman dimuat ulang.", accountSettings: "PENGATURAN AKUN", myProfile: "Profil saya", appearance: "Tampilan", lightTheme: "Terang", darkTheme: "Gelap", language: "Bahasa", saveSettings: "Simpan pengaturan", logout: "Keluar", locationSecurity: "KEAMANAN LOKASI", schoolMap: "Peta area sekolah", mapDesc: "Titik sekolah dan posisi perangkat Anda.", schoolPoint: "Titik sekolah", yourLocation: "Lokasi Anda", allowedRadius: "Radius diizinkan: 50 m", mapLocationPending: "Periksa lokasi untuk menampilkan posisi perangkat.", refreshLocation: "Periksa lokasi lagi", confirmDeleteTitle: "Hapus semua data?", confirmDeleteDesc: "Semua catatan presensi dan siswa dalam sesi ini akan dihapus.", cancel: "Batal", locationChecking: "Memeriksa lokasi...", locationInside: "Di dalam area sekolah", locationOutside: "Di luar area sekolah", locationError: "Lokasi gagal diperiksa", gpsDenied: "Izin lokasi ditolak. Aktifkan izin lokasi/GPS pada browser lalu coba lagi.", gpsUnavailable: "Posisi tidak tersedia. Aktifkan GPS dan pastikan perangkat mendapat sinyal lokasi.", gpsTimeout: "Waktu pemeriksaan lokasi habis. Coba lagi di area dengan sinyal GPS yang lebih baik.", gpsUnsupported: "Browser ini tidak mendukung geolocation. Gunakan browser modern dengan izin lokasi.", gpsFailed: "Lokasi gagal diperiksa. Periksa pengaturan lokasi perangkat lalu coba lagi.", outsideMessage: "Presensi ditolak. Jarak Anda dari sekolah {distance} m, sedangkan radius maksimum yang diizinkan {radius} m.", insideMessage: "Lokasi lolos: {distance} m dari sekolah, akurasi GPS ±{accuracy} m.", accuracyWarning: "Lokasi berada di dalam radius, tetapi akurasi GPS terlalu rendah ({accuracy} m). Coba lagi di area terbuka.", checkingBeforeCamera: "Memeriksa GPS sebelum kamera dinyalakan...", cameraPermission: "Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.", cameraUnavailable: "Kamera tidak tersedia atau sedang digunakan aplikasi lain.", cameraUnsupported: "Browser tidak mendukung akses kamera.", modelFailed: "Model AI gagal dimuat. Periksa koneksi internet lalu tekan muat ulang halaman.", retryModel: "Coba muat model lagi.", faceNoMatch: "Wajah belum cocok dengan siswa terdaftar.", faceTooMany: "Terdeteksi lebih dari satu wajah. Pastikan hanya satu orang di depan kamera.", faceNotFound: "Wajah tidak terdeteksi. Posisikan wajah di dalam bingkai.", livenessMove: "Gerakkan kepala sedikit agar pemeriksaan keaktifan selesai.", attendanceSuccess: "Presensi berhasil dicatat untuk {name}.", alreadyPresent: "Presensi hari ini sudah tercatat untuk siswa ini.", cameraStopped: "Kamera dimatikan.", locationRequired: "Lokasi belum terverifikasi. Kamera tetap mati.", fullscreenError: "Mode layar penuh tidak tersedia pada perangkat ini.", mapFailed: "Peta gagal dimuat. Periksa koneksi internet.", mapLocationFailed: "Posisi Anda belum tersedia. Periksa lokasi terlebih dahulu.", studentExists: "NISN sudah terdaftar.", invalidNisn: "NISN harus diisi dengan benar.", needFace: "Ambil atau unggah sampel wajah terlebih dahulu.", studentSaved: "Data siswa berhasil didaftarkan.", studentDeleted: "Data siswa berhasil dihapus.", attendanceDeleted: "Catatan presensi berhasil dihapus.", allDeleted: "Semua data presensi dan siswa berhasil dihapus.", settingsSaved: "Pengaturan berhasil disimpan.", loginFailed: "Email atau kata sandi tidak sesuai.", signupSuccess: "Akun demo dibuat. Silakan masuk.", passwordMismatch: "Konfirmasi kata sandi tidak cocok.", termsRequired: "Setujui ketentuan sebelum mendaftar.", emailExists: "Email sudah terdaftar.", loggedOut: "Anda telah keluar.", emptyCsv: "Tidak ada data untuk diekspor.", csvSaved: "File CSV berhasil disiapkan.", cameraFormReady: "Kamera formulir aktif.", cameraFormOff: "Kamera formulir dimatikan.", faceSampleReady: "Sampel wajah siap digunakan.", modelReady: "AI siap", modelLoadingLong: "Menyiapkan model AI...", faceDetected: "Wajah terdeteksi", faceRegistered: "Wajah terdaftar", faceNotRegistered: "Wajah belum terdaftar", attendanceInProgress: "Memverifikasi wajah...", attendanceWaiting: "Menunggu wajah terdaftar...", attendanceReady: "Lokasi terverifikasi. Kamera siap.", methodFaceGps: "Wajah + GPS", delete: "Hapus", recordsCount: "{count} catatan", studentsCount: "{count} siswa", unknownClass: "Belum diisi", mapSchoolPopup: "Al Fityan School · Radius 50 m", mapUserPopup: "Posisi perangkat Anda", mapDistance: "Jarak dari sekolah: {distance} m", mapAccuracy: "Akurasi GPS: ±{accuracy} m", registeredAlready: "NISN tersebut sudah terdaftar.", locationMapReady: "Peta siap. Posisi perangkat akan muncul setelah GPS berhasil diperiksa.", noLocationForMap: "Periksa lokasi terlebih dahulu untuk menampilkan titik perangkat.", faceUploadError: "Foto tidak dapat diproses. Gunakan JPG, PNG, atau WebP yang valid.", faceSampleCapture: "Wajah terdeteksi. Sampel dapat digunakan.", cameraStartFailed: "Kamera gagal dimulai. Periksa izin browser dan koneksi aman HTTPS.", cameraStarting: "Memulai kamera...", locationVerified: "Lokasi terverifikasi.", confidenceLabel: "Keyakinan", student: "Siswa", attendance: "Hadir"
    },
    en: {
        authEyebrow: "CONNECTED ATTENDANCE · AL FITYAN SCHOOL", welcomeTitle: "Attendance, made safer.", welcomeDesc: "Sign in to manage attendance and student records.", login: "Log in", signup: "Sign up", email: "Email", password: "Password", demoAccount: "Demo account", fullName: "Full name", confirmPassword: "Confirm password", terms: "I agree to the demo terms of use.", workspace: "WORKSPACE", dashboard: "Dashboard", database: "Database", formulir: "Registration", geofenceEnabled: "GPS geofencing active", viewProfile: "View profile", schoolWorkspace: "AL FITYAN SCHOOL", dailyAttendance: "DAILY ATTENDANCE", cameraTitle: "Attendance camera", cameraDesc: "Verify your school location, then verify your face to record attendance.", viewMap: "View map", secureCamera: "Attendance camera", modelLoading: "Loading AI...", cameraOff: "Camera is off", cameraOffDesc: "Enable the switch after your location is verified.", cameraReady: "Camera ready", fullscreen: "Fullscreen", locationVerification: "Location verification", locationNotChecked: "Location not checked", locationPending: "Not checked", attendanceSwitch: "Attendance switch", switchOffHint: "Camera is off. Your location will be checked when enabled.", off: "OFF", on: "ON", waitingFace: "Waiting for camera", livenessWaiting: "Face and movement checks begin after location verification.", recordsCenter: "RECORDS CENTER", attendanceDatabase: "Attendance database", databaseDesc: "Search, filter, and export attendance history and student records.", exportCsv: "Export CSV", registeredStudents: "Registered students", registeredStudentsHint: "Face data in this session", todayAttendance: "Today's attendance", todayAttendanceHint: "Attendance records today", totalRecords: "Total records", totalRecordsHint: "All records in this session", attendanceHistory: "Attendance history", historyDesc: "Demo data stays while this page is open.", deleteAll: "Delete all data", searchPlaceholder: "Search name, NISN, or class...", fromDate: "From", toDate: "To", number: "No.", nisn: "NISN", name: "Name", class: "Class", status: "Status", date: "Date", time: "Time", method: "Method", confidence: "Confidence", action: "Action", noRecords: "No records yet", noRecordsDesc: "Attendance history appears here after successful verification.", studentRegistry: "Student registry", studentRegistryDesc: "Students with registered face samples.", registeredAt: "Registered at", noStudents: "No registered students yet", registerFromForm: "Add students from the Registration menu.", studentManagement: "STUDENT MANAGEMENT", studentRegistration: "Student registration form", formDesc: "Register student details and a face sample for attendance recognition.", studentIdentity: "Student identity", studentIdentityDesc: "Enter the correct information before saving.", faceSample: "Face sample", faceSampleDesc: "Use the camera or upload a photo with one clearly visible face.", openCamera: "Open camera", closeCamera: "Close camera", uploadPhoto: "Upload face photo", noFaceSample: "No face sample yet.", saveStudent: "Save student", clearFace: "Face must be clear", clearFaceDesc: "Ensure only one face is visible, lighting is sufficient, and the face is unobstructed.", privacyFirst: "Temporary data", privacyDesc: "This demo stores face descriptors only in browser memory. Data disappears after reload.", accountSettings: "ACCOUNT SETTINGS", myProfile: "My profile", appearance: "Appearance", lightTheme: "Light", darkTheme: "Dark", language: "Language", saveSettings: "Save settings", logout: "Log out", locationSecurity: "LOCATION SECURITY", schoolMap: "School area map", mapDesc: "School point and your device location.", schoolPoint: "School location", yourLocation: "Your location", allowedRadius: "Allowed radius: 50 m", mapLocationPending: "Check your location to show your device position.", refreshLocation: "Check location again", confirmDeleteTitle: "Delete all data?", confirmDeleteDesc: "All attendance records and registered students in this session will be deleted.", cancel: "Cancel", locationChecking: "Checking location...", locationInside: "Inside school area", locationOutside: "Outside school area", locationError: "Location check failed", gpsDenied: "Location permission was denied. Enable location/GPS permissions in your browser and try again.", gpsUnavailable: "Position unavailable. Enable GPS and ensure your device can receive location signals.", gpsTimeout: "Location check timed out. Try again where GPS reception is better.", gpsUnsupported: "This browser does not support geolocation. Use a modern browser with location permission.", gpsFailed: "Could not check location. Review your device location settings and try again.", outsideMessage: "Attendance denied. You are {distance} m from school; the maximum allowed radius is {radius} m.", insideMessage: "Location accepted: {distance} m from school, GPS accuracy ±{accuracy} m.", accuracyWarning: "You are inside the radius, but GPS accuracy is too low ({accuracy} m). Try again in an open area.", checkingBeforeCamera: "Checking GPS before enabling the camera...", cameraPermission: "Camera permission denied. Allow camera access in your browser settings.", cameraUnavailable: "Camera unavailable or already in use by another app.", cameraUnsupported: "This browser does not support camera access.", modelFailed: "AI model failed to load. Check your internet connection and reload the page.", retryModel: "Retry model loading.", faceNoMatch: "Face does not match a registered student.", faceTooMany: "More than one face detected. Ensure only one person is in front of the camera.", faceNotFound: "No face detected. Position your face inside the frame.", livenessMove: "Move your head slightly to complete the liveness check.", attendanceSuccess: "Attendance recorded for {name}.", alreadyPresent: "Attendance is already recorded for this student today.", cameraStopped: "Camera turned off.", locationRequired: "Location is not verified. The camera will remain off.", fullscreenError: "Fullscreen mode is unavailable on this device.", mapFailed: "Map failed to load. Check your internet connection.", mapLocationFailed: "Your position is unavailable. Check your location first.", studentExists: "This NISN is already registered.", invalidNisn: "Enter a valid NISN.", needFace: "Capture or upload a face sample first.", studentSaved: "Student registered successfully.", studentDeleted: "Student deleted successfully.", attendanceDeleted: "Attendance record deleted.", allDeleted: "All attendance and student data deleted.", settingsSaved: "Settings saved.", loginFailed: "Email or password is incorrect.", signupSuccess: "Demo account created. You can now log in.", passwordMismatch: "Password confirmation does not match.", termsRequired: "Accept the terms before signing up.", emailExists: "Email is already registered.", loggedOut: "You have logged out.", emptyCsv: "There is no data to export.", csvSaved: "CSV file prepared successfully.", cameraFormReady: "Registration camera is active.", cameraFormOff: "Registration camera turned off.", faceSampleReady: "Face sample is ready.", modelReady: "AI ready", modelLoadingLong: "Preparing AI models...", faceDetected: "Face detected", faceRegistered: "Face registered", faceNotRegistered: "Face not registered", attendanceInProgress: "Verifying face...", attendanceWaiting: "Waiting for a registered face...", attendanceReady: "Location verified. Camera ready.", methodFaceGps: "Face + GPS", delete: "Delete", recordsCount: "{count} records", studentsCount: "{count} students", unknownClass: "Not provided", mapSchoolPopup: "Al Fityan School · 50 m radius", mapUserPopup: "Your device location", mapDistance: "Distance from school: {distance} m", mapAccuracy: "GPS accuracy: ±{accuracy} m", registeredAlready: "This NISN is already registered.", locationMapReady: "Map ready. Your device position will appear after GPS verification.", noLocationForMap: "Check your location first to display your device marker.", faceUploadError: "Unable to process photo. Use a valid JPG, PNG, or WebP image.", faceSampleCapture: "Face detected. Sample can be used.", cameraStartFailed: "Could not start camera. Check browser permissions and secure HTTPS connection.", cameraStarting: "Starting camera...", locationVerified: "Location verified.", confidenceLabel: "Confidence", student: "Student", attendance: "Present"
    },
    ar: {
        authEyebrow: "حضور متكامل · مدرسة الفتيان", welcomeTitle: "حضور أكثر أمانًا.", welcomeDesc: "سجّل الدخول لإدارة الحضور وبيانات الطلاب.", login: "تسجيل الدخول", signup: "إنشاء حساب", email: "البريد الإلكتروني", password: "كلمة المرور", demoAccount: "حساب تجريبي", fullName: "الاسم الكامل", confirmPassword: "تأكيد كلمة المرور", terms: "أوافق على شروط استخدام النسخة التجريبية.", workspace: "مساحة العمل", dashboard: "الرئيسية", database: "قاعدة البيانات", formulir: "التسجيل", geofenceEnabled: "تحديد الموقع مفعّل", viewProfile: "عرض الملف الشخصي", schoolWorkspace: "مدرسة الفتيان", dailyAttendance: "الحضور اليومي", cameraTitle: "كاميرا الحضور", cameraDesc: "تحقق من وجودك داخل المدرسة ثم تحقق من الوجه لتسجيل الحضور.", viewMap: "عرض الخريطة", secureCamera: "كاميرا الحضور", modelLoading: "جارٍ تحميل الذكاء الاصطناعي...", cameraOff: "الكاميرا متوقفة", cameraOffDesc: "فعّل المفتاح بعد التحقق من الموقع.", cameraReady: "الكاميرا جاهزة", fullscreen: "ملء الشاشة", locationVerification: "التحقق من الموقع", locationNotChecked: "لم يتم التحقق من الموقع", locationPending: "لم يتم التحقق", attendanceSwitch: "مفتاح الحضور", switchOffHint: "الكاميرا متوقفة. سيتم التحقق من موقعك عند التفعيل.", off: "إيقاف", on: "تشغيل", waitingFace: "بانتظار الكاميرا", livenessWaiting: "يبدأ التحقق من الوجه والحركة بعد التحقق من الموقع.", recordsCenter: "مركز السجلات", attendanceDatabase: "قاعدة بيانات الحضور", databaseDesc: "ابحث عن سجل الحضور وبيانات الطلاب وصفِّها وصدرها.", exportCsv: "تصدير CSV", registeredStudents: "الطلاب المسجلون", registeredStudentsHint: "بيانات الوجه في هذه الجلسة", todayAttendance: "حضور اليوم", todayAttendanceHint: "سجلات الحضور اليوم", totalRecords: "إجمالي السجلات", totalRecordsHint: "جميع سجلات هذه الجلسة", attendanceHistory: "سجل الحضور", historyDesc: "تظل البيانات التجريبية متاحة أثناء فتح الصفحة.", deleteAll: "حذف جميع البيانات", searchPlaceholder: "ابحث بالاسم أو رقم الطالب أو الفصل...", fromDate: "من", toDate: "إلى", number: "رقم", nisn: "رقم الطالب", name: "الاسم", class: "الفصل", status: "الحالة", date: "التاريخ", time: "الوقت", method: "الطريقة", confidence: "نسبة الثقة", action: "الإجراء", noRecords: "لا توجد سجلات بعد", noRecordsDesc: "سيظهر سجل الحضور هنا بعد نجاح التحقق.", studentRegistry: "سجل الطلاب", studentRegistryDesc: "الطلاب الذين لديهم عينات وجه مسجلة.", registeredAt: "تاريخ التسجيل", noStudents: "لا يوجد طلاب مسجلون بعد", registerFromForm: "أضف الطلاب من قائمة التسجيل.", studentManagement: "إدارة الطلاب", studentRegistration: "نموذج تسجيل الطلاب", formDesc: "سجّل بيانات الطالب وعينة الوجه للتعرف على الحضور.", studentIdentity: "بيانات الطالب", studentIdentityDesc: "أدخل المعلومات الصحيحة قبل الحفظ.", faceSample: "عينة الوجه", faceSampleDesc: "استخدم الكاميرا أو ارفع صورة يظهر فيها وجه واحد بوضوح.", openCamera: "فتح الكاميرا", closeCamera: "إغلاق الكاميرا", uploadPhoto: "رفع صورة الوجه", noFaceSample: "لا توجد عينة وجه بعد.", saveStudent: "حفظ الطالب", clearFace: "يجب أن يكون الوجه واضحًا", clearFaceDesc: "تأكد من ظهور وجه واحد فقط ومن الإضاءة الجيدة وعدم تغطية الوجه.", privacyFirst: "بيانات مؤقتة", privacyDesc: "تحفظ هذه النسخة التجريبية بيانات الوجه في ذاكرة المتصفح فقط، وتختفي عند إعادة تحميل الصفحة.", accountSettings: "إعدادات الحساب", myProfile: "ملفي الشخصي", appearance: "المظهر", lightTheme: "فاتح", darkTheme: "داكن", language: "اللغة", saveSettings: "حفظ الإعدادات", logout: "تسجيل الخروج", locationSecurity: "أمان الموقع", schoolMap: "خريطة منطقة المدرسة", mapDesc: "موقع المدرسة وموقع جهازك.", schoolPoint: "موقع المدرسة", yourLocation: "موقعك", allowedRadius: "نطاق السماح: 50 مترًا", mapLocationPending: "تحقق من موقعك لإظهار موقع الجهاز.", refreshLocation: "التحقق من الموقع مجددًا", confirmDeleteTitle: "حذف جميع البيانات؟", confirmDeleteDesc: "سيتم حذف سجلات الحضور والطلاب المسجلين في هذه الجلسة.", cancel: "إلغاء", locationChecking: "جارٍ التحقق من الموقع...", locationInside: "داخل نطاق المدرسة", locationOutside: "خارج نطاق المدرسة", locationError: "فشل التحقق من الموقع", gpsDenied: "تم رفض إذن الموقع. فعّل إذن الموقع أو GPS في المتصفح ثم حاول مجددًا.", gpsUnavailable: "الموقع غير متاح. فعّل GPS وتأكد من استقبال الجهاز لإشارة الموقع.", gpsTimeout: "انتهت مهلة التحقق من الموقع. حاول مجددًا في مكان تكون فيه إشارة GPS أفضل.", gpsUnsupported: "هذا المتصفح لا يدعم تحديد الموقع. استخدم متصفحًا حديثًا مع السماح بالوصول إلى الموقع.", gpsFailed: "تعذر التحقق من الموقع. راجع إعدادات الموقع في جهازك ثم حاول مجددًا.", outsideMessage: "تم رفض الحضور. تبعد عن المدرسة {distance} مترًا، بينما النطاق الأقصى المسموح هو {radius} مترًا.", insideMessage: "تم قبول الموقع: البعد {distance} مترًا، ودقة GPS نحو ±{accuracy} متر.", accuracyWarning: "أنت داخل النطاق لكن دقة GPS منخفضة ({accuracy} متر). حاول مجددًا في مكان مفتوح.", checkingBeforeCamera: "جارٍ التحقق من GPS قبل تشغيل الكاميرا...", cameraPermission: "تم رفض إذن الكاميرا. اسمح للمتصفح باستخدام الكاميرا.", cameraUnavailable: "الكاميرا غير متاحة أو تستخدمها تطبيقات أخرى.", cameraUnsupported: "هذا المتصفح لا يدعم الوصول إلى الكاميرا.", modelFailed: "تعذر تحميل نموذج الذكاء الاصطناعي. تحقق من الإنترنت وأعد تحميل الصفحة.", retryModel: "أعد محاولة تحميل النموذج.", faceNoMatch: "الوجه لا يطابق أي طالب مسجل.", faceTooMany: "تم اكتشاف أكثر من وجه. تأكد من وجود شخص واحد أمام الكاميرا.", faceNotFound: "لم يتم اكتشاف وجه. ضع وجهك داخل الإطار.", livenessMove: "حرّك رأسك قليلًا لإكمال التحقق من الحيوية.", attendanceSuccess: "تم تسجيل الحضور للطالب {name}.", alreadyPresent: "تم تسجيل حضور هذا الطالب اليوم بالفعل.", cameraStopped: "تم إيقاف الكاميرا.", locationRequired: "لم يتم التحقق من الموقع. ستظل الكاميرا متوقفة.", fullscreenError: "وضع ملء الشاشة غير متاح على هذا الجهاز.", mapFailed: "تعذر تحميل الخريطة. تحقق من اتصال الإنترنت.", mapLocationFailed: "موقعك غير متاح. تحقق من الموقع أولًا.", studentExists: "رقم الطالب مسجل بالفعل.", invalidNisn: "أدخل رقم طالب صحيحًا.", needFace: "التقط عينة وجه أو ارفعها أولًا.", studentSaved: "تم تسجيل الطالب بنجاح.", studentDeleted: "تم حذف الطالب بنجاح.", attendanceDeleted: "تم حذف سجل الحضور.", allDeleted: "تم حذف جميع بيانات الحضور والطلاب.", settingsSaved: "تم حفظ الإعدادات.", loginFailed: "البريد الإلكتروني أو كلمة المرور غير صحيحة.", signupSuccess: "تم إنشاء الحساب التجريبي. يمكنك تسجيل الدخول الآن.", passwordMismatch: "تأكيد كلمة المرور غير مطابق.", termsRequired: "وافق على الشروط قبل التسجيل.", emailExists: "البريد الإلكتروني مسجل بالفعل.", loggedOut: "تم تسجيل الخروج.", emptyCsv: "لا توجد بيانات لتصديرها.", csvSaved: "تم تجهيز ملف CSV.", cameraFormReady: "كاميرا التسجيل تعمل.", cameraFormOff: "تم إيقاف كاميرا التسجيل.", faceSampleReady: "عينة الوجه جاهزة.", modelReady: "الذكاء الاصطناعي جاهز", modelLoadingLong: "جارٍ تجهيز نماذج الذكاء الاصطناعي...", faceDetected: "تم اكتشاف الوجه", faceRegistered: "الوجه مسجل", faceNotRegistered: "الوجه غير مسجل", attendanceInProgress: "جارٍ التحقق من الوجه...", attendanceWaiting: "بانتظار وجه مسجل...", attendanceReady: "تم التحقق من الموقع. الكاميرا جاهزة.", methodFaceGps: "الوجه + GPS", delete: "حذف", recordsCount: "{count} سجل", studentsCount: "{count} طالب", unknownClass: "غير محدد", mapSchoolPopup: "مدرسة الفتيان · نطاق 50 مترًا", mapUserPopup: "موقع جهازك", mapDistance: "المسافة من المدرسة: {distance} متر", mapAccuracy: "دقة GPS: ±{accuracy} متر", registeredAlready: "رقم الطالب مسجل بالفعل.", locationMapReady: "الخريطة جاهزة. سيظهر موقع جهازك بعد التحقق من GPS.", noLocationForMap: "تحقق من موقعك أولًا لإظهار علامة الجهاز.", faceUploadError: "تعذرت معالجة الصورة. استخدم صورة JPG أو PNG أو WebP صالحة.", faceSampleCapture: "تم اكتشاف الوجه. يمكن استخدام العينة.", cameraStartFailed: "تعذر تشغيل الكاميرا. تحقق من أذونات المتصفح واتصال HTTPS الآمن.", cameraStarting: "جارٍ تشغيل الكاميرا...", locationVerified: "تم التحقق من الموقع.", confidenceLabel: "الثقة", student: "الطالب", attendance: "حاضر"
    }
};

Object.keys(ROLE_T).forEach(lang => Object.assign(T[lang], ROLE_T[lang]));

const LANDING_T = {
    id: {
        brandName: "Amanah ID", splashSubtitle: "Presensi Digital Sekolah",
        heroTitleFirst: "Presensi sekolah,", heroTitleSecond: "lebih rapi dan tepercaya.",
        heroDescription: "Satukan pencatatan kehadiran, verifikasi wajah, dan pemeriksaan lokasi dalam satu alur digital. Admin, guru, dan siswa dapat mengaksesnya dari perangkat masing-masing.",
        heroBenefitsLabel: "Fitur Amanah ID", heroBenefitAccuracy: "Pencocokan wajah diproses di sisi server",
        heroBenefitGps: "Lokasi diperiksa terhadap radius sekolah", heroBenefitPhone: "Akses untuk ponsel, tablet, dan laptop",
        aboutTitle: "Tentang Amanah ID",
        aboutDescription: "Amanah ID membantu sekolah mencatat kehadiran dengan verifikasi wajah dan lokasi.",
        chooseAccess: "Pilih akses", heroDashboardLabel: "Contoh dashboard presensi Amanah ID",
        mockDashboard: "Dashboard Presensi", mockGreeting: "Selamat pagi 👋",
        mockAttendanceLabel: "STATUS KEHADIRAN", mockPresentToday: "Hadir hari ini",
        mockTotalStudents: "Total siswa", mockRegistered: "Terdaftar", mockCheckedIn: "Sudah hadir",
        mockLatestAttendance: "Presensi terbaru", mockViewAll: "Lihat semua",
        heroFaceMatch: "Wajah cocok", heroFaceVerified: "99.8% terverifikasi",
        heroLocationValid: "Lokasi valid", heroSchoolDistance: "15 m dari sekolah",
        heroAttendanceSuccess: "Presensi berhasil", heroRecordedAutomatically: "Tercatat otomatis",
        heroFooter: "© 2026 Amanah ID · Presensi digital sekolah",
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
        brandName: "Amanah ID", splashSubtitle: "Digital School Attendance",
        heroTitleFirst: "School attendance,", heroTitleSecond: "clearer and more reliable.",
        heroDescription: "Bring attendance records, face verification, and location checks into one digital workflow. Administrators, teachers, and students can access it from their own devices.",
        heroBenefitsLabel: "Amanah ID features", heroBenefitAccuracy: "Face matching is processed server-side",
        heroBenefitGps: "Location is checked against the school geofence",
        heroBenefitPhone: "Access from phones, tablets, and laptops",
        aboutTitle: "About Amanah ID",
        aboutDescription: "Amanah ID helps schools record attendance with face and location verification.",
        chooseAccess: "Choose access", heroDashboardLabel: "Amanah ID attendance dashboard preview",
        mockDashboard: "Attendance dashboard", mockGreeting: "Good morning 👋",
        mockAttendanceLabel: "ATTENDANCE STATUS", mockPresentToday: "Present today",
        mockTotalStudents: "Total students", mockRegistered: "Registered", mockCheckedIn: "Checked in",
        mockLatestAttendance: "Recent attendance", mockViewAll: "View all",
        heroFaceMatch: "Face matched", heroFaceVerified: "99.8% verified",
        heroLocationValid: "Location verified", heroSchoolDistance: "15 m from school",
        heroAttendanceSuccess: "Attendance recorded", heroRecordedAutomatically: "Saved automatically",
        heroFooter: "© 2026 Amanah ID · Digital school attendance",
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
        heroTitleFirst: "حضور مدرسي،", heroTitleSecond: "أوضح وأكثر موثوقية.",
        heroDescription: "اجمع تسجيل الحضور والتحقق من الوجه وفحص الموقع ضمن مسار رقمي واحد. يمكن للإدارة والمعلمين والطلاب استخدام النظام من أجهزتهم.",
        heroBenefitsLabel: "ميزات أمانة.id", heroBenefitAccuracy: "تتم مطابقة الوجه من خلال الخادم",
        heroBenefitGps: "يُفحص الموقع وفق نطاق المدرسة",
        heroBenefitPhone: "يعمل على الهاتف واللوحي والحاسوب",
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

const ADMIN_T = {
    id: {
        adminWorkspace: "ADMINISTRATOR", adminNavigation: "Navigasi Admin", faceSampleProgress: "Progres sampel wajah", administratorRole: "Administrator", confirmDeactivateAccount: "Nonaktifkan akun ini?", promptNewEmail: "Email baru (kosongkan jika tidak berubah):", promptNewName: "Nama baru (kosongkan jika tidak berubah):", promptNewPassword: "Kata sandi baru (kosongkan jika tidak berubah):", adminOverview: "Ringkasan", adminAccounts: "Kelola akun",
        adminSchoolSettings: "Pengaturan sekolah", adminAudit: "Audit aktivitas", adminSecurity: "Keamanan akun",
        adminOverviewTitle: "Ringkasan sistem", refreshData: "Segarkan data", adminOverviewKicker: "RINGKASAN",
        adminAttendanceOverview: "Ikhtisar presensi", adminOverviewDescription: "Pantau akun, aktivitas presensi, dan kesehatan layanan dari satu tempat.",
        totalActiveStudents: "Total siswa aktif", supabaseData: "Data pada Supabase", totalActiveTeachers: "Total guru aktif",
        teacherAccounts: "Akun pengajar", attendanceToday: "Presensi hari ini", todayRecords: "Catatan hari ini",
        attendanceLast7Days: "Presensi 7 hari", rollingPeriod: "Periode bergulir", activeUsers: "Pengguna aktif",
        loginsLast7Days: "Login 7 hari terakhir", serviceHealth: "Kesehatan layanan",
        serviceHealthDescription: "Status konfigurasi layanan utama.", vercelApi: "Vercel API",
        whatsappNotifications: "Notifikasi WhatsApp", adminAccountsKicker: "MANAJEMEN AKUN",
        schoolUsers: "Pengguna sekolah", schoolUsersDescription: "Admin dapat membuat akun Guru dan Siswa. Akun Siswa memerlukan NISN dan kelas; sampel wajah dapat didaftarkan Guru kemudian.",
        accountRole: "Peran akun", teacherRole: "Guru", studentRole: "Siswa", studentNisn: "NISN siswa", studentClass: "Kelas siswa", studentAccountNote: "Siswa dapat login setelah dibuat; presensi wajah aktif setelah Guru mendaftarkan sampel.", createTeacherAccount: "Buat akun", newTeacherDescription: "Akun Guru atau Siswa baru akan tersimpan di database.",
        initialPassword: "Kata sandi awal", accountsList: "Daftar akun",
        accountsListDescription: "Kelola email, nama, kata sandi, atau status akun.", noAccounts: "Belum ada akun.",
        accountsEmptyDescription: "Data akan tampil setelah tersimpan di Supabase.", adminRole: "Peran",
        configurationKicker: "KONFIGURASI", adminSettingsDescription: "Perbarui titik geofence dan aturan waktu presensi.",
        schoolLatitude: "Latitude sekolah", schoolLongitude: "Longitude sekolah", geofenceRadius: "Radius geofence (meter)",
        timezone: "Zona waktu", schoolEntryTime: "Jam masuk sekolah", lateTolerance: "Toleransi keterlambatan (menit)",
        adminAuditDescription: "Riwayat operasi yang tercatat oleh API.", auditActorEmail: "Email pelaku", searchEmail: "Cari email",
        actionPlaceholder: "Mis. admin.login", applyFilter: "Terapkan filter", dateTime: "Waktu", targetTable: "Tabel",
        changeAdminPassword: "Ubah kata sandi Admin", adminPasswordDescription: "Gunakan kata sandi unik dan kuat untuk akun dengan hak akses tinggi.",
        currentPassword: "Kata sandi saat ini", newPassword: "Kata sandi baru", savePassword: "Simpan kata sandi",
        activeStatus: "Aktif", inactiveStatus: "Nonaktif", editAccount: "Ubah", deactivateAccount: "Nonaktifkan",
        teacherAccountCreated: "Akun Guru berhasil dibuat.", studentAccountCreated: "Akun Siswa berhasil dibuat. Guru perlu mendaftarkan sampel wajah sebelum siswa dapat melakukan presensi.",
        systemGovernance: "PENGELOLAAN SISTEM", governanceTitle: "Kontrol operasional Amanah ID", governanceDescription: "38 kontrol dalam 6 kategori. Pengaturan disimpan di Supabase dan setiap perubahan dicatat dalam audit.", governanceReload: "Muat ulang",
        adminMapSchoolTitle: "Titik GPS sekolah", adminMapSchoolDescription: "Pilih titik sekolah pada peta atau masukkan koordinat secara manual.", adminMapCenter: "Pusatkan", adminMapPointStatus: "Klik peta untuk memilih titik lokasi sekolah."
    },
    en: {
        adminWorkspace: "ADMINISTRATOR", adminNavigation: "Admin navigation", faceSampleProgress: "Face sample progress", administratorRole: "Administrator", confirmDeactivateAccount: "Deactivate this account?", promptNewEmail: "New email (leave blank to keep it unchanged):", promptNewName: "New name (leave blank to keep it unchanged):", promptNewPassword: "New password (leave blank to keep it unchanged):", adminOverview: "Overview", adminAccounts: "Manage accounts",
        adminSchoolSettings: "School settings", adminAudit: "Activity audit", adminSecurity: "Account security",
        adminOverviewTitle: "System overview", refreshData: "Refresh data", adminOverviewKicker: "OVERVIEW",
        adminAttendanceOverview: "Attendance overview", adminOverviewDescription: "Monitor accounts, attendance activity, and service health in one place.",
        totalActiveStudents: "Active students", supabaseData: "Supabase records", totalActiveTeachers: "Active teachers",
        teacherAccounts: "Teacher accounts", attendanceToday: "Attendance today", todayRecords: "Records today",
        attendanceLast7Days: "Attendance · 7 days", rollingPeriod: "Rolling period", activeUsers: "Active users",
        loginsLast7Days: "Logins in the last 7 days", serviceHealth: "Service health",
        serviceHealthDescription: "Configuration status of core services.", vercelApi: "Vercel API",
        whatsappNotifications: "WhatsApp notifications", adminAccountsKicker: "ACCOUNT MANAGEMENT",
        schoolUsers: "School users", schoolUsersDescription: "Admins can create Teacher and Student accounts. Student accounts need a NISN and class; a Teacher can register face samples later.",
        accountRole: "Account role", teacherRole: "Teacher", studentRole: "Student", studentNisn: "Student NISN", studentClass: "Student class", studentAccountNote: "Students can sign in after creation; face attendance is enabled after a Teacher registers a face sample.", createTeacherAccount: "Create account", newTeacherDescription: "The new Teacher or Student account will be stored in the database.",
        initialPassword: "Initial password", accountsList: "Account list",
        accountsListDescription: "Manage email, name, password, or account status.", noAccounts: "No accounts yet.",
        accountsEmptyDescription: "Records will appear after they are saved in Supabase.", adminRole: "Role",
        configurationKicker: "CONFIGURATION", adminSettingsDescription: "Update the geofence point and attendance time rules.",
        schoolLatitude: "School latitude", schoolLongitude: "School longitude", geofenceRadius: "Geofence radius (meters)",
        timezone: "Time zone", schoolEntryTime: "School entry time", lateTolerance: "Late tolerance (minutes)",
        adminAuditDescription: "Operation history recorded by the API.", auditActorEmail: "Actor email", searchEmail: "Search email",
        actionPlaceholder: "e.g. admin.login", applyFilter: "Apply filters", dateTime: "Date and time", targetTable: "Table",
        changeAdminPassword: "Change Admin password", adminPasswordDescription: "Use a unique, strong password for this privileged account.",
        currentPassword: "Current password", newPassword: "New password", savePassword: "Save password",
        activeStatus: "Active", inactiveStatus: "Inactive", editAccount: "Edit", deactivateAccount: "Deactivate",
        teacherAccountCreated: "Teacher account created successfully.", studentAccountCreated: "Student account created. A Teacher must register face samples before attendance can be recorded.",
        systemGovernance: "SYSTEM GOVERNANCE", governanceTitle: "Amanah ID operational controls", governanceDescription: "38 controls across 6 categories. Settings are stored in Supabase and every change is recorded in the audit log.", governanceReload: "Reload",
        adminMapSchoolTitle: "School GPS point", adminMapSchoolDescription: "Choose the school point on the map or enter its coordinates manually.", adminMapCenter: "Recenter", adminMapPointStatus: "Click the map to select the school location."
    },
    ar: {
        adminWorkspace: "مساحة المسؤول", adminNavigation: "تنقل المسؤول", faceSampleProgress: "تقدم عينات الوجه", administratorRole: "المسؤول", confirmDeactivateAccount: "هل تريد تعطيل هذا الحساب؟", promptNewEmail: "البريد الجديد (اتركه فارغًا لإبقائه كما هو):", promptNewName: "الاسم الجديد (اتركه فارغًا لإبقائه كما هو):", promptNewPassword: "كلمة المرور الجديدة (اتركها فارغة لإبقائها كما هي):", adminOverview: "نظرة عامة", adminAccounts: "إدارة الحسابات",
        adminSchoolSettings: "إعدادات المدرسة", adminAudit: "سجل النشاط", adminSecurity: "أمان الحساب",
        adminOverviewTitle: "نظرة عامة على النظام", refreshData: "تحديث البيانات", adminOverviewKicker: "نظرة عامة",
        adminAttendanceOverview: "ملخص الحضور", adminOverviewDescription: "تابع الحسابات ونشاط الحضور وحالة الخدمات من مكان واحد.",
        totalActiveStudents: "إجمالي الطلاب النشطين", supabaseData: "سجلات Supabase", totalActiveTeachers: "إجمالي المعلمين النشطين",
        teacherAccounts: "حسابات المعلمين", attendanceToday: "حضور اليوم", todayRecords: "سجلات اليوم",
        attendanceLast7Days: "الحضور خلال 7 أيام", rollingPeriod: "الفترة المتحركة", activeUsers: "المستخدمون النشطون",
        loginsLast7Days: "تسجيلات الدخول خلال 7 أيام", serviceHealth: "حالة الخدمات",
        serviceHealthDescription: "حالة إعداد الخدمات الأساسية.", vercelApi: "واجهة Vercel",
        whatsappNotifications: "إشعارات WhatsApp", adminAccountsKicker: "إدارة الحسابات",
        schoolUsers: "مستخدمو المدرسة", schoolUsersDescription: "يمكن للمسؤول إنشاء حسابات المعلمين والطلاب. يحتاج حساب الطالب إلى رقم NISN والصف، ويمكن للمعلم تسجيل عينة الوجه لاحقًا.",
        accountRole: "دور الحساب", teacherRole: "معلم", studentRole: "طالب", studentNisn: "رقم NISN للطالب", studentClass: "صف الطالب", studentAccountNote: "يمكن للطالب تسجيل الدخول بعد إنشاء الحساب؛ ويُفعّل الحضور بالوجه بعد تسجيل عينة الوجه بواسطة المعلم.", createTeacherAccount: "إنشاء حساب", newTeacherDescription: "سيُحفظ حساب المعلم أو الطالب الجديد في قاعدة البيانات.",
        initialPassword: "كلمة المرور الأولية", accountsList: "قائمة الحسابات",
        accountsListDescription: "إدارة البريد والاسم وكلمة المرور وحالة الحساب.", noAccounts: "لا توجد حسابات بعد.",
        accountsEmptyDescription: "ستظهر السجلات بعد حفظها في Supabase.", adminRole: "الدور",
        configurationKicker: "الإعدادات", adminSettingsDescription: "حدّث نقطة النطاق الجغرافي وقواعد وقت الحضور.",
        schoolLatitude: "خط عرض المدرسة", schoolLongitude: "خط طول المدرسة", geofenceRadius: "نطاق الموقع (متر)",
        timezone: "المنطقة الزمنية", schoolEntryTime: "وقت دخول المدرسة", lateTolerance: "سماح التأخير (دقائق)",
        adminAuditDescription: "سجل العمليات التي وثقتها واجهة API.", auditActorEmail: "بريد المنفّذ", searchEmail: "ابحث بالبريد",
        actionPlaceholder: "مثال: admin.login", applyFilter: "تطبيق المرشحات", dateTime: "التاريخ والوقت", targetTable: "الجدول",
        changeAdminPassword: "تغيير كلمة مرور المسؤول", adminPasswordDescription: "استخدم كلمة مرور قوية وفريدة لهذا الحساب ذي الصلاحيات العالية.",
        currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة", savePassword: "حفظ كلمة المرور",
        activeStatus: "نشط", inactiveStatus: "غير نشط", editAccount: "تعديل", deactivateAccount: "تعطيل",
        teacherAccountCreated: "تم إنشاء حساب المعلم بنجاح.", studentAccountCreated: "تم إنشاء حساب الطالب. يجب على المعلم تسجيل عينة الوجه قبل تسجيل الحضور.",
        systemGovernance: "إدارة النظام", governanceTitle: "عناصر التحكم التشغيلية في أمانة ID", governanceDescription: "38 عنصر تحكم ضمن 6 فئات. تُحفظ الإعدادات في Supabase ويُسجل كل تغيير في سجل التدقيق.", governanceReload: "إعادة تحميل",
        adminMapSchoolTitle: "نقطة GPS للمدرسة", adminMapSchoolDescription: "اختر موقع المدرسة على الخريطة أو أدخل الإحداثيات يدويًا.", adminMapCenter: "إعادة التمركز", adminMapPointStatus: "انقر على الخريطة لاختيار موقع المدرسة."
    }
};
Object.keys(ADMIN_T).forEach(lang => Object.assign(T[lang], ADMIN_T[lang]));

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
    if (!el) return;
    el.textContent = String(message ?? "");
    el.className = `toast show ${["success", "error", "warning"].includes(type) ? type : "info"}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("show"), type === "error" ? 5600 : 4200);
}

async function refreshLoginCaptcha() {
    const question = $("login-captcha-question");
    const answer = $("login-captcha-answer");
    const refresh = $("login-captcha-refresh");
    if (!question || !answer) return;

    const requestId = ++state.loginCaptchaRequestId;
    state.loginCaptchaToken = null;
    if (refresh) refresh.disabled = true;
    question.textContent = tr("captchaLoading");
    answer.value = "";
    answer.setCustomValidity("");
    const help = $("login-captcha-help");
    if (help) help.textContent = tr("captchaHelp");

    try {
        const challenge = await cloudRequest(
            `/api/auth/login?action=captcha&lang=${encodeURIComponent(state.lang)}`,
            { timeoutMs: 10_000 }
        );
        if (requestId !== state.loginCaptchaRequestId) return;
        if (typeof challenge?.token !== "string" || typeof challenge?.question !== "string" ||
            challenge.token.length < 20 || challenge.question.length > 180) {
            throw new Error(tr("captchaUnavailable"));
        }
        state.loginCaptchaToken = challenge.token;
        question.textContent = challenge.question;
    } catch (error) {
        if (requestId !== state.loginCaptchaRequestId) return;
        console.warn("Could not load login CAPTCHA:", error);
        question.textContent = tr("captchaUnavailable");
        if (help) help.textContent = tr("captchaUnavailable");
    } finally {
        if (requestId === state.loginCaptchaRequestId && refresh) refresh.disabled = false;
    }
}


function exportTableCsv(tbodyId, filename) {
    const tbody = $(tbodyId);
    const table = tbody && tbody.closest("table");
    if (!table) {
        toast("Tabel belum tersedia untuk diekspor.", "warning");
        return;
    }
    const rows = Array.from(table.querySelectorAll("tr")).map(row =>
        Array.from(row.querySelectorAll("th, td")).map((cell, index, cells) => {
            if (tbodyId === "admin-users-tbody" && index === cells.length - 1) return "";
            let value = cell.innerText.trim().replace(/\s+/g, " ");
            if (/^[=+@-]/.test(value)) value = "'" + value;
            return '"' + value.replace(/"/g, '""') + '"';
        })
    );
    if (rows.length < 2 || !rows.slice(1).some(row => row.some(cell => cell !== '""'))) {
        toast("Belum ada data untuk diekspor.", "info");
        return;
    }
    const csv = "\uFEFF" + rows.map(row => row.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Berkas CSV berhasil disiapkan.", "success");
}

function syncAdminSettingsMap({ center = false } = {}) {
    const mapElement = $("admin-school-map");
    if (!mapElement) return;
    updateAdminMapDistanceSummary();
    if (!window.L) return;
    if (!$("admin-setting-lat")?.value.trim() || !$("admin-setting-lng")?.value.trim()) return;
    const lat = Number($("admin-setting-lat").value);
    const lng = Number($("admin-setting-lng").value);
    const radius = Number($("admin-setting-radius") && $("admin-setting-radius").value);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lng) || lng < -180 || lng > 180) return;
    const point = [lat, lng];
    if (!state.adminSettingsMap) {
        state.adminSettingsMap = L.map(mapElement, { zoomControl: true }).setView(point, 17);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(state.adminSettingsMap);
        state.adminSettingsMarker = L.marker(point).addTo(state.adminSettingsMap);
        state.adminSettingsCircle = L.circle(point, {
            radius: Number.isFinite(radius) ? radius : 50,
            color: "#3978f6",
            fillColor: "#3978f6",
            fillOpacity: .12,
            weight: 2
        }).addTo(state.adminSettingsMap);
        state.adminSettingsMap.on("click", event => {
            $("admin-setting-lat").value = event.latlng.lat.toFixed(7);
            $("admin-setting-lng").value = event.latlng.lng.toFixed(7);
            syncAdminSettingsMap({ center: false });
            const status = $("admin-school-map-status");
            if (status) status.textContent = tr("adminMapPointChanged");
        });
        $("admin-map-center")?.addEventListener("click", () => syncAdminSettingsMap({ center: true }));
        ["admin-setting-lat", "admin-setting-lng", "admin-setting-radius"].forEach(id => {
            $(id)?.addEventListener("change", () => syncAdminSettingsMap({ center: false }));
        });
    } else {
        state.adminSettingsMarker.setLatLng(point);
        state.adminSettingsCircle.setLatLng(point);
        if (Number.isFinite(radius) && radius >= 10 && radius <= 500) {
            state.adminSettingsCircle.setRadius(radius);
        }
        if (center) state.adminSettingsMap.setView(point, Math.max(state.adminSettingsMap.getZoom(), 17));
    }
    const latLabel = $("admin-map-lat-label");
    const lngLabel = $("admin-map-lng-label");
    if (latLabel) latLabel.textContent = lat.toFixed(7);
    if (lngLabel) lngLabel.textContent = lng.toFixed(7);
    updateAdminMapDistanceSummary();
    window.setTimeout(() => state.adminSettingsMap?.invalidateSize(), 80);
}

function formatMapDistance(meters) {
    if (!Number.isFinite(meters) || meters < 0) return "—";
    if (meters < 1000) return `${Math.round(meters)} m`;
    const locale = state.lang === "id" ? "id-ID" : state.lang === "ar" ? "ar" : "en-US";
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(meters / 1000)} km`;
}

function updateAdminMapDistanceSummary() {
    const fix = state.adminSettingsDeviceFix;
    const distanceEl = $("admin-map-device-distance");
    const accuracyEl = $("admin-map-device-accuracy");
    const radiusEl = $("admin-map-device-radius");
    const updatedEl = $("admin-map-device-updated");
    const statusEl = $("admin-map-device-status");
    const panel = document.querySelector(".admin-map-device-panel");
    if (!fix) {
        if (radiusEl) radiusEl.textContent = formatMapDistance(Number($("admin-setting-radius")?.value));
        return;
    }

    const schoolLat = Number($("admin-setting-lat")?.value);
    const schoolLng = Number($("admin-setting-lng")?.value);
    const radius = Number($("admin-setting-radius")?.value);
    const distance = calculateDistance(fix.lat, fix.lng, schoolLat, schoolLng);
    if (![distance, fix.accuracy, radius].every(Number.isFinite) || fix.accuracy <= 0 || radius <= 0) {
        if (statusEl) statusEl.textContent = tr("adminMapBadFix");
        return;
    }

    if (distanceEl) distanceEl.textContent = formatMapDistance(distance);
    if (accuracyEl) accuracyEl.textContent = `±${formatMapDistance(fix.accuracy)}`;
    if (radiusEl) radiusEl.textContent = formatMapDistance(radius);
    const locale = state.lang === "id" ? "id-ID" : state.lang === "ar" ? "ar" : "en-US";
    const checkedAt = new Intl.DateTimeFormat(locale, {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(new Date(fix.timestamp));
    if (updatedEl) updatedEl.textContent = checkedAt;

    const clearlyInside = distance + fix.accuracy <= radius;
    const clearlyOutside = Math.max(0, distance - fix.accuracy) > radius;
    const statusKey = clearlyInside ? "adminMapInside" : clearlyOutside ? "adminMapOutside" : "adminMapBoundary";
    const margin = clearlyInside
        ? formatMapDistance(Math.max(0, radius - distance - fix.accuracy))
        : formatMapDistance(Math.max(0, distance - fix.accuracy - radius));
    if (statusEl) statusEl.textContent = `${tr(statusKey, { margin })} ${tr("adminMapLastFix", { time: checkedAt })}`;

    if (state.adminSettingsMap && window.L) {
        const point = [fix.lat, fix.lng];
        if (!state.adminSettingsDeviceMarker) {
            state.adminSettingsDeviceMarker = L.circleMarker(point, {
                radius: 7, color: "#087a50", weight: 2, fillColor: "#16a36a", fillOpacity: .95
            }).addTo(state.adminSettingsMap);
        } else state.adminSettingsDeviceMarker.setLatLng(point);
        if (!state.adminSettingsAccuracyCircle) {
            state.adminSettingsAccuracyCircle = L.circle(point, {
                radius: fix.accuracy, color: "#16a36a", weight: 1, fillColor: "#16a36a", fillOpacity: .07
            }).addTo(state.adminSettingsMap);
        } else {
            state.adminSettingsAccuracyCircle.setLatLng(point);
            state.adminSettingsAccuracyCircle.setRadius(fix.accuracy);
        }
    }
    if (panel) {
        panel.classList.remove("is-updated");
        requestAnimationFrame(() => panel.classList.add("is-updated"));
    }
}

async function checkAdminMapDeviceLocation() {
    const button = $("admin-map-check-location");
    const status = $("admin-map-device-status");
    if (!status) return;
    if (!navigator.geolocation?.getCurrentPosition && !navigator.geolocation?.watchPosition) {
        status.textContent = tr("gpsUnsupported");
        return;
    }
    const schoolLat = Number($("admin-setting-lat")?.value);
    const schoolLng = Number($("admin-setting-lng")?.value);
    const radius = Number($("admin-setting-radius")?.value);
    if (![schoolLat, schoolLng, radius].every(Number.isFinite) ||
        Math.abs(schoolLat) > 90 || Math.abs(schoolLng) > 180 || radius <= 0) {
        status.textContent = tr("adminMapBadFix");
        return;
    }

    const originalLabel = button?.textContent;
    if (button) { button.disabled = true; button.textContent = tr("adminMapCheckingDeviceLocation"); }
    status.textContent = tr("adminMapCheckingDeviceLocation");
    try {
        const position = await getBestGpsPosition();
        const { latitude, longitude, accuracy } = position.coords || {};
        if (![latitude, longitude, accuracy].every(Number.isFinite) ||
            Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy <= 0) {
            throw new Error("invalid-gps-fix");
        }
        state.adminSettingsDeviceFix = {
            lat: latitude, lng: longitude, accuracy,
            timestamp: Number.isFinite(position.timestamp) ? position.timestamp : Date.now()
        };
        updateAdminMapDistanceSummary();
        if (!isGpsAccuracyAcceptable(accuracy, radius)) {
            status.textContent = tr("adminMapLowAccuracy", { accuracy: Math.round(accuracy) });
        } else if (status) {
            status.textContent += ` ${tr("adminMapLocationSuccess")}`;
        }
    } catch (error) {
        const key = error?.message === "invalid-gps-fix" ? "adminMapBadFix"
            : error?.code === 1 ? "adminMapLocationPermission"
            : error?.code === 2 ? "adminMapLocationUnavailable"
            : error?.code === 3 ? "adminMapLocationTimeout"
            : "adminMapLocationFailure";
        status.textContent = tr(key);
    } finally {
        if (button) { button.disabled = false; button.textContent = originalLabel || tr("adminMapCheckDeviceLocation"); }
    }
}


let appDialogResolve = null;
let appDialogPreviousFocus = null;
function closeAppDialog(result = null) {
    const modal = $("app-dialog");
    if (!modal || modal.classList.contains("hidden")) return;
    modal.classList.add("hidden");
    document.body.classList.remove("app-dialog-open");
    const resolve = appDialogResolve;
    appDialogResolve = null;
    if (typeof resolve === "function") resolve(result);
    appDialogPreviousFocus?.focus?.();
}
function openAppDialog({ title, description = "", fields = [], confirmLabel = "Simpan", cancelLabel = "Batal", danger = false, icon = "✦" }) {
    const modal = $("app-dialog");
    const form = $("app-dialog-form");
    if (!modal || !form) return Promise.resolve(null);
    if (appDialogResolve) closeAppDialog(null);
    appDialogPreviousFocus = document.activeElement;
    $("app-dialog-title").textContent = title;
    $("app-dialog-description").textContent = description;
    $("app-dialog-icon").textContent = icon;
    $("app-dialog-submit").textContent = confirmLabel;
    $("app-dialog-cancel").textContent = cancelLabel;
    $("app-dialog-submit").classList.toggle("danger", danger);
    $("app-dialog-error").classList.add("hidden");
    const container = $("app-dialog-fields");
    container.replaceChildren();
    const controls = {};
    for (const field of fields) {
        const label = document.createElement("label");
        label.className = "app-dialog-field";
        label.append(document.createTextNode(field.label));
        const input = field.type === "select"
            ? document.createElement("select")
            : document.createElement("input");
        input.name = field.name;
        if (field.type !== "select") input.type = field.type || "text";
        input.autocomplete = field.autocomplete || "off";
        input.placeholder = field.placeholder || "";
        input.required = Boolean(field.required);
        if (field.type === "select") {
            for (const optionData of field.options || []) {
                const option = document.createElement("option");
                option.value = String(optionData.value ?? "");
                option.textContent = String(optionData.label ?? optionData.value ?? "");
                input.append(option);
            }
            input.value = field.value || "";
        } else {
            input.value = field.value || "";
        }
        if (field.pattern) input.pattern = field.pattern;
        if (field.minLength) input.minLength = field.minLength;
        if (field.maxLength) input.maxLength = field.maxLength;
        label.append(input);
        container.append(label);
        controls[field.name] = input;
    }
    modal.classList.remove("hidden");
    document.body.classList.add("app-dialog-open");
    requestAnimationFrame(() => (Object.values(controls)[0] || $("app-dialog-cancel")).focus());
    return new Promise(resolve => { appDialogResolve = resolve; modal._appDialogControls = controls; });
}
function setupAppDialog() {
    const modal = $("app-dialog"), form = $("app-dialog-form");
    if (!modal || !form || modal.dataset.ready) return;
    modal.dataset.ready = "true";
    $("app-dialog-cancel").addEventListener("click", () => closeAppDialog(null));
    modal.addEventListener("click", event => { if (event.target === modal) closeAppDialog(null); });
    document.addEventListener("keydown", event => {
        if (modal.classList.contains("hidden")) return;
        if (event.key === "Escape") { event.preventDefault(); closeAppDialog(null); }
        if (event.key === "Tab") {
            const focusable = [...modal.querySelectorAll("input, select, button")].filter(el => !el.disabled);
            if (!focusable.length) return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    form.addEventListener("submit", event => {
        event.preventDefault();
        const values = {};
        for (const [name, input] of Object.entries(modal._appDialogControls || {})) {
            if (!input.reportValidity()) return;
            values[name] = input.value;
        }
        closeAppDialog(values);
    });
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
    if (!$("auth-modal")?.classList.contains("hidden")) void refreshLoginCaptcha();
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    if (state.user?.role === "admin") updateAdminPageTitle();
    $("profile-language").value = lang;
    $("student-profile-language").value = lang;
    renderLocationBadge();
    renderDatabase();
    renderStudentList();
    updateStats();
    updateCameraTexts();
    renderStudentHistory();
    if ($("admin-test-whatsapp-template") && !$("admin-test-whatsapp-template").dataset.userEdited) {
        $("admin-test-whatsapp-template").value = tr("testWhatsappDefaultTemplate");
        updateAdminWhatsAppPreview();
    }
    updateAdminWhatsAppTestControls();
    if (state.adminFeatures) renderAdminFeatures();
    updateAdminMapDistanceSummary();
    updateStudentProfile();
    if (state.map) updateMapText();
    updateSchoolLocationEditor();
    fitHeroTitle();
}

function fitHeroTitle() {
    if (heroTitleFrame) return;
    heroTitleFrame = window.requestAnimationFrame(() => {
        heroTitleFrame = 0;
        fitHeroTitleNow();
    });
}

function fitHeroTitleNow() {
    const title = $("auth-hero-title");
    if (!title || !title.getClientRects().length) return;
    const availableWidth = title.clientWidth;
    if (!availableWidth) return;

    const style = getComputedStyle(title);
    if (!heroTitleMeasure) {
        heroTitleMeasure = document.createElement("span");
        Object.assign(heroTitleMeasure.style, {
            position: "fixed",
            left: "-10000px",
            top: "0",
            width: "max-content",
            whiteSpace: "nowrap",
            visibility: "hidden",
            pointerEvents: "none"
        });
        document.body.append(heroTitleMeasure);
    }
    Object.assign(heroTitleMeasure.style, {
        fontFamily: style.fontFamily,
        fontSize: style.getPropertyValue("--hero-base-size").trim() || style.fontSize,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        direction: style.direction
    });
    const lines = [...title.querySelectorAll("[data-i18n^='heroTitle']")];
    if (!lines.length) return;
    const lineWidths = lines.map(line => {
        heroTitleMeasure.textContent = line.textContent.trim();
        return heroTitleMeasure.getBoundingClientRect().width;
    });
    const widestLine = Math.max(0, ...lineWidths);
    const baseSize = Number.parseFloat(getComputedStyle(heroTitleMeasure).fontSize);
    if (!baseSize || !widestLine) return;
    const fitSize = widestLine > availableWidth
        ? baseSize * ((availableWidth - 2) / widestLine)
        : baseSize;
    const nextSize = `${Math.round(Math.max(12, fitSize) * 100) / 100}px`;
    if (title.style.getPropertyValue("--hero-fit-size") !== nextSize) {
        title.style.setProperty("--hero-fit-size", nextSize);
    }
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
    if (document.fonts?.ready) {
        document.fonts.ready.then(() => fitHeroTitle()).catch(error => {
            console.warn("Hero title font readiness check failed:", error);
        });
    }
}

function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    if ($("theme-select")) $("theme-select").value = state.theme;
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

function showAuth({ clearSession = true } = {}) {
    stopAllCameras();
    stopNetworkHeartbeat();
    if (clearSession) {
        sessionStorage.removeItem("amanahid.sessionToken");
        sessionStorage.removeItem("amanahid.adminToken");
    }
    state.user = null;
    state.students = [];
    state.attendance = [];
    state.faceSamples = [];
    state.faceSampleAngles = [];
    state.faceImageHashes = new Set();
    state.faceCandidate = null;
    state.faceCandidateQuality = null;
    state.lastLocation = null;
    state.lastGpsFix = null;
    state.locationCheckBusy = false;
    state.cloudDataPromise = Promise.resolve();
    cancelSchoolLocationEdit();
    state.schoolSettingsLoaded = false;
    state.cloudLoadToken++;
    if ($("btn-attendance-switch")) $("btn-attendance-switch").disabled = true;
    if ($("btn-student-attendance")) $("btn-student-attendance").disabled = true;
    closeAuthModal();
    if ($("login-password")) $("login-password").value = "";
    $("dashboard-guru")?.classList.add("hidden");
    $("dashboard-siswa")?.classList.add("hidden");
    $("dashboard-admin")?.classList.add("hidden");
    $("auth-screen")?.classList.remove("hidden");
    $("network-banner")?.classList.add("hidden");
    $("profile-modal")?.classList.add("hidden");
    $("map-modal")?.classList.add("hidden");
    document.body.classList.remove("auth-modal-open");
    renderLocationBadge();
    updateFaceSampleCount();
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
    const expected = state.user.role === "admin" ? "#admin" :
        state.user.role === "siswa" ? "#siswa" : "#guru";
    if (location.hash !== expected) {
        showAuth();
        state.user = null;
        state.cloudLoadToken++;
    }
}

async function showApp(user) {
    if (!user || !["admin", "guru", "siswa"].includes(user.role) ||
        typeof user.token !== "string" || !user.token) {
        throw new Error("Sesi tidak memiliki peran atau token yang valid.");
    }
    closeAuthModal();
    stopAllCameras();
    state.user = user;
    if (user.role === "admin") {
        sessionStorage.setItem("amanahid.adminToken", user.token);
        sessionStorage.removeItem("amanahid.sessionToken");
    } else {
        sessionStorage.setItem("amanahid.sessionToken", user.token);
        sessionStorage.removeItem("amanahid.adminToken");
    }
    state.cloudLoadToken++;
    state.schoolSettingsLoaded = false;
    if ($("btn-attendance-switch")) $("btn-attendance-switch").disabled = true;
    if ($("btn-student-attendance")) $("btn-student-attendance").disabled = true;
    $("auth-screen")?.classList.add("hidden");
    startNetworkHeartbeat();
    $("dashboard-admin")?.classList.toggle("hidden", user.role !== "admin");
    const isStudent = user.role === "siswa";
    $("dashboard-guru")?.classList.toggle("hidden", user.role !== "guru");
    $("dashboard-siswa")?.classList.toggle("hidden", !isStudent);
    const activeDashboard = user.role === "admin"
        ? $("dashboard-admin")
        : (isStudent ? $("dashboard-siswa") : $("dashboard-guru"));
    if (activeDashboard) {
        activeDashboard.classList.remove("auth-enter");
        void activeDashboard.offsetWidth;
        activeDashboard.classList.add("auth-enter");
        activeDashboard.addEventListener("animationend", () => {
            activeDashboard.classList.remove("auth-enter");
        }, { once: true });
    }
    const displayName = String(user.name ?? user.email ?? "");
    const initial = displayName.trim().charAt(0).toUpperCase() || (isStudent ? "S" : "A");
    if (user.role === "admin") {
        if ($("admin-header-user")) $("admin-header-user").textContent = displayName;
        if ($("admin-header-avatar")) $("admin-header-avatar").textContent = initial;
        location.hash = "admin";
        showAdminView("admin-view-dashboard");
        await loadAdminDashboard();
        return;
    } else if (isStudent) {
        if ($("student-header-user")) $("student-header-user").textContent = displayName;
        if ($("student-header-avatar")) $("student-header-avatar").textContent = initial;
        if ($("student-profile-name")) $("student-profile-name").textContent = displayName;
        if ($("student-profile-email")) $("student-profile-email").textContent = user.email;
        if ($("student-profile-avatar")) $("student-profile-avatar").textContent = initial;
        updateStudentProfile();
        location.hash = "siswa";
        showView("view-s-presensi");
    } else {
        if ($("header-user")) $("header-user").textContent = displayName;
        if ($("header-avatar")) $("header-avatar").textContent = initial;
        if ($("profile-name")) $("profile-name").textContent = displayName;
        if ($("profile-email")) $("profile-email").textContent = user.email;
        if ($("profile-modal-avatar")) $("profile-modal-avatar").textContent = initial;
        location.hash = "guru";
        showView("view-presensi");
    }
    const cloudDataPromise = loadCloudData(user);
    state.cloudDataPromise = cloudDataPromise;
    const settingsLoaded = await loadSchoolSettings();
    await cloudDataPromise;
    if (state.user !== user || state.cloudDataPromise !== cloudDataPromise) return;
    state.schoolSettingsLoaded = settingsLoaded;
    if ($("btn-attendance-switch")) $("btn-attendance-switch").disabled = !settingsLoaded;
    if ($("btn-student-attendance")) $("btn-student-attendance").disabled = !settingsLoaded;
    if (!settingsLoaded) toast(tr("schoolSettingsFailed"), "error");
    void loadFaceDetector();
}

function restoreSession() {
    const key = sessionStorage.getItem("amanahid.adminToken")
        ? "amanahid.adminToken"
        : "amanahid.sessionToken";
    const token = sessionStorage.getItem(key);
    if (!token) return;
    try {
        const encoded = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
        const claims = JSON.parse(new TextDecoder().decode(bytes));
        const expectedRole = key === "amanahid.adminToken"
            ? claims.role === "admin"
            : ["guru", "siswa"].includes(claims.role);
        if (!expectedRole || !claims.email || !Number.isFinite(claims.exp) || claims.exp <= Date.now()) {
            throw new Error("Stored session is invalid or expired");
        }
        void showApp({ ...claims, token });
    } catch (error) {
        console.warn("Stored session could not be restored:", error);
        sessionStorage.removeItem("amanahid.sessionToken");
        sessionStorage.removeItem("amanahid.adminToken");
    }
}

const ADMIN_VIEW_TITLES = {
    "admin-view-dashboard": "adminOverviewTitle",
    "admin-view-users": "schoolUsers",
    "admin-view-settings": "adminSchoolSettings",
    "admin-view-tests": "adminTestToolsTitle",
    "admin-view-audit": "adminAudit",
    "admin-view-profile": "changeAdminPassword"
};

function updateAdminPageTitle() {
    const title = $("admin-page-title");
    const active = document.querySelector("#dashboard-admin .admin-view.active");
    if (title && active) title.textContent = tr(ADMIN_VIEW_TITLES[active.id] ?? "adminOverviewTitle");
}

function showAdminView(viewId) {
    if (state.user?.role !== "admin" || !sessionStorage.getItem("amanahid.adminToken")) {
        showAuth();
        return;
    }
    const targetView = document.querySelector(`#dashboard-admin .admin-view#${CSS.escape(viewId)}`);
    if (!targetView) {
        toast("Halaman Admin tidak ditemukan.", "error");
        return;
    }
    document.querySelectorAll("#dashboard-admin .admin-view").forEach(view => {
        view.classList.toggle("hidden", view.id !== viewId);
        view.classList.toggle("active", view.id === viewId);
    });
    document.querySelectorAll("#dashboard-admin .nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.adminTarget === viewId);
    });
    updateAdminPageTitle();
    if (viewId === "admin-view-users") void loadAdminUsers();
    if (viewId === "admin-view-settings") void loadAdminSettings();
    if (viewId === "admin-view-audit") void loadAdminAudit();
    if (viewId === "admin-view-dashboard") void loadAdminFeatures();
    if (viewId === "admin-view-tests") void loadAdminTestTools();
    if (viewId !== "admin-view-tests") stopAdminTestCamera();
}

async function loadAdminDashboard() {
    if (state.user?.role !== "admin" || !sessionStorage.getItem("amanahid.adminToken")) {
        showAuth();
        toast("Sesi Admin tidak valid. Silakan login kembali.", "error");
        return;
    }
    try {
        const stats = await cloudRequest("/api/admin/audit?action=stats");
        $("admin-total-students").textContent = stats?.total_students ?? 0;
        $("admin-total-teachers").textContent = stats?.total_teachers ?? 0;
        $("admin-attendance-today").textContent = stats?.attendance_today ?? 0;
        $("admin-attendance-week").textContent = stats?.attendance_week ?? 0;
        $("admin-active-week").textContent = stats?.active_users_week ?? 0;
        try {
            const health = await cloudRequest("/api/ready");
            $("health-supabase").textContent = health?.checks?.database ?? "unknown";
            $("health-vercel").textContent = health?.ok ? "ok" : "error";
            $("health-fonnte").textContent = health?.checks?.whatsapp ?? "not_configured";
        } catch {
            $("health-supabase").textContent = "error";
            $("health-vercel").textContent = "error";
            $("health-fonnte").textContent = "unknown";
        }
    } catch (error) {
        console.error("Admin dashboard could not load:", error);
        toastAdminError(error);
    }
}

const LOCKED_ADMIN_FEATURES = new Set([
    "admin_audit_log", "duplicate_attendance_block", "face_ambiguity_guard", "face_sample_limit",
    "gps_accuracy_guard", "gps_boundary_guard",
    "rate_limiting", "session_expiry", "origin_validation", "strict_server_validation",
    "reduced_motion_support", "responsive_layout", "privacy_notice"
]);

function updateAdminCreationControls() {
    const roleSelect = $("admin-user-role");
    const form = $("admin-user-form");
    if (!roleSelect || !form) return;
    const features = state.adminFeatures || {};
    const guru = roleSelect.querySelector('option[value="guru"]');
    const siswa = roleSelect.querySelector('option[value="siswa"]');
    if (guru) guru.disabled = features.teacher_account_creation === false;
    if (siswa) siswa.disabled = features.student_account_creation === false;
    const available = [guru, siswa].filter(option => option && !option.disabled);
    if (roleSelect.selectedOptions[0]?.disabled && available[0]) roleSelect.value = available[0].value;
    roleSelect.disabled = available.length === 0;
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = available.length === 0 || roleSelect.selectedOptions[0]?.disabled === true;
}

function applyAdminFeatureFlags(features = {}) {
    const hide = (id, hidden) => $(id)?.classList.toggle("hidden", Boolean(hidden));
    hide("admin-export-users", features.admin_account_export === false);
    hide("admin-service-health-panel", features.service_health_panel === false);
    hide("admin-test-whatsapp-card", features.parent_notifications === false);

    const profileForm = $("admin-profile-form");
    if (profileForm) {
        const disabled = features.admin_password_change === false;
        profileForm.querySelectorAll("input, button").forEach(element => { element.disabled = disabled; });
        profileForm.setAttribute("aria-disabled", String(disabled));
    }
    const deactivateDisabled = features.account_deactivation === false;
    $("admin-users-tbody")?.querySelectorAll("[data-admin-disable]").forEach(button => {
        button.disabled = deactivateDisabled || button.dataset.active === "false";
    });
    const radius = $("admin-setting-radius");
    if (radius) radius.disabled = features.geofence_radius_edit === false;
    for (const id of ["admin-setting-timezone", "admin-setting-entry-time", "admin-setting-tolerance"]) {
        const element = $(id);
        if (element) element.disabled = features.school_schedule_rules === false;
    }
    updateAdminCreationControls();
}

function hideSplashScreen() {
    const splash = $("splash-screen");
    if (!splash) return;
    clearSplashTimers();
    splash.classList.add("is-leaving", "hidden");
    splash.setAttribute("aria-hidden", "true");
}

function applyRuntimeFeatureFlags(features = {}) {
    const setHidden = (id, hidden) => $(id)?.classList.toggle("hidden", Boolean(hidden));
    setHidden("maintenance-banner", features.maintenance_banner !== true);
    setHidden("btn-export", features.attendance_export === false);

    // Navigation owns normal view visibility; only force-hide a disabled view.
    if (features.attendance_history === false) {
        $("view-database")?.classList.add("hidden");
        $("view-s-history")?.classList.add("hidden");
    }
    if (features.face_enrollment === false || features.student_account_creation === false) {
        $("view-formulir")?.classList.add("hidden");
    }
    document.querySelectorAll('[data-view="view-database"], [data-view="view-s-history"]').forEach(element => {
        element.classList.toggle("hidden", features.attendance_history === false);
    });
    document.querySelectorAll('[data-view="view-formulir"]').forEach(element => {
        element.classList.toggle("hidden", features.face_enrollment === false || features.student_account_creation === false);
    });
    document.querySelectorAll(".language-row").forEach(element => {
        element.classList.toggle("hidden", features.language_switcher === false);
    });
    const coreAttendanceOff = ["camera_attendance", "face_recognition", "liveness_check", "attendance_recording"]
        .some(key => features[key] === false);
    if (coreAttendanceOff) {
        if ($("btn-attendance-switch")) $("btn-attendance-switch").disabled = true;
        if ($("btn-student-attendance")) $("btn-student-attendance").disabled = true;
    }
    if (features.splash_animation === false) hideSplashScreen();

}

const ADMIN_FEATURE_COPY = {
    id: {
        groups: { attendance: "1. Presensi & biometrik", accounts: "2. Akun & peran", data: "3. Data & presensi", security: "4. Keamanan & audit", experience: "5. Pengalaman website", location: "6. Lokasi, jadwal & tata kelola" },
        lockedSuffix: " (wajib aktif; tidak dapat dinonaktifkan).",
        features: {
            camera_attendance: ["Kamera presensi", "Mengizinkan akses kamera pada alur presensi."], gps_geofencing: ["GPS geofencing", "Mengaktifkan pembatasan radius sekolah."], face_recognition: ["Pencocokan wajah", "Mengizinkan pencocokan descriptor wajah terdaftar."], liveness_check: ["Pemeriksaan gerakan kepala", "Mengaktifkan pemeriksaan keaktifan dasar."], face_ambiguity_guard: ["Penolakan wajah ambigu", "Menolak hasil jika dua identitas terlalu mirip untuk dibedakan dengan aman."], face_enrollment: ["Pendaftaran sampel wajah", "Mengizinkan pendaftaran sampel wajah siswa."], face_sample_limit: ["Batas sampel wajah", "Menegakkan batas sampel wajah per siswa."],
            student_login: ["Login siswa", "Mengizinkan autentikasi akun siswa."], teacher_login: ["Login guru", "Mengizinkan autentikasi akun guru."], admin_login: ["Login administrator", "Mengizinkan autentikasi administrator."], student_account_creation: ["Pembuatan akun siswa", "Mengizinkan administrator membuat akun siswa."], teacher_account_creation: ["Pembuatan akun guru", "Mengizinkan administrator membuat akun guru."], account_deactivation: ["Penonaktifan akun", "Mengizinkan penonaktifan akun sekolah."],
            attendance_recording: ["Pencatatan presensi", "Mengizinkan pencatatan kehadiran baru."], duplicate_attendance_block: ["Blokir presensi ganda", "Mencegah pencatatan lebih dari satu kali pada hari yang sama."], attendance_history: ["Riwayat presensi", "Mengizinkan akses ke riwayat kehadiran."], attendance_export: ["Ekspor data presensi", "Mengizinkan ekspor riwayat presensi."], parent_notifications: ["Notifikasi orang tua", "Mengizinkan pemicu notifikasi WhatsApp kepada orang tua."], late_detection: ["Deteksi keterlambatan", "Mengaktifkan aturan jam masuk dan toleransi keterlambatan."],
            admin_audit_log: ["Audit aktivitas admin", "Mencatat perubahan penting yang dilakukan administrator."], admin_account_export: ["Ekspor akun", "Mengizinkan ekspor daftar akun sekolah."], admin_password_change: ["Perubahan sandi admin", "Mengizinkan pengelolaan kata sandi administrator."], rate_limiting: ["Pembatasan percobaan", "Membatasi frekuensi permintaan dan percobaan berulang."], session_expiry: ["Kedaluwarsa sesi", "Mewajibkan sesi autentikasi yang masih valid."], origin_validation: ["Validasi origin", "Menolak permintaan dari origin yang tidak diizinkan."],
            maintenance_banner: ["Banner pemeliharaan", "Menampilkan pengumuman pemeliharaan saat diaktifkan."], public_status_panel: ["Panel status layanan", "Menampilkan status kesiapan layanan yang aman untuk publik."], reduced_motion_support: ["Dukungan reduced motion", "Menghormati preferensi pengurangan animasi perangkat."], language_switcher: ["Pemilih bahasa", "Mengizinkan pergantian bahasa antarmuka."], responsive_layout: ["Tata letak responsif", "Mengaktifkan penyesuaian tampilan desktop dan perangkat seluler."], splash_animation: ["Animasi pembuka", "Mengaktifkan animasi pembuka Amanah ID."],
            gps_accuracy_guard: ["Pemeriksaan akurasi GPS", "Memeriksa batas akurasi lokasi sebelum presensi."], gps_boundary_guard: ["Pengaman batas geofence", "Menolak presensi ketika rentang ketidakpastian GPS memotong batas radius."], geofence_radius_edit: ["Pengubahan radius geofence", "Mengizinkan perubahan radius area sekolah."], school_schedule_rules: ["Aturan jadwal sekolah", "Mengaktifkan zona waktu, jam masuk, dan toleransi terlambat."], privacy_notice: ["Pemberitahuan privasi", "Menampilkan informasi pemrosesan data pribadi dan biometrik."], service_health_panel: ["Panel kesehatan layanan", "Menampilkan status backend dan integrasi."], strict_server_validation: ["Validasi server ketat", "Mewajibkan validasi payload di sisi server."]
        },
        saving: "Menyimpan perubahan…", saved: "Tersimpan ke server.", loading: "Memuat kebijakan sistem…", loadFailed: "Pengaturan gagal dimuat. Periksa koneksi dan izin Admin.", savingStatus: "Menyimpan perubahan kebijakan ke server…", savedStatus: "Perubahan tersimpan dan dicatat dalam audit.", saveFailed: "Server menolak perubahan. Periksa sesi Admin dan koneksi.", sessionError: "Sesi Admin tidak valid atau akses ditolak.", networkError: "Koneksi terputus atau server tidak merespons.", databaseError: "Database/backend gagal menyimpan pengaturan.", countLoaded: "{enabled} dari {total} kontrol aktif · Tersimpan di Supabase", countSaved: "{enabled} dari {total} kontrol aktif · Perubahan tersimpan dan diaudit", errorStatus: "Gagal menyimpan “{key}”: {reason}", savedToast: "Pengaturan sistem berhasil disimpan."
    },
    en: {
        groups: { attendance: "1. Attendance & biometrics", accounts: "2. Accounts & roles", data: "3. Data & attendance", security: "4. Security & audit", experience: "5. Website experience", location: "6. Location, schedule & governance" },
        lockedSuffix: " (required; cannot be disabled).",
        features: {
            camera_attendance: ["Attendance camera", "Allow camera access in the attendance workflow."], gps_geofencing: ["GPS geofencing", "Enforce the school's location radius."], face_recognition: ["Face matching", "Allow matching against registered face descriptors."], liveness_check: ["Head-movement check", "Enable the basic liveness interaction."], face_ambiguity_guard: ["Reject ambiguous face matches", "Reject results when two identities are too similar to distinguish safely."], face_enrollment: ["Face enrollment", "Allow student face-sample enrollment."], face_sample_limit: ["Face-sample limit", "Enforce the per-student face-sample limit."],
            student_login: ["Student login", "Allow student account authentication."], teacher_login: ["Teacher login", "Allow teacher account authentication."], admin_login: ["Administrator login", "Allow administrator authentication."], student_account_creation: ["Student account creation", "Allow administrators to create student accounts."], teacher_account_creation: ["Teacher account creation", "Allow administrators to create teacher accounts."], account_deactivation: ["Account deactivation", "Allow school accounts to be deactivated."],
            attendance_recording: ["Attendance recording", "Allow new attendance records."], duplicate_attendance_block: ["Duplicate attendance block", "Prevent more than one attendance record per day."], attendance_history: ["Attendance history", "Allow access to attendance history."], attendance_export: ["Attendance export", "Allow attendance-history exports."], parent_notifications: ["Parent notifications", "Allow WhatsApp notifications to parents."], late_detection: ["Late-arrival detection", "Enable entry-time and late-tolerance rules."],
            admin_audit_log: ["Admin activity audit", "Record important administrator changes."], admin_account_export: ["Account export", "Allow school-account list exports."], admin_password_change: ["Admin password changes", "Allow administrator password management."], rate_limiting: ["Rate limiting", "Limit request frequency and repeated attempts."], session_expiry: ["Session expiry", "Require a valid, unexpired authentication session."], origin_validation: ["Origin validation", "Reject requests from unapproved origins."],
            maintenance_banner: ["Maintenance banner", "Show a maintenance notice when enabled."], public_status_panel: ["Public service-status panel", "Show service readiness information safe for public display."], reduced_motion_support: ["Reduced-motion support", "Respect the device's reduced-motion preference."], language_switcher: ["Language selector", "Allow interface-language changes."], responsive_layout: ["Responsive layout", "Enable desktop and mobile layout adaptation."], splash_animation: ["Splash animation", "Enable the Amanah ID opening animation."],
            gps_accuracy_guard: ["GPS accuracy check", "Enforce a location-accuracy limit before attendance."], gps_boundary_guard: ["Geofence boundary guard", "Reject attendance when GPS uncertainty overlaps the geofence boundary."], geofence_radius_edit: ["Edit geofence radius", "Allow changes to the school's geofence radius."], school_schedule_rules: ["School schedule rules", "Enable time zone, entry-time, and late-tolerance settings."], privacy_notice: ["Privacy notice", "Show information about personal and biometric data processing."], service_health_panel: ["Service-health panel", "Show backend and integration status."], strict_server_validation: ["Strict server validation", "Require payload validation on the server."]
        },
        saving: "Saving changes…", saved: "Saved to the server.", loading: "Loading system policies…", loadFailed: "Could not load settings. Check the connection and Admin access.", savingStatus: "Saving policy changes to the server…", savedStatus: "Changes saved and recorded in the audit log.", saveFailed: "The server rejected the change. Check the Admin session and connection.", sessionError: "The Admin session is invalid or access was denied.", networkError: "The connection was lost or the server did not respond.", databaseError: "The database/backend could not save the settings.", countLoaded: "{enabled} of {total} controls active · Stored in Supabase", countSaved: "{enabled} of {total} controls active · Changes saved and audited", errorStatus: "Could not save “{key}”: {reason}", savedToast: "System settings saved successfully."
    },
    ar: {
        groups: { attendance: "1. الحضور والقياسات الحيوية", accounts: "2. الحسابات والأدوار", data: "3. البيانات والحضور", security: "4. الأمان والتدقيق", experience: "5. تجربة الموقع", location: "6. الموقع والجدول والحوكمة" },
        lockedSuffix: " (إلزامي؛ لا يمكن تعطيله).",
        features: {
            camera_attendance: ["كاميرا الحضور", "السماح باستخدام الكاميرا ضمن عملية تسجيل الحضور."], gps_geofencing: ["تحديد الموقع الجغرافي GPS", "فرض نطاق الموقع الجغرافي للمدرسة."], face_recognition: ["مطابقة الوجه", "السماح بمطابقة واصفات الوجه المسجلة."], liveness_check: ["فحص حركة الرأس", "تفعيل فحص الحيوية الأساسي."], face_ambiguity_guard: ["رفض مطابقة الوجه الملتبسة", "رفض النتيجة عندما يتشابه ملفا هوية بدرجة تمنع التمييز الآمن."], face_enrollment: ["تسجيل الوجه", "السماح بتسجيل عينات وجوه الطلاب."], face_sample_limit: ["حد عينات الوجه", "فرض الحد الأقصى لعينات الوجه لكل طالب."],
            student_login: ["دخول الطالب", "السماح بمصادقة حساب الطالب."], teacher_login: ["دخول المعلم", "السماح بمصادقة حساب المعلم."], admin_login: ["دخول المسؤول", "السماح بمصادقة حساب المسؤول."], student_account_creation: ["إنشاء حساب الطالب", "السماح للمسؤولين بإنشاء حسابات الطلاب."], teacher_account_creation: ["إنشاء حساب المعلم", "السماح للمسؤولين بإنشاء حسابات المعلمين."], account_deactivation: ["تعطيل الحساب", "السماح بتعطيل حسابات المدرسة."],
            attendance_recording: ["تسجيل الحضور", "السماح بإنشاء سجلات حضور جديدة."], duplicate_attendance_block: ["منع تكرار الحضور", "منع تسجيل الحضور أكثر من مرة في اليوم."], attendance_history: ["سجل الحضور", "السماح بالوصول إلى سجل الحضور."], attendance_export: ["تصدير الحضور", "السماح بتصدير سجل الحضور."], parent_notifications: ["إشعارات أولياء الأمور", "السماح بإرسال إشعارات WhatsApp إلى أولياء الأمور."], late_detection: ["اكتشاف التأخر", "تفعيل قواعد وقت الدخول وسماح التأخر."],
            admin_audit_log: ["تدقيق نشاط المسؤول", "تسجيل التغييرات المهمة التي يجريها المسؤول."], admin_account_export: ["تصدير الحسابات", "السماح بتصدير قائمة حسابات المدرسة."], admin_password_change: ["تغيير كلمة مرور المسؤول", "السماح بإدارة كلمة مرور المسؤول."], rate_limiting: ["تحديد معدل الطلبات", "تقييد تكرار الطلبات والمحاولات المتتالية."], session_expiry: ["انتهاء الجلسة", "اشتراط جلسة مصادقة صالحة وغير منتهية."], origin_validation: ["التحقق من مصدر الطلب", "رفض الطلبات من مصادر غير معتمدة."],
            maintenance_banner: ["إشعار الصيانة", "عرض إشعار الصيانة عند التفعيل."], public_status_panel: ["لوحة حالة الخدمات العامة", "عرض معلومات جاهزية الخدمات المسموح بنشرها."], reduced_motion_support: ["دعم تقليل الحركة", "احترام إعداد تقليل الحركة في الجهاز."], language_switcher: ["اختيار اللغة", "السماح بتغيير لغة الواجهة."], responsive_layout: ["تصميم متجاوب", "تفعيل التكيف مع أجهزة الكمبيوتر والهواتف."], splash_animation: ["رسوم شاشة البداية", "تفعيل حركة افتتاح Amanah ID."],
            gps_accuracy_guard: ["فحص دقة GPS", "فرض حد لدقة الموقع قبل تسجيل الحضور."], gps_boundary_guard: ["حماية حدود النطاق الجغرافي", "رفض الحضور عندما يتداخل عدم يقين GPS مع حد النطاق."], geofence_radius_edit: ["تعديل نطاق الموقع", "السماح بتعديل نطاق المدرسة الجغرافي."], school_schedule_rules: ["قواعد جدول المدرسة", "تفعيل المنطقة الزمنية ووقت الدخول وسماح التأخر."], privacy_notice: ["إشعار الخصوصية", "عرض معلومات معالجة البيانات الشخصية والبيومترية."], service_health_panel: ["لوحة صحة الخدمات", "عرض حالة الخادم والتكاملات."], strict_server_validation: ["التحقق الصارم من الخادم", "اشتراط التحقق من البيانات على الخادم."]
        },
        saving: "جارٍ حفظ التغييرات…", saved: "تم الحفظ على الخادم.", loading: "جارٍ تحميل سياسات النظام…", loadFailed: "تعذر تحميل الإعدادات. تحقق من الاتصال وصلاحيات المسؤول.", savingStatus: "جارٍ حفظ تغييرات السياسات على الخادم…", savedStatus: "تم حفظ التغييرات وتسجيلها في سجل التدقيق.", saveFailed: "رفض الخادم التغيير. تحقق من جلسة المسؤول والاتصال.", sessionError: "جلسة المسؤول غير صالحة أو تم رفض الوصول.", networkError: "انقطع الاتصال أو لم يستجب الخادم.", databaseError: "تعذر على قاعدة البيانات أو الخادم حفظ الإعدادات.", countLoaded: "تم تفعيل {enabled} من {total} عنصر تحكم · محفوظ في Supabase", countSaved: "تم تفعيل {enabled} من {total} عنصر تحكم · تم الحفظ والتدقيق", errorStatus: "تعذر حفظ “{key}”: {reason}", savedToast: "تم حفظ إعدادات النظام بنجاح."
    }
};

const ADMIN_FEATURE_GROUPS = [
 { key:"attendance", title:"1. Presensi & biometrik", items:[["camera_attendance","Kamera presensi","Mengizinkan akses kamera pada alur presensi."],["gps_geofencing","GPS geofencing","Mengaktifkan pembatasan radius sekolah."],["face_recognition","Pencocokan wajah","Mengizinkan proses pencocokan descriptor wajah."],["liveness_check","Pemeriksaan gerakan kepala","Mengaktifkan pemeriksaan keaktifan dasar."],["face_ambiguity_guard","Penolakan wajah ambigu","Menolak pencocokan jika dua identitas memiliki skor yang terlalu berdekatan."],["face_enrollment","Pendaftaran sampel wajah","Mengizinkan pendaftaran sampel siswa."],["face_sample_limit","Batas sampel wajah","Menegakkan batas sampel per siswa."]]},
 { key:"accounts", title:"2. Akun & peran", items:[["student_login","Login siswa","Mengizinkan autentikasi role siswa."],["teacher_login","Login guru","Mengizinkan autentikasi role guru."],["admin_login","Login administrator","Mengizinkan autentikasi role admin."],["student_account_creation","Pembuatan akun siswa","Mengizinkan admin membuat akun siswa."],["teacher_account_creation","Pembuatan akun guru","Mengizinkan admin membuat akun guru."],["account_deactivation","Penonaktifan akun","Mengizinkan status akun nonaktif diberlakukan."]]},
 { key:"data", title:"3. Data & presensi", items:[["attendance_recording","Pencatatan presensi","Mengizinkan pencatatan kehadiran baru."],["duplicate_attendance_block","Blokir presensi ganda","Mencegah catatan ganda pada hari yang sama."],["attendance_history","Riwayat presensi","Mengizinkan akses ke riwayat presensi."],["attendance_export","Ekspor data presensi","Mengizinkan ekspor CSV yang tersedia."],["parent_notifications","Notifikasi orang tua","Mengizinkan pemicu notifikasi WhatsApp."],["late_detection","Deteksi keterlambatan","Mengaktifkan aturan waktu masuk dan toleransi terlambat."]]},
 { key:"security", title:"4. Keamanan & audit", items:[["admin_audit_log","Audit aktivitas admin","Mencatat perubahan penting oleh administrator."],["admin_account_export","Ekspor akun","Mengizinkan ekspor daftar akun admin."],["admin_password_change","Perubahan sandi admin","Mengizinkan pengelolaan sandi admin."],["rate_limiting","Pembatasan percobaan","Mengaktifkan rate limit pada endpoint terkait."],["session_expiry","Kedaluwarsa sesi","Mewajibkan sesi valid dan belum kedaluwarsa."],["origin_validation","Validasi origin","Menolak request dari origin yang tidak diizinkan."]]},
 { key:"experience", title:"5. Pengalaman website", items:[["maintenance_banner","Banner pemeliharaan","Menampilkan peringatan pemeliharaan saat diimplementasikan."],["public_status_panel","Panel status layanan","Menampilkan status layanan yang aman untuk publik."],["reduced_motion_support","Dukungan reduced motion","Menghormati preferensi aksesibilitas perangkat."],["language_switcher","Pemilih bahasa","Mengizinkan pergantian bahasa antarmuka."],["responsive_layout","Tata letak responsif","Mengizinkan layout responsif desktop dan mobile."],["splash_animation","Animasi pembuka","Mengaktifkan animasi splash Amanah ID."]]},
 { key:"location", title:"6. Lokasi, jadwal & tata kelola", items:[["gps_accuracy_guard","Pemeriksaan akurasi GPS","Memeriksa akurasi lokasi sebelum presensi."],["gps_boundary_guard","Pengaman batas geofence","Menolak presensi jika rentang ketidakpastian GPS memotong batas radius sekolah."],["geofence_radius_edit","Pengubahan radius geofence","Mengizinkan admin mengubah radius sekolah."],["school_schedule_rules","Aturan jadwal sekolah","Mengaktifkan jam masuk dan toleransi terlambat."],["privacy_notice","Pemberitahuan privasi","Menampilkan informasi pemrosesan data biometrik."],["service_health_panel","Panel kesehatan layanan","Menampilkan status backend dan integrasi."],["strict_server_validation","Validasi server ketat","Mewajibkan validasi payload pada endpoint terkait."]]}
];
function renderAdminFeatures() {
 const root = $("admin-governance-controls");
 if (!root) return;
 const features = state.adminFeatures || {};
 const feedback = state.adminFeatureStatus || {};
 const localized = ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id;
 root.innerHTML = ADMIN_FEATURE_GROUPS.map(group => `<section class="admin-governance-category"><h4>${safeText(localized.groups[group.key] || group.title)}</h4>${group.items.map(([key,label,description]) => {
   const [featureLabel, featureDescription] = localized.features[key] || [label, description];
   const locked = LOCKED_ADMIN_FEATURES.has(key);
   const checked = locked || features[key] !== false;
   const detail = feedback[key]?.message || (locked ? featureDescription + localized.lockedSuffix : featureDescription);
   const phase = feedback[key]?.type || "";
   const icon = phase === "pending" ? '<span class="feature-spinner" aria-hidden="true"></span>' : phase === "success" ? '<span class="feature-result feature-result-ok" aria-hidden="true">✓</span>' : phase === "error" ? '<span class="feature-result feature-result-error" aria-hidden="true">!</span>' : "";
   return `<div class="admin-governance-control ${phase === "error" ? "has-error" : ""}"><label for="feature-${key}">${safeText(featureLabel)}<small class="feature-description ${phase === "error" ? "feature-error-text" : ""}" id="feature-help-${key}" aria-live="polite">${safeText(detail)}</small></label><span class="admin-switch-wrap">${icon}<label class="admin-switch" for="feature-${key}"><input id="feature-${key}" type="checkbox" data-feature-key="${key}" ${checked ? "checked" : ""} ${locked || phase === "pending" ? "disabled" : ""} aria-label="${safeText(featureLabel)}" aria-describedby="feature-help-${key}"><span class="admin-switch-track"></span></label></span></div>`;
 }).join("")}</section>`).join("");
}
function adminFeatureCountStatus(saved = false) {
 const copy = ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id;
 const enabled = Object.values(state.adminFeatures || {}).filter(Boolean).length;
 const total = Object.keys(state.adminFeatures || {}).length;
 return (saved ? copy.countSaved : copy.countLoaded)
  .replaceAll("{enabled}", String(enabled))
  .replaceAll("{total}", String(total));
}
async function loadAdminFeatures() {
 const status = $("admin-governance-status");
 if (!status) return;
 status.textContent = (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).loading;
 try {
   const result = await cloudRequest("/api/admin/settings?action=features");
   state.adminFeatures = result.features || {};
   renderAdminFeatures();
   applyAdminFeatureFlags(state.adminFeatures);
   status.textContent = adminFeatureCountStatus(false);
 } catch (error) {
   status.textContent = (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).loadFailed;
   console.error("Admin feature controls failed to load:", error);
 }
}
async function saveAdminFeatureToggle(input) {
 const key = input?.dataset?.featureKey;
 if (!key || !state.adminFeatures || state.adminFeatureStatus?.[key]?.type === "pending") return;
 const previous = state.adminFeatures[key] !== false;
 const requested = input.checked;
 const status = $("admin-governance-status");
 state.adminFeatureStatus = state.adminFeatureStatus || {};
 state.adminFeatureStatus[key] = { type: "pending", message: (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).saving };
 state.adminFeatures[key] = requested;
 renderAdminFeatures();
 if (status) status.textContent = (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).savingStatus;
 state.adminFeatureSaveQueue = state.adminFeatureSaveQueue || Promise.resolve();
 const operation = state.adminFeatureSaveQueue.then(async () => {
   const payload = { features: { ...state.adminFeatures } };
   const result = await cloudRequest("/api/admin/settings?action=features", { method: "PUT", body: payload });
   const saved = result.features || payload.features;
   // Keep newer edits that are waiting in the queue while adopting the server response.
   for (const [pendingKey, item] of Object.entries(state.adminFeatureStatus || {})) {
     if (item?.type === "pending") saved[pendingKey] = state.adminFeatures[pendingKey];
   }
   state.adminFeatures = saved;
   state.runtimeFeatures = { ...(state.runtimeFeatures || {}), ...saved };
   applyRuntimeFeatureFlags(state.runtimeFeatures);
   state.adminFeatureStatus[key] = { type: "success", message: (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).saved };
   renderAdminFeatures();
   applyAdminFeatureFlags(state.adminFeatures);
   if (status) status.textContent = adminFeatureCountStatus(true);
   toast((ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).savedToast, "success");
   window.setTimeout(() => {
     if (state.adminFeatureStatus?.[key]?.type === "success") {
       delete state.adminFeatureStatus[key];
       renderAdminFeatures();
     }
   }, 3000);
 }).catch(error => {
   state.adminFeatures[key] = previous;
   applyAdminFeatureFlags(state.adminFeatures);
   const raw = String(error?.message || "");
   const reason = /401|403|unauthori|forbidden|session|sesi/i.test(raw)
     ? (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).sessionError
     : /timeout|network|fetch|offline|failed to fetch/i.test(raw)
       ? "Koneksi terputus atau server tidak merespons."
       : /supabase|database|500|503/i.test(raw)
         ? (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).databaseError
         : (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).saveFailed;
   state.adminFeatureStatus[key] = { type: "error", message: reason };
   renderAdminFeatures();
   if (status) status.textContent = (ADMIN_FEATURE_COPY[state.lang] || ADMIN_FEATURE_COPY.id).errorStatus
     .replaceAll("{key}", key).replaceAll("{reason}", reason);
   toast(reason, "error");
   window.setTimeout(() => {
     if (state.adminFeatureStatus?.[key]?.type === "error") {
       delete state.adminFeatureStatus[key];
       renderAdminFeatures();
     }
   }, 3000);
 });
 state.adminFeatureSaveQueue = operation.catch(() => {});
 await operation;
}

let adminTestStream = null;
let adminTestTimer = null;
let adminTestBusy = false;
let adminTestFrames = 0;
let adminTestFpsStarted = 0;

function stopAdminTestCamera() {
    if (adminTestTimer) window.clearInterval(adminTestTimer);
    adminTestTimer = null;
    if (adminTestStream) adminTestStream.getTracks().forEach(track => track.stop());
    adminTestStream = null;
    adminTestBusy = false;
    const video = $("admin-test-video");
    if (video) video.srcObject = null;
    $("admin-test-camera-placeholder")?.classList.remove("hidden");
    if ($("admin-test-camera-start")) $("admin-test-camera-start").disabled = false;
    if ($("admin-test-camera-stop")) $("admin-test-camera-stop").disabled = true;
}

async function startAdminTestCamera() {
    if (adminTestStream) return;
    const status = $("admin-test-camera-status");
    const modelState = $("admin-test-model-state");
    $("admin-test-camera-start").disabled = true;
    status.textContent = tr("testModelLoading");
    modelState.textContent = tr("testModelLoading");
    try {
        if (!state.faceDetectorReady && !(await loadFaceDetector())) throw new Error("model");
        modelState.textContent = tr("testModelReady");
        const stream = await getCameraStream();
        if (!$("admin-view-tests")?.classList.contains("active")) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }
        adminTestStream = stream;
        const video = $("admin-test-video");
        video.srcObject = stream;
        await video.play();
        $("admin-test-camera-placeholder")?.classList.add("hidden");
        $("admin-test-camera-start").disabled = true;
        $("admin-test-camera-stop").disabled = false;
        status.textContent = tr("testCameraNoFace");
        adminTestFrames = 0;
        adminTestFpsStarted = performance.now();
        adminTestTimer = window.setInterval(async () => {
            if (adminTestBusy || !adminTestStream || video.readyState < 2) return;
            adminTestBusy = true;
            try {
                const detections = await detectUsableFaces(video);
                if (!adminTestStream) return;
                drawDetections(video, $("admin-test-overlay"), detections);
                $("admin-test-face-count").textContent = String(detections.length);
                status.textContent = detections.length === 0 ? tr("testCameraNoFace")
                    : detections.length === 1 ? tr("testCameraOneFace") : tr("testCameraMultipleFaces");
                adminTestFrames += 1;
                const elapsed = (performance.now() - adminTestFpsStarted) / 1000;
                if (elapsed >= 2) {
                    $("admin-test-camera-fps").textContent = String(Math.round(adminTestFrames / elapsed));
                    adminTestFrames = 0;
                    adminTestFpsStarted = performance.now();
                }
            } catch (error) {
                status.textContent = cameraErrorText(error);
            } finally {
                adminTestBusy = false;
            }
        }, 500);
    } catch (error) {
        stopAdminTestCamera();
        $("admin-test-model-state").textContent = tr("testModelFailed");
        status.textContent = error?.message === "model" ? tr("testModelFailed") : cameraErrorText(error);
    }
}

function normalizeAdminTestPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (/^08\d{8,13}$/.test(digits)) return digits.replace(/^08/, "628");
    return /^628\d{8,13}$/.test(digits) ? digits : "";
}

function updateAdminWhatsAppTestControls() {
    const target = normalizeAdminTestPhone($("admin-test-whatsapp-number")?.value);
    const message = $("admin-test-whatsapp-template")?.value.trim() || "";
    const consent = Boolean($("admin-test-whatsapp-consent")?.checked);
    const printable = message.length >= 10 && message.length <= 300 &&
        !/[\u0000-\u001F\u007F]/.test(message);
    const button = $("admin-test-whatsapp-send");
    if (button) button.disabled = !(target && printable && consent);
}

async function loadAdminTestTools() {
    const templateInput = $("admin-test-whatsapp-template");
    if (templateInput && !templateInput.dataset.userEdited) templateInput.value = tr("testWhatsappDefaultTemplate");
    updateAdminWhatsAppPreview();
    updateAdminWhatsAppTestControls();
    try {
        const result = await cloudRequest("/api/admin/test-tools");
        state.adminFonnteConfigured = result.fonnte_configured === true;
        $("admin-test-fonnte-state").textContent = state.adminFonnteConfigured
            ? "Token Fonnte terdeteksi"
            : "Token Fonnte belum berisi nilai pada Production";
    } catch (error) {
        state.adminFonnteConfigured = false;
        $("admin-test-fonnte-state").textContent = "Status token belum dapat diperiksa";
        console.error("Fonnte configuration status could not load:", error);
    }
    // Configuration failures are reported by the send API only after the Admin
    // presses the enabled button. They must not block a real test attempt.
    updateAdminWhatsAppTestControls();
}

function updateAdminWhatsAppPreview() {
    const template = $("admin-test-whatsapp-template");
    const preview = $("admin-test-whatsapp-preview");
    if (template && preview) preview.textContent = template.value.trim();
}

async function sendAdminWhatsAppTest() {
    const target = normalizeAdminTestPhone($("admin-test-whatsapp-number").value);
    const message = $("admin-test-whatsapp-template").value.trim();
    const status = $("admin-test-whatsapp-status");
    if (!/^628\d{8,13}$/.test(target)) {
        status.textContent = tr("testPhoneInvalid");
        return;
    }
    if (!$("admin-test-whatsapp-consent").checked) {
        status.textContent = tr("testWhatsappNoConsent");
        return;
    }
    const button = $("admin-test-whatsapp-send");
    button.disabled = true;
    status.textContent = tr("testWhatsappSending");
    try {
        const result = await cloudRequest("/api/admin/test-tools", {
            method: "POST",
            body: { target, message, confirm: true }
        });
        status.textContent = result.accepted ? tr("testWhatsappSent") : tr("testWhatsappFailed");
        toast(status.textContent, result.accepted ? "success" : "error");
    } catch (error) {
        status.textContent = error.message || tr("testWhatsappFailed");
        toast(status.textContent, "error");
    } finally {
        button.disabled = false;
        $("admin-test-whatsapp-consent").checked = false;
        updateAdminWhatsAppTestControls();
    }
}

async function testAdminGps() {
    const status = $("admin-test-gps-status");
    status.textContent = tr("testGpsChecking");
    try {
        const settingsAvailable = await loadSchoolSettings({ preserveOnError: true });
        if (!settingsAvailable || !state.schoolSettingsLoaded) throw new Error("School GPS settings could not be loaded.");
        if (!navigator.geolocation) throw new Error("Geolocation API tidak tersedia.");
        const position = await getBestGpsPosition();
        const { latitude, longitude, accuracy } = position.coords || {};
        if (![latitude, longitude, accuracy].every(Number.isFinite) ||
            Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy <= 0) {
            throw new Error("invalid-gps-fix");
        }
        const distance = calculateDistance(latitude, longitude, SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng);
        if (!Number.isFinite(distance)) throw new Error("invalid-gps-fix");
        $("admin-test-gps-lat").textContent = latitude.toFixed(6);
        $("admin-test-gps-lng").textContent = longitude.toFixed(6);
        $("admin-test-gps-accuracy").textContent = Math.round(accuracy) + " m";
        $("admin-test-gps-distance").textContent = Math.round(distance) + " m";
        const clearlyInside = distance + accuracy <= SCHOOL_LOCATION.radius;
        const clearlyOutside = Math.max(0, distance - accuracy) > SCHOOL_LOCATION.radius;
        if (!isGpsAccuracyAcceptable(accuracy)) {
            status.textContent = tr("adminMapLowAccuracy", { accuracy: Math.round(accuracy) });
        } else if (clearlyInside) {
            status.textContent = tr("testGpsInside");
        } else if (clearlyOutside) {
            status.textContent = tr("testGpsOutside");
        } else {
            status.textContent = tr("gpsBoundaryUncertain");
        }
    } catch (error) {
        status.textContent = error?.message === "invalid-gps-fix" ? tr("adminMapBadFix")
            : error?.code === 1 ? tr("testGpsPermission")
            : error?.code === 3 ? tr("testGpsTimeout")
            : error.message || tr("testGpsFailed");
    }
}

async function runAdminServiceChecks() {
    const root = $("admin-test-services-results");
    root.textContent = tr("testServiceChecking");
    const results = [];
    try {
        const health = await cloudRequest("/api/ready");
        results.push({
            name: "Vercel API + Supabase",
            state: health?.ok === true && health?.checks?.database === "ok" ? "ready" : "error"
        });
    } catch {
        results.push({ name: "Vercel API + Supabase", state: "error" });
    }
    try {
        const tools = await cloudRequest("/api/admin/test-tools");
        results.push({
            name: "Fonnte WhatsApp token",
            state: tools?.fonnte_configured === true ? "ready" : "not_configured"
        });
    } catch {
        results.push({ name: "Fonnte WhatsApp token", state: "error" });
    }
    try {
        const flags = await cloudRequest("/api?action=features");
        results.push({
            name: "Konfigurasi feature flags",
            state: flags?.features && typeof flags.features === "object" ? "ready" : "error"
        });
    } catch {
        results.push({ name: "Konfigurasi feature flags", state: "error" });
    }
    root.innerHTML = results.map(item => {
        const css = item.state === "ready" ? "is-ok"
            : item.state === "not_configured" ? "is-not-configured" : "is-error";
        const message = item.state === "ready" ? tr("testOtherPass")
            : item.state === "not_configured" ? tr("testOtherNotConfigured") : tr("testOtherFail");
        return '<div class="admin-test-service-row"><span>' + safeText(item.name) +
            '</span><strong class="' + css + '">' + safeText(message) + '</strong></div>';
    }).join("");
}

async function loadAdminUsers() {
    try {
        const response = await cloudRequest("/api/admin/users");
        const users = Array.isArray(response?.users)
            ? response.users.filter(user => user && typeof user === "object") : [];
        state.adminTeachers = users.filter(user => user.role === "guru" && user.is_active);

        $("admin-users-tbody").innerHTML = users.map(user => `<tr>
            <td>${safeText(user.name ?? user.email ?? "—")}</td><td>${safeText(user.email ?? "")}</td>
            <td>${safeText(user.parent_whatsapp ?? "—")}</td>
            <td>${safeText(user.role === "guru" ? tr("roleTeacher") : user.role === "siswa" ? tr("roleStudent") : tr("adminRole"))}</td>
            <td>${safeText(user.role === "siswa" ? user.homeroom_teacher?.name || "Belum ditetapkan" : user.homeroom_class || "—")}</td>
            <td>${safeText(user.is_active ? tr("activeStatus") : tr("inactiveStatus"))}</td>
            <td class="admin-account-actions">
            <button class="button subtle" type="button" data-admin-edit="${safeText(user.id ?? "")}" data-table="${safeText(user.table ?? "")}" data-parent-whatsapp="${safeText(user.parent_whatsapp ?? "")}" data-current-homeroom="${safeText(user.homeroom_teacher_id ?? "")}" data-class-name="${safeText(user.class_name ?? "")}">${safeText(tr("editAccount"))}</button>
            <button class="button ${user.is_active ? "subtle" : "secondary"}" type="button" data-admin-set-active="${safeText(user.id ?? "")}" data-table="${safeText(user.table ?? "")}" data-active="${user.is_active ? "true" : "false"}">${user.is_active ? "Nonaktifkan" : "Aktifkan kembali"}</button>
            <button class="button danger" type="button" data-admin-permanent-delete="${safeText(user.id ?? "")}" data-table="${safeText(user.table ?? "")}" data-email="${safeText(user.email ?? "")}">Hapus permanen</button></td>
        </tr>`).join("");
        $("admin-users-empty").classList.toggle("hidden", users.length > 0);
    } catch (error) {
        console.error("Admin users could not load:", error);
        toastAdminError(error);
    }
}

async function loadAdminSettings() {
    try {
        const settings = await cloudRequest("/api/admin/settings");
        $("admin-setting-lat").value = settings?.lat ?? "";
        $("admin-setting-lng").value = settings?.lng ?? "";
        $("admin-setting-radius").value = settings?.radius ?? "";
        $("admin-setting-timezone").value = settings?.timezone ?? "";
        $("admin-setting-entry-time").value = settings?.entry_time ?? "";
        $("admin-setting-tolerance").value = settings?.late_tolerance_min ?? "";
        syncAdminSettingsMap({ center: true });
    } catch (error) {
        console.error("Admin settings could not load:", error);
        toastAdminError(error);
    }
}

function formatRoleActivityTime(value, fallback) {
    if (!value) return fallback;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Tidak tersedia";
    return date.toLocaleString(state.lang === "ar" ? "ar" : state.lang === "en" ? "en-GB" : "id-ID");
}

function roleActivityActionLabel(action) {
    const labels = {
        "attendance.create": "Mencatat presensi",
        "student.face_update_v2": "Memperbarui sampel wajah",
        "student.create": "Mendaftarkan siswa",
        "siswa.create": "Membuat akun siswa",
        "guru.create": "Membuat akun guru",
        "settings.update": "Memperbarui lokasi/jadwal sekolah",
        "system.features.update": "Mengubah sakelar sistem",
        "absence.create": "Mengirim pengajuan ketidakhadiran",
        "absence.review": "Meninjau pengajuan ketidakhadiran",
        "student.update": "Memperbarui data siswa",
        "teacher.update": "Memperbarui data guru"
    };
    return labels[action] || String(action || "Aktivitas tercatat").replaceAll(".", " · ");
}

function renderRoleActivityTable(targetId, users) {
    const table = $(targetId);
    if (!table) return;
    if (!Array.isArray(users) || users.length === 0) {
        table.innerHTML = '<tr><td colspan="3">Belum ada akun pada peran ini.</td></tr>';
        return;
    }
    table.innerHTML = users.map(user => {
        const account = '<strong>' + safeText(user.name || "—") + '</strong><br><small>' +
            safeText(user.email || "Email tidak tersedia") + '</small><br><small>' +
            safeText(user.is_active ? "Aktif" : "Nonaktif") + '</small>';
        const login = safeText(formatRoleActivityTime(user.last_login_at, "Belum pernah login"));
        const activity = user.last_activity_action
            ? '<strong>' + safeText(roleActivityActionLabel(user.last_activity_action)) + '</strong><br><small>' +
                safeText(formatRoleActivityTime(user.last_activity_at, "Waktu tidak tersedia")) + '</small>'
            : "Belum ada aktivitas tercatat";
        return '<tr><td>' + account + '</td><td>' + login + '</td><td>' + activity + '</td></tr>';
    }).join("");
}

async function loadAdminRoleActivity() {
    const status = $("admin-activity-status");
    if (status) status.textContent = "Memuat riwayat login dan aktivitas per peran...";
    try {
        const response = await cloudRequest("/api/admin/audit?action=activity");
        const groups = response?.activity || {};
        renderRoleActivityTable("admin-activity-admin-tbody", groups.admin);
        renderRoleActivityTable("admin-activity-teacher-tbody", groups.guru);
        renderRoleActivityTable("admin-activity-student-tbody", groups.siswa);
        if (status) {
            const limit = Number(response?.audit_history_limit_per_role) || 1000;
            status.textContent = "Login diambil dari catatan login akun. Aktivitas menunjukkan tindakan penting yang tercatat pada API, dengan pemeriksaan hingga " +
                limit.toLocaleString() + " catatan audit terbaru per peran.";
        }
    } catch (error) {
        console.error("Admin role activity could not load:", error);
        for (const id of ["admin-activity-admin-tbody", "admin-activity-teacher-tbody", "admin-activity-student-tbody"]) {
            const table = $(id);
            if (table) table.innerHTML = '<tr><td colspan="3">Riwayat aktivitas gagal dimuat.</td></tr>';
        }
        if (status) status.textContent = "Riwayat aktivitas tidak dapat dimuat. Periksa koneksi dan akses Admin.";
    }
}

async function loadAdminAudit() {
    void loadAdminRoleActivity();
    try {
        const filters = new URLSearchParams();
        if ($("admin-audit-actor").value) filters.set("actor", $("admin-audit-actor").value);
        if ($("admin-audit-action").value) filters.set("action", $("admin-audit-action").value);
        if ($("admin-audit-from").value) filters.set("from", $("admin-audit-from").value);
        if ($("admin-audit-to").value) filters.set("to", $("admin-audit-to").value);
        const response = await cloudRequest(`/api/admin/audit?${filters.toString()}`);
        const entries = Array.isArray(response?.entries)
            ? response.entries.filter(entry => entry && typeof entry === "object") : [];
        $("admin-audit-tbody").innerHTML = entries.map(entry => `<tr>
            <td>${safeText(new Date(entry.created_at ?? 0).toLocaleString())}</td>
            <td>${safeText(entry.actor_email ?? "")}</td><td>${safeText(entry.actor_role === "guru" ? tr("roleTeacher") : entry.actor_role === "siswa" ? tr("roleStudent") : entry.actor_role === "admin" ? tr("administratorRole") : entry.actor_role ?? "")}</td>
            <td>${safeText(entry.action ?? "")}</td><td>${safeText(entry.target_table ?? "")}</td>
        </tr>`).join("");
    } catch (error) {
        console.error("Admin audit log could not load:", error);
        toastAdminError(error);
    }
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
    method = "GET", body, role = state.user?.role, nisn = state.user?.nisn,
    timeoutMs = 15_000, idempotencyKey, faceProofToken
} = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const adminRequest = path.startsWith("/api/admin/");
    if (adminRequest || role === "admin") {
        const token = sessionStorage.getItem("amanahid.adminToken");
        if (adminRequest && !path.endsWith("/login") && !token) {
            const error = new Error("Admin session token is missing");
            error.name = "CloudApiError";
            error.status = 401;
            error.originalMessage = error.message;
            throw error;
        }
        if (token && !path.endsWith("/login")) headers["X-Admin-Token"] = token;
    } else {
        const token = sessionStorage.getItem("amanahid.sessionToken");
        if (token) headers["X-Session-Token"] = token;
    }
    if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
    if (faceProofToken) headers["X-Face-Proof"] = faceProofToken;

    let lastError;
    let attempt = 0;
    while (true) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(path, {
                method,
                cache: "no-store",
                headers,
                signal: controller.signal,
                ...(body === undefined ? {} : { body: JSON.stringify(body) })
            });
            const responseText = response.status === 204 || method === "HEAD"
                ? ""
                : await response.text();

            if (!response.ok) {
                let payload;
                try {
                    payload = responseText ? JSON.parse(responseText) : null;
                } catch {
                    payload = null;
                }
                let message = response.status === 405
                    ? `HTTP 405 (${payload?.error ?? "metode tidak diizinkan"}). Pastikan Root Directory Vercel menunjuk ke folder proyek yang berisi api/, package.json, dan vercel.json, bukan folder public/. Periksa juga endpoint dan metode request.`
                    : (payload?.error || `Request failed (${response.status})`);
                const error = new Error(message);
                error.name = "CloudApiError";
                error.status = response.status;
                error.originalMessage = message;
                if (response.status === 400 && /gps/i.test(String(payload?.error || ""))) {
                    error.type = "gps_accuracy";
                    error.gpsAccuracy = payload;
                    message = "Akurasi GPS terlalu rendah.";
                } else if (response.status === 401) {
                    if (state.user) {
                        message = "Sesi habis, silakan login ulang";
                        showAuth();
                        state.user = null;
                        toast("Sesi habis, silakan login ulang", "info");
                    } else if (path === "/api/auth/login") {
                        message = tr("loginFailed");
                    }

                } else if (response.status === 403) {
                    message = "Akses ditolak. Periksa APP_ORIGIN di Vercel atau hubungi Admin.";
                } else if (response.status === 404) {
                    message = "Data tidak ditemukan.";
                } else if (response.status === 409) {
                    message = "Sudah ada data serupa hari ini.";
                } else if (response.status === 429) {
                    const retryAfter = Number(response.headers.get("Retry-After"));
                    error.retryAfter = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
                    message = `Tunggu ${error.retryAfter} detik.`;
                } else if ([500, 502, 503, 504].includes(response.status)) {
                    message = "Server sibuk, mencoba menghubungkan ulang...";
                }
                error.message = message;
                error.retryAfter = error.retryAfter || response.headers.get("Retry-After");
                throw error;
            }

            if (!responseText) return {};
            try {
                return JSON.parse(responseText);
            } catch (cause) {
                const error = new Error("Invalid server response");
                error.name = "CloudApiError";
                error.cause = cause;
                throw error;
            }
        } catch (cause) {
            if (cause?.name === "CloudApiError") {
                lastError = cause;
            } else {
                lastError = new Error("Periksa koneksi internet Anda.");
                lastError.name = "CloudApiError";
                lastError.status = undefined;
                lastError.type = "network";
                lastError.originalMessage = cause?.message ?? "Periksa koneksi internet Anda.";
                lastError.cause = cause;
            }
            const isServerError = [500, 502, 503, 504].includes(lastError.status);
            const retrySafe = method === "GET" || method === "HEAD" || Boolean(idempotencyKey);
            const retryLimit = !retrySafe ? 0 : isServerError ? 3 : lastError.type === "network" ? 2 : 0;
            if (attempt >= retryLimit) {
                const status = Number.isInteger(lastError.status)
                    ? `HTTP ${lastError.status}`
                    : "Network error";
                lastError.message = `${status}: ${lastError.originalMessage ?? lastError.message}`;
                throw lastError;
            }
            if (isServerError) lastError.message = "Server sibuk, mencoba menghubungkan ulang...";
        } finally {
            window.clearTimeout(timeoutId);
        }

        const delay = Math.min(5000, 1000 * (2 ** attempt)) + Math.random() * 500;
        attempt++;
        await new Promise(resolve => window.setTimeout(resolve, delay));
    }
}

function toastAdminError(error) {
    const status = Number.isInteger(error?.status) ? `HTTP ${error.status}` : "Network error";
    const message = error?.originalMessage ?? error?.message ?? "Permintaan Admin gagal.";
    toast(`${status}: ${message}`, "error");
}

function setAuthFormBusy(form, busy) {
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = Boolean(busy);
    button.classList.toggle("is-loading", Boolean(busy));
    if (busy) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
}

async function passwordDigest(password) {
    if (!window.crypto?.subtle) {
        const error = new Error("Login memerlukan koneksi HTTPS agar kata sandi dapat diproses dengan aman.");
        error.name = "AuthenticationSetupError";
        throw error;
    }
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

function createIdempotencyKey() {
    if (typeof window.crypto?.randomUUID === "function") return window.crypto.randomUUID();
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function checkNetworkHeartbeat() {
    const requestUser = state.user;
    if (!requestUser || state.networkHeartbeatBusy) return;
    state.networkHeartbeatBusy = true;
    try {
        await cloudRequest("/api/settings", { method: "HEAD", timeoutMs: 5_000 });
        if (state.user !== requestUser) return;
        state.networkHeartbeatFailures = 0;
        $("network-banner")?.classList.add("hidden");
        $("network-status-teacher")?.classList.add("hidden");
        $("network-status-student")?.classList.add("hidden");
    } catch (error) {
        if (state.user !== requestUser) return;
        if (error?.status === 401 || error?.status === 403) {
            showAuth();
            toast("Sesi berakhir karena akun tidak lagi aktif. Hubungi Admin sekolah.", "warning");
            return;
        }
        state.networkHeartbeatFailures++;
        console.warn("Network heartbeat failed; will retry on the next interval:", error);
        const badge = requestUser.role === "siswa"
            ? $("network-status-student")
            : $("network-status-teacher");
        badge?.classList.remove("hidden");
        if (state.networkHeartbeatFailures >= 3) {
            $("network-banner")?.classList.remove("hidden");
        }
    } finally {
        if (state.user === requestUser) state.networkHeartbeatBusy = false;
    }
}

function startNetworkHeartbeat() {
    if (state.networkHeartbeatTimer !== null) {
        window.clearInterval(state.networkHeartbeatTimer);
    }
    state.networkHeartbeatBusy = false;
    state.networkHeartbeatFailures = 0;
    $("network-banner")?.classList.add("hidden");
    void checkNetworkHeartbeat();
    state.networkHeartbeatTimer = window.setInterval(() => {
        if (state.user) void checkNetworkHeartbeat();
    }, 15_000);
}

function stopNetworkHeartbeat() {
    if (state.networkHeartbeatTimer !== null) {
        window.clearInterval(state.networkHeartbeatTimer);
    }
    state.networkHeartbeatTimer = null;
    state.networkHeartbeatBusy = false;
    stopAbsenceSync();
    $("network-status-teacher")?.classList.add("hidden");
    $("network-status-student")?.classList.add("hidden");
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
    return {
        id: student.id,
        nisn: student.nisn,
        name: student.name,
        className: student.class_name,
        homeroomTeacherId: student.homeroom_teacher_id || "",
        homeroomTeacherName: student.homeroom_teacher?.name || "",
        parentWhatsApp: student.parent_whatsapp || "",
        registeredDate: student.created_at
            ? new Date(student.created_at).toLocaleString(state.lang === "ar" ? "ar" : state.lang === "en" ? "en-GB" : "id-ID")
            : ""
    };
}

async function loadStudentAbsenceRequests({ silent = false } = {}) {
    startAbsenceSync();
    if (state.user?.role !== "siswa") return;
    const list = $("student-absence-requests-list");
    if (!list) return;
    try {
        const result = await cloudRequest("/api/absence", { role: "siswa" });
        const requests = Array.isArray(result.requests) ? result.requests : [];
        const statusLabels = { pending: "Menunggu peninjauan wali kelas", approved: "Disetujui wali kelas", rejected: "Ditolak wali kelas", revoked: "Persetujuan dicabut oleh wali kelas" };
        list.innerHTML = requests.map(item => {
            const typeLabel = item.absence_type === "dispensation" ? "Dispensasi" : tr("absenceType_" + item.absence_type);
            const evidence = item.absence_type === "sick" ? '<span class="absence-request-meta">' + (item.medical_evidence_uploaded ? "Surat dokter terlampir" : "Surat dokter belum terlampir") + '</span>' : "";
            const status = statusLabels[item.status] || tr("absenceStatus_" + item.status);
            const stateClass = item.status === "revoked" ? "is-revoked" : item.status === "rejected" ? "is-rejected" : item.status === "approved" ? "is-approved" : "is-pending";
            return '<article class="absence-request-card ' + stateClass + '">' +
                '<div class="absence-request-card-top"><strong>' + safeText(typeLabel) + '</strong><span class="absence-request-status">' + safeText(status) + '</span></div>' +
                '<p>' + safeText(formatDate(item.absence_date)) + ' · ' + safeText(item.note || "—") + '</p>' + evidence +
                (item.reviewed_at ? '<small class="absence-request-meta">Diperbarui ' + safeText(new Date(item.reviewed_at).toLocaleString("id-ID")) + '</small>' : "") + '</article>';
        }).join("");
        $("student-absence-empty")?.classList.toggle("hidden", requests.length > 0);
    } catch (error) {
        console.error("Student absence status could not load:", error);
        if (!silent) toast(error.message || "Riwayat pengajuan gagal dimuat.", "error");
    }
}

function stopAbsenceSync() {
    if (state.absenceSyncTimer) window.clearInterval(state.absenceSyncTimer);
    state.absenceSyncTimer = null;
    state.absenceSyncBusy = false;
}

function startAbsenceSync() {
    if (state.absenceSyncTimer) return;
    state.absenceSyncTimer = window.setInterval(() => { void syncAbsenceOnReturn(); }, 25_000);
}

async function syncAbsenceOnReturn() {
    if (!state.user || document.hidden || state.absenceSyncBusy) return;
    const teacherVisible = state.user.role === "guru" && $("absence-requests-tbody")?.getClientRects().length;
    const studentVisible = state.user.role === "siswa" && $("student-absence-requests-list")?.getClientRects().length;
    if (!teacherVisible && !studentVisible) return;
    state.absenceSyncBusy = true;
    try {
        if (teacherVisible) await loadAbsenceRequests({ silent: true });
        else if (studentVisible) await loadStudentAbsenceRequests({ silent: true });
    } finally { state.absenceSyncBusy = false; }
}
async function loadCloudData(user = state.user) {
    if (!user) return;
    const token = ++state.cloudLoadToken;
    try {
        const studentsRequest = user.role === "siswa"
            ? cloudRequest(`/api/students?nisn=${encodeURIComponent(user.nisn)}`, {
                role: user.role,
                nisn: user.nisn
            })
            : cloudRequest("/api/students", { role: user.role });
        const [studentData, attendanceResult] = await Promise.all([
            studentsRequest,
            cloudRequest("/api/attendance", { role: user.role, nisn: user.nisn })
        ]);
        if (token !== state.cloudLoadToken || state.user !== user) return;

        state.students = studentData.students.map(normalizeCloudStudent);
        state.attendance = attendanceResult.attendance;
        if (user.role === "guru") void loadAbsenceRequests();
        renderStudentList();
        renderDatabase();
        renderStudentHistory();
        updateStudentProfile();
        updateStats();
        if (user.role === "siswa") await loadStudentAbsenceRequests({ silent: true });
    } catch (error) {
        console.error("Cloud data load failed:", error);
        if (token === state.cloudLoadToken && state.user === user) {
            toast(tr("cloudLoadFailed"), "error");
            if (user.role === "siswa") await loadStudentAbsenceRequests({ silent: true });
        }
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
    const homeroom = $("student-profile-homeroom");
    if (homeroom) homeroom.textContent = student?.homeroomTeacherName || "Belum ditetapkan";
}

function attendanceStatusLabel(record) {
    if (record?.status !== "late") return tr("attendance");
    const lang = String(document.documentElement.lang || "id").toLowerCase();
    return lang.startsWith("en") ? "Late" : lang.startsWith("ar") ? "متأخر" : "Terlambat";
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
            <td><span class="status-pill">${safeText(attendanceStatusLabel(item))}</span></td>
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
      <td><span class="status-pill">${safeText(attendanceStatusLabel(a))}</span></td>
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
      <td><button class="row-action" type="button" data-edit-student-face="${safeText(s.nisn)}">${safeText(tr("replaceFace"))}</button>
      ${state.user?.role === "guru" ? '<button class="row-action danger-outline" type="button" data-deactivate-student="' + safeText(s.nisn) + '">Nonaktifkan akun</button>' : ""}</td>
    </tr>`).join("");
    $("students-empty").classList.toggle("hidden", state.students.length > 0);
    $("student-count-badge").textContent = state.students.length;
}

function exportCsv() {
    if (state.runtimeFeatures?.attendance_export === false) {
        toast("Ekspor presensi sedang dinonaktifkan oleh administrator.", "error");
        return;
    }
    if (!state.attendance.length && !state.students.length) {
        toast(tr("emptyCsv"), "error");
        return;
    }
    const headers = ["NISN", "Nama", "Kelas", "Status", "Tanggal", "Waktu", "Metode", "Keyakinan"];
    const lines = [headers, ...state.attendance.map(a => [
        a.nisn, a.name, a.className, attendanceStatusLabel(a), a.date, a.time, tr("methodFaceGps"), `${Math.round(a.confidence * 100)}%`
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

async function getBestGpsPosition() {
    if (!navigator.geolocation) throw { code: 2 };
    return new Promise((resolve, reject) => {
        let best = null;
        let watchId = null;
        let settled = false;
        const geo = navigator.geolocation;
        const finish = (position, error) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            if (watchId !== null && typeof geo.clearWatch === "function") {
                try { geo.clearWatch(watchId); } catch { /* best effort */ }
            }
            if (position) resolve(position);
            else reject(error || { code: 2 });
        };
        const consider = position => {
            const coords = position?.coords;
            const latitude = Number(coords?.latitude);
            const longitude = Number(coords?.longitude);
            const accuracy = Number(coords?.accuracy);
            const timestamp = Number(position?.timestamp);
            const age = Date.now() - timestamp;
            if (![latitude, longitude, accuracy, timestamp].every(Number.isFinite) ||
                latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
                accuracy <= 0 || accuracy > 10000 || age < -5000 || age > 30000) {
                return;
            }
            if (!best || accuracy < Number(best.coords.accuracy)) best = position;
            // Finish early for a high-quality fix; otherwise keep watching briefly
            // so indoor/phone GPS has a chance to improve from its first coarse fix.
            if (accuracy <= 20) finish(best);
        };
        const onError = error => {
            if (error?.code === 1) finish(null, error);
            else if (best) finish(best);
            else finish(null, error || { code: 2 });
        };
        const timeoutId = window.setTimeout(() => {
            if (best) finish(best);
            else finish(null, { code: 3 });
        }, 15000);

        try {
            if (typeof geo.watchPosition === "function") {
                watchId = geo.watchPosition(consider, onError, {
                    enableHighAccuracy: true,
                    timeout: 16000,
                    maximumAge: 0
                });
            } else if (typeof geo.getCurrentPosition === "function") {
                geo.getCurrentPosition(position => {
                    consider(position);
                    if (!settled && best) finish(best);
                    else if (!settled) finish(null, { code: 2 });
                }, onError, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            } else {
                finish(null, { code: 2 });
            }
        } catch (error) {
            finish(null, error);
        }
    });
}

async function checkGeofence() {
    if (!navigator.geolocation?.getCurrentPosition && !navigator.geolocation?.watchPosition) {
        return setLocationError("gpsUnsupported");
    }
    if (![SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng, SCHOOL_LOCATION.radius].every(Number.isFinite) ||
        SCHOOL_LOCATION.lat < -90 || SCHOOL_LOCATION.lat > 90 ||
        SCHOOL_LOCATION.lng < -180 || SCHOOL_LOCATION.lng > 180 ||
        SCHOOL_LOCATION.radius < 10 || SCHOOL_LOCATION.radius > 500) {
        return setLocationError("gpsFailed");
    }

    try {
        const position = await getBestGpsPosition();
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = Number(position.timestamp);
        const age = Date.now() - timestamp;
        if (![latitude, longitude, accuracy, timestamp].every(Number.isFinite) ||
            latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
            accuracy <= 0 || age < -5000 || age > 30000) {
            return setLocationError("gpsUnavailable");
        }

        const distanceExact = calculateDistance(
            latitude, longitude, SCHOOL_LOCATION.lat, SCHOOL_LOCATION.lng
        );
        if (!Number.isFinite(distanceExact)) return setLocationError("gpsFailed");

        const previousFix = state.lastGpsFix;
        const elapsedSeconds = previousFix ? (timestamp - previousFix.timestamp) / 1000 : 0;
        const estimatedSpeed = previousFix && elapsedSeconds > 0 && elapsedSeconds <= 600
            ? calculateDistance(previousFix.lat, previousFix.lng, latitude, longitude) / elapsedSeconds
            : 0;
        const reportedSpeed = Number.isFinite(position.coords.speed) ? position.coords.speed : 0;
        const fakeLocation = reportedSpeed > 55 ||
            (elapsedSeconds >= 1 && elapsedSeconds <= 600 && estimatedSpeed > 55);
        state.lastGpsFix = { lat: latitude, lng: longitude, timestamp };
        if (fakeLocation) {
            const error = tr("fakeLocation");
            state.lastLocation = { error, errorKey: "fakeLocation", fakeLocation: true, checkedAt: Date.now() };
            renderLocationBadge();
            updateMapText();
            return { inside: false, distance: NaN, accuracy, error, fakeLocation: true };
        }

        const roundedDistance = Math.round(distanceExact);
        const clearlyInside = distanceExact + accuracy <= SCHOOL_LOCATION.radius;
        const clearlyOutside = Math.max(0, distanceExact - accuracy) > SCHOOL_LOCATION.radius;
        const boundaryUncertain = !clearlyInside && !clearlyOutside;
        const inside = clearlyInside;

        state.lastLocation = {
            lat: latitude, lng: longitude, accuracy,
            distance: roundedDistance, inside, boundaryUncertain, checkedAt: Date.now(),
            positionTimestamp: timestamp, speed: reportedSpeed
        };
        renderLocationBadge();
        updateMapUserMarker();
        updateMapText();

        return {
            inside,
            boundaryUncertain,
            distance: roundedDistance,
            accuracy,
            lat: latitude,
            lng: longitude,
            positionTimestamp: timestamp,
            speed: reportedSpeed,
            error: null,
            fakeLocation: false
        };
    } catch (error) {
        console.error("GPS location processing error:", error);
        return setLocationError(geolocationErrorKey(error));
    }
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
    if (state.lastLocation.boundaryUncertain) {
        setStatus("outside", tr("locationOutside"), tr("gpsBoundaryUncertain"));
        return;
    }

    const accuracyAccepted = isGpsAccuracyAcceptable(state.lastLocation.accuracy, SCHOOL_LOCATION.radius);
    const badgeLabel = !accuracyAccepted
        ? `${tr("locationAccuracyBad")} · ±${Math.round(state.lastLocation.accuracy)} m`
        : `${tr(state.lastLocation.inside ? "locationInside" : "locationOutside")} · ${state.lastLocation.distance} m`;
    const description = !isGpsAccuracyAcceptable(state.lastLocation.accuracy, SCHOOL_LOCATION.radius)
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
function displayModelError(error, stage = "recognition") {
    console.error(stage === "detector" ? "Face detector error:" : "Face recognition model error:", error);
    if (stage === "detector") state.faceDetectorReady = false;
    else {
        state.faceRecognitionReady = false;
        state.faceEngine = null;
    }
    state.modelReady = state.faceDetectorReady && state.faceRecognitionReady;
    if ($("model-status")) {
        $("model-status").className = "model-badge error";
        $("model-status").textContent = stage === "detector"
            ? "Face detector gagal dimuat"
            : "Model pengenalan gagal dimuat";
    }
    if ($("model-error-text")) {
        const detail = String(error?.message || "").slice(0, 180);
        $("model-error-text").textContent = detail
            ? (stage === "detector" ? "Detector: " : "ArcFace: ") + detail
            : tr("modelFailed");
    }
    $("model-error")?.classList.remove("hidden");
}

function loadExternalScript(url, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        let settled = false;
        const timeout = window.setTimeout(() => finish(new Error("Face detector library request timed out")), timeoutMs);
        const finish = error => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            if (error) {
                script.remove();
                reject(error);
            } else resolve();
        };
        script.src = url;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = () => finish();
        script.onerror = () => finish(new Error("Face detector library could not be loaded"));
        document.head.appendChild(script);
    });
}

async function ensureFaceApi() {
    if (window.faceapi) return window.faceapi;
    const sources = [
        "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js",
        "https://unpkg.com/face-api.js@0.22.2/dist/face-api.min.js"
    ];
    let lastError = null;
    for (const source of sources) {
        try {
            await loadExternalScript(source);
            if (window.faceapi) return window.faceapi;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("Face detector library unavailable from supported CDN mirrors");
}

function updateFaceModelProgress(progress) {
    const label = progress?.message || tr("modelLoadingLong");
    if ($("model-status")) {
        $("model-status").className = "model-badge";
        $("model-status").textContent = label;
    }
    // Progress is not an error. Keep the error panel hidden while the model downloads.
    $("model-error")?.classList.add("hidden");
}

function loadFaceDetector() {
    if (state.faceDetectorReady && window.faceapi) return Promise.resolve(true);
    if (state.faceDetectorFailed) return Promise.resolve(false);
    if (state.faceDetectorLoadingPromise) return state.faceDetectorLoadingPromise;
    state.faceDetectorLoadingPromise = (async () => {
        try {
            if ($("model-status")) {
                $("model-status").className = "model-badge";
                $("model-status").textContent = "Menyiapkan deteksi wajah…";
            }
            const faceapi = await ensureFaceApi();
            const detectorWeightSources = [
                "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights",
                "https://unpkg.com/face-api.js@0.22.2/weights"
            ];
            let detectorReady = false;
            let lastError = null;
            for (const base of detectorWeightSources) {
                try {
                    if (!faceapi.nets.tinyFaceDetector.isLoaded) {
                        await faceapi.nets.tinyFaceDetector.loadFromUri(base);
                    }
                    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
                        await faceapi.nets.faceLandmark68Net.loadFromUri(base);
                    }
                    detectorReady = Boolean(
                        faceapi.nets.tinyFaceDetector.isLoaded &&
                        faceapi.nets.faceLandmark68Net.isLoaded
                    );
                    if (detectorReady) break;
                    lastError = new Error("Face detector weights did not report ready");
                } catch (error) {
                    lastError = error;
                    console.warn("Face detector weights mirror failed:", base, error);
                }
            }
            if (!detectorReady) throw lastError || new Error("Face detector or landmark weights unavailable");

            state.faceDetectorReady = true;
            if ($("model-status")) {
                $("model-status").className = "model-badge ready";
                $("model-status").textContent = state.faceRecognitionReady
                    ? "ArcFace 512D siap"
                    : "Deteksi wajah siap · menyiapkan ArcFace…";
            }
            $("model-error")?.classList.add("hidden");
            return true;
        } catch (error) {
            state.faceDetectorFailed = true;
            displayModelError(error, "detector");
            return false;
        } finally {
            state.faceDetectorLoadingPromise = null;
        }
    })();
    return state.faceDetectorLoadingPromise;
}

function loadFaceRecognition() {
    if (state.faceRecognitionReady && state.faceEngine) return Promise.resolve(true);
    if (state.faceRecognitionFailed) return Promise.resolve(false);
    if (state.faceRecognitionLoadingPromise) return state.faceRecognitionLoadingPromise;
    state.faceRecognitionLoadingPromise = (async () => {
        try {
            if (!state.faceDetectorReady && !(await loadFaceDetector())) {
                throw new Error("Face detector is not ready");
            }
            if ($("model-status")) {
                $("model-status").className = "model-badge";
                $("model-status").textContent = "Menyiapkan model pengenalan ArcFace…";
            }
            const engineModule = await import("./face-engine.js");
            const engine = await engineModule.createAmanahFaceEngine({
                onProgress: updateFaceModelProgress
            });
            state.faceEngine = engine;
            state.faceRecognitionReady = true;
            state.faceRecognitionFailed = false;
            state.modelReady = state.faceDetectorReady && state.faceRecognitionReady;
            if ($("model-status")) {
                $("model-status").className = "model-badge ready";
                $("model-status").textContent = "ArcFace 512D siap";
            }
            $("model-error")?.classList.add("hidden");
            return true;
        } catch (error) {
            state.faceRecognitionFailed = true;
            displayModelError(error, "recognition");
            return false;
        } finally {
            state.faceRecognitionLoadingPromise = null;
            state.modelLoading = false;
        }
    })();
    state.modelLoading = true;
    return state.faceRecognitionLoadingPromise;
}

function loadModels() {
    if (state.faceDetectorReady && state.faceRecognitionReady && state.faceEngine) {
        state.modelReady = true;
        return Promise.resolve(true);
    }
    if (state.modelLoadingPromise) return state.modelLoadingPromise;
    state.modelLoadingPromise = (async () => {
        const detectorReady = await loadFaceDetector();
        if (!detectorReady) return false;
        return await loadFaceRecognition();
    })().finally(() => {
        state.modelLoadingPromise = null;
        state.modelLoading = false;
    });
    return state.modelLoadingPromise;
}

function updateCameraTexts() {
    if (!state.attendanceStream) {
        if ($("camera-status")) $("camera-status").textContent = tr("cameraReady");
        if ($("switch-hint")) $("switch-hint").textContent = tr("switchOffHint");
        if ($("status-presensi")) $("status-presensi").textContent = tr("waitingFace");
    }
    const studentButton = $("btn-student-attendance");
    if (studentButton) studentButton.textContent = state.attendanceStream
        ? tr("studentCameraStop")
        : state.attendanceStarting ? tr("studentCameraStarting") : tr("checkInNow");
    if ($("model-status")) {
        $("model-status").textContent = state.faceRecognitionReady
            ? "ArcFace 512D siap"
            : state.faceDetectorReady
                ? "Deteksi wajah siap · menyiapkan ArcFace…"
                : state.modelLoading ? tr("modelLoadingLong") : tr("modelFailed");
    }
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
    const view = $(viewId);
    return Boolean(view && !view.classList.contains("hidden") && view.classList.contains("active"));
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
    state.livenessChallenge = null;
    state.lastFaceMatchAt = 0;
    state.attendanceIdempotencyKey = null;
    setSwitch(false);
}

function stopFormCamera() {
    state.formStartToken++;
    if (state.formTimer) clearInterval(state.formTimer);
    state.formTimer = null;
    state.formStableFrames = 0;
    state.lastFormNose = null;
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
    if (typeof stopAdminTestCamera === "function") stopAdminTestCamera();
}

async function getCameraStream() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
    const constraints = [
        {
            audio: false,
            video: {
                facingMode: { ideal: "user" },
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 24, max: 30 }
            }
        },
        {
            audio: false,
            video: {
                facingMode: { ideal: "user" },
                width: { ideal: 480 },
                height: { ideal: 360 }
            }
        },
        { audio: false, video: true }
    ];
    let lastError = null;
    for (const constraint of constraints) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraint);
            const track = stream.getVideoTracks()[0];
            if (track) {
                const settings = track.getSettings?.() || {};
                console.info("Amanah camera started", {
                    width: settings.width || null,
                    height: settings.height || null,
                    frameRate: settings.frameRate || null,
                    facingMode: settings.facingMode || null
                });
            }
            return stream;
        } catch (error) {
            lastError = error;
            if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
                throw new Error("permission");
            }
            if (error?.name === "NotFoundError" || error?.name === "NotReadableError" ||
                error?.name === "AbortError") {
                throw new Error("unavailable");
            }
            // A device may reject an ideal resolution; fall back to simpler constraints.
        }
    }
    console.error("Camera constraints failed:", lastError);
    throw new Error("failed");
}

async function waitForVideoReady(video, timeoutMs = 7000) {
    if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return;
    if (!video) throw new Error("Camera video element is missing");
    await new Promise((resolve, reject) => {
        let settled = false;
        const finish = error => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            video.removeEventListener("loadeddata", onReady);
            video.removeEventListener("canplay", onReady);
            video.removeEventListener("error", onError);
            if (error) reject(error);
            else resolve();
        };
        const onReady = () => {
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) finish();
        };
        const onError = () => finish(new Error("Camera video could not provide frames"));
        const timeout = window.setTimeout(() => finish(new Error("Camera did not produce a video frame in time")), timeoutMs);
        video.addEventListener("loadeddata", onReady);
        video.addEventListener("canplay", onReady);
        video.addEventListener("error", onError);
        onReady();
    });
}

function cameraErrorText(error) {
    if (error.message === "permission") return tr("cameraPermission");
    if (error.message === "unavailable") return tr("cameraUnavailable");
    if (error.message === "unsupported") return tr("cameraUnsupported");
    return tr("cameraStartFailed");
}

async function loadRuntimeFeatures({ refresh = false } = {}) {
 if (state.runtimeFeatures && !refresh) return state.runtimeFeatures;
 const response = await cloudRequest("/api?action=features");
 if (!response?.features || typeof response.features !== "object") throw new Error("Runtime feature configuration is unavailable");
 state.runtimeFeatures = response.features;
 applyRuntimeFeatureFlags(state.runtimeFeatures);
 return state.runtimeFeatures;
}
async function startAttendanceCamera() {
    if (state.attendanceStream || state.attendanceStarting) return;
    if (!state.user) return;
    const requestUser = state.user;
    const cloudDataPromise = state.cloudDataPromise;
    state.attendanceStarting = true;
    const startToken = ++state.attendanceStartToken;

    try {
        const runtimeFeatures = await loadRuntimeFeatures({ refresh: true });
        const gpsGeofencingEnabled = runtimeFeatures.gps_geofencing !== false;
        const requiredFeatures = ["camera_attendance", "face_recognition", "liveness_check", "attendance_recording"];
        const disabledFeature = requiredFeatures.find(key => runtimeFeatures[key] === false);
        if (disabledFeature) {
            toast("Fitur presensi sedang dinonaktifkan oleh administrator.", "error");
            return;
        }
        const settingsLoaded = gpsGeofencingEnabled ? await loadSchoolSettings() : true;
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            state.cloudDataPromise !== cloudDataPromise) return;
        if (!settingsLoaded) {
            const message = tr("schoolSettingsFailed");
            setAttendanceMessage(message);
            toast(message, "error");
            return;
        }
        if (!attendanceViewActive() || document.hidden) return;
        await cloudDataPromise;
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            state.cloudDataPromise !== cloudDataPromise ||
            !attendanceViewActive() || document.hidden) return;

        if (requestUser.role === "siswa" && !state.students.some(student => student.nisn === requestUser.nisn)) {
            toast(tr("studentUnlinked"), "error");
            return;
        }

        if (gpsGeofencingEnabled) {
            state.lastLocation = { checking: true };
            renderLocationBadge();
            if (requestUser.role === "siswa") {
                if ($("student-attendance-status")) $("student-attendance-status").textContent = tr("checkingBeforeCamera");
                if ($("btn-student-attendance")) $("btn-student-attendance").textContent = tr("studentCameraStarting");
            } else {
                if ($("camera-status")) $("camera-status").textContent = tr("checkingBeforeCamera");
                if ($("switch-hint")) $("switch-hint").textContent = tr("checkingBeforeCamera");
                setSwitch(false);
            }

            const result = await checkGeofence();
            if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
                !attendanceViewActive() || document.hidden) return;

            if (result.error || !isGpsAccuracyAcceptable(result.accuracy, SCHOOL_LOCATION.radius) ||
                result.boundaryUncertain || !result.inside) {
                const message = result.error ||
                    (!isGpsAccuracyAcceptable(result.accuracy, SCHOOL_LOCATION.radius)
                        ? tr("accuracyWarning", { accuracy: Math.round(result.accuracy) })
                        : result.boundaryUncertain
                            ? tr("gpsBoundaryUncertain")
                            : tr("outsideMessage", {
                                distance: result.distance,
                                radius: SCHOOL_LOCATION.radius
                            }));
                stopAttendanceCamera();
                setAttendanceMessage(message);
                toast(message, "error");
                return;
            }
        } else {
            const message = "GPS Geofencing sedang dinonaktifkan oleh Admin. Presensi tetap memakai verifikasi wajah.";
            if (requestUser.role === "siswa") {
                if ($("student-attendance-status")) $("student-attendance-status").textContent = message;
            } else {
                if ($("camera-status")) $("camera-status").textContent = message;
                if ($("switch-hint")) $("switch-hint").textContent = message;
            }
        }

        if (!state.faceDetectorReady && !(await loadFaceDetector())) {
            if (startToken === state.attendanceStartToken) {
                stopAttendanceCamera();
                setAttendanceMessage("Deteksi wajah gagal dimuat. Periksa koneksi lalu coba lagi.");
                toast("Deteksi wajah gagal dimuat. Periksa koneksi lalu coba lagi.", "error");
            }
            return;
        }
        // The camera and live face detector can start while the 105 MB
        // recognition model downloads in the background.
        void loadFaceRecognition();
        if (startToken !== state.attendanceStartToken || state.user !== requestUser ||
            !attendanceViewActive() || document.hidden) return;

        if (requestUser.role === "siswa") {
            if ($("student-attendance-status")) $("student-attendance-status").textContent = tr("cameraStarting");
            if ($("btn-student-attendance")) $("btn-student-attendance").textContent = tr("studentCameraStarting");
        } else {
            if ($("camera-status")) $("camera-status").textContent = tr("cameraStarting");
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
        if (!video) {
            stopStream(stream);
            throw new Error("unavailable");
        }
        video.srcObject = stream;
        await video.play();
        await waitForVideoReady(video);
        if (startToken !== state.attendanceStartToken || state.attendanceStream !== stream ||
            state.user !== requestUser || !attendanceViewActive() || document.hidden) {
            stopStream(stream);
            if (state.attendanceStream === stream) stopAttendanceCamera();
            return;
        }
        attendancePlaceholder()?.classList.add("hidden");
        if (requestUser.role === "siswa") {
            if ($("student-attendance-status")) $("student-attendance-status").textContent = tr("livenessMove");
            if ($("btn-student-attendance")) $("btn-student-attendance").textContent = tr("studentCameraStop");
        } else {
            if ($("camera-status")) $("camera-status").textContent = tr("attendanceReady");
            if ($("switch-hint")) $("switch-hint").textContent = tr("attendanceReady");
            if ($("status-presensi")) $("status-presensi").textContent = tr("attendanceWaiting");
            if ($("liveness-status")) $("liveness-status").textContent = tr("livenessMove");
            setSwitch(true);
        }
        state.attendanceRecorded = false;
        state.lastNose = null;
        state.movementFrames = 0;
        state.attendanceIdempotencyKey = createIdempotencyKey();

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
        if ($("student-attendance-status")) $("student-attendance-status").textContent = message;
    } else {
        if ($("camera-status")) $("camera-status").textContent = message;
        if ($("liveness-status")) $("liveness-status").textContent = message;
        if ($("switch-hint")) $("switch-hint").textContent = message;
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
    if (!state.faceDetectorReady || !window.faceapi || !video?.videoWidth || video.readyState < 2) return [];
    // Run detection at a light resolution; do not block it on the much larger
    // ArcFace recognition model. A slightly lower score threshold improves recall;
    // size/landmark/embedding checks still gate any identity decision.
    state.faceDetectorOptions ||= new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 });
    return faceapi.detectAllFaces(video, state.faceDetectorOptions).withFaceLandmarks();
}

function isFaceDetectionUsable(detection, video) {
    const box = detection?.box || detection?.detection?.box;
    const score = Number(detection?.score ?? detection?.detection?.score);
    const width = Number(box?.width);
    const height = Number(box?.height);
    const sourceWidth = Number(video?.videoWidth) || 0;
    const sourceHeight = Number(video?.videoHeight) || 0;
    const minimumWidth = Math.max(64, sourceWidth * 0.10);
    const minimumHeight = Math.max(64, sourceHeight * 0.12);
    return Number.isFinite(score) && score >= 0.50 &&
        Number.isFinite(width) && width >= minimumWidth &&
        Number.isFinite(height) && height >= minimumHeight;
}

async function detectUsableFaces(video) {
    const detections = await detectFaces(video);
    return detections.filter(detection => isFaceDetectionUsable(detection, video));
}

function updateAttendanceLiveness(detection) {
    if (!state.livenessChallenge) {
        state.livenessChallenge = {
            direction: Math.random() < 0.5 ? "left" : "right",
            stage: "front",
            frames: 0,
            total: 0,
            completed: false
        };
    }
    const challenge = state.livenessChallenge;
    if (challenge.completed) return { completed: true, progress: 9 };
    const angle = faceAngleBucket(detection, true);
    const expected = challenge.stage === "turn" ? challenge.direction : "front";
    challenge.total += 1;
    if (angle === expected) challenge.frames += 1;
    else challenge.frames = 0;

    if (challenge.frames >= 3) {
        challenge.frames = 0;
        if (challenge.stage === "front") challenge.stage = "turn";
        else if (challenge.stage === "turn") challenge.stage = "return";
        else challenge.completed = true;
    }
    const messageKey = challenge.stage === "front" ? "livenessFaceForward"
        : challenge.stage === "turn" ? (challenge.direction === "left" ? "livenessTurnLeft" : "livenessTurnRight")
        : "livenessReturnFront";
    return { completed: challenge.completed, progress: challenge.total, messageKey };
}

function updateFaceSampleCount() {
    if ($("face-sample-count")) {
        $("face-sample-count").textContent = tr("faceSamplesCount", { count: state.faceSamples.length });
    }
    const progress = $("face-sample-progress-bar");
    if (progress) {
        const complete = state.faceSamples.length === MAX_FACE_SAMPLES && ["front", "left", "right", "up", "down"].every(angle => state.faceSampleAngles.includes(angle));
        progress.style.width = `${state.faceSamples.length / MAX_FACE_SAMPLES * 100}%`;
        progress.dataset.count = complete ? "5" : String(Math.min(3, state.faceSamples.length));
        progress.setAttribute("aria-valuenow", String(state.faceSamples.length));
    }
}

function faceAngleBucket(detection, mirroredPreview = false) {
    const points = detection?.landmarks?.positions;
    const box = detection?.box;
    if (!Array.isArray(points) || points.length < 48 || !box?.width || !box?.height) return null;
    const mean = indices => ({ x: indices.reduce((sum, index) => sum + points[index].x, 0) / indices.length, y: indices.reduce((sum, index) => sum + points[index].y, 0) / indices.length });
    const leftEye = mean([36,37,38,39,40,41]);
    const rightEye = mean([42,43,44,45,46,47]);
    const nose = points[30];
    const yaw = (nose.x - (leftEye.x + rightEye.x) / 2) / Math.max(1, Math.abs(rightEye.x - leftEye.x));
    const pitch = (nose.y - (leftEye.y + rightEye.y) / 2) / box.height;
    if (yaw < -0.13) return mirroredPreview ? 'right' : 'left';
    if (yaw > 0.13) return mirroredPreview ? 'left' : 'right';
    if (pitch < 0.19) return 'up';
    if (pitch > 0.31) return 'down';
    if (Math.abs(yaw) <= 0.13 && pitch >= 0.19 && pitch <= 0.31) return 'front';
    return null;
}

function saveFaceSample(embedding, quality = state.faceCandidateQuality, angle = null) {
    const values = Array.from(embedding || [], Number);
    if (values.length !== 512 || !values.every(Number.isFinite)) {
        toast("Embedding ArcFace harus berisi 512 angka valid.", "error");
        return false;
    }
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    if (norm < 0.98 || norm > 1.02) {
        toast("Embedding wajah belum ternormalisasi dengan benar. Ambil sampel ulang.", "error");
        return false;
    }
    if (typeof quality !== "number" || !Number.isFinite(quality) || quality < 0.70) {
        $("form-face-status").textContent = "Kualitas wajah belum cukup. Perbaiki pencahayaan dan posisi kamera.";
        toast("Kualitas wajah belum cukup. Perbaiki pencahayaan dan posisi kamera.", "error");
        return false;
    }
    if (state.faceSamples.length >= MAX_FACE_SAMPLES) {
        toast(tr("faceSampleLimit"), "info");
        return false;
    }
    if (!["front", "left", "right", "up", "down"].includes(angle)) {
        $("form-face-status").textContent = tr("faceTurnAngle");
        return false;
    }
    if (state.faceSampleAngles.includes(angle)) {
        $("form-face-status").textContent = tr("faceAngleAlreadyCaptured", { angle: tr("faceAngle_" + angle) });
        return false;
    }
    const duplicate = state.faceSamples.some(sample => {
        const prior = sample.embedding || [];
        let dot = 0;
        for (let index = 0; index < 512; index += 1) dot += values[index] * prior[index];
        return 1 - dot < 0.002;
    });
    if (duplicate) {
        $("form-face-status").textContent = "Sampel terlalu mirip. Ubah sudut wajah dan ulangi.";
        toast("Sampel terlalu mirip. Ubah sudut wajah dan ulangi.", "info");
        return false;
    }
    state.faceSamples.push({ sample_angle: angle, quality, embedding: values });
    state.faceSampleAngles.push(angle);
    state.faceCandidate = null;
    state.faceCandidateQuality = null;
    updateFaceSampleCount();
    $("form-face-status").textContent = tr("faceAngleSaved", { angle: tr("faceAngle_" + angle) });
    return true;
}

function updateProgress(percent, label) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    $("ai-progress").style.width = `${value}%`;
    $("ai-percent").textContent = `${value}%`;
    $("status-presensi").textContent = label;
}

async function processAttendanceFrame() {
    if (state.attendanceBusy) return;
    if (!state.attendanceStream || state.attendanceRecorded) return;
    const requestStream = state.attendanceStream;
    const requestUser = state.user;
    if (!requestUser) return;
    state.attendanceBusy = true;
    let pipelineStage = "detection";

    try {
        const video = attendanceVideo();
        if (!video || video.readyState < 2) return;
        const candidates = requestUser.role === "siswa"
            ? state.students.filter(item => item.nisn === requestUser.nisn)
            : state.students;
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        if (state.attendanceStream !== requestStream || state.user !== requestUser) return;
        if (video.readyState < 2) return;
        const detections = await detectUsableFaces(video);
        if (state.attendanceStream !== requestStream || state.user !== requestUser) return;
        drawDetections(video, attendanceCanvas(), detections);

        if (!detections.length) {
            if (state.livenessChallenge) state.livenessChallenge.frames = 0;
            setAttendanceMessage(tr("faceNotFound"));
            if (requestUser.role === "guru") {
                updateProgress(0, tr("faceNotFound"));
            }
            state.lastNose = null;
            state.movementFrames = 0;
            return;
        }

        if (detections.length > 1) {
            if (state.livenessChallenge) state.livenessChallenge.frames = 0;
            setAttendanceMessage(tr("faceTooMany"));
            state.lastNose = null;
            state.movementFrames = 0;
            if (requestUser.role === "guru") {
                updateProgress(0, tr("faceTooMany"));
            }
            return;
        }

        const detection = detections[0];
        if (!isFaceDetectionUsable(detection, video)) {
            if (state.livenessChallenge) state.livenessChallenge.frames = 0;
            setAttendanceMessage(tr("faceQualityLow"));
            if (requestUser.role === "guru") updateProgress(0, tr("faceQualityLow"));
            return;
        }
        const liveness = updateAttendanceLiveness(detection);
        state.movementFrames = liveness.progress;
        if (requestUser.role === "guru") {
            updateProgress(liveness.completed ? 90 : Math.min(85, 25 + liveness.progress * 7), tr("attendanceInProgress"));
        }
        if (!liveness.completed) {
            setAttendanceMessage(tr(liveness.messageKey));
            return;
        }

        // Show face detection independently; wait for the recognition backbone
        // without stopping the camera or resetting the completed liveness check.
        if (!state.faceRecognitionReady || !state.faceEngine) {
            const recognitionFailed = state.faceRecognitionFailed;
            const message = recognitionFailed
                ? "Wajah terdeteksi, tetapi model ArcFace gagal dimuat. Gunakan tombol coba lagi pada status model."
                : "Wajah terdeteksi. Menyiapkan model pengenalan wajah…";
            setAttendanceMessage(message);
            if (requestUser.role === "guru") updateProgress(88, message);
            if (!recognitionFailed) void loadFaceRecognition();
            return;
        }
        pipelineStage = "recognition";
        const embedded = await state.faceEngine.embed(video, detection);
        if (state.attendanceStream !== requestStream || state.user !== requestUser) return;

        let student;
        let confidence;
        let faceProofToken = null;
        if (Date.now() - state.lastFaceMatchAt < 2500) return;
        state.lastFaceMatchAt = Date.now();
        pipelineStage = "face-match";
        const result = await cloudRequest("/api/face-match", {
            method: "POST",
            role: requestUser.role,
            nisn: requestUser.nisn,
            body: {
                model_key: "auraface-glintr100-int8-v1",
                embedding: embedded.embedding
            }
        });
        if (state.attendanceStream !== requestStream || state.user !== requestUser) return;
        if (!result.registered) {
            setAttendanceMessage(tr("studentUnlinked"));
            return;
        }
        if (!result.match || typeof result.proofToken !== "string" || !result.proofToken) {
            const message = result.ambiguous ? tr("faceMatchAmbiguous") : tr("faceNoMatch");
            setAttendanceMessage(message);
            updateProgress(0, message);
            return;
        }
        student = candidates.find(item => item.nisn === result.nisn);
        if (!student) {
            setAttendanceMessage(tr("faceNotRegistered"));
            return;
        }
        confidence = result.confidence;
        faceProofToken = result.proofToken;
        if (!student) return;

        let location = null;
        if (state.runtimeFeatures?.gps_geofencing !== false) {
            pipelineStage = "gps";
            location = await checkGeofence();
            if (state.user !== requestUser || state.attendanceStream !== requestStream ||
                !attendanceViewActive() || document.hidden) return;
            if (location.error || !location.inside ||
                !isGpsAccuracyAcceptable(location.accuracy, SCHOOL_LOCATION.radius)) {
                const message = location.error || (location.boundaryUncertain
                    ? tr("gpsBoundaryUncertain")
                    : !isGpsAccuracyAcceptable(location.accuracy, SCHOOL_LOCATION.radius)
                        ? tr("accuracyWarning", { accuracy: Math.round(location.accuracy) })
                        : tr("outsideMessage", { distance: location.distance, radius: SCHOOL_LOCATION.radius }));
                stopAttendanceCamera();
                setAttendanceMessage(message);
                if (requestUser.role === "guru") updateProgress(0, message);
                toast(message, "error");
                return;
            }
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

        pipelineStage = "attendance";
        const saved = await cloudRequest("/api/attendance", {
            method: "POST",
            role: requestUser.role,
            nisn: requestUser.nisn,
            body: {
                nisn: student.nisn,
                ...(location ? {
                    lat: location.lat,
                    lng: location.lng,
                    accuracy: location.accuracy,
                    gpsTimestamp: location.positionTimestamp,
                    speed: location.speed || 0
                } : {}),
                confidence
            },
            idempotencyKey: state.attendanceIdempotencyKey,
            faceProofToken
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
            console.error("Attendance pipeline error (" + pipelineStage + "):", error);
            if (pipelineStage === "recognition") {
                state.faceRecognitionReady = false;
                state.faceRecognitionFailed = true;
                state.faceEngine = null;
                state.modelReady = false;
                displayModelError(error, "recognition");
                const message = "Wajah terdeteksi, tetapi model pengenalan gagal berjalan. Gunakan tombol coba lagi pada status model.";
                setAttendanceMessage(message);
                if (requestUser.role === "guru") updateProgress(0, message);
            } else if (pipelineStage === "detection") {
                const message = "Kamera aktif, tetapi satu frame gagal diproses. Sistem akan mencoba frame berikutnya.";
                setAttendanceMessage(message);
                if (requestUser.role === "guru") updateProgress(0, message);
            } else if (error.status === 409) {
                stopAttendanceCamera();
                setAttendanceMessage(error.message);
                toast(error.message, "info");
            } else if (error.name === "CloudApiError" || ["face-match", "gps", "attendance"].includes(pipelineStage)) {
                stopAttendanceCamera();
                const message = error.type === "gps_accuracy"
                    ? tr("accuracyWarning", {
                        accuracy: Math.ceil(error.gpsAccuracy?.actual || Number(SCHOOL_LOCATION.radius) + 1)
                    })
                    : error.message || "Koneksi ke layanan presensi gagal. Periksa jaringan dan coba lagi.";
                setAttendanceMessage(message);
                toast(message, "error");
            } else {
                const message = "Terjadi gangguan sementara pada kamera. Coba mulai kamera kembali.";
                setAttendanceMessage(message);
                toast(message, "error");
            }
        }
    } finally {
        state.attendanceBusy = false;
        if (state.attendanceStream === requestStream) {
            if (!state.attendanceRecorded) scheduleAttendanceFrame(requestStream, state.attendanceStartToken);
        }
    }
}

function scheduleAttendanceFrame(stream, startToken, delay = 220) {
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
        if (!state.faceDetectorReady && !(await loadFaceDetector())) {
            toast("Deteksi wajah gagal dimuat. Periksa koneksi lalu coba lagi.", "error");
            return;
        }
        // Do not block the camera preview/face-detected feedback on ArcFace download.
        void loadFaceRecognition();
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
        await waitForVideoReady($("video-formulir"));
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
    let pipelineStage = "detection";
    try {
        const video = $("video-formulir");
        const detections = await detectUsableFaces(video);
        if (state.formStream !== requestStream) return;
        drawDetections(video, $("overlay-formulir"), detections);
        if (detections.length === 1) {
            const detection = detections[0];
            const angle = faceAngleBucket(detection, true);
            const nose = detection.landmarks.getNose()?.[3];
            const sourceWidth = video.videoWidth || 480;
            const quality = detection.score * Math.min(1, detection.box.width / (sourceWidth * 0.18));
            state.faceCandidate = null;
            state.faceCandidateQuality = quality;
            $("form-face-status").textContent = angle ? tr("faceDetectedAngle", { angle: tr("faceAngle_" + angle) }) : tr("faceTurnAngle");
            if (!nose || !Number.isFinite(nose.x) || !Number.isFinite(nose.y) ||
                quality < 0.70 || state.faceSamples.length >= MAX_FACE_SAMPLES) {
                state.formStableFrames = 0;
                state.lastFormNose = null;
                if (quality < 0.70) $("form-face-status").textContent = "Wajah kurang jelas, mendekatlah ke kamera.";
            } else {
                if (state.lastFormNose) {
                    const delta = Math.hypot(nose.x - state.lastFormNose.x, nose.y - state.lastFormNose.y);
                    state.formStableFrames = delta < Math.max(2, detection.box.width * 0.015)
                        ? state.formStableFrames + 1 : 0;
                }
                state.lastFormNose = { x: nose.x, y: nose.y };
                if (state.formStableFrames >= 3) {
                    let saved = false;
                    if (angle) {
                        const sampleDetections = await detectUsableFaces(video);
                        if (state.formStream !== requestStream) return;
                        const sample = sampleDetections.length === 1 ? sampleDetections[0] : null;
                        if (sample && isFaceDetectionUsable(sample, video) && faceAngleBucket(sample, true) === angle) {
                            const sampleQuality = sample.score * Math.min(1, sample.box.width / (sourceWidth * 0.18));
                            if (!state.faceRecognitionReady || !state.faceEngine) {
                                $("form-face-status").textContent = state.faceRecognitionFailed
                                    ? "Wajah terdeteksi, tetapi model pengenalan gagal dimuat. Gunakan tombol coba lagi pada status model."
                                    : "Wajah terdeteksi. Menyiapkan model pengenalan wajah…";
                                if (!state.faceRecognitionFailed) void loadFaceRecognition();
                            } else {
                                pipelineStage = "recognition";
                                const embedded = await state.faceEngine.embed(video, sample);
                                if (state.formStream !== requestStream) return;
                                saved = saveFaceSample(embedded.embedding, sampleQuality, angle);
                            }
                        }
                    }
                    if (saved) toast(`Sampel ${state.faceSamples.length}/${MAX_FACE_SAMPLES} tersimpan`, "success");
                    state.formStableFrames = 0;
                    state.lastFormNose = null;
                }
            }
        } else if (detections.length > 1) {
            state.faceCandidate = null;
            state.faceCandidateQuality = null;
            state.formStableFrames = 0;
            state.lastFormNose = null;
            $("form-face-status").textContent = tr("faceTooMany");
        } else {
            state.faceCandidate = null;
            state.faceCandidateQuality = null;
            state.formStableFrames = 0;
            state.lastFormNose = null;
            $("form-face-status").textContent = tr("faceNotFound");
        }
        updateFaceSampleCount();
    } catch (error) {
        console.error("Registration camera frame failed (" + pipelineStage + "):", error);
        if (pipelineStage === "recognition") {
            state.faceRecognitionReady = false;
            state.faceRecognitionFailed = true;
            state.faceEngine = null;
            state.modelReady = false;
            displayModelError(error, "recognition");
            $("form-face-status").textContent = "Wajah sudah terdeteksi, tetapi model pengenalan gagal berjalan. Coba muat ulang model.";
        } else {
            $("form-face-status").textContent = "Kamera aktif. Frame belum dapat diproses; mencoba kembali…";
        }
    } finally {
        state.formBusy = false;
    }
}

async function decodeFaceUpload(file) {
    if (!(file instanceof Blob) || file.size === 0) throw new Error("empty-image");
    let bitmap = null;
    try {
        if (typeof createImageBitmap === "function") {
            bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        }
    } catch (error) {
        console.warn("createImageBitmap decode fallback:", error?.name || error);
    }

    let source = bitmap;
    let sourceWidth = Number(bitmap?.width) || 0;
    let sourceHeight = Number(bitmap?.height) || 0;
    if (!source) {
        const objectUrl = URL.createObjectURL(file);
        try {
            const image = new Image();
            image.decoding = "async";
            image.src = objectUrl;
            await image.decode();
            source = image;
            sourceWidth = image.naturalWidth;
            sourceHeight = image.naturalHeight;
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    try {
        if (!sourceWidth || !sourceHeight) throw new Error("invalid-image-dimensions");
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("image-canvas-unavailable");
        context.drawImage(source, 0, 0, width, height);
        // face-api.js accepts HTMLImageElement/HTMLCanvasElement/video/tensor,
        // not ImageBitmap in all supported 0.22.2 code paths. Always return canvas.
        return canvas;
    } finally {
        bitmap?.close?.();
    }
}
async function readUploadedFace(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
        toast("Foto terlalu besar (maksimal 15 MB). Pilih foto yang lebih kecil.", "error");
        return;
    }
    if (!state.faceDetectorReady && !(await loadFaceDetector())) {
        toast("Deteksi wajah gagal dimuat. Periksa koneksi lalu coba lagi.", "error");
        return;
    }

    let image = null;
    try {
        image = await decodeFaceUpload(file);
        const width = image.width || image.naturalWidth;
        const height = image.height || image.naturalHeight;
        if (!width || !height || width < 96 || height < 96) {
            throw new Error("image-resolution-too-small");
        }
        const detections = await faceapi.detectAllFaces(
            image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.48 })
        ).withFaceLandmarks();

        if (detections.length !== 1) {
            const message = detections.length > 1 ? tr("faceTooMany") : tr("faceNotFound");
            $("form-face-status").textContent = message;
            toast(message, "error");
            return;
        }

        const detection = detections[0];
        $("form-face-status").textContent = "Wajah terdeteksi. Memeriksa kualitas foto…";
        if (!isFaceDetectionUsable(detection, { videoWidth: width, videoHeight: height })) {
            $("form-face-status").textContent = "Wajah ditemukan, tetapi ukurannya terlalu kecil atau kurang jelas. Gunakan foto yang lebih dekat.";
            toast("Wajah ditemukan, tetapi kualitas foto belum cukup.", "error");
            return;
        }
        const angle = faceAngleBucket(detection);
        const sourceWidth = width || 640;
        const quality = detection.score * Math.min(1, detection.box.width / (sourceWidth * 0.18));
        if (!angle) {
            $("form-face-status").textContent = tr("faceTurnAngle");
            toast(tr("faceTurnAngle"), "error");
            return;
        }
        if (!globalThis.crypto?.subtle) throw new Error("secure-context-required");
        const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
        const imageHash = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("");
        if (state.faceImageHashes.has(imageHash)) {
            toast(tr("duplicateImageFile"), "error");
            return;
        }
        $("form-face-status").textContent = "Wajah terdeteksi. Menyiapkan model pengenalan…";
        if (!state.faceRecognitionReady && !(await loadFaceRecognition())) {
            $("form-face-status").textContent = "Deteksi wajah berhasil, tetapi model pengenalan belum siap. Tekan coba lagi pada status model.";
            toast("Deteksi wajah berhasil, tetapi model pengenalan belum siap.", "error");
            return;
        }
        const embedded = await state.faceEngine.embed(image, detection);
        if (saveFaceSample(embedded.embedding, quality, angle)) {
            state.faceImageHashes.add(imageHash);
            toast(`Sampel ${state.faceSamples.length}/${MAX_FACE_SAMPLES} tersimpan`, "success");
        }
    } catch (error) {
        console.error("Image processing error:", error);
        const reason = error?.message === "secure-context-required"
            ? "Pemrosesan foto membutuhkan HTTPS atau localhost."
            : error?.message === "image-resolution-too-small"
                ? "Resolusi foto terlalu kecil. Gunakan foto minimal 96 × 96 piksel."
                : tr("faceUploadError");
        $("form-face-status").textContent = reason;
        toast(reason, "error");
    } finally {
        image?.close?.();
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

function updateAbsenceTypeFields() {
    const type = $("absence-type")?.value;
    const isSick = type === "sick";
    const isDispensation = type === "dispensation";
    $("absence-severity-wrap")?.classList.toggle("hidden", !isSick);
    if ($("absence-severity")) $("absence-severity").required = isSick;
    $("absence-evidence-wrap")?.classList.toggle("hidden", !isSick);
    if ($("absence-medical-file")) {
        $("absence-medical-file").required = isSick;
        if (!isSick) $("absence-medical-file").value = "";
    }
    $("absence-dispensation-hint")?.classList.toggle("hidden", !isDispensation);
    if ($("absence-date")) {
        $("absence-date").disabled = isDispensation;
        if (isDispensation) $("absence-date").value = localDateKey();
    }
}

async function getFreshDispensationLocation() {
    if (!navigator.geolocation) throw new Error("Perangkat ini tidak mendukung pemeriksaan GPS.");
    const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, error => {
            const messages = {
                1: "Izin lokasi ditolak. Aktifkan izin lokasi pada browser.",
                2: "Lokasi perangkat belum tersedia. Coba lagi di area terbuka.",
                3: "Pemeriksaan GPS melewati batas waktu. Coba lagi."
            };
            reject(new Error(messages[error.code] || "Lokasi perangkat gagal diperiksa."));
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 });
    });
    const coords = position.coords;
    if (![coords.latitude, coords.longitude, coords.accuracy].every(Number.isFinite) ||
        coords.accuracy <= 0 || coords.accuracy > 35) {
        throw new Error("Akurasi GPS harus 35 meter atau lebih baik untuk mengajukan dispensasi.");
    }
    return {
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy,
        gpsTimestamp: position.timestamp
    };
}

async function submitStudentAbsence(event) {
    event.preventDefault();
    if (!state.user || state.user.role !== "siswa") { toast(tr("absenceSubmitFailed"), "error"); return; }
    const button = $("btn-submit-absence");
    const status = $("absence-form-status");
    const type = $("absence-type").value;
    const file = $("absence-medical-file")?.files?.[0] || null;
    const body = { date: type === "dispensation" ? localDateKey() : $("absence-date").value, type, note: $("absence-note").value.trim() };
    if (type === "sick") {
        body.severity = $("absence-severity").value;
        if (!file || !["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) {
            toast("Surat dokter wajib dilampirkan dalam format PDF, JPG, atau PNG dengan ukuran maksimal 5 MB.", "error");
            $("absence-medical-file")?.focus(); return;
        }
    }
    if (!body.date || !body.note) { toast(tr("absenceRequired"), "error"); return; }
    button.disabled = true;
    status.textContent = type === "dispensation" ? "Memeriksa presensi dan lokasi sekolah..." : tr("absenceSending");
    try {
        if (type === "sick") {
            status.textContent = "Memvalidasi dan mengunggah surat dokter secara privat...";
            const evidenceRequestId = createIdempotencyKey();
            const signed = await cloudRequest("/api/absence", { method: "POST", role: "siswa", body: { action: "medical-evidence-sign", request_id: evidenceRequestId, mime_type: file.type, file_size: file.size } });
            const uploadResponse = await fetch(signed.upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
            if (!uploadResponse.ok) throw new Error("Surat dokter gagal diunggah. Periksa koneksi lalu coba kembali.");
            body.evidence_request_id = evidenceRequestId;
            body.medical_evidence_path = signed.path;
        }
        if (type === "dispensation") Object.assign(body, await getFreshDispensationLocation());
        status.textContent = "Mengirim pengajuan ke wali kelas...";
        const result = await cloudRequest("/api/absence", { method: "POST", role: "siswa", body });
        status.textContent = tr("absenceSubmitted");
        $("absence-note").value = "";
        if (type === "sick" && $("absence-medical-file")) $("absence-medical-file").value = "";
        toast(type === "dispensation" ? "Pengajuan dispensasi terkirim ke wali kelas." : type === "sick" ? "Surat dokter terlampir. Pengajuan sakit langsung dikirim ke wali kelas." : tr("absenceSubmitted"), "success");
        if (result.whatsapp?.error) toast(tr("absenceWhatsappFailed"), "error");
        if (!result.teacher_notification?.created) toast("Pengajuan tersimpan, tetapi notifikasi wali kelas belum terkonfirmasi. Hubungi Admin.", "warning");
        await loadStudentAbsenceRequests({ silent: true });
    } catch (error) {
        status.textContent = error.message || tr("absenceSubmitFailed");
        toast(status.textContent, "error");
    } finally { button.disabled = false; }
}
async function loadAbsenceRequests({ silent = false } = {}) {
    startAbsenceSync();
    const tbody = $("absence-requests-tbody");
    if (!tbody || state.user?.role !== "guru") return;
    try {
        const result = await cloudRequest("/api/absence", { role: "guru" });
        const rows = Array.isArray(result.requests) ? result.requests : [];
        const notices = Array.isArray(result.notifications) ? result.notifications : [];
        if (notices.length) {
            const noticeSummary = notices.slice(0, 3).map(item => item.title + ": " + item.body).join(" · ");
            toast(noticeSummary, "info");
        }
        tbody.innerHTML = rows.map(item => {
            const typeLabel = item.absence_type === "dispensation"
                ? "Dispensasi" : tr("absenceType_" + item.absence_type);
            const severity = ({ mild: "Ringan", moderate: "Sedang", severe: "Berat" })[item.severity];
            const detailType = typeLabel + (severity ? " · " + severity : "");
            const statusLabel = item.status === "revoked" ? "Dicabut oleh wali kelas" : tr("absenceStatus_" + item.status);
            let action = item.status === "pending"
                ? '<button class="button subtle" type="button" data-absence-review="approved" data-absence-id="' + safeText(item.id) + '">' + safeText(tr("approveAbsence")) + '</button> <button class="button danger-outline" type="button" data-absence-review="rejected" data-absence-id="' + safeText(item.id) + '">' + safeText(tr("rejectAbsence")) + '</button>'
                : item.status === "approved"
                    ? '<button class="button danger-outline" type="button" data-absence-review="revoked" data-absence-id="' + safeText(item.id) + '">Cabut persetujuan</button>'
                    : safeText(statusLabel);
            if (item.absence_type === "sick" && item.medical_evidence_uploaded) {
                action += ' <button class="button subtle" type="button" data-medical-evidence-view="' + safeText(item.id) + '">Lihat surat dokter</button>';
            }
            return '<tr><td>' + safeText(item.name) + '</td><td>' + safeText(item.class_name) + '</td><td>' +
                safeText(formatDate(item.absence_date)) + '</td><td>' + safeText(detailType) + '</td><td>' +
                safeText(item.note) + '</td><td>' + safeText(statusLabel) + '</td><td>' + action + '</td></tr>';
        }).join("");
        $("absence-requests-empty")?.classList.toggle("hidden", rows.length > 0);
    } catch (error) {
        console.error("Absence request load failed:", error);
        if (!silent) toast(tr("absenceLoadFailed"), "error");
    }
}

async function handleAbsenceReview(event) {
    const evidenceButton = event.target.closest("[data-medical-evidence-view]");
    if (evidenceButton) {
        evidenceButton.disabled = true;
        const opened = window.open("about:blank", "_blank");
        if (opened) opened.opener = null;
        try {
            const result = await cloudRequest("/api/absence", {
                method: "POST", role: "guru",
                body: { action: "medical-evidence-view", request_id: evidenceButton.dataset.medicalEvidenceView }
            });
            if (opened) opened.location.href = result.url;
            else toast("Browser memblokir tab baru. Izinkan pop-up untuk membuka surat dokter.", "warning");
        } catch (error) {
            opened?.close();
            toast(error.message || "Surat dokter gagal dibuka.", "error");
        } finally {
            evidenceButton.disabled = false;
        }
        return;
    }
    const button = event.target.closest("[data-absence-review]");
    if (!button) return;
    const nextStatus = button.dataset.absenceReview;
    if (nextStatus === "revoked" && !window.confirm("Cabut persetujuan pengajuan ini? Status terbaru akan langsung terlihat oleh siswa.")) return;
    button.disabled = true;
    try {
        await cloudRequest("/api/absence", {
            method: "PATCH", role: "guru",
            body: { id: button.dataset.absenceId, status: nextStatus }
        });
        toast(nextStatus === "revoked" ? "Persetujuan berhasil dicabut. Status siswa telah diperbarui." : tr("absenceReviewSaved"), "success");
        await loadAbsenceRequests();
    } catch (error) {
        toast(error.message || tr("absenceReviewFailed"), "error");
        button.disabled = false;
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
    const email = $("input-student-email").value.trim().toLowerCase();
    const password = $("input-student-password").value;

    if (!nisn || !name || !className) {
        toast(tr("invalidNisn"), "error");
        return;
    }
    if (!/^\d{8,20}$/.test(nisn)) {
        toast(tr("invalidNisn"), "error");
        $("input-nisn").focus();
        return;
    }
    if (!name || name.length > 120 || /[\u0000-\u001F\u007F]/.test(name)) {
        toast("Nama siswa wajib diisi dengan benar.", "error");
        $("input-nama").focus();
        return;
    }
    if (state.faceUpdateNisn) {
        if (!state.faceSamples.length || state.faceSamples.length !== 5 ||
            !["front", "left", "right", "up", "down"].every(angle => state.faceSampleAngles.includes(angle))) {
            toast(tr("faceTurnAngle"), "error");
            return;
        }
        try {
            const result = await cloudRequest("/api/students", {
                method: "PATCH", role: "guru",
                body: { nisn: state.faceUpdateNisn, model_key: "auraface-glintr100-int8-v1", face_embeddings: state.faceSamples }
            });
            state.students = state.students.map(student => student.nisn === state.faceUpdateNisn
                ? normalizeCloudStudent(result.student) : student);
            state.faceSamples = [];
            state.faceSampleAngles = [];
            state.faceImageHashes = new Set();
            state.faceCandidate = null;
            state.faceCandidateQuality = null;
            setFaceUpdateMode(false);
            $("student-form").reset();
            $("form-face-status").textContent = tr("noFaceSample");
            updateFaceSampleCount();
            renderStudentList();
            toast(tr("faceUpdateSaved"), "success");
        } catch (error) {
            toast(error.message || tr("faceUpdateFailed"), "error");
        }
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast("Masukkan email akun siswa yang valid.", "error");
        $("input-student-email").focus();
        return;
    }
    if (password.length < 8 || password.length > 128) {
        toast("Kata sandi awal siswa harus terdiri dari 8–128 karakter.", "error");
        $("input-student-password").focus();
        return;
    }
    if (parentWhatsApp && !/^(08|628)\d{8,13}$/.test(parentWhatsApp)) {
        toast(tr("invalidWhatsApp"), "error");
        return;
    }
    if (state.faceSamples.length !== 5 ||
        !["front", "left", "right", "up", "down"].every(angle => state.faceSampleAngles.includes(angle))) {
        toast(tr("faceTurnAngle"), "error");
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
                parent_whatsapp: parentWhatsApp ? parentWhatsApp.replace(/^08/, "628") : undefined,
                email,
                password,
                model_key: "auraface-glintr100-int8-v1",
                face_embeddings: state.faceSamples
            }
        });
        state.students = [
            normalizeCloudStudent(response.student),
            ...state.students.filter(student => student.nisn !== nisn)
        ];
    } catch (error) {
        console.error("Student registration failed:", error);
        toast(error.message || tr("cloudSaveFailed"), "error");
        return;
    }

    state.faceSamples = [];
    state.faceSampleAngles = [];
    state.faceImageHashes = new Set();
    state.faceCandidate = null;
    state.faceCandidateQuality = null;
    state.formStableFrames = 0;
    state.lastFormNose = null;
    $("student-form").reset();
    $("form-face-status").textContent = tr("noFaceSample");
    updateFaceSampleCount();
    renderStudentList();
    renderDatabase();
    updateStudentProfile();
    updateStats();
    toast(tr("studentSaved"), "success");
}

function setFaceUpdateMode(enabled) {
    state.faceUpdateNisn = enabled ? state.faceUpdateNisn : null;
    ["input-nisn", "input-nama", "input-kelas", "input-parent-wa"].forEach(id => {
        const input = $(id);
        if (input) input.disabled = enabled;
    });
    ["input-student-email", "input-student-password"].forEach(id => {
        const input = $(id);
        const label = document.querySelector('label[for="' + id + '"]');
        if (input) { input.disabled = enabled; input.required = !enabled; input.classList.toggle("hidden", enabled); }
        if (label) label.classList.toggle("hidden", enabled);
    });
    const submit = $("student-form")?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = enabled ? tr("replaceFace") : tr("saveStudent");
}

function beginFaceUpdate(nisn) {
    const student = state.students.find(item => item.nisn === nisn);
    if (!student) return;
    stopAllCameras();
    state.faceSamples = [];
    state.faceSampleAngles = [];
    state.faceImageHashes = new Set();
    state.faceCandidate = null;
    state.faceCandidateQuality = null;
    state.faceUpdateNisn = nisn;
    $("input-nisn").value = student.nisn;
    $("input-nama").value = student.name;
    $("input-kelas").value = student.className;
    $("input-parent-wa").value = student.parentWhatsApp || "";
    setFaceUpdateMode(true);
    $("form-face-status").textContent = tr("faceUpdateMode");
    updateFaceSampleCount();
    document.querySelector('[data-target="view-formulir"]')?.click();
}

function openMap() {
    stopAllCameras();
    $("map-modal").classList.remove("hidden");
    setMapStatus();
    $("school-location-editor").classList.add("hidden");
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
                if (!state.mapEditMode || state.user?.role !== "admin") return;
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
    if ($("allowed-radius")) {
        $("allowed-radius").textContent = tr("allowedRadius", { radius: SCHOOL_LOCATION.radius });
    }
    updateMapText();
    updateSchoolLocationEditor();
}

async function saveSchoolLocation() {
    if (!state.mapDraftLocation || state.user?.role !== "admin") return;
    const button = $("btn-save-school-location");
    button.disabled = true;
    $("school-location-edit-status").textContent = tr("locationSaving");
    try {
        const saved = await cloudRequest("/api/settings", {
            method: "PUT",
            role: "admin",
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
    if ($("map-subtitle")) $("map-subtitle").textContent = tr("mapDesc");
    const locationDetail = $("map-location-detail");
    if (locationDetail) locationDetail.textContent = state.lastLocation && !state.lastLocation.error && !state.lastLocation.checking
        ? !isGpsAccuracyAcceptable(state.lastLocation.accuracy, SCHOOL_LOCATION.radius)
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
    if ($("allowed-radius")) {
        $("allowed-radius").textContent = tr("allowedRadius", { radius: SCHOOL_LOCATION.radius });
    }
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
        } else if (!isGpsAccuracyAcceptable(result.accuracy, SCHOOL_LOCATION.radius)) {
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

// Authentication modal: public self-signup is intentionally disabled.
// Teachers are created by Admin; student accounts are created by authenticated teachers.
function openAuthModal(trigger = document.activeElement) {
    authModalTrigger = trigger;
    $("login-form").reset();
    $("auth-modal-title").textContent = `${tr("login")} Amanah ID`;
    $("auth-modal").classList.remove("hidden");
    document.body.classList.add("auth-modal-open");
    void refreshLoginCaptcha();
    requestAnimationFrame(() => $("login-email").focus());
}

function closeAuthModal() {
    const modal = $("auth-modal");
    modal?.classList.add("hidden");
    document.body.classList.remove("auth-modal-open");
    state.loginCaptchaToken = null;
    state.loginCaptchaRequestId++;
    if (authModalTrigger?.isConnected && !authModalTrigger.hidden) authModalTrigger.focus();
    authModalTrigger = null;
}

function cssTimeInMs(value) {
    const time = Number.parseFloat(value);
    if (!Number.isFinite(time)) return 0;
    return value.trim().endsWith("ms") ? time : time * 1000;
}

function initSplashScreen() {
    const splash = $("splash-screen");
    if (!splash || splash.classList.contains("hidden")) return;
    if (state.runtimeFeatures?.splash_animation === false) return hideSplashScreen();
    clearSplashTimers();
    const mark = splash.querySelector(".splash-mark");
    const brand = splash.querySelector(".splash-text");
    const lockup = splash.querySelector(".splash-lockup");
    const headerMark = document.querySelector(".brand-auth");
    const fontReady = document.fonts?.ready || Promise.resolve();
    let fontTimeout;
    const fontsReady = new Promise(resolve => {
        fontTimeout = window.setTimeout(resolve, 900);
        Promise.resolve(fontReady).then(resolve, resolve);
    }).finally(() => window.clearTimeout(fontTimeout));
    const safetyTimer = window.setTimeout(() => {
        clearSplashTimers();
        splash.classList.add("is-leaving", "hidden");
        splash.setAttribute("aria-hidden", "true");
    }, 5000);
    state.splashTimers.push(safetyTimer);

    void fontsReady.then(() => new Promise(resolve => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
    })).then(() => {
        if (!splash.isConnected || splash.classList.contains("hidden")) return;
        if (mark && headerMark && lockup) {
            const targetRect = headerMark.getBoundingClientRect();
            const lockupRect = lockup.getBoundingClientRect();
            if (targetRect.width > 0 && targetRect.height > 0 && lockupRect.width > 0 && lockupRect.height > 0) {
                const scale = Math.min(1, targetRect.width / lockupRect.width);
                const groupCenterX = lockupRect.left + lockupRect.width / 2;
                const groupCenterY = lockupRect.top + lockupRect.height / 2;
                const targetCenterX = targetRect.left + targetRect.width / 2;
                const targetCenterY = targetRect.top + targetRect.height / 2;
                splash.style.setProperty("--splash-target-x", (targetCenterX - groupCenterX) + "px");
                splash.style.setProperty("--splash-target-y", (targetCenterY - groupCenterY) + "px");
                splash.style.setProperty("--splash-target-scale", String(scale));
            }
        }
        splash.classList.add("is-playing");
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        const motionElements = [lockup, mark, brand].filter(Boolean);
        const animationMs = reducedMotion ? 1 : Math.max(0, ...motionElements.map(element => {
            const style = getComputedStyle(element);
            return cssTimeInMs(style.animationDuration) + cssTimeInMs(style.animationDelay);
        }));
        const transitionMs = cssTimeInMs(getComputedStyle(splash).transitionDuration);
        const leaveTimer = window.setTimeout(() => {
            if (!splash.isConnected || splash.classList.contains("hidden")) return;
            splash.classList.add("is-leaving");
            const hideTimer = window.setTimeout(() => {
                if (!splash.isConnected || splash.classList.contains("hidden")) return;
                splash.classList.add("hidden");
                splash.setAttribute("aria-hidden", "true");
                clearSplashTimers();
            }, transitionMs + 50);
            state.splashTimers.push(hideTimer);
        }, animationMs + 100);
        state.splashTimers.push(leaveTimer);
    }).catch(error => {
        console.error("Splash animation could not be initialized; hiding it safely:", error);
        clearSplashTimers();
        splash.classList.add("is-leaving", "hidden");
        splash.setAttribute("aria-hidden", "true");
    });
}

function clearSplashTimers() {
    state.splashTimers.forEach(timer => window.clearTimeout(timer));
    state.splashTimers = [];
}

async function copyTextToClipboard(value) {
    if (typeof value !== "string" || !value.trim()) throw new Error("Tidak ada teks yang dapat disalin.");
    if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return;
    }
    const temporary = document.createElement("textarea");
    temporary.value = value;
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.append(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    if (!copied) throw new Error("Browser tidak mengizinkan penyalinan otomatis.");
}

function setupEvents() {
    document.querySelectorAll("[data-copy-target]").forEach(button => {
        button.addEventListener("click", async () => {
            const value = $(button.dataset.copyTarget)?.textContent?.trim() ?? "";
            try {
                await copyTextToClipboard(value);
                toast(`${button.dataset.copyTarget === "admin-demo-email" ? "Email" : "Password"} demo berhasil disalin.`, "success");
            } catch (error) {
                console.error("Credential copy failed:", error);
                toast(error?.message ?? "Kredensial gagal disalin.", "error");
            }
        });
    });
    $("tab-login").addEventListener("click", () => openAuthModal($("tab-login")));
    $("close-auth-modal").addEventListener("click", closeAuthModal);
    $("auth-modal").addEventListener("click", event => {
        if (event.target === $("auth-modal")) closeAuthModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !$("auth-modal").classList.contains("hidden")) closeAuthModal();
    });
    $("model-retry").addEventListener("click", async () => {
        const button = $("model-retry");
        button.disabled = true;
        try {
            state.faceDetectorFailed = false;
            state.faceRecognitionFailed = false;
            state.faceDetectorReady = false;
            state.faceRecognitionReady = false;
            state.modelReady = false;
            state.faceEngine = null;
            const loaded = await loadModels();
            if (loaded) toast("Model ArcFace siap digunakan.", "success");
            else toast("Model belum berhasil dimuat. Periksa koneksi lalu coba lagi.", "error");
        } finally {
            button.disabled = false;
        }
    });
    $("login-captcha-refresh").addEventListener("click", () => void refreshLoginCaptcha());

    $("login-form").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.querySelector('button[type="submit"]')?.disabled) return;
        if (!state.loginCaptchaToken) {
            toast(tr("captchaUnavailable"), "error");
            void refreshLoginCaptcha();
            return;
        }

        const email = $("login-email").value.trim().toLowerCase();
        const password = $("login-password").value;
        const captchaAnswer = $("login-captcha-answer").value.trim();
        setAuthFormBusy(form, true);
        try {
            const result = await cloudRequest("/api/auth/login", {
                method: "POST",
                body: {
                    email,
                    password: await passwordDigest(password),
                    captchaToken: state.loginCaptchaToken,
                    captchaAnswer
                }
            });
            state.loginCaptchaToken = null;
            await showApp({ ...result.user, token: result.token });
            closeAuthModal();
            form.reset();
        } catch (error) {
            console.error("Login failed:", error);
            $("login-password").value = "";
            const message = String(error?.message || "");
            toast(message.startsWith("CAPTCHA_INVALID:")
                ? message.replace(/^CAPTCHA_INVALID:\s*/, "")
                : (message || tr("loginFailed")), "error");
        } finally {
            if (!$("auth-modal").classList.contains("hidden")) await refreshLoginCaptcha();
            setAuthFormBusy(form, false);
        }
    });

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
    });

    document.querySelectorAll("#dashboard-guru .nav-link[data-target], #dashboard-siswa .nav-link[data-target]").forEach(btn => {
        btn.addEventListener("click", () => showView(btn.dataset.target));
    });
    document.querySelectorAll("#dashboard-admin .nav-link[data-admin-target]").forEach(btn => {
        btn.addEventListener("click", () => showAdminView(btn.dataset.adminTarget));
    });
    const updateAdminStudentFields = () => {
        const isStudent = $("admin-user-role").value === "siswa";
        $("admin-student-fields").classList.toggle("hidden", !isStudent);
        $("admin-student-fields").setAttribute("aria-hidden", String(!isStudent));
        $("admin-user-nisn").required = isStudent;
        $("admin-user-class").required = isStudent;
    };
    $("admin-user-role").addEventListener("change", updateAdminStudentFields);
    updateAdminStudentFields();
    $("admin-user-form").addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.querySelector('button[type="submit"]')?.disabled) return;
        const role = $("admin-user-role").value;
        const body = {
            role,
            email: $("admin-user-email").value.trim().toLowerCase(),
            name: $("admin-user-name").value.trim(),
            password: $("admin-user-password").value
        };
        if (role === "siswa") {
            body.nisn = $("admin-user-nisn").value.trim();
            body.class_name = $("admin-user-class").value.trim();

            const parentWhatsApp = $("admin-user-parent-whatsapp").value.trim();
            if (parentWhatsApp && !/^(08|628)\d{8,13}$/.test(parentWhatsApp)) {
                toast(tr("invalidWhatsApp"), "error");
                $("admin-user-parent-whatsapp").focus();
                return;
            }
            if (parentWhatsApp) body.parent_whatsapp = parentWhatsApp.replace(/^08/, "628");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
            toast("Masukkan email akun yang valid.", "error");
            $("admin-user-email").focus();
            return;
        }
        if (body.password.length < 8 || body.password.length > 128) {
            toast("Kata sandi awal harus terdiri dari 8–128 karakter.", "error");
            $("admin-user-password").focus();
            return;
        }
        if (role === "siswa" && !/^[0-9]{8,20}$/.test(body.nisn)) {
            toast("NISN siswa harus terdiri dari 8–20 digit.", "error");
            $("admin-user-nisn").focus();
            return;
        }
        setAuthFormBusy(form, true);
        try {
            await cloudRequest("/api/admin/users", { method: "POST", body });
            form.reset();
            updateAdminStudentFields();
            await loadAdminUsers();
            await loadAdminDashboard();
            toast(tr(role === "siswa" ? "studentAccountCreated" : "teacherAccountCreated"), "success");
        } catch (error) {
            console.error("Admin user creation failed:", error);
            toastAdminError(error);
        } finally {
            setAuthFormBusy(form, false);
        }
    });
    $("admin-users-tbody").addEventListener("click", async event => {
        const button = event.target.closest("[data-admin-edit], [data-admin-disable], [data-admin-set-active], [data-admin-permanent-delete]");
        if (!button) return;
        const id = button.dataset.adminEdit || button.dataset.adminDisable || button.dataset.adminSetActive || button.dataset.adminPermanentDelete;
        const table = button.dataset.table;
        if (button.hasAttribute("data-admin-set-active") || button.hasAttribute("data-admin-disable")) {
            const nextActive = button.dataset.active !== "true";
            const confirmed = await openAppDialog({
                title: nextActive ? "Aktifkan kembali akun?" : "Nonaktifkan akun?",
                description: nextActive
                    ? "Akun dapat login kembali setelah statusnya diaktifkan."
                    : "Akun segera kehilangan akses. Jika sedang login, browser akan mengeluarkan akun pada pemeriksaan sesi berikutnya.",
                confirmLabel: nextActive ? "Aktifkan" : "Nonaktifkan",
                cancelLabel: "Batal", danger: !nextActive, icon: nextActive ? "✓" : "!"
            });
            if (confirmed === null) return;
            try {
                await cloudRequest("/api/admin/users", {
                    method: "PUT",
                    body: { action: "set_active", id, table, is_active: nextActive }
                });
                toast(nextActive ? "Akun berhasil diaktifkan kembali." : "Akun berhasil dinonaktifkan.", "success");
            } catch (error) { toastAdminError(error); return; }
        } else if (button.hasAttribute("data-admin-permanent-delete")) {
            const confirmed = await openAppDialog({
                title: "Hapus akun secara permanen?",
                description: "Tindakan ini tidak dapat dibatalkan. Data dengan riwayat presensi, pengajuan ketidakhadiran, notifikasi, atau relasi Wali Kelas akan ditolak agar arsip sekolah tidak rusak.",
                fields: [{ name: "confirm_email", label: "Ketik email akun untuk konfirmasi: " + (button.dataset.email || ""), type: "email", placeholder: button.dataset.email || "", autocomplete: "off", minLength: 3 }],
                confirmLabel: "Hapus permanen", cancelLabel: "Batal", danger: true, icon: "!"
            });
            if (!confirmed?.confirm_email) return;
            try {
                await cloudRequest("/api/admin/users?action=permanent-delete", {
                    method: "POST",
                    body: { id, table, confirm_email: confirmed.confirm_email.trim() }
                });
                toast("Akun berhasil dihapus permanen.", "success");
            } catch (error) { toastAdminError(error); return; }
        } else {
            const fields = [
                { name: "email", label: "Email baru", type: "email", placeholder: "email@sekolah.id", autocomplete: "email" },
                { name: "name", label: "Nama lengkap baru", type: "text", placeholder: "Nama pengguna", autocomplete: "name" },
                { name: "password", label: "Kata sandi baru", type: "password", placeholder: "Kosongkan jika tidak diubah", autocomplete: "new-password", minLength: 8 }
            ];
            if (table === "students") {
                fields.push({
                    name: "parent_whatsapp", label: "WhatsApp orang tua", type: "tel",
                    placeholder: "08xxxxxxxxxx atau 628xxxxxxxxxx",
                    value: button.dataset.parentWhatsapp || "", pattern: "(08|628)[0-9]{8,13}"
                });
                const currentClass = (button.dataset.className || "").trim();
                const walasOptions = [
                    { value: "", label: "Belum ditetapkan" },
                    ...state.adminTeachers.filter(teacher =>
                        (teacher.is_active && (!teacher.homeroom_class || teacher.homeroom_class.trim() === currentClass)) ||
                        teacher.id === (button.dataset.currentHomeroom || "")
                    ).map(teacher => ({
                        value: teacher.id,
                        label: (teacher.name || teacher.email) + (teacher.homeroom_class ? " · " + teacher.homeroom_class : " · kelas akan mengikuti siswa")
                    }))
                ];
                fields.push({ name: "homeroom_teacher_id", label: "Wali kelas", type: "select", value: button.dataset.currentHomeroom || "", options: walasOptions });
            }
            const result = await openAppDialog({
                title: "Ubah akun",
                description: "Isi hanya data yang ingin diubah. Kolom kosong tidak akan mengubah data saat ini.",
                fields, confirmLabel: "Simpan perubahan", cancelLabel: "Batal", icon: "✎"
            });
            if (result === null) return;
            const body = { id, table };
            if (result.email.trim()) body.email = result.email.trim();
            if (result.name.trim()) body.name = result.name.trim();
            if (result.password) body.password = result.password;
            if (result.parent_whatsapp !== undefined) {
                const normalized = result.parent_whatsapp.trim();
                if (normalized && !/^(08|628)\d{8,13}$/.test(normalized)) {
                    toast(tr("invalidWhatsApp"), "error"); return;
                }
                body.parent_whatsapp = normalized.replace(/^08/, "628");
            }
            if (result.homeroom_teacher_id && result.homeroom_teacher_id !== (button.dataset.currentHomeroom || "")) body.homeroom_teacher_id = result.homeroom_teacher_id;
            if (!body.email && !body.name && !body.password && body.parent_whatsapp === undefined && body.homeroom_teacher_id === undefined) {
                toast("Tidak ada perubahan yang dimasukkan.", "info"); return;
            }
            try {
                await cloudRequest("/api/admin/users", { method: "PUT", body });
                toast("Data akun berhasil diperbarui.", "success");
            } catch (error) { toastAdminError(error); return; }
        }
        await loadAdminUsers();
        await loadAdminDashboard();
    });
    $("admin-settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        const body = {
            lat: Number($("admin-setting-lat").value),
            lng: Number($("admin-setting-lng").value),
            radius: Number($("admin-setting-radius").value),
            timezone: $("admin-setting-timezone").value.trim(),
            entry_time: $("admin-setting-entry-time").value,
            late_tolerance_min: Number($("admin-setting-tolerance").value)
        };
        const submitButton = $("admin-settings-form").querySelector('button[type="submit"]');
        const status = $("admin-settings-status");
        const originalLabel = submitButton?.textContent || tr("saveSettings");
        if (submitButton) { submitButton.disabled = true; submitButton.textContent = tr("adminSettingsSaving"); }
        if (status) status.textContent = tr("adminSettingsSaving");
        try {
            const saved = await cloudRequest("/api/admin/settings", { method: "PUT", body });
            SCHOOL_LOCATION = { ...SCHOOL_LOCATION, ...saved };
            syncAdminSettingsMap({ center: true });
            const mapStatus = $("admin-school-map-status");
            if (mapStatus) mapStatus.textContent = tr("adminMapSaved");
            if (status) status.textContent = tr("adminSettingsSaved");
            toast(tr("settingsSaved"), "success");
        } catch (error) {
            if (status) status.textContent = error.message || "Pengaturan sekolah gagal disimpan.";
            toastAdminError(error);
        } finally {
            if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalLabel; }
        }
    });
    $("admin-audit-filter").addEventListener("click", () => void loadAdminAudit());
    $("admin-export-users").addEventListener("click", () => exportTableCsv("admin-users-tbody", "amanah-id-daftar-akun.csv"));
    $("admin-export-audit").addEventListener("click", () => exportTableCsv("admin-audit-tbody", "amanah-id-audit-aktivitas.csv"));
    $("admin-health-refresh").addEventListener("click", () => void loadAdminDashboard());
    $("admin-user-role")?.addEventListener("change", updateAdminCreationControls);
    $("admin-governance-controls")?.addEventListener("change", event => {
        const input = event.target.closest("input[data-feature-key]");
        if (input) void saveAdminFeatureToggle(input);
    });
    $("admin-governance-reset")?.addEventListener("click", () => void loadAdminFeatures());
    $("admin-test-camera-start")?.addEventListener("click", () => void startAdminTestCamera());
    $("admin-test-camera-stop")?.addEventListener("click", stopAdminTestCamera);
    $("admin-test-gps-run")?.addEventListener("click", () => void testAdminGps());
    $("admin-map-check-location")?.addEventListener("click", () => void checkAdminMapDeviceLocation());
    $("admin-test-open-settings")?.addEventListener("click", () => showAdminView("admin-view-settings"));
    $("admin-test-services-run")?.addEventListener("click", () => void runAdminServiceChecks());
    $("admin-test-whatsapp-template")?.addEventListener("input", () => {
        $("admin-test-whatsapp-template").dataset.userEdited = "true";
        updateAdminWhatsAppPreview();
        updateAdminWhatsAppTestControls();
    });
    $("admin-test-whatsapp-number")?.addEventListener("input", updateAdminWhatsAppTestControls);
    $("admin-test-whatsapp-consent")?.addEventListener("change", updateAdminWhatsAppTestControls);
    $("admin-test-whatsapp-send")?.addEventListener("click", () => void sendAdminWhatsAppTest());
    $("admin-profile-form").addEventListener("submit", async event => {
        event.preventDefault();
        const password = $("admin-new-password").value;
        if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
            !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            toast("Kata sandi harus 12+ karakter dan berisi huruf besar/kecil, angka, serta simbol.", "error");
            return;
        }
        try {
            await cloudRequest("/api/admin/profile", {
                method: "PUT",
                body: {
                    current_password: await passwordDigest($("admin-current-password").value),
                    password
                }
            });
            $("admin-profile-form").reset();
            toast("Kata sandi Admin berhasil diubah.", "success");
        } catch (error) {
            toastAdminError(error);
        }
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
    $("admin-logout").addEventListener("click", () => {
        showAuth();
        toast(tr("loggedOut"), "info");
    });
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

    $("photo-upload").addEventListener("change", event => {
        readUploadedFaces(Array.from(event.target.files || []));
        event.target.value = "";
    });

    $("student-form").addEventListener("submit", registerStudent);
    $("student-absence-form")?.addEventListener("submit", submitStudentAbsence);
    $("absence-type")?.addEventListener("change", updateAbsenceTypeFields);
    updateAbsenceTypeFields();

    $("btn-refresh-absence-requests")?.addEventListener("click", loadAbsenceRequests);
    $("absence-requests-tbody")?.addEventListener("click", handleAbsenceReview);
    document.addEventListener("visibilitychange", syncAbsenceOnReturn);
    window.addEventListener("focus", syncAbsenceOnReturn);
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
            toast(error.message || tr("cloudDeleteFailed"), "error");
            return;
        }
        state.attendance = state.attendance.filter(a => a.id !== button.dataset.deleteAttendance);
        renderDatabase();
        updateStats();
        toast(tr("attendanceDeleted"), "success");
    });

    $("students-tbody").addEventListener("click", async event => {
        const deactivate = event.target.closest("[data-deactivate-student]");
        if (deactivate) {
            if (state.user?.role !== "guru") return;
            const nisn = deactivate.dataset.deactivateStudent;
            const confirmed = await openAppDialog({
                title: "Nonaktifkan akun siswa?",
                description: "Siswa tidak dapat login sampai Admin mengaktifkannya kembali. Riwayat presensi tetap disimpan.",
                confirmLabel: "Nonaktifkan", cancelLabel: "Batal", danger: true, icon: "!"
            });
            if (confirmed === null) return;
            deactivate.disabled = true;
            try {
                await cloudRequest("/api/students", { method: "PATCH", body: { action: "deactivate", nisn } });
                state.students = state.students.filter(student => student.nisn !== nisn);
                renderStudentList();
                toast("Akun siswa dinonaktifkan. Admin tetap dapat mengaktifkannya kembali.", "success");
            } catch (error) {
                toastAdminError(error);
            } finally {
                deactivate.disabled = false;
            }
            return;
        }
        const editFace = event.target.closest("[data-edit-student-face]");
        if (editFace) beginFaceUpdate(editFace.dataset.editStudentFace);
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
        if (state.user?.role !== "admin") return;
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
    window.addEventListener("pagehide", () => {
        clearSplashTimers();
        const splash = $("splash-screen");
        if (splash) {
            splash.classList.add("hidden");
            splash.setAttribute("aria-hidden", "true");
        }
    }, { once: true });
    window.addEventListener("beforeunload", clearSplashTimers, { once: true });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopAllCameras();
    });
    window.addEventListener("pagehide", stopAllCameras);
    window.addEventListener("beforeunload", stopAllCameras);
    window.addEventListener("hashchange", handleHashRoute);
}

function initialize() {
    // Bind controls before optional rendering/localization so one startup error
    // cannot leave the entire interface looking interactive but inert.
    try {
        setupAppDialog();
    } catch (error) {
        console.error("Optional dialog initialization failed:", error);
    }

    try {
        initSplashScreen();
    } catch (error) {
        console.error("Splash initialization failed:", error);
        const splash = $("splash-screen");
        splash?.classList.add("hidden");
        splash?.setAttribute("aria-hidden", "true");
    }

    try {
        setTheme("light");
    } catch (error) {
        console.error("Theme initialization failed:", error);
    }

    try {
        setupEvents();
    } catch (error) {
        console.error("Control binding failed:", error);
        toast("Sebagian kontrol gagal diinisialisasi. Muat ulang halaman dan periksa Console.", "error");
    }

    try {
        setLanguage("id");
    } catch (error) {
        console.error("Language initialization failed:", error);
    }

    void loadRuntimeFeatures().catch(error => console.warn("Runtime feature flags could not be loaded during startup:", error));

    try {
        if ($("absence-date")) $("absence-date").value = localDateKey();
        observeHeroTitleSize();
        showAuth({ clearSession: false });
        renderDatabase();
        renderStudentList();
        renderStudentHistory();
        updateStats();
        setSwitch(false);
        updateFaceSampleCount();
        const modelStatus = $("model-status");
        if (modelStatus) modelStatus.textContent = tr("modelLoading");
        restoreSession();
    } catch (error) {
        console.error("Application initialization failed:", error);
        toast("Aplikasi mengalami kendala saat memuat. Periksa koneksi dan muat ulang halaman.", "error");
    }
}

initialize();