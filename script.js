/* ================= KONFIGURASI BAHASA (i18n) ================= */
const translations = {
    id: {
        subtitle: "Sistem Presensi Wajah",
        login: "Masuk",
        register: "Daftar",
        email: "Email",
        password: "Kata Sandi",
        confirm_password: "Konfirmasi Sandi",
        full_name: "Nama Lengkap",
        terms_agree: "Saya setuju dengan <a href='#'>Syarat & Ketentuan</a>",
        terms_agree_reg: "Saya setuju dengan <a href='#'>Syarat & Ketentuan</a>",
        login_btn: "Masuk",
        register_btn: "Daftar",
        demo_info: "Demo: admin@amanahid.sch.id / AmanahDemo!2026#ID",
        nav_presensi: "Presensi",
        nav_database: "Database",
        nav_formulir: "Formulir",
        nav_profile: "Profil",
        loading_ai: "Memuat Model AI...",
        detecting_face: "Mendeteksi Wajah...",
        db_title: "Database Presensi",
        db_desc: "Kelola riwayat presensi, filter tanggal, & ekspor laporan.",
        total_students: "Total Siswa",
        present_today: "Hadir Hari Ini",
        percentage: "Persentase",
        total_history: "Total Riwayat",
        search_placeholder: "Cari nama, NISN, atau kelas...",
        export: "Export",
        delete_all: "Hapus Semua",
        nisn: "NISN",
        name: "NAMA",
        class: "KELAS",
        status: "STATUS",
        date: "TANGGAL",
        time: "WAKTU",
        method: "METODE",
        confidence: "CONFIDENCE",
        action: "AKSI",
        no_data: "Belum ada data presensi<br><small>Data akan muncul setelah siswa melakukan verifikasi wajah.</small>",
        form_title: "Formulir Siswa",
        form_desc: "Daftarkan identitas dan wajah siswa untuk presensi.",
        student_identity: "Identitas Siswa",
        save_student: "Simpan Data Siswa",
        face_verification: "Verifikasi Wajah",
        face_verification_desc: "Ambil wajah dari depan, kiri, kanan, atas, dan bawah agar presensi tetap akurat.",
        ai_analysis: "Analisis AI",
        position_hint: "Posisikan wajah dari depan",
        upload_photo: "Upload Foto",
        use_camera: "Gunakan Kamera",
        profile_title: "Profil",
        change_photo: "Ganti foto",
        language: "Bahasa",
        save_profile: "Simpan Profil",
        logout: "Keluar",
        toast_login_success: "Login berhasil! Selamat datang.",
        toast_login_fail: "Email atau kata sandi salah!",
        toast_register_success: "Pendaftaran berhasil! Silakan login.",
        toast_model_loaded: "Model AI berhasil dimuat!",
        toast_model_fail: "Gagal memuat model AI. Periksa koneksi internet.",
        toast_camera_denied: "Akses kamera ditolak atau tidak tersedia.",
        toast_student_saved: "Siswa {name} berhasil didaftarkan!",
        toast_face_not_detected: "Wajah tidak terdeteksi! Pastikan wajah terlihat jelas.",
        toast_attendance_success: "Presensi {name} berhasil!",
        toast_profile_saved: "Profil berhasil disimpan!",
        toast_logout: "Anda telah keluar.",
        toast_fill_all: "Harap isi semua data identitas siswa!"
    },
    en: {
        subtitle: "Facial Attendance System",
        login: "Login",
        register: "Register",
        email: "Email",
        password: "Password",
        confirm_password: "Confirm Password",
        full_name: "Full Name",
        terms_agree: "I agree to the <a href='#'>Terms & Conditions</a>",
        terms_agree_reg: "I agree to the <a href='#'>Terms & Conditions</a>",
        login_btn: "Login",
        register_btn: "Register",
        demo_info: "Demo: admin@amanahid.sch.id / AmanahDemo!2026#ID",
        nav_presensi: "Attendance",
        nav_database: "Database",
        nav_formulir: "Form",
        nav_profile: "Profile",
        loading_ai: "Loading AI Model...",
        detecting_face: "Detecting Face...",
        db_title: "Attendance Database",
        db_desc: "Manage attendance history, filter dates, & export reports.",
        total_students: "Total Students",
        present_today: "Present Today",
        percentage: "Percentage",
        total_history: "Total History",
        search_placeholder: "Search name, NISN, or class...",
        export: "Export",
        delete_all: "Delete All",
        nisn: "NISN",
        name: "NAME",
        class: "CLASS",
        status: "STATUS",
        date: "DATE",
        time: "TIME",
        method: "METHOD",
        confidence: "CONFIDENCE",
        action: "ACTION",
        no_data: "No attendance data yet<br><small>Data will appear after students verify their face.</small>",
        form_title: "Student Form",
        form_desc: "Register student identity and face for attendance.",
        student_identity: "Student Identity",
        save_student: "Save Student Data",
        face_verification: "Face Verification",
        face_verification_desc: "Capture face from front, left, right, top, and bottom for accurate attendance.",
        ai_analysis: "AI Analysis",
        position_hint: "Position your face forward",
        upload_photo: "Upload Photo",
        use_camera: "Use Camera",
        profile_title: "Profile",
        change_photo: "Change photo",
        language: "Language",
        save_profile: "Save Profile",
        logout: "Logout",
        toast_login_success: "Login successful! Welcome.",
        toast_login_fail: "Wrong email or password!",
        toast_register_success: "Registration successful! Please login.",
        toast_model_loaded: "AI Model loaded successfully!",
        toast_model_fail: "Failed to load AI model. Check internet connection.",
        toast_camera_denied: "Camera access denied or unavailable.",
        toast_student_saved: "Student {name} registered successfully!",
        toast_face_not_detected: "Face not detected! Make sure face is clearly visible.",
        toast_attendance_success: "Attendance for {name} successful!",
        toast_profile_saved: "Profile saved successfully!",
        toast_logout: "You have been logged out.",
        toast_fill_all: "Please fill in all student identity data!"
    },
    ar: {
        subtitle: "نظام الحضور بالوجه",
        login: "تسجيل الدخول",
        register: "تسجيل",
        email: "البريد الإلكتروني",
        password: "كلمة المرور",
        confirm_password: "تأكيد كلمة المرور",
        full_name: "الاسم الكامل",
        terms_agree: "أوافق على <a href='#'>الشروط والأحكام</a>",
        terms_agree_reg: "أوافق على <a href='#'>الشروط والأحكام</a>",
        login_btn: "دخول",
        register_btn: "تسجيل",
        demo_info: "تجريبي: admin@amanahid.sch.id / AmanahDemo!2026#ID",
        nav_presensi: "الحضور",
        nav_database: "قاعدة البيانات",
        nav_formulir: "النموذج",
        nav_profile: "الملف الشخصي",
        loading_ai: "جارٍ تحميل نموذج الذكاء الاصطناعي...",
        detecting_face: "جارٍ اكتشاف الوجه...",
        db_title: "قاعدة بيانات الحضور",
        db_desc: "إدارة سجل الحضور، تصفية التواريخ، وتصدير التقارير.",
        total_students: "إجمالي الطلاب",
        present_today: "الحاضرون اليوم",
        percentage: "النسبة المئوية",
        total_history: "إجمالي السجل",
        search_placeholder: "ابحث عن الاسم، NISN، أو الفصل...",
        export: "تصدير",
        delete_all: "حذف الكل",
        nisn: "NISN",
        name: "الاسم",
        class: "الفصل",
        status: "الحالة",
        date: "التاريخ",
        time: "الوقت",
        method: "الطريقة",
        confidence: "الثقة",
        action: "الإجراء",
        no_data: "لا توجد بيانات حضور بعد<br><small>ستظهر البيانات بعد التحقق من الوجه.</small>",
        form_title: "نموذج الطالب",
        form_desc: "تسجيل هوية الطالب ووجهه للحضور.",
        student_identity: "هوية الطالب",
        save_student: "حفظ بيانات الطالب",
        face_verification: "التحقق من الوجه",
        face_verification_desc: "التقط الوجه من الأمام، اليسار، اليمين، الأعلى، والأسفل لضمان دقة الحضور.",
        ai_analysis: "تحليل الذكاء الاصطناعي",
        position_hint: "ضع وجهك للأمام",
        upload_photo: "رفع صورة",
        use_camera: "استخدام الكاميرا",
        profile_title: "الملف الشخصي",
        change_photo: "تغيير الصورة",
        language: "اللغة",
        save_profile: "حفظ الملف",
        logout: "خروج",
        toast_login_success: "تم تسجيل الدخول بنجاح! مرحباً.",
        toast_login_fail: "البريد الإلكتروني أو كلمة المرور خاطئة!",
        toast_register_success: "تم التسجيل بنجاح! يرجى تسجيل الدخول.",
        toast_model_loaded: "تم تحميل نموذج الذكاء الاصطناعي بنجاح!",
        toast_model_fail: "فشل تحميل نموذج الذكاء الاصطناعي. تحقق من الاتصال.",
        toast_camera_denied: "تم رفض الوصول إلى الكاميرا أو غير متاح.",
        toast_student_saved: "تم تسجيل الطالب {name} بنجاح!",
        toast_face_not_detected: "لم يتم اكتشاف الوجه! تأكد من وضوح الوجه.",
        toast_attendance_success: "تم تسجيل حضور {name} بنجاح!",
        toast_profile_saved: "تم حفظ الملف الشخصي بنجاح!",
        toast_logout: "لقد تم تسجيل خروجك.",
        toast_fill_all: "يرجى ملء جميع بيانات هوية الطالب!"
    }
};

let currentLang = 'id';

/* ================= STATE & DOM ================= */
const state = {
    currentUser: null,
    registeredFaces: [],
    isModelLoaded: false,
    attendanceData: [],
    stream: null,
    detectionInterval: null,
};

const screens = {
    auth: document.getElementById('auth-screen'),
    dashboard: document.getElementById('dashboard-screen'),
};
const views = {
    presensi: document.getElementById('view-presensi'),
    database: document.getElementById('view-database'),
    formulir: document.getElementById('view-formulir'),
};
const modalProfile = document.getElementById('profile-modal');
const toastEl = document.getElementById('toast');

/* ================= FUNGSI BAHASA (i18n) ================= */
function setLanguage(lang) {
    currentLang = lang;
    document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

    // Update semua elemen dengan atribut data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Update placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    // Update tombol bahasa aktif
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

// Event listener untuk semua tombol bahasa
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const lang = e.target.dataset.lang;
        if (lang) setLanguage(lang);
    });
});

/* ================= TOAST ================= */
function showToast(messageKey, type = 'info', params = {}) {
    let message = translations[currentLang][messageKey] || messageKey;
    // Ganti parameter seperti {name}
    Object.keys(params).forEach(key => {
        message = message.replace(`{${key}}`, params[key]);
    });

    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => { toastEl.classList.remove('show'); }, 3000);
}

/* ================= NAVIGASI & UI ================= */
document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
});
document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    document.getElementById('login-form').classList.remove('active');
});

const termsReg = document.getElementById('terms-reg');
const btnRegisterSubmit = document.getElementById('btn-register-submit');
termsReg.addEventListener('change', () => {
    btnRegisterSubmit.disabled = !termsReg.checked;
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    if (email === 'admin@amanahid.sch.id' && password === 'AmanahDemo!2026#ID') {
        state.currentUser = { name: 'Admin', email: email };
        showToast('toast_login_success', 'success');
        screens.auth.classList.remove('active');
        screens.dashboard.classList.add('active');
        initDashboard();
    } else {
        showToast('toast_login_fail', 'error');
    }
});

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('toast_register_success', 'success');
    document.getElementById('tab-login').click();
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;
        if (target === 'profile') {
            modalProfile.classList.add('active');
            return;
        }
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
        Object.values(views).forEach(v => v.classList.remove('active'));
        if (views[target]) {
            views[target].classList.add('active');
            if (target === 'presensi') startCamera('video-presensi', 'overlay-presensi');
            else if (target === 'formulir') startCamera('video-formulir', 'overlay-formulir');
            else stopCamera();
        }
    });
});

document.getElementById('close-profile').addEventListener('click', () => modalProfile.classList.remove('active'));
document.getElementById('btn-save-profile').addEventListener('click', () => {
    showToast('toast_profile_saved', 'success');
    modalProfile.classList.remove('active');
});
document.getElementById('btn-logout').addEventListener('click', () => {
    modalProfile.classList.remove('active');
    screens.dashboard.classList.remove('active');
    screens.auth.classList.add('active');
    state.currentUser = null;
    stopCamera();
    showToast('toast_logout', 'info');
});

/* ================= AI & FACE RECOGNITION ================= */
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        state.isModelLoaded = true;
        document.getElementById('loading-ai').style.display = 'none';
        document.getElementById('loading-ai-form').style.display = 'none';
        showToast('toast_model_loaded', 'success');
    } catch (error) {
        console.error("Gagal memuat model AI:", error);
        showToast('toast_model_fail', 'error');
    }
}

async function startCamera(videoId, overlayId) {
    stopCamera();
    const video = document.getElementById(videoId);
    const overlay = document.getElementById(overlayId);
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
        video.srcObject = state.stream;
        video.onloadedmetadata = () => {
            video.play();
            startDetection(video, overlay);
        };
    } catch (err) {
        showToast('toast_camera_denied', 'error');
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    if (state.detectionInterval) {
        clearInterval(state.detectionInterval);
        state.detectionInterval = null;
    }
}

async function startDetection(video, canvas) {
    if (!state.isModelLoaded) {
        setTimeout(() => startDetection(video, canvas), 500);
        return;
    }
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    state.detectionInterval = setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        // Update progress bar di Formulir
        const aiProgress = document.getElementById('ai-progress');
        const aiPercent = document.getElementById('ai-percent');
        if (aiProgress && aiPercent) {
            if (detections.length > 0) {
                const confidence = Math.round(detections[0].detection.score * 100);
                aiProgress.style.width = `${confidence}%`;
                aiPercent.textContent = `${confidence}%`;
            } else {
                aiProgress.style.width = '0%';
                aiPercent.textContent = '0%';
            }
        }

        // Logika Presensi (Mencocokkan Wajah)
        if (video.id === 'video-presensi' && detections.length > 0) {
            const statusBadge = document.getElementById('status-presensi');
            if (state.registeredFaces.length === 0) {
                statusBadge.textContent = translations[currentLang].no_data.split('<')[0];
                statusBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
            } else {
                const labeledDescriptors = state.registeredFaces.map(f =>
                    new faceapi.LabeledFaceDescriptors(f.nisn, [new Float32Array(f.descriptor)])
                );
                const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);

                if (bestMatch.label !== 'unknown') {
                    const student = state.registeredFaces.find(f => f.nisn === bestMatch.label);
                    statusBadge.textContent = `${translations[currentLang].nav_presensi}: ${student.nama}`;
                    statusBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.8)';

                    if (!state.attendanceData.find(a => a.nisn === student.nisn && a.timestamp > Date.now() - 5000)) {
                        state.attendanceData.push({
                            nisn: student.nisn,
                            nama: student.nama,
                            kelas: student.kelas,
                            status: 'Hadir',
                            timestamp: Date.now(),
                            confidence: Math.round(bestMatch.distance * 100)
                        });
                        updateDatabaseTable();
                        showToast('toast_attendance_success', 'success', { name: student.nama });
                    }
                } else {
                    statusBadge.textContent = 'Wajah tidak dikenali!';
                    statusBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
                }
            }
        }
    }, 500);
}

document.getElementById('btn-save-siswa').addEventListener('click', async () => {
    const nisn = document.getElementById('input-nisn').value;
    const nama = document.getElementById('input-nama').value;
    const kelas = document.getElementById('input-kelas').value;
    const video = document.getElementById('video-formulir');

    if (!nisn || !nama || !kelas) {
        showToast('toast_fill_all', 'error');
        return;
    }
    if (!state.isModelLoaded) {
        showToast('toast_model_fail', 'error');
        return;
    }

    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detections) {
        showToast('toast_face_not_detected', 'error');
        return;
    }

    state.registeredFaces.push({
        nisn: nisn,
        nama: nama,
        kelas: kelas,
        descriptor: Array.from(detections.descriptor)
    });

    showToast('toast_student_saved', 'success', { name: nama });
    document.getElementById('input-nisn').value = '';
    document.getElementById('input-nama').value = '';
    document.getElementById('input-kelas').value = '';
    updateStats();
});

function updateStats() {
    document.querySelector('.stat-card:nth-child(1) p').textContent = state.registeredFaces.length;
    document.querySelector('.stat-card:nth-child(2) p').textContent = state.attendanceData.filter(a => a.status === 'Hadir').length;
    const percentage = state.registeredFaces.length > 0 ? Math.round((state.attendanceData.length / state.registeredFaces.length) * 100) : 0;
    document.querySelector('.stat-card:nth-child(3) p').textContent = `${percentage}%`;
    document.querySelector('.stat-card:nth-child(4) p').textContent = state.attendanceData.length;
}

function updateDatabaseTable() {
    const tbody = document.getElementById('db-tbody');
    if (state.attendanceData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">${translations[currentLang].no_data}</td></tr>`;
        return;
    }
    tbody.innerHTML = state.attendanceData.map((data, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${data.nisn}</td>
            <td>${data.nama}</td>
            <td>${data.kelas}</td>
            <td><span style="color: var(--success); font-weight: bold;">${data.status}</span></td>
            <td>${new Date(data.timestamp).toLocaleDateString(currentLang === 'id' ? 'id-ID' : currentLang === 'ar' ? 'ar-SA' : 'en-US')}</td>
            <td>${new Date(data.timestamp).toLocaleTimeString(currentLang === 'id' ? 'id-ID' : currentLang === 'ar' ? 'ar-SA' : 'en-US')}</td>
            <td>Face Recognition</td>
            <td>${data.confidence}%</td>
            <td><button class="btn-text" style="color: var(--danger);">Hapus</button></td>
        </tr>
    `).join('');
    updateStats();
}

function initDashboard() {
    loadModels();
    document.querySelector('[data-target="presensi"]').click();
}

document.getElementById('btn-capture-presensi').addEventListener('click', () => {
    showToast('toast_attendance_success', 'info', { name: 'Siswa' });
});

// Inisialisasi bahasa default
setLanguage('id');