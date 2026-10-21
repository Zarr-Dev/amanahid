
"use strict";

/* ==================== CONFIGURATION ==================== */

const MODEL_URL =
    "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

const DEMO_EMAIL = "admin@amanahid.sch.id";
const DEMO_PASSWORD = "AmanahDemo!2026#ID";
const FACE_THRESHOLD = 0.45;
const DETECTION_INTERVAL = 250;

const $ = id => document.getElementById(id);

const state = {
    user: null,
    registrations: [],
    students: [],
    attendance: [],
    lang: "id",
    theme: "light",
    modelReady: false,
    modelLoading: false,
    stream: null,
    activeVideo: null,
    activeCanvas: null,
    detectionTimer: null,
    detectionBusy: false,
    pendingDescriptor: null,
    faceSamples: [],
    livenessPassed: false,
    toastTimer: null,
    lastLivenessPrompt: 0
};

/* ==================== TRANSLATIONS ==================== */

const translations = {
    id: {
        subtitle: "Sistem Presensi Wajah",
        welcome: "SELAMAT DATANG",
        auth_title: "Halo, kembali!",
        auth_desc: "Masuk untuk melanjutkan aktivitasmu.",
        login: "Masuk",
        register: "Daftar",
        email: "Email",
        password: "Kata sandi",
        confirm_password: "Konfirmasi kata sandi",
        full_name: "Nama lengkap",
        login_btn: "Masuk",
        register_btn: "Daftar",
        email_placeholder: "Masukkan email",
        password_placeholder: "Masukkan kata sandi",
        confirm_placeholder: "Ulangi kata sandi",
        name_placeholder: "Nama lengkap",
        terms: "Saya menyetujui syarat dan ketentuan.",
        demo_info: "Akun demo tersedia",
        footer_text: "Presensi yang lebih praktis.",
        workspace: "MENU UTAMA",
        account: "AKUN",
        nav_presensi: "Dashboard",
        nav_database: "Database",
        nav_formulir: "Formulir",
        profile_settings: "Profil & pengaturan",
        local_mode: "Mode lokal",
        model_waiting: "Model AI belum siap",
        model_ready: "Model AI siap",
        model_loading: "Memuat model AI...",
        model_error: "Model AI gagal dimuat.",
        retry: "Coba lagi",
        camera_off: "Kamera mati",
        camera_on: "Kamera aktif",
        attendance_label: "PRESENSI SISWA",
        attendance_title: "Dashboard presensi",
        attendance_desc: "Pantau dan catat kehadiran dengan pengenalan wajah.",
        total_students: "Total siswa",
        present_today: "Hadir hari ini",
        attendance_rate: "Kehadiran",
        live_camera: "Kamera presensi",
        camera_hint: "Posisikan wajah di tengah kamera.",
        live_label: "LANGSUNG",
        camera_placeholder: "Kamera belum diaktifkan",
        start_camera: "Mulai kamera",
        stop_camera: "Matikan kamera",
        ai_confidence: "Keyakinan deteksi AI",
        waiting_face: "Menunggu wajah...",
        no_face: "Wajah tidak terdeteksi",
        multiple_faces: "Terdeteksi lebih dari satu wajah",
        face_found: "Wajah terdeteksi",
        face_unknown: "Wajah belum dikenali",
        face_match: "Wajah cocok: {name}",
        liveness_waiting: "Menunggu gerakan wajah.",
        liveness_move: "Gerakkan kepala sedikit untuk pemeriksaan liveness.",
        liveness_pass: "Gerakan terdeteksi. Pemeriksaan awal lolos.",
        liveness_fail: "Gerakan belum cukup. Presensi ditahan.",
        how_to: "Cara presensi",
        quick_desc: "Empat langkah sederhana.",
        step_one: "Aktifkan kamera dan izinkan akses.",
        step_two: "Hadapkan wajah ke kamera dengan pencahayaan cukup.",
        step_three: "Gerakkan kepala sedikit.",
        step_four: "Presensi tercatat otomatis jika wajah cocok.",
        privacy_title: "Privasi",
        privacy_text: "Data disimpan sementara di memori halaman.",
        registered_students: "Siswa terdaftar",
        add_student: "+ Tambah siswa",
        records_label: "DATA & LAPORAN",
        db_title: "Database presensi",
        db_desc: "Cari dan kelola riwayat kehadiran.",
        total_history: "Total riwayat",
        search_placeholder: "Cari nama, NISN, atau kelas...",
        date_start: "Tanggal mulai",
        date_end: "Tanggal selesai",
        export: "Ekspor CSV",
        delete_all: "Hapus semua",
        number: "No.",
        nisn: "NISN",
        name: "Nama",
        class: "Kelas",
        status: "Status",
        date: "Tanggal",
        time: "Waktu",
        method: "Metode",
        confidence: "Keyakinan",
        action: "Aksi",
        no_data: "Belum ada data.",
        delete_row: "Hapus",
        records: "catatan",
        student_list: "Siswa terdaftar",
        student_list_desc: "Daftar identitas siswa.",
        student_label: "DATA SISWA",
        form_title: "Formulir siswa",
        form_desc: "Daftarkan siswa dan data wajahnya.",
        student_identity: "Identitas siswa",
        required_fields: "Lengkapi informasi di bawah.",
        nisn_placeholder: "Masukkan NISN",
        student_name_placeholder: "Nama siswa",
        class_placeholder: "Contoh: XI IPA 1",
        face_verification: "Verifikasi wajah",
        upload_photo: "Unggah foto",
        upload_hint: "Foto harus memuat tepat satu wajah yang jelas.",
        save_student: "Simpan siswa",
        form_camera_hint: "Ambil descriptor wajah melalui kamera.",
        use_camera: "Gunakan kamera",
        profile_title: "Profil & pengaturan",
        demo_account: "Akun sesi aktif",
        theme: "Tema",
        light: "Terang",
        dark: "Gelap",
        save_profile: "Simpan",
        logout: "Keluar",
        confirm_delete_title: "Hapus seluruh data?",
        confirm_delete_text: "Semua siswa dan riwayat presensi akan dihapus dari memori sesi ini.",
        cancel: "Batal",
        status_present: "Hadir",
        method_face: "Pengenalan wajah",
        toast_login_success: "Login berhasil. Selamat datang!",
        toast_login_fail: "Email atau kata sandi salah.",
        toast_register_success: "Registrasi demo berhasil. Silakan masuk.",
        toast_register_fail: "Data tidak valid. Periksa kembali isianmu.",
        register_password_mismatch: "Kata sandi tidak cocok.",
        toast_model_loaded: "Model AI berhasil dimuat.",
        toast_model_fail: "Model AI gagal dimuat. Periksa koneksi internet.",
        toast_camera_denied: "Kamera tidak tersedia atau izin ditolak.",
        toast_camera_secure: "Kamera memerlukan localhost atau HTTPS.",
        toast_student_saved: "Siswa {name} berhasil didaftarkan.",
        toast_face_not_detected: "Wajah tidak terdeteksi dengan jelas.",
        toast_attendance_success: "Presensi {name} berhasil dicatat.",
        toast_profile_saved: "Pengaturan berhasil disimpan.",
        toast_logout: "Kamu telah keluar.",
        toast_fill_all: "Lengkapi semua identitas siswa.",
        toast_duplicate_nisn: "NISN tersebut sudah terdaftar.",
        toast_duplicate_attendance: "Presensi siswa ini sudah tercatat hari ini.",
        toast_upload_one_face: "Foto harus berisi tepat satu wajah.",
        toast_need_liveness: "Gerakan wajah diperlukan sebelum presensi.",
        toast_deleted: "Data berhasil dihapus.",
        toast_student_deleted: "Siswa dan riwayatnya berhasil dihapus.",
        toast_all_deleted: "Seluruh data siswa dan presensi telah dihapus.",
        toast_csv_empty: "Tidak ada data untuk diekspor.",
        toast_date_invalid: "Tanggal mulai melebihi tanggal selesai.",
        toast_profile_name: "Nama tidak boleh kosong.",
        toast_models_wait: "Tunggu sampai model AI selesai dimuat.",
        memory_note: "Data hanya tersimpan selama sesi aktif.",
        csv_filename: "laporan-presensi.csv"
    },

    en: {
        subtitle: "Face Attendance System",
        welcome: "WELCOME BACK",
        auth_title: "Hello again!",
        auth_desc: "Log in to continue.",
        login: "Login",
        register: "Sign up",
        email: "Email",
        password: "Password",
        confirm_password: "Confirm password",
        full_name: "Full name",
        login_btn: "Login",
        register_btn: "Sign up",
        email_placeholder: "Enter your email",
        password_placeholder: "Enter your password",
        confirm_placeholder: "Repeat your password",
        name_placeholder: "Full name",
        terms: "I agree to the terms and conditions.",
        demo_info: "Demo account available",
        footer_text: "Attendance, made simpler.",
        workspace: "MAIN MENU",
        account: "ACCOUNT",
        nav_presensi: "Dashboard",
        nav_database: "Database",
        nav_formulir: "Student form",
        profile_settings: "Profile & settings",
        local_mode: "Local mode",
        model_waiting: "AI model not ready",
        model_ready: "AI model ready",
        model_loading: "Loading AI models...",
        model_error: "AI model failed to load.",
        retry: "Retry",
        camera_off: "Camera off",
        camera_on: "Camera active",
        attendance_label: "STUDENT ATTENDANCE",
        attendance_title: "Attendance dashboard",
        attendance_desc: "Track and record attendance using face recognition.",
        total_students: "Total students",
        present_today: "Present today",
        attendance_rate: "Attendance rate",
        live_camera: "Attendance camera",
        camera_hint: "Position your face in the center.",
        live_label: "LIVE",
        camera_placeholder: "Camera is not active",
        start_camera: "Start camera",
        stop_camera: "Stop camera",
        ai_confidence: "AI detection confidence",
        waiting_face: "Waiting for a face...",
        no_face: "No face detected",
        multiple_faces: "More than one face detected",
        face_found: "Face detected",
        face_unknown: "Face not recognized",
        face_match: "Face matched: {name}",
        liveness_waiting: "Waiting for facial movement.",
        liveness_move: "Move your head slightly for the liveness check.",
        liveness_pass: "Movement detected. Initial check passed.",
        liveness_fail: "Insufficient movement. Attendance is on hold.",
        how_to: "How to check in",
        quick_desc: "Four simple steps.",
        step_one: "Start the camera and allow access.",
        step_two: "Face the camera in adequate lighting.",
        step_three: "Move your head slightly.",
        step_four: "Attendance is recorded after a face match.",
        privacy_title: "Privacy",
        privacy_text: "Data is temporarily stored in page memory.",
        registered_students: "Registered students",
        add_student: "+ Add student",
        records_label: "DATA & REPORTS",
        db_title: "Attendance database",
        db_desc: "Search and manage attendance records.",
        total_history: "Total records",
        search_placeholder: "Search name, NISN, or class...",
        date_start: "Start date",
        date_end: "End date",
        export: "Export CSV",
        delete_all: "Delete all",
        number: "No.",
        nisn: "NISN",
        name: "Name",
        class: "Class",
        status: "Status",
        date: "Date",
        time: "Time",
        method: "Method",
        confidence: "Confidence",
        action: "Action",
        no_data: "No data yet.",
        delete_row: "Delete",
        records: "records",
        student_list: "Registered students",
        student_list_desc: "Student identity records.",
        student_label: "STUDENT DATA",
        form_title: "Student form",
        form_desc: "Register students and their face data.",
        student_identity: "Student identity",
        required_fields: "Complete the details below.",
        nisn_placeholder: "Enter NISN",
        student_name_placeholder: "Student name",
        class_placeholder: "Example: Grade 11 A",
        face_verification: "Face verification",
        upload_photo: "Upload photo",
        upload_hint: "The photo must contain exactly one clear face.",
        save_student: "Save student",
        form_camera_hint: "Extract a face descriptor using the camera.",
        use_camera: "Use camera",
        profile_title: "Profile & settings",
        demo_account: "Active session account",
        theme: "Theme",
        light: "Light",
        dark: "Dark",
        save_profile: "Save",
        logout: "Log out",
        confirm_delete_title: "Delete all data?",
        confirm_delete_text: "All students and attendance records will be deleted from this session.",
        cancel: "Cancel",
        status_present: "Present",
        method_face: "Face recognition",
        toast_login_success: "Login successful. Welcome!",
        toast_login_fail: "Incorrect email or password.",
        toast_register_success: "Demo registration successful. Please log in.",
        toast_register_fail: "Invalid details. Please check your entries.",
        register_password_mismatch: "Passwords do not match.",
        toast_model_loaded: "AI models loaded successfully.",
        toast_model_fail: "AI model failed to load. Check your connection.",
        toast_camera_denied: "Camera unavailable or permission denied.",
        toast_camera_secure: "Camera access requires localhost or HTTPS.",
        toast_student_saved: "Student {name} registered successfully.",
        toast_face_not_detected: "No clear face detected.",
        toast_attendance_success: "Attendance for {name} recorded.",
        toast_profile_saved: "Settings saved.",
        toast_logout: "You have logged out.",
        toast_fill_all: "Complete all student details.",
        toast_duplicate_nisn: "That NISN is already registered.",
        toast_duplicate_attendance: "Attendance is already recorded today.",
        toast_upload_one_face: "The photo must contain exactly one face.",
        toast_need_liveness: "Facial movement is required before attendance.",
        toast_deleted: "Record deleted.",
        toast_student_deleted: "Student and attendance records deleted.",
        toast_all_deleted: "All student and attendance records deleted.",
        toast_csv_empty: "There is no data to export.",
        toast_date_invalid: "Start date cannot be later than end date.",
        toast_profile_name: "Name cannot be empty.",
        toast_models_wait: "Wait until the AI models finish loading.",
        memory_note: "Data only remains during this session.",
        csv_filename: "attendance-report.csv"
    },

    ar: {
        subtitle: "نظام الحضور بالوجه",
        welcome: "مرحباً بعودتك",
        auth_title: "أهلاً بعودتك!",
        auth_desc: "سجّل الدخول للمتابعة.",
        login: "تسجيل الدخول",
        register: "إنشاء حساب",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        confirm_password: "تأكيد كلمة المرور",
        full_name: "الاسم الكامل",
        login_btn: "دخول",
        register_btn: "تسجيل",
        email_placeholder: "أدخل البريد الإلكتروني",
        password_placeholder: "أدخل كلمة المرور",
        confirm_placeholder: "أعد إدخال كلمة المرور",
        name_placeholder: "الاسم الكامل",
        terms: "أوافق على الشروط والأحكام.",
        demo_info: "الحساب التجريبي متاح",
        footer_text: "الحضور أصبح أسهل.",
        workspace: "القائمة الرئيسية",
        account: "الحساب",
        nav_presensi: "لوحة التحكم",
        nav_database: "قاعدة البيانات",
        nav_formulir: "نموذج الطالب",
        profile_settings: "الملف الشخصي والإعدادات",
        local_mode: "الوضع المحلي",
        model_waiting: "النموذج غير جاهز",
        model_ready: "النموذج جاهز",
        model_loading: "جارٍ تحميل نماذج الذكاء الاصطناعي...",
        model_error: "فشل تحميل النموذج.",
        retry: "إعادة المحاولة",
        camera_off: "الكاميرا متوقفة",
        camera_on: "الكاميرا تعمل",
        attendance_label: "حضور الطلاب",
        attendance_title: "لوحة الحضور",
        attendance_desc: "تابع الحضور وسجّله باستخدام التعرف على الوجه.",
        total_students: "إجمالي الطلاب",
        present_today: "الحاضرون اليوم",
        attendance_rate: "نسبة الحضور",
        live_camera: "كاميرا الحضور",
        camera_hint: "ضع وجهك في منتصف الكاميرا.",
        live_label: "مباشر",
        camera_placeholder: "الكاميرا غير مفعلة",
        start_camera: "تشغيل الكاميرا",
        stop_camera: "إيقاف الكاميرا",
        ai_confidence: "ثقة اكتشاف الذكاء الاصطناعي",
        waiting_face: "في انتظار الوجه...",
        no_face: "لم يتم اكتشاف وجه",
        multiple_faces: "تم اكتشاف أكثر من وجه",
        face_found: "تم اكتشاف الوجه",
        face_unknown: "الوجه غير معروف",
        face_match: "تم التعرف على الوجه: {name}",
        liveness_waiting: "في انتظار حركة الوجه.",
        liveness_move: "حرّك رأسك قليلاً للتحقق من الحيوية.",
        liveness_pass: "تم اكتشاف الحركة. اجتاز الفحص الأولي.",
        liveness_fail: "الحركة غير كافية. تم تعليق الحضور.",
        how_to: "طريقة تسجيل الحضور",
        quick_desc: "أربع خطوات بسيطة.",
        step_one: "شغّل الكاميرا واسمح بالوصول إليها.",
        step_two: "واجه الكاميرا في إضاءة مناسبة.",
        step_three: "حرّك رأسك قليلاً.",
        step_four: "يتم تسجيل الحضور عند تطابق الوجه.",
        privacy_title: "الخصوصية",
        privacy_text: "تُحفظ البيانات مؤقتاً في ذاكرة الصفحة.",
        registered_students: "الطلاب المسجلون",
        add_student: "+ إضافة طالب",
        records_label: "البيانات والتقارير",
        db_title: "قاعدة بيانات الحضور",
        db_desc: "ابحث عن سجلات الحضور وأدِرها.",
        total_history: "إجمالي السجلات",
        search_placeholder: "ابحث عن الاسم أو NISN أو الفصل...",
        date_start: "تاريخ البداية",
        date_end: "تاريخ النهاية",
        export: "تصدير CSV",
        delete_all: "حذف الكل",
        number: "الرقم",
        nisn: "NISN",
        name: "الاسم",
        class: "الفصل",
        status: "الحالة",
        date: "التاريخ",
        time: "الوقت",
        method: "الطريقة",
        confidence: "الثقة",
        action: "الإجراء",
        no_data: "لا توجد بيانات بعد.",
        delete_row: "حذف",
        records: "سجلات",
        student_list: "الطلاب المسجلون",
        student_list_desc: "سجلات هوية الطلاب.",
        student_label: "بيانات الطلاب",
        form_title: "نموذج الطالب",
        form_desc: "سجّل الطلاب وبيانات الوجه.",
        student_identity: "بيانات الطالب",
        required_fields: "أكمل المعلومات أدناه.",
        nisn_placeholder: "أدخل NISN",
        student_name_placeholder: "اسم الطالب",
        class_placeholder: "مثال: الصف الحادي عشر",
        face_verification: "التحقق من الوجه",
        upload_photo: "رفع صورة",
        upload_hint: "يجب أن تحتوي الصورة على وجه واحد واضح.",
        save_student: "حفظ الطالب",
        form_camera_hint: "استخرج وصف الوجه باستخدام الكاميرا.",
        use_camera: "استخدام الكاميرا",
        profile_title: "الملف الشخصي والإعدادات",
        demo_account: "حساب الجلسة الحالية",
        theme: "المظهر",
        light: "فاتح",
        dark: "داكن",
        save_profile: "حفظ",
        logout: "تسجيل الخروج",
        confirm_delete_title: "حذف جميع البيانات؟",
        confirm_delete_text: "سيتم حذف جميع الطلاب وسجلات الحضور من ذاكرة الجلسة.",
        cancel: "إلغاء",
        status_present: "حاضر",
        method_face: "التعرف على الوجه",
        toast_login_success: "تم تسجيل الدخول بنجاح!",
        toast_login_fail: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        toast_register_success: "نجح التسجيل التجريبي. يرجى تسجيل الدخول.",
        toast_register_fail: "البيانات غير صحيحة. تحقق من المدخلات.",
        register_password_mismatch: "كلمتا المرور غير متطابقتين.",
        toast_model_loaded: "تم تحميل النماذج بنجاح.",
        toast_model_fail: "فشل تحميل النموذج. تحقق من الاتصال.",
        toast_camera_denied: "الكاميرا غير متاحة أو تم رفض الإذن.",
        toast_camera_secure: "يتطلب الوصول إلى الكاميرا localhost أو HTTPS.",
        toast_student_saved: "تم تسجيل الطالب {name} بنجاح.",
        toast_face_not_detected: "لم يتم اكتشاف وجه واضح.",
        toast_attendance_success: "تم تسجيل حضور {name}.",
        toast_profile_saved: "تم حفظ الإعدادات.",
        toast_logout: "تم تسجيل الخروج.",
        toast_fill_all: "أكمل جميع بيانات الطالب.",
        toast_duplicate_nisn: "رقم NISN مسجل بالفعل.",
        toast_duplicate_attendance: "تم تسجيل حضور الطالب اليوم بالفعل.",
        toast_upload_one_face: "يجب أن تحتوي الصورة على وجه واحد فقط.",
        toast_need_liveness: "يجب اكتشاف حركة الوجه قبل تسجيل الحضور.",
        toast_deleted: "تم حذف السجل.",
        toast_student_deleted: "تم حذف الطالب وسجلات حضوره.",
        toast_all_deleted: "تم حذف جميع الطلاب وسجلات الحضور.",
        toast_csv_empty: "لا توجد بيانات للتصدير.",
        toast_date_invalid: "لا يمكن أن يكون تاريخ البداية بعد تاريخ النهاية.",
        toast_profile_name: "لا يمكن أن يكون الاسم فارغاً.",
        toast_models_wait: "انتظر حتى يكتمل تحميل النماذج.",
        memory_note: "تبقى البيانات خلال الجلسة الحالية فقط.",
        csv_filename: "attendance-report.csv"
    }
};

/* ==================== UTILITIES ==================== */

function tr(key, values = {}) {
    let value = translations[state.lang]?.[key] ??
        translations.id[key] ?? key;

    return value.replace(/\{(\w+)\}/g, (_, name) =>
        String(values[name] ?? "")
    );
}

function toast(key, type = "info", values = {}) {
    const el = $("toast");
    el.textContent = tr(key, values);
    el.className = `toast show ${type}`;

    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 3000);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function setLanguage(lang) {
    if (!translations[lang]) return;

    stopCamera();
    state.lang = lang;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.body.dir = document.documentElement.dir;

    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = tr(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = tr(el.dataset.i18nPlaceholder);
    });

    document.querySelectorAll(".lang-btn").forEach(button => {
        const active = button.dataset.lang === lang;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    $("model-status").textContent = tr(
        state.modelReady ? "model_ready" :
            state.modelLoading ? "model_loading" : "model_waiting"
    );

    if (state.modelReady) {
        $("model-status").className = "pill success";
    } else {
        $("model-status").className = "pill neutral";
    }

    renderCameraStatus();
    renderDatabase();
    renderStudentList();
    updateStats();
    updateFormConfidence(0);
    $("status-presensi").textContent = tr("waiting_face");
    $("form-face-status").textContent = tr("waiting_face");
    $("liveness-status").textContent = tr("liveness_waiting");
}

/* ==================== THEME ==================== */

function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = state.theme;
    $("theme-select").value = state.theme;
}

/* ==================== AUTHENTICATION ==================== */

function showScreen(screen) {
    stopCamera();
    closeProfile();

    $("auth-screen").classList.toggle("active", screen === "auth");
    $("dashboard-screen").classList.toggle("active", screen === "dashboard");
}

function openDashboard(user) {
    state.user = user;
    updateProfileLabels();
    showScreen("dashboard");
    switchView("presensi");

    if (!state.modelReady) loadModels();
}

function updateProfileLabels() {
    const user = state.user;
    if (!user) return;

    $("header-user").textContent = user.name;
    $("profile-avatar").textContent = user.name.trim().charAt(0).toUpperCase() || "A";
    $("profile-modal-avatar").textContent = user.name.trim().charAt(0).toUpperCase() || "A";
    $("profile-name").value = user.name;
    $("profile-email").textContent = user.email;
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
        toast("toast_login_success", "success");
        openDashboard({ name: "Admin", email });
        return;
    }

    const user = state.registrations.find(item =>
        item.email.toLowerCase() === email && item.password === password
    );

    if (!user) {
        toast("toast_login_fail", "error");
        return;
    }

    toast("toast_login_success", "success");
    openDashboard({ name: user.name, email: user.email });
});

$("register-form").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("register-name").value.trim();
    const email = $("register-email").value.trim();
    const password = $("register-password").value;
    const confirm = $("register-confirm").value;

    if (!name || !email || password.length < 8 || !$("terms-reg").checked) {
        toast("toast_register_fail", "error");
        return;
    }

    if (password !== confirm) {
        toast("register_password_mismatch", "error");
        return;
    }

    if (state.registrations.some(item =>
        item.email.toLowerCase() === email.toLowerCase()
    )) {
        toast("toast_register_fail", "error");
        return;
    }

    state.registrations.push({ name, email, password });

    $("register-form").reset();
    $("btn-register-submit").disabled = true;
    $("tab-login").click();
    $("login-email").value = email;

    toast("toast_register_success", "success");
});

/* ==================== NAVIGATION ==================== */

function switchView(target) {
    stopCamera();

    document.querySelectorAll(".nav-link[data-target]").forEach(button => {
        button.classList.toggle("active", button.dataset.target === target);
    });

    document.querySelectorAll(".view").forEach(view => {
        view.classList.toggle("active", view.id === `view-${target}`);
    });
}

document.addEventListener("click", event => {
    const targetButton = event.target.closest("[data-target]");
    if (!targetButton) return;

    const target = targetButton.dataset.target;
    if (!["presensi", "database", "formulir", "profile"].includes(target)) return;

    event.preventDefault();
    stopCamera();

    if (target === "profile") {
        openProfile();
    } else {
        switchView(target);
    }
});

$("brand-home").addEventListener("click", event => {
    event.preventDefault();
    switchView("presensi");
});

/* ==================== PROFILE MODAL ==================== */

function openProfile() {
    stopCamera();
    updateProfileLabels();
    $("profile-modal").classList.remove("hidden");
    $("theme-select").value = state.theme;
}

function closeProfile() {
    $("profile-modal").classList.add("hidden");
}

$("open-profile").addEventListener("click", openProfile);
$("close-profile").addEventListener("click", closeProfile);

$("profile-modal").addEventListener("click", event => {
    if (event.target === $("profile-modal")) closeProfile();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeProfile();
});

$("theme-select").addEventListener("change", () => {
    setTheme($("theme-select").value);
});

$("btn-save-profile").addEventListener("click", () => {
    const name = $("profile-name").value.trim();

    if (!name) {
        toast("toast_profile_name", "error");
        return;
    }

    if (state.user) state.user.name = name;

    setTheme($("theme-select").value);
    updateProfileLabels();
    closeProfile();
    toast("toast_profile_saved", "success");
});

$("btn-logout").addEventListener("click", () => {
    stopCamera();
    state.user = null;
    closeProfile();
    showScreen("auth");
    $("login-form").reset();
    $("register-form").reset();
    $("btn-register-submit").disabled = true;
    $("terms-reg").checked = false;
    toast("toast_logout");
});

/* ==================== AI MODEL LOADING ==================== */

async function loadModels() {
    if (state.modelReady || state.modelLoading) return;

    if (!window.faceapi) {
        state.modelLoading = false;
        $("model-error").classList.remove("hidden");
        $("model-status").textContent = tr("model_error");
        toast("toast_model_fail", "error");
        return;
    }

    state.modelLoading = true;
    $("model-error").classList.add("hidden");
    $("model-status").textContent = tr("model_loading");

    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        state.modelReady = true;
        state.modelLoading = false;
        $("model-status").textContent = tr("model_ready");
        $("model-status").className = "pill success";
        toast("toast_model_loaded", "success");
    } catch (error) {
        console.error("Model loading failed:", error);
        state.modelReady = false;
        state.modelLoading = false;
        $("model-status").textContent = tr("model_waiting");
        $("model-status").className = "pill warning";
        $("model-error").classList.remove("hidden");
        toast("toast_model_fail", "error");
    }
}

$("btn-retry-model").addEventListener("click", async () => {
    stopCamera();
    await loadModels();
});

/* ==================== CAMERA MANAGEMENT ==================== */

function renderCameraStatus() {
    const active = Boolean(state.stream?.active);

    $("camera-status").textContent = tr(active ? "camera_on" : "camera_off");
    $("camera-status").className = `pill ${active ? "success" : "neutral"}`;

    $("camera-placeholder").classList.toggle(
        "hidden", active && state.activeVideo?.id === "video-presensi"
    );

    $("form-camera-placeholder").classList.toggle(
        "hidden", active && state.activeVideo?.id === "video-formulir"
    );
}

function updateFormConfidence(score) {
    const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
    $("form-ai-progress").style.width = `${percent}%`;
    $("form-ai-percent").textContent = `${percent}%`;
}

function stopCamera() {
    if (state.detectionTimer !== null) {
        clearInterval(state.detectionTimer);
        state.detectionTimer = null;
    }

    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
    }

    if (state.activeVideo) {
        state.activeVideo.pause();
        state.activeVideo.srcObject = null;
    }

    if (state.activeCanvas) {
        const context = state.activeCanvas.getContext("2d");
        context.clearRect(
            0, 0, state.activeCanvas.width, state.activeCanvas.height
        );
    }

    state.stream = null;
    state.activeVideo = null;
    state.activeCanvas = null;
    state.detectionBusy = false;
    state.faceSamples = [];
    state.livenessPassed = false;
    state.lastLivenessPrompt = 0;

    updateFormConfidence(0);
    $("ai-progress").style.width = "0%";
    $("ai-percent").textContent = "0%";
    $("liveness-status").textContent = tr("liveness_waiting");

    renderCameraStatus();
}

async function startCamera(videoId, canvasId) {
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
        toast("toast_camera_secure", "error");
        return;
    }

    if (!state.modelReady) {
        await loadModels();

        if (!state.modelReady) {
            toast("toast_models_wait", "error");
            return;
        }
    }

    const video = $(videoId);
    const canvas = $(canvasId);

    if (!video || !canvas) return;

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

        // Jangan biarkan izin kamera yang terlambat membuka stream di layar lain.
        if (
            document.hidden ||
            !video.closest(".view")?.classList.contains("active") ||
            !$("dashboard-screen").classList.contains("active")
        ) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        state.stream = stream;
        state.activeVideo = video;
        state.activeCanvas = canvas;

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 360;

        renderCameraStatus();
        startDetectionLoop(video, canvas);
    } catch (error) {
        console.error("Camera error:", error);
        stopCamera();
        toast(
            error.name === "NotAllowedError" || error.name === "NotFoundError"
                ? "toast_camera_denied"
                : "toast_camera_secure",
            "error"
        );
    }
}

$("btn-start-attendance").addEventListener("click", () => {
    startCamera("video-presensi", "overlay-presensi");
});

$("btn-stop-attendance").addEventListener("click", stopCamera);

$("btn-start-form-camera").addEventListener("click", () => {
    startCamera("video-formulir", "overlay-formulir");
});

$("btn-stop-form-camera").addEventListener("click", stopCamera);

document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCamera();
});

window.addEventListener("pagehide", stopCamera);
window.addEventListener("beforeunload", stopCamera);

// Hentikan kamera sebelum aksi tombol lain dijalankan.
document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || !state.stream) return;

    const cameraButtons = new Set([
        "btn-start-attendance",
        "btn-stop-attendance",
        "btn-start-form-camera",
        "btn-stop-form-camera"
    ]);

    if (!cameraButtons.has(button.id)) stopCamera();
}, true);

/* ==================== FACE DETECTION ==================== */

function detectorOptions() {
    return new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5
    });
}

function updateAttendanceConfidence(score) {
    const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
    $("ai-progress").style.width = `${percent}%`;
    $("ai-percent").textContent = `${percent}%`;
}

function nosePosition(detection) {
    const points = detection.landmarks.positions.slice(27, 36);

    return points.reduce((sum, point) => ({
        x: sum.x + point.x / points.length,
        y: sum.y + point.y / points.length
    }), { x: 0, y: 0 });
}

function checkLiveness(detection) {
    const position = nosePosition(detection);
    const now = Date.now();

    state.faceSamples.push({ ...position, time: now });
    state.faceSamples = state.faceSamples.filter(
        sample => now - sample.time < 3000
    );

    if (state.faceSamples.length < 4) return false;

    const xs = state.faceSamples.map(sample => sample.x);
    const ys = state.faceSamples.map(sample => sample.y);

    const movedX = Math.max(...xs) - Math.min(...xs);
    const movedY = Math.max(...ys) - Math.min(...ys);

    if (movedX > 7 || movedY > 7) {
        state.livenessPassed = true;
        $("liveness-status").textContent = tr("liveness_pass");
    } else {
        $("liveness-status").textContent = tr("liveness_move");
    }

    return state.livenessPassed;
}

function getFaceMatcher() {
    if (!state.students.length) return null;

    const descriptors = state.students.map(student =>
        new faceapi.LabeledFaceDescriptors(
            student.nisn,
            [new Float32Array(student.descriptor)]
        )
    );

    return new faceapi.FaceMatcher(descriptors, FACE_THRESHOLD);
}

function localDateKey(timestamp) {
    const date = new Date(timestamp);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function formatDate(timestamp) {
    const locale = { id: "id-ID", en: "en-US", ar: "ar-SA" }[state.lang];

    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date(timestamp));
}

function formatTime(timestamp) {
    const locale = { id: "id-ID", en: "en-US", ar: "ar-SA" }[state.lang];

    return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(new Date(timestamp));
}

function recordAttendance(student, distance) {
    const now = Date.now();

    const duplicate = state.attendance.some(row =>
        row.nisn === student.nisn &&
        localDateKey(row.timestamp) === localDateKey(now)
    );

    if (duplicate) return;

    state.attendance.unshift({
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : `${now}-${Math.random()}`,
        nisn: student.nisn,
        nama: student.nama,
        kelas: student.kelas,
        status: "present",
        timestamp: now,
        method: "face",
        confidence: Math.round((1 - distance) * 100)
    });

    renderDatabase();
    updateStats();

    $("status-presensi").textContent = tr("face_match", {
        name: student.nama
    });

    toast("toast_attendance_success", "success", {
        name: student.nama
    });
}

async function processDetections(video, canvas) {
    if (
        !state.modelReady ||
        video.readyState < 2 ||
        video.videoWidth === 0
    ) return;

    const detections = await faceapi
        .detectAllFaces(video, detectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (video !== state.activeVideo || !state.stream?.active) return;

    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length) {
        const resized = faceapi.resizeResults(detections, {
            width: canvas.width,
            height: canvas.height
        });

        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
    }

    // Formulir: descriptor disiapkan saat wajah terlihat melalui kamera.
    if (video.id === "video-formulir") {
        if (detections.length === 1) {
            const result = detections[0];

            state.pendingDescriptor = Array.from(result.descriptor);
            updateFormConfidence(result.detection.score);
            $("form-face-status").textContent = tr("face_found");
        } else {
            state.pendingDescriptor = null;
            updateFormConfidence(0);
            $("form-face-status").textContent = tr(
                detections.length > 1 ? "multiple_faces" : "no_face"
            );
        }

        return;
    }

    if (detections.length !== 1) {
        state.faceSamples = [];
        state.livenessPassed = false;

        $("liveness-status").textContent = tr("liveness_waiting");
        $("status-presensi").textContent = tr(
            detections.length > 1 ? "multiple_faces" : "no_face"
        );

        return;
    }

    const detection = detections[0];
    updateAttendanceConfidence(detection.detection.score);

    if (!state.students.length) {
        $("status-presensi").textContent = tr("face_unknown");
        return;
    }

    const matcher = getFaceMatcher();
    if (!matcher) return;

    const match = matcher.findBestMatch(detection.descriptor);

    if (match.label === "unknown") {
        $("status-presensi").textContent = tr("face_unknown");
        return;
    }

    const student = state.students.find(
        item => item.nisn === match.label
    );

    if (!student) return;

    $("status-presensi").textContent = tr("face_match", {
        name: student.nama
    });

    if (!checkLiveness(detection)) return;

    recordAttendance(student, match.distance);
}

function startDetectionLoop(video, canvas) {
    if (state.detectionTimer !== null) {
        clearInterval(state.detectionTimer);
    }

    state.detectionTimer = setInterval(async () => {
        if (
            state.detectionBusy ||
            !state.stream?.active ||
            !state.modelReady ||
            video !== state.activeVideo
        ) return;

        state.detectionBusy = true;

        try {
            await processDetections(video, canvas);
        } catch (error) {
            console.error("Detection error:", error);
        } finally {
            state.detectionBusy = false;
        }
    }, DETECTION_INTERVAL);
}

/* ==================== STUDENT REGISTRATION ==================== */

async function extractSingleDescriptor(image) {
    if (!state.modelReady) {
        toast("toast_models_wait", "error");
        return null;
    }

    const detections = await faceapi
        .detectAllFaces(image, detectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (detections.length !== 1) {
        toast("toast_upload_one_face", "error");
        return null;
    }

    return {
        descriptor: Array.from(detections[0].descriptor),
        score: detections[0].detection.score
    };
}

$("photo-upload").addEventListener("change", async event => {
    stopCamera();
    state.pendingDescriptor = null;

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        toast("toast_face_not_detected", "error");
        event.target.value = "";
        return;
    }

    if (!state.modelReady) {
        await loadModels();
        if (!state.modelReady) return;
    }

    let url;

    try {
        const image = new Image();
        url = URL.createObjectURL(file);
        image.src = url;
        await image.decode();

        const result = await extractSingleDescriptor(image);
        if (!result) return;

        state.pendingDescriptor = result.descriptor;
        updateFormConfidence(result.score);
        $("form-face-status").textContent = tr("face_found");
    } catch (error) {
        console.error("Image processing error:", error);
        toast("toast_face_not_detected", "error");
    } finally {
        if (url) URL.revokeObjectURL(url);
    }
});

$("student-form").addEventListener("submit", event => {
    event.preventDefault();
    stopCamera();

    const nisn = $("input-nisn").value.trim();
    const nama = $("input-nama").value.trim();
    const kelas = $("input-kelas").value.trim();

    if (!nisn || !nama || !kelas) {
        toast("toast_fill_all", "error");
        return;
    }

    if (state.students.some(student => student.nisn === nisn)) {
        toast("toast_duplicate_nisn", "error");
        return;
    }

    if (!state.pendingDescriptor) {
        toast("toast_face_not_detected", "error");
        return;
    }

    state.students.push({
        nisn,
        nama,
        kelas,
        descriptor: state.pendingDescriptor.slice()
    });

    state.pendingDescriptor = null;
    $("student-form").reset();
    updateFormConfidence(0);
    $("form-face-status").textContent = tr("waiting_face");

    renderStudentList();
    renderDatabase();
    updateStats();

    toast("toast_student_saved", "success", { name: nama });
});

/* ==================== DATABASE ==================== */

function filteredAttendance() {
    const query = $("db-search").value.trim().toLocaleLowerCase();
    const start = $("date-start").value;
    const end = $("date-end").value;

    return state.attendance.filter(row => {
        const matchesSearch = [row.nama, row.nisn, row.kelas]
            .some(value => value.toLocaleLowerCase().includes(query));

        const date = localDateKey(row.timestamp);

        return matchesSearch &&
            (!start || date >= start) &&
            (!end || date <= end);
    });
}

function renderDatabase() {
    const tbody = $("db-tbody");
    const rows = filteredAttendance();

    if (rows.length === 0) {
        tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-cell">${escapeHTML(tr("no_data"))}</td>
      </tr>`;
    } else {
        tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(row.nisn)}</td>
        <td>${escapeHTML(row.nama)}</td>
        <td>${escapeHTML(row.kelas)}</td>
        <td><span class="pill success">${escapeHTML(tr("status_present"))}</span></td>
        <td>${escapeHTML(formatDate(row.timestamp))}</td>
        <td>${escapeHTML(formatTime(row.timestamp))}</td>
        <td>${escapeHTML(tr("method_face"))}</td>
        <td>${row.confidence}%</td>
        <td><button class="btn-delete-row" data-delete-id="${escapeHTML(row.id)}" type="button">${escapeHTML(tr("delete_row"))}</button></td>
      </tr>
    `).join("");
    }

    $("db-count").textContent = `${rows.length} ${tr("records")}`;
}

function renderStudentList() {
    const tbody = $("students-tbody");

    if (!state.students.length) {
        tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">${escapeHTML(tr("no_data"))}</td>
      </tr>`;
    } else {
        tbody.innerHTML = state.students.map((student, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(student.nisn)}</td>
        <td>${escapeHTML(student.nama)}</td>
        <td>${escapeHTML(student.kelas)}</td>
        <td><button class="btn-delete-row" data-delete-student="${escapeHTML(student.nisn)}" type="button">${escapeHTML(tr("delete_row"))}</button></td>
      </tr>
    `).join("");
    }

    $("student-count-badge").textContent = String(state.students.length);
}

$("db-tbody").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    const index = state.attendance.findIndex(
        row => row.id === button.dataset.deleteId
    );

    if (index === -1) return;

    state.attendance.splice(index, 1);
    renderDatabase();
    updateStats();
    toast("toast_deleted", "success");
});

$("students-tbody").addEventListener("click", event => {
    const button = event.target.closest("[data-delete-student]");
    if (!button) return;

    const nisn = button.dataset.deleteStudent;

    state.students = state.students.filter(student => student.nisn !== nisn);
    state.attendance = state.attendance.filter(row => row.nisn !== nisn);

    renderStudentList();
    renderDatabase();
    updateStats();
    toast("toast_student_deleted", "success");
});

function applyDatabaseFilters() {
    const start = $("date-start").value;
    const end = $("date-end").value;

    if (start && end && start > end) {
        $("db-count").textContent = tr("toast_date_invalid");
        return;
    }

    renderDatabase();
}

["db-search", "date-start", "date-end"].forEach(id => {
    $(id).addEventListener("input", applyDatabaseFilters);
});

/* ==================== STATISTICS ==================== */

function updateStats() {
    const today = localDateKey(Date.now());

    const presentToday = state.attendance.filter(
        row => localDateKey(row.timestamp) === today
    ).length;

    const rate = state.students.length
        ? Math.round((presentToday / state.students.length) * 100)
        : 0;

    $("stat-students").textContent = state.students.length;
    $("db-stat-students").textContent = state.students.length;
    $("registered-count").textContent = state.students.length;

    $("stat-today").textContent = presentToday;
    $("db-stat-today").textContent = presentToday;
    $("stat-rate").textContent = `${Math.min(100, rate)}%`;
    $("stat-history").textContent = state.attendance.length;
}

/* ==================== DELETE ALL ==================== */

$("btn-delete-all").addEventListener("click", () => {
    stopCamera();
    $("confirm-dialog").showModal();
});

$("cancel-delete").addEventListener("click", () => {
    $("confirm-dialog").close();
});

$("confirm-delete").addEventListener("click", () => {
    stopCamera();

    state.students = [];
    state.attendance = [];
    state.pendingDescriptor = null;
    state.faceSamples = [];
    state.livenessPassed = false;

    $("confirm-dialog").close();

    renderStudentList();
    renderDatabase();
    updateStats();

    $("status-presensi").textContent = tr("waiting_face");
    $("liveness-status").textContent = tr("liveness_waiting");

    toast("toast_all_deleted", "success");
});

/* ==================== CSV EXPORT ==================== */

function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

$("btn-export").addEventListener("click", () => {
    const rows = filteredAttendance();

    if (!rows.length) {
        toast("toast_csv_empty", "error");
        return;
    }

    const headers = [
        tr("number"),
        tr("nisn"),
        tr("name"),
        tr("class"),
        tr("status"),
        tr("date"),
        tr("time"),
        tr("method"),
        tr("confidence")
    ];

    const data = rows.map((row, index) => [
        index + 1,
        row.nisn,
        row.nama,
        row.kelas,
        tr("status_present"),
        formatDate(row.timestamp),
        formatTime(row.timestamp),
        tr("method_face"),
        `${row.confidence}%`
    ]);

    const csv = "\uFEFF" +
        [headers, ...data]
            .map(row => row.map(csvCell).join(","))
            .join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = tr("csv_filename");
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ==================== LANGUAGE SWITCHING ==================== */

document.querySelectorAll(".lang-btn").forEach(button => {
    button.addEventListener("click", () => {
        setLanguage(button.dataset.lang);
    });
});

/* ==================== INITIALIZATION ==================== */

setTheme("light");
setLanguage("id");
renderDatabase();
renderStudentList();
updateStats();
renderCameraStatus();
