
"use strict";

/* ==================== KONFIGURASI ==================== */

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";
const DEMO_EMAIL = "admin@amanahid.sch.id";
const DEMO_PASSWORD = "AmanahDemo!2026#ID";
const FACE_THRESHOLD = 0.45;
const DETECTION_INTERVAL = 250;

const T = {
    id: {
        subtitle: "Sistem Presensi Wajah", login: "Masuk", register: "Daftar", email: "Email",
        password: "Kata sandi", confirm_password: "Konfirmasi kata sandi", full_name: "Nama lengkap",
        login_btn: "Masuk", register_btn: "Daftar", email_placeholder: "Masukkan email",
        password_placeholder: "Masukkan kata sandi", confirm_placeholder: "Ulangi kata sandi",
        name_placeholder: "Nama lengkap", terms: "Saya menyetujui syarat dan ketentuan.",
        demo_info: "Demo: admin@amanahid.sch.id / AmanahDemo!2026#ID",
        register_note: "Registrasi demo hanya berlaku selama halaman aktif.",
        workspace: "RUANG KERJA", nav_presensi: "Presensi", nav_database: "Database",
        nav_formulir: "Formulir siswa", nav_profile: "Profil & pengaturan", local_mode: "Mode lokal",
        memory_note: "Data hanya tersimpan selama sesi aktif.",
        attendance_label: "MANAJEMEN PRESENSI", attendance_title: "Presensi wajah",
        attendance_desc: "Verifikasi identitas siswa menggunakan kamera.",
        model_waiting: "Model AI belum siap", model_ready: "Model AI siap",
        model_loading: "Memuat model AI...", model_error: "Model AI gagal dimuat. Periksa koneksi internet.",
        live_camera: "Kamera langsung", camera_hint: "Posisikan wajah di tengah kamera.",
        camera_off: "Kamera mati", camera_on: "Kamera aktif", camera_placeholder: "Kamera belum diaktifkan",
        start_camera: "Aktifkan kamera", stop_camera: "Matikan kamera", waiting_face: "Menunggu wajah...",
        no_face: "Wajah tidak terdeteksi", multiple_faces: "Terdeteksi lebih dari satu wajah",
        face_found: "Wajah terdeteksi", face_unknown: "Wajah belum dikenali",
        face_match: "Wajah cocok: {name}", liveness_waiting: "Liveness: menunggu gerakan wajah.",
        liveness_move: "Gerakkan kepala sedikit untuk verifikasi liveness.",
        liveness_pass: "Gerakan terdeteksi. Liveness awal lolos.",
        liveness_fail: "Belum ada gerakan yang cukup. Presensi ditahan.",
        verification: "VERIFIKASI", how_to: "Cara melakukan presensi",
        step_one: "Aktifkan kamera dan izinkan akses.",
        step_two: "Hadapkan wajah ke kamera dengan pencahayaan cukup.",
        step_three: "Gerakkan kepala sedikit agar sistem memeriksa liveness.",
        step_four: "Wajah yang cocok akan dicatat sebagai hadir.",
        privacy_title: "Privasi", privacy_text: "Descriptor wajah dan data presensi disimpan di memori halaman ini, bukan dikirim ke server aplikasi.",
        registered_students: "Siswa terdaftar", records_label: "RIWAYAT & LAPORAN",
        db_title: "Database presensi", db_desc: "Cari, filter, ekspor, dan kelola riwayat kehadiran.",
        total_students: "Total siswa", present_today: "Hadir hari ini",
        attendance_rate: "Persentase kehadiran", total_history: "Total riwayat",
        search_placeholder: "Cari nama, NISN, atau kelas...", date_start: "Tanggal mulai",
        date_end: "Tanggal selesai", export: "Ekspor CSV", delete_all: "Hapus semua",
        number: "No.", nisn: "NISN", name: "Nama", class: "Kelas", status: "Status",
        date: "Tanggal", time: "Waktu", method: "Metode", confidence: "Keyakinan", action: "Aksi",
        no_data: "Belum ada data presensi.", delete_row: "Hapus", records: "catatan",
        student_label: "MANAJEMEN SISWA", form_title: "Formulir siswa",
        form_desc: "Daftarkan identitas dan descriptor wajah siswa.",
        student_identity: "Identitas siswa", nisn_placeholder: "Masukkan NISN",
        student_name_placeholder: "Nama siswa", class_placeholder: "Contoh: XI IPA 1",
        upload_photo: "Unggah foto", upload_hint: "Foto harus memuat tepat satu wajah yang terlihat jelas.",
        save_student: "Simpan data siswa", face_verification: "Verifikasi wajah",
        form_camera_hint: "Gunakan kamera atau unggah foto untuk mengambil descriptor wajah.",
        use_camera: "Gunakan kamera", ai_confidence: "Keyakinan deteksi AI",
        profile_title: "Profil & pengaturan", language: "Bahasa", theme: "Tema",
        light: "Terang", dark: "Gelap", save_profile: "Simpan pengaturan", logout: "Keluar",
        confirm_delete_title: "Hapus seluruh data?",
        confirm_delete_text: "Semua siswa dan riwayat presensi akan dihapus dari memori sesi ini.",
        cancel: "Batal", retry: "Coba lagi",
        toast_login_success: "Login berhasil. Selamat datang.",
        toast_login_fail: "Email atau kata sandi salah.",
        toast_register_success: "Registrasi demo berhasil. Silakan login.",
        toast_register_fail: "Data registrasi tidak valid atau kata sandi tidak cocok.",
        toast_model_loaded: "Model AI berhasil dimuat.",
        toast_model_fail: "Model AI gagal dimuat. Periksa koneksi lalu coba lagi.",
        toast_camera_denied: "Kamera tidak tersedia atau izin ditolak.",
        toast_camera_secure: "Akses kamera memerlukan localhost atau HTTPS.",
        toast_student_saved: "Siswa {name} berhasil didaftarkan.",
        toast_face_not_detected: "Wajah tidak terdeteksi dengan jelas.",
        toast_attendance_success: "Presensi {name} berhasil dicatat.",
        toast_profile_saved: "Pengaturan berhasil disimpan.",
        toast_logout: "Anda telah keluar.",
        toast_fill_all: "Harap isi semua identitas siswa.",
        toast_duplicate_nisn: "NISN tersebut sudah terdaftar.",
        toast_duplicate_attendance: "Presensi siswa ini sudah tercatat hari ini.",
        toast_upload_one_face: "Foto harus berisi tepat satu wajah.",
        toast_need_liveness: "Gerakan wajah diperlukan sebelum presensi.",
        toast_deleted: "Data berhasil dihapus.",
        toast_all_deleted: "Seluruh data siswa dan presensi telah dihapus.",
        toast_csv_empty: "Tidak ada data untuk diekspor.",
        toast_date_invalid: "Tanggal mulai tidak boleh melebihi tanggal selesai.",
        toast_profile_name: "Nama profil tidak boleh kosong.",
        toast_models_wait: "Tunggu sampai model AI selesai dimuat.",
        status_present: "Hadir", method_face: "Pengenalan wajah",
        csv_filename: "laporan-presensi.csv", register_password_mismatch: "Kata sandi tidak cocok."
    },

    en: {
        subtitle: "Facial Attendance System", login: "Login", register: "Register", email: "Email",
        password: "Password", confirm_password: "Confirm password", full_name: "Full name",
        login_btn: "Login", register_btn: "Register", email_placeholder: "Enter email",
        password_placeholder: "Enter password", confirm_placeholder: "Repeat password",
        name_placeholder: "Full name", terms: "I agree to the terms and conditions.",
        demo_info: "Demo: admin@amanahid.sch.id / AmanahDemo!2026#ID",
        register_note: "Demo registration only lasts for the current session.",
        workspace: "WORKSPACE", nav_presensi: "Attendance", nav_database: "Database",
        nav_formulir: "Student form", nav_profile: "Profile & settings", local_mode: "Local mode",
        memory_note: "Data only remains during this session.",
        attendance_label: "ATTENDANCE MANAGEMENT", attendance_title: "Face attendance",
        attendance_desc: "Verify student identity using the camera.",
        model_waiting: "AI model not ready", model_ready: "AI model ready",
        model_loading: "Loading AI models...", model_error: "AI model failed to load. Check your internet connection.",
        live_camera: "Live camera", camera_hint: "Position your face in the center.",
        camera_off: "Camera off", camera_on: "Camera on", camera_placeholder: "Camera is not active",
        start_camera: "Start camera", stop_camera: "Stop camera", waiting_face: "Waiting for a face...",
        no_face: "No face detected", multiple_faces: "More than one face detected",
        face_found: "Face detected", face_unknown: "Face not recognized",
        face_match: "Face matched: {name}", liveness_waiting: "Liveness: waiting for facial movement.",
        liveness_move: "Move your head slightly for liveness verification.",
        liveness_pass: "Movement detected. Initial liveness check passed.",
        liveness_fail: "Insufficient movement. Attendance is on hold.",
        verification: "VERIFICATION", how_to: "How to check in",
        step_one: "Start the camera and allow access.",
        step_two: "Face the camera in adequate lighting.",
        step_three: "Move your head slightly for the liveness check.",
        step_four: "A matched face will be recorded as present.",
        privacy_title: "Privacy", privacy_text: "Face descriptors and attendance data remain in this page's memory and are not sent to an application server.",
        registered_students: "Registered students", records_label: "RECORDS & REPORTS",
        db_title: "Attendance database", db_desc: "Search, filter, export, and manage attendance history.",
        total_students: "Total students", present_today: "Present today",
        attendance_rate: "Attendance rate", total_history: "Total records",
        search_placeholder: "Search name, NISN, or class...", date_start: "Start date",
        date_end: "End date", export: "Export CSV", delete_all: "Delete all",
        number: "No.", nisn: "NISN", name: "Name", class: "Class", status: "Status",
        date: "Date", time: "Time", method: "Method", confidence: "Confidence", action: "Action",
        no_data: "No attendance records yet.", delete_row: "Delete", records: "records",
        student_label: "STUDENT MANAGEMENT", form_title: "Student form",
        form_desc: "Register student details and face descriptor.",
        student_identity: "Student identity", nisn_placeholder: "Enter NISN",
        student_name_placeholder: "Student name", class_placeholder: "Example: Grade 11 A",
        upload_photo: "Upload photo", upload_hint: "The photo must contain exactly one clearly visible face.",
        save_student: "Save student", face_verification: "Face verification",
        form_camera_hint: "Use the camera or upload a photo to extract a face descriptor.",
        use_camera: "Use camera", ai_confidence: "AI detection confidence",
        profile_title: "Profile & settings", language: "Language", theme: "Theme",
        light: "Light", dark: "Dark", save_profile: "Save settings", logout: "Log out",
        confirm_delete_title: "Delete all data?",
        confirm_delete_text: "All students and attendance records will be deleted from this session's memory.",
        cancel: "Cancel", retry: "Retry",
        toast_login_success: "Login successful. Welcome.",
        toast_login_fail: "Incorrect email or password.",
        toast_register_success: "Demo registration successful. Please log in.",
        toast_register_fail: "Invalid registration details or passwords do not match.",
        toast_model_loaded: "AI models loaded successfully.",
        toast_model_fail: "AI model failed to load. Check your connection and retry.",
        toast_camera_denied: "Camera unavailable or permission denied.",
        toast_camera_secure: "Camera access requires localhost or HTTPS.",
        toast_student_saved: "Student {name} registered successfully.",
        toast_face_not_detected: "No clear face detected.",
        toast_attendance_success: "Attendance for {name} recorded.",
        toast_profile_saved: "Settings saved.",
        toast_logout: "You have logged out.",
        toast_fill_all: "Please fill in all student details.",
        toast_duplicate_nisn: "That NISN is already registered.",
        toast_duplicate_attendance: "Attendance is already recorded for this student today.",
        toast_upload_one_face: "The photo must contain exactly one face.",
        toast_need_liveness: "Facial movement is required before attendance.",
        toast_deleted: "Record deleted.",
        toast_all_deleted: "All students and attendance records have been deleted.",
        toast_csv_empty: "There is no data to export.",
        toast_date_invalid: "Start date cannot be later than end date.",
        toast_profile_name: "Profile name cannot be empty.",
        toast_models_wait: "Wait until the AI models finish loading.",
        status_present: "Present", method_face: "Face recognition",
        csv_filename: "attendance-report.csv", register_password_mismatch: "Passwords do not match."
    },

    ar: {
        subtitle: "نظام الحضور بالوجه", login: "تسجيل الدخول", register: "إنشاء حساب",
        email: "البريد الإلكتروني", password: "كلمة المرور", confirm_password: "تأكيد كلمة المرور",
        full_name: "الاسم الكامل", login_btn: "دخول", register_btn: "تسجيل",
        email_placeholder: "أدخل البريد الإلكتروني", password_placeholder: "أدخل كلمة المرور",
        confirm_placeholder: "أعد إدخال كلمة المرور", name_placeholder: "الاسم الكامل",
        terms: "أوافق على الشروط والأحكام.", demo_info: "حساب تجريبي: admin@amanahid.sch.id / AmanahDemo!2026#ID",
        register_note: "يستمر التسجيل التجريبي خلال الجلسة الحالية فقط.",
        workspace: "مساحة العمل", nav_presensi: "الحضور", nav_database: "قاعدة البيانات",
        nav_formulir: "نموذج الطالب", nav_profile: "الملف الشخصي والإعدادات",
        local_mode: "الوضع المحلي", memory_note: "تبقى البيانات خلال الجلسة الحالية فقط.",
        attendance_label: "إدارة الحضور", attendance_title: "الحضور بالوجه",
        attendance_desc: "تحقق من هوية الطالب باستخدام الكاميرا.",
        model_waiting: "نموذج الذكاء الاصطناعي غير جاهز", model_ready: "النموذج جاهز",
        model_loading: "جارٍ تحميل النماذج...", model_error: "فشل تحميل النموذج. تحقق من الاتصال بالإنترنت.",
        live_camera: "الكاميرا المباشرة", camera_hint: "ضع وجهك في منتصف الكاميرا.",
        camera_off: "الكاميرا متوقفة", camera_on: "الكاميرا تعمل",
        camera_placeholder: "الكاميرا غير مفعلة", start_camera: "تشغيل الكاميرا",
        stop_camera: "إيقاف الكاميرا", waiting_face: "في انتظار الوجه...",
        no_face: "لم يتم اكتشاف وجه", multiple_faces: "تم اكتشاف أكثر من وجه",
        face_found: "تم اكتشاف الوجه", face_unknown: "الوجه غير معروف",
        face_match: "تم التعرف على الوجه: {name}",
        liveness_waiting: "التحقق الحيوي: في انتظار حركة الوجه.",
        liveness_move: "حرّك رأسك قليلاً للتحقق من الحيوية.",
        liveness_pass: "تم اكتشاف الحركة. اجتاز الفحص الأولي.",
        liveness_fail: "الحركة غير كافية. تم تعليق الحضور.",
        verification: "التحقق", how_to: "طريقة تسجيل الحضور",
        step_one: "شغّل الكاميرا واسمح بالوصول إليها.",
        step_two: "واجه الكاميرا في إضاءة مناسبة.",
        step_three: "حرّك رأسك قليلاً للتحقق من الحيوية.",
        step_four: "سيتم تسجيل الوجه المطابق كحاضر.",
        privacy_title: "الخصوصية",
        privacy_text: "تبقى أوصاف الوجه وبيانات الحضور في ذاكرة الصفحة ولا تُرسل إلى خادم التطبيق.",
        registered_students: "الطلاب المسجلون", records_label: "السجلات والتقارير",
        db_title: "قاعدة بيانات الحضور", db_desc: "ابحث عن سجلات الحضور وصَفِّها وصَدِّرها.",
        total_students: "إجمالي الطلاب", present_today: "الحاضرون اليوم",
        attendance_rate: "نسبة الحضور", total_history: "إجمالي السجلات",
        search_placeholder: "ابحث عن الاسم أو NISN أو الفصل...", date_start: "تاريخ البداية",
        date_end: "تاريخ النهاية", export: "تصدير CSV", delete_all: "حذف الكل",
        number: "الرقم", nisn: "NISN", name: "الاسم", class: "الفصل", status: "الحالة",
        date: "التاريخ", time: "الوقت", method: "الطريقة", confidence: "الثقة", action: "الإجراء",
        no_data: "لا توجد سجلات حضور بعد.", delete_row: "حذف", records: "سجلات",
        student_label: "إدارة الطلاب", form_title: "نموذج الطالب",
        form_desc: "سجّل بيانات الطالب ووصف الوجه.", student_identity: "بيانات الطالب",
        nisn_placeholder: "أدخل NISN", student_name_placeholder: "اسم الطالب",
        class_placeholder: "مثال: الصف الحادي عشر", upload_photo: "رفع صورة",
        upload_hint: "يجب أن تحتوي الصورة على وجه واحد واضح فقط.",
        save_student: "حفظ بيانات الطالب", face_verification: "التحقق من الوجه",
        form_camera_hint: "استخدم الكاميرا أو ارفع صورة لاستخراج وصف الوجه.",
        use_camera: "استخدام الكاميرا", ai_confidence: "ثقة اكتشاف الذكاء الاصطناعي",
        profile_title: "الملف الشخصي والإعدادات", language: "اللغة", theme: "المظهر",
        light: "فاتح", dark: "داكن", save_profile: "حفظ الإعدادات", logout: "تسجيل الخروج",
        confirm_delete_title: "حذف جميع البيانات؟",
        confirm_delete_text: "سيتم حذف جميع الطلاب وسجلات الحضور من ذاكرة هذه الجلسة.",
        cancel: "إلغاء", retry: "إعادة المحاولة",
        toast_login_success: "تم تسجيل الدخول بنجاح.",
        toast_login_fail: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        toast_register_success: "نجح التسجيل التجريبي. يرجى تسجيل الدخول.",
        toast_register_fail: "بيانات التسجيل غير صحيحة أو كلمتا المرور غير متطابقتين.",
        toast_model_loaded: "تم تحميل نماذج الذكاء الاصطناعي بنجاح.",
        toast_model_fail: "فشل تحميل النموذج. تحقق من الاتصال وأعد المحاولة.",
        toast_camera_denied: "الكاميرا غير متاحة أو تم رفض الإذن.",
        toast_camera_secure: "يتطلب الوصول إلى الكاميرا localhost أو HTTPS.",
        toast_student_saved: "تم تسجيل الطالب {name} بنجاح.",
        toast_face_not_detected: "لم يتم اكتشاف وجه واضح.",
        toast_attendance_success: "تم تسجيل حضور {name}.",
        toast_profile_saved: "تم حفظ الإعدادات.",
        toast_logout: "تم تسجيل الخروج.",
        toast_fill_all: "يرجى ملء جميع بيانات الطالب.",
        toast_duplicate_nisn: "رقم NISN مسجل بالفعل.",
        toast_duplicate_attendance: "تم تسجيل حضور هذا الطالب اليوم بالفعل.",
        toast_upload_one_face: "يجب أن تحتوي الصورة على وجه واحد فقط.",
        toast_need_liveness: "يجب اكتشاف حركة الوجه قبل تسجيل الحضور.",
        toast_deleted: "تم حذف السجل.",
        toast_all_deleted: "تم حذف جميع الطلاب وسجلات الحضور.",
        toast_csv_empty: "لا توجد بيانات للتصدير.",
        toast_date_invalid: "لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية.",
        toast_profile_name: "لا يمكن أن يكون اسم الملف الشخصي فارغاً.",
        toast_models_wait: "انتظر حتى يكتمل تحميل نماذج الذكاء الاصطناعي.",
        status_present: "حاضر", method_face: "التعرف على الوجه",
        csv_filename: "attendance-report.csv", register_password_mismatch: "كلمتا المرور غير متطابقتين."
    }
};

/* ==================== STATE ==================== */

const state = {
    user: null,
    students: [],
    attendance: [],
    registrations: [],
    lang: "id",
    theme: "light",
    modelReady: false,
    modelLoading: false,
    stream: null,
    activeVideo: null,
    activeCanvas: null,
    detectionTimer: null,
    detectionBusy: false,
    lastAttendance: new Map(),
    faceSamples: [],
    livenessPassed: false,
    toastTimer: null
};

const $ = id => document.getElementById(id);
const t = key => T[state.lang][key] ?? T.id[key] ?? key;
const interpolate = (text, params = {}) =>
    text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ""));

function notify(key, type = "info", params = {}) {
    const el = $("toast");
    el.textContent = interpolate(t(key), params);
    el.className = `toast show ${type}`;
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function translatePage() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.body.dir = state.lang === "ar" ? "rtl" : "ltr";

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        if (T[state.lang][key] !== undefined) el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lang === state.lang);
        btn.setAttribute("aria-pressed", String(btn.dataset.lang === state.lang));
    });

    $("model-status").textContent = t(state.modelReady ? "model_ready" : state.modelLoading ? "model_loading" : "model_waiting");
    renderCameraStatus();
    renderDatabase();
    updateStats();
    updateLivenessText();
}

function setLanguage(lang) {
    if (!T[lang]) return;
    state.lang = lang;
    translatePage();
}

/* ==================== TEMA ==================== */

function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = state.theme;
    $("theme-select").value = state.theme;
}

/* ==================== AUTENTIKASI DEMO ==================== */

function showScreen(name) {
    stopCamera();
    $("auth-screen").classList.toggle("active", name === "auth");
    $("dashboard-screen").classList.toggle("active", name === "dashboard");
    closeProfile();
}

function openDashboard(user) {
    state.user = user;
    $("header-user").textContent = user.name;
    $("open-profile").textContent = (user.name || "A").trim().charAt(0).toUpperCase();
    $("profile-name").value = user.name;
    $("profile-email").textContent = user.email;
    showScreen("dashboard");
    switchView("presensi");
    updateStats();
    if (!state.modelReady) loadModels();
}

$("tab-login").addEventListener("click", () => {
    stopCamera();
    $("tab-login").classList.add("active");
    $("tab-register").classList.remove("active");
    $("login-form").classList.add("active");
    $("register-form").classList.remove("active");
});

$("tab-register").addEventListener("click", () => {
    stopCamera();
    $("tab-register").classList.add("active");
    $("tab-login").classList.remove("active");
    $("register-form").classList.add("active");
    $("login-form").classList.remove("active");
});

$("terms-reg").addEventListener("change", () => {
    $("btn-register-submit").disabled = !$("terms-reg").checked;
});

$("login-form").addEventListener("submit", event => {
    event.preventDefault();
    const email = $("login-email").value.trim().toLowerCase();
    const password = $("login-password").value;

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
        notify("toast_login_success", "success");
        openDashboard({ name: "Admin", email });
        return;
    }

    const registered = state.registrations.find(user =>
        user.email.toLowerCase() === email && user.password === password
    );

    if (!registered) {
        notify("toast_login_fail", "error");
        return;
    }

    notify("toast_login_success", "success");
    openDashboard({ name: registered.name, email: registered.email });
});

$("register-form").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("register-name").value.trim();
    const email = $("register-email").value.trim();
    const password = $("register-password").value;
    const confirm = $("register-confirm").value;

    if (!$("terms-reg").checked || !name || !email || password.length < 8 || password !== confirm) {
        notify(password !== confirm ? "register_password_mismatch" : "toast_register_fail", "error");
        return;
    }

    if (state.registrations.some(user => user.email.toLowerCase() === email.toLowerCase())) {
        notify("toast_register_fail", "error");
        return;
    }

    state.registrations.push({ name, email, password });
    $("register-form").reset();
    $("btn-register-submit").disabled = true;
    $("tab-login").click();
    $("login-email").value = email;
    notify("toast_register_success", "success");
});

/* ==================== NAVIGASI DAN PROFIL ==================== */

function switchView(target) {
    stopCamera();

    document.querySelectorAll(".nav-link[data-target]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.target === target);
    });

    document.querySelectorAll(".view").forEach(view => {
        view.classList.toggle("active", view.id === `view-${target}`);
    });
}

document.querySelectorAll(".nav-link[data-target]").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        if (target === "profile") {
            openProfile();
            return;
        }
        switchView(target);
    });
});

function openProfile() {
    stopCamera();
    $("profile-modal").classList.remove("hidden");
    $("profile-name").value = state.user?.name || "";
    $("profile-email").textContent = state.user?.email || "";
    $("theme-select").value = state.theme;
}

function closeProfile() {
    $("profile-modal").classList.add("hidden");
}

$("open-profile").addEventListener("click", openProfile);
$("close-profile").addEventListener("click", closeProfile);
document.querySelectorAll("[data-close-profile]").forEach(el => el.addEventListener("click", closeProfile));

$("btn-save-profile").addEventListener("click", () => {
    const name = $("profile-name").value.trim();
    if (!name) {
        notify("toast_profile_name", "error");
        return;
    }

    state.user.name = name;
    setTheme($("theme-select").value);
    $("header-user").textContent = name;
    $("open-profile").textContent = name.charAt(0).toUpperCase();
    notify("toast_profile_saved", "success");
    closeProfile();
});

$("theme-select").addEventListener("change", () => setTheme($("theme-select").value));

$("btn-logout").addEventListener("click", () => {
    stopCamera();
    state.user = null;
    showScreen("auth");
    $("login-form").reset();
    notify("toast_logout");
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeProfile();
});

/* ==================== MODEL AI ==================== */

async function loadModels() {
    if (state.modelReady || state.modelLoading) return;

    if (!window.faceapi) {
        state.modelLoading = false;
        $("model-error").classList.remove("hidden");
        $("model-status").textContent = t("model_waiting");
        notify("toast_model_fail", "error");
        return;
    }

    state.modelLoading = true;
    $("model-error").classList.add("hidden");
    $("model-status").textContent = t("model_loading");

    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        state.modelReady = true;
        state.modelLoading = false;
        $("model-status").textContent = t("model_ready");
        $("model-status").className = "pill success";
        notify("toast_model_loaded", "success");
    } catch (error) {
        console.error("Amanah.id model loading error:", error);
        state.modelReady = false;
        state.modelLoading = false;
        $("model-status").textContent = t("model_waiting");
        $("model-status").className = "pill warning";
        $("model-error").classList.remove("hidden");
        notify("toast_model_fail", "error");
    }
}

$("btn-retry-model").addEventListener("click", async () => {
    stopCamera();
    await loadModels();
});

/* ==================== MANAJEMEN KAMERA ==================== */

function renderCameraStatus() {
    const active = Boolean(state.stream?.active);
    $("camera-status").textContent = t(active ? "camera_on" : "camera_off");
    $("camera-status").className = `pill ${active ? "success" : "neutral"}`;

    $("camera-placeholder").classList.toggle("hidden", active && state.activeVideo?.id === "video-presensi");
    $("form-camera-placeholder").classList.toggle("hidden", active && state.activeVideo?.id === "video-formulir");
}

async function startCamera(videoId, canvasId) {
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
        notify("toast_camera_secure", "error");
        return;
    }

    if (!state.modelReady) {
        notify("toast_models_wait", "info");
        await loadModels();
        if (!state.modelReady) return;
    }

    const video = $(videoId);
    const canvas = $(canvasId);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: "user",
                width: { ideal: 480, max: 640 },
                height: { ideal: 360, max: 480 },
                frameRate: { ideal: 15, max: 20 }
            }
        });

        // Pengguna mungkin berpindah tampilan saat izin kamera sedang diproses.
        if (!video.closest(".view")?.classList.contains("active")) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        state.stream = stream;
        state.activeVideo = video;
        state.activeCanvas = canvas;
        state.faceSamples = [];
        state.livenessPassed = false;

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 360;

        renderCameraStatus();
        updateLivenessText();

        if (videoId === "video-presensi") {
            $("status-presensi").textContent = t("waiting_face");
        } else {
            $("form-face-status").textContent = t("waiting_face");
        }

        startDetectionLoop(video, canvas);
    } catch (error) {
        console.error("Camera error:", error);
        stopCamera();
        notify("toast_camera_denied", "error");
    }
}

function stopCamera() {
    if (state.detectionTimer !== null) {
        clearInterval(state.detectionTimer);
        state.detectionTimer = null;
    }

    if (state.stream) {
        state.stream.getTracks().forEach(track => {
            track.stop();
        });
    }

    if (state.activeVideo) {
        state.activeVideo.pause();
        state.activeVideo.srcObject = null;
    }

    if (state.activeCanvas) {
        const context = state.activeCanvas.getContext("2d");
        context?.clearRect(0, 0, state.activeCanvas.width, state.activeCanvas.height);
    }

    state.stream = null;
    state.activeVideo = null;
    state.activeCanvas = null;
    state.detectionBusy = false;
    state.faceSamples = [];
    state.livenessPassed = false;

    $("ai-progress").style.width = "0%";
    $("ai-percent").textContent = "0%";
    renderCameraStatus();
}

$("btn-start-attendance").addEventListener("click", () => startCamera("video-presensi", "overlay-presensi"));
$("btn-stop-attendance").addEventListener("click", stopCamera);
$("btn-start-form-camera").addEventListener("click", () => startCamera("video-formulir", "overlay-formulir"));
$("btn-stop-form-camera").addEventListener("click", stopCamera);

// Lepaskan perangkat keras saat tab disembunyikan atau halaman ditutup.
document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCamera();
});
window.addEventListener("pagehide", stopCamera);
window.addEventListener("beforeunload", stopCamera);

// Semua tombol selain kontrol kamera menghentikan kamera sebelum aksi berikutnya.
document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !state.stream) return;

    const cameraControls = [
        "btn-start-attendance", "btn-stop-attendance",
        "btn-start-form-camera", "btn-stop-form-camera"
    ];

    if (!cameraControls.includes(button.id)) stopCamera();
}, true);

/* ==================== DETEKSI WAJAH ==================== */

function detectorOptions() {
    return new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5
    });
}

function updateConfidence(score) {
    const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
    $("ai-progress").style.width = `${percent}%`;
    $("ai-percent").textContent = `${percent}%`;
}

function updateLivenessText() {
    $("liveness-status").textContent = t(
        state.livenessPassed ? "liveness_pass" : "liveness_waiting"
    );
}

function updateFaceStatus(message, type = "neutral") {
    const el = $("status-presensi");
    el.textContent = message;
    el.style.color = type === "success" ? "var(--success)" :
        type === "error" ? "var(--danger)" : "var(--text)";
}

function landmarkNosePosition(detection) {
    const points = detection.landmarks.positions;
    const nose = points.slice(27, 36);
    const avg = nose.reduce((sum, p) => ({
        x: sum.x + p.x / nose.length,
        y: sum.y + p.y / nose.length
    }), { x: 0, y: 0 });

    return avg;
}

function checkLiveness(detection) {
    const position = landmarkNosePosition(detection);
    const now = Date.now();

    state.faceSamples.push({ ...position, now });
    state.faceSamples = state.faceSamples.filter(sample => now - sample.now < 3000);

    if (state.faceSamples.length < 4) return false;

    const xs = state.faceSamples.map(sample => sample.x);
    const ys = state.faceSamples.map(sample => sample.y);
    const movementX = Math.max(...xs) - Math.min(...xs);
    const movementY = Math.max(...ys) - Math.min(...ys);

    // Ambang piksel sederhana, bukan sistem anti-spoofing yang kuat.
    if (movementX > 7 || movementY > 7) {
        state.livenessPassed = true;
        updateLivenessText();
    }

    return state.livenessPassed;
}

function getFaceMatcher() {
    if (!state.students.length) return null;

    const labeled = state.students.map(student =>
        new faceapi.LabeledFaceDescriptors(
            student.nisn,
            [new Float32Array(student.descriptor)]
        )
    );

    return new faceapi.FaceMatcher(labeled, FACE_THRESHOLD);
}

function formatDate(timestamp) {
    const locale = { id: "id-ID", en: "en-US", ar: "ar-SA" }[state.lang];
    return new Intl.DateTimeFormat(locale, {
        year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(timestamp));
}

function formatTime(timestamp) {
    const locale = { id: "id-ID", en: "en-US", ar: "ar-SA" }[state.lang];
    return new Intl.DateTimeFormat(locale, {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false
    }).format(new Date(timestamp));
}

function sameLocalDay(a, b) {
    const x = new Date(a);
    const y = new Date(b);
    return x.getFullYear() === y.getFullYear() &&
        x.getMonth() === y.getMonth() &&
        x.getDate() === y.getDate();
}

function recordAttendance(student, distance) {
    const now = Date.now();
    const alreadyRecorded = state.attendance.some(row =>
        row.nisn === student.nisn && sameLocalDay(row.timestamp, now)
    );

    if (alreadyRecorded) {
        updateFaceStatus(t("toast_duplicate_attendance"), "neutral");
        return;
    }

    state.attendance.unshift({
        id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random()}`,
        nisn: student.nisn,
        nama: student.nama,
        kelas: student.kelas,
        status: "present",
        timestamp: now,
        method: "face",
        confidence: Math.max(0, Math.min(100, Math.round((1 - distance) * 100)))
    });

    renderDatabase();
    updateStats();
    updateFaceStatus(interpolate(t("face_match"), { name: student.nama }), "success");
    notify("toast_attendance_success", "success", { name: student.nama });
}

async function processDetections(video, canvas) {
    if (!state.modelReady || video.readyState < 2 || video.videoWidth === 0) return;

    const detections = await faceapi.detectAllFaces(video, detectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length) {
        const displaySize = { width: canvas.width, height: canvas.height };
        const resized = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
    }

    if (video.id === "video-formulir") {
        if (detections.length === 1) {
            updateConfidence(detections[0].detection.score);
            $("form-face-status").textContent = t("face_found");
        } else {
            updateConfidence(0);
            $("form-face-status").textContent = t(
                detections.length > 1 ? "multiple_faces" : "no_face"
            );
        }
        return;
    }

    if (detections.length === 0) {
        state.faceSamples = [];
        state.livenessPassed = false;
        updateLivenessText();
        updateFaceStatus(t("no_face"));
        return;
    }

    if (detections.length !== 1) {
        state.faceSamples = [];
        state.livenessPassed = false;
        updateLivenessText();
        updateFaceStatus(t("multiple_faces"), "error");
        return;
    }

    const detection = detections[0];
    const live = checkLiveness(detection);

    if (!state.students.length) {
        updateFaceStatus(t("face_unknown"));
        return;
    }

    const matcher = getFaceMatcher();
    const match = matcher.findBestMatch(detection.descriptor);

    if (match.label === "unknown") {
        updateFaceStatus(t("face_unknown"), "error");
        return;
    }

    const student = state.students.find(item => item.nisn === match.label);
    if (!student) return;

    updateFaceStatus(interpolate(t("face_match"), { name: student.nama }), "success");

    if (!live) {
        $("liveness-status").textContent = t("liveness_move");
        return;
    }

    recordAttendance(student, match.distance);
}

function startDetectionLoop(video, canvas) {
    if (state.detectionTimer !== null) clearInterval(state.detectionTimer);

    state.detectionTimer = setInterval(async () => {
        if (state.detectionBusy || !state.stream?.active || !state.modelReady) return;

        state.detectionBusy = true;
        try {
            await processDetections(video, canvas);
        } catch (error) {
            console.error("Face detection error:", error);
        } finally {
            state.detectionBusy = false;
        }
    }, DETECTION_INTERVAL);
}

/* ==================== REGISTRASI SISWA ==================== */

async function extractSingleDescriptor(image) {
    if (!state.modelReady) {
        notify("toast_models_wait", "error");
        return null;
    }

    const detections = await faceapi.detectAllFaces(image, detectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (detections.length !== 1) {
        notify("toast_upload_one_face", "error");
        return null;
    }

    return {
        descriptor: Array.from(detections[0].descriptor),
        score: detections[0].detection.score
    };
}

$("photo-upload").addEventListener("change", async event => {
    stopCamera();

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        notify("toast_face_not_detected", "error");
        event.target.value = "";
        return;
    }

    try {
        const image = new Image();
        const url = URL.createObjectURL(file);

        image.src = url;
        await image.decode();

        const result = await extractSingleDescriptor(image);
        URL.revokeObjectURL(url);

        if (!result) {
            state.pendingDescriptor = null;
            return;
        }

        state.pendingDescriptor = result.descriptor;
        updateConfidence(result.score);
        $("form-face-status").textContent = t("face_found");
        notify("toast_model_loaded", "success");
    } catch (error) {
        console.error("Photo processing error:", error);
        notify("toast_face_not_detected", "error");
    }
});

$("student-form").addEventListener("submit", async event => {
    event.preventDefault();
    stopCamera();

    const nisn = $("input-nisn").value.trim();
    const nama = $("input-nama").value.trim();
    const kelas = $("input-kelas").value.trim();

    if (!nisn || !nama || !kelas) {
        notify("toast_fill_all", "error");
        return;
    }

    if (state.students.some(student => student.nisn === nisn)) {
        notify("toast_duplicate_nisn", "error");
        return;
    }

    let descriptor = state.pendingDescriptor || null;

    if (!descriptor && $("video-formulir").readyState >= 2 &&
        $("video-formulir").videoWidth > 0) {
        const result = await extractSingleDescriptor($("video-formulir"));
        if (!result) return;
        descriptor = result.descriptor;
    }

    if (!descriptor) {
        notify("toast_face_not_detected", "error");
        return;
    }

    state.students.push({ nisn, nama, kelas, descriptor });
    state.pendingDescriptor = null;
    $("student-form").reset();
    $("ai-progress").style.width = "0%";
    $("ai-percent").textContent = "0%";
    $("form-face-status").textContent = t("waiting_face");
    renderDatabase();
    updateStats();
    notify("toast_student_saved", "success", { name: nama });
});

/* ==================== DATABASE ==================== */

function filteredAttendance() {
    const query = $("db-search").value.trim().toLocaleLowerCase();
    const start = $("date-start").value;
    const end = $("date-end").value;

    return state.attendance.filter(row => {
        const matchesText = [row.nama, row.nisn, row.kelas]
            .some(value => value.toLocaleLowerCase().includes(query));

        const date = new Date(row.timestamp);
        const localDate = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        return matchesText && (!start || localDate >= start) && (!end || localDate <= end);
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    })[character]);
}

function renderDatabase() {
    const tbody = $("db-tbody");
    const rows = filteredAttendance();

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-cell">${escapeHTML(t("no_data"))}</td></tr>`;
    } else {
        tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(row.nisn)}</td>
        <td>${escapeHTML(row.nama)}</td>
        <td>${escapeHTML(row.kelas)}</td>
        <td><span class="pill success">${escapeHTML(t("status_present"))}</span></td>
        <td>${escapeHTML(formatDate(row.timestamp))}</td>
        <td>${escapeHTML(formatTime(row.timestamp))}</td>
        <td>${escapeHTML(t("method_face"))}</td>
        <td>${row.confidence}%</td>
        <td><button class="btn-delete-row" data-delete-id="${escapeHTML(row.id)}">${escapeHTML(t("delete_row"))}</button></td>
      </tr>
    `).join("");
    }

    $("db-count").textContent = `${rows.length} ${t("records")}`;
}

$("db-tbody").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    const index = state.attendance.findIndex(row => row.id === button.dataset.deleteId);
    if (index < 0) return;

    state.attendance.splice(index, 1);
    renderDatabase();
    updateStats();
    notify("toast_deleted", "success");
});

["db-search", "date-start", "date-end"].forEach(id => {
    $(id).addEventListener("input", () => {
        const start = $("date-start").value;
        const end = $("date-end").value;

        if (start && end && start > end) {
            $("db-count").textContent = t("toast_date_invalid");
            return;
        }

        renderDatabase();
    });
});

function updateStats() {
    const today = state.attendance.filter(row => sameLocalDay(row.timestamp, Date.now())).length;
    const rate = state.students.length
        ? Math.min(100, Math.round((today / state.students.length) * 100))
        : 0;

    $("registered-count").textContent = state.students.length;
    $("stat-students").textContent = state.students.length;
    $("stat-today").textContent = today;
    $("stat-rate").textContent = `${rate}%`;
    $("stat-history").textContent = state.attendance.length;
}

$("btn-delete-all").addEventListener("click", () => {
    stopCamera();
    $("confirm-dialog").showModal();
});

$("confirm-delete").addEventListener("click", event => {
    event.preventDefault();

    state.students = [];
    state.attendance = [];
    state.lastAttendance.clear();
    state.faceSamples = [];
    state.livenessPassed = false;
    state.pendingDescriptor = null;

    $("confirm-dialog").close();
    renderDatabase();
    updateStats();
    updateFaceStatus(t("waiting_face"));
    notify("toast_all_deleted", "success");
});

function csvCell(value) {
    const safe = String(value ?? "");
    return `"${safe.replace(/"/g, '""')}"`;
}

$("btn-export").addEventListener("click", () => {
    const rows = filteredAttendance();
    if (!rows.length) {
        notify("toast_csv_empty", "error");
        return;
    }

    const headers = [
        t("number"), t("nisn"), t("name"), t("class"), t("status"),
        t("date"), t("time"), t("method"), t("confidence")
    ];

    const data = rows.map((row, index) => [
        index + 1,
        row.nisn,
        row.nama,
        row.kelas,
        t("status_present"),
        formatDate(row.timestamp),
        formatTime(row.timestamp),
        t("method_face"),
        `${row.confidence}%`
    ]);

    const csv = "\uFEFF" + [headers, ...data]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = t("csv_filename");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
});

/* ==================== BAHASA DAN INISIALISASI ==================== */

document.querySelectorAll(".lang-btn").forEach(button => {
    button.addEventListener("click", () => {
        stopCamera();
        setLanguage(button.dataset.lang);
    });
});

setTheme("light");
setLanguage("id");
renderDatabase();
updateStats();
