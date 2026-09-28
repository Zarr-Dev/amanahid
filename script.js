/* ================= KONFIGURASI & STATE ================= */
const state = {
    currentUser: null,
    registeredFaces: [], // Menyimpan data wajah siswa { nisn, nama, kelas, descriptor }
    isModelLoaded: false,
    attendanceData: [],
    stream: null,
    detectionInterval: null,
};

// Elemen DOM
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

// ================= TOAST NOTIFICATION =================
function showToast(message, type = 'info') {
    toastEl.textContent = message;
    toastEl.className = `toast show ${type}`;
    setTimeout(() => { toastEl.classList.remove('show'); }, 3000);
}

// ================= NAVIGASI & UI =================
// Auth Tabs
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

// Register Checkbox Validation
const termsReg = document.getElementById('terms-reg');
const btnRegisterSubmit = document.getElementById('btn-register-submit');
termsReg.addEventListener('change', () => {
    btnRegisterSubmit.disabled = !termsReg.checked;
});

// Login Submit
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    if (email === 'admin@amanahid.sch.id' && password === 'AmanahDemo!2026#ID') {
        state.currentUser = { name: 'Admin', email: email };
        showToast('Login berhasil! Selamat datang.', 'success');
        screens.auth.classList.remove('active');
        screens.dashboard.classList.add('active');
        initDashboard();
    } else {
        showToast('Email atau kata sandi salah!', 'error');
    }
});

// Register Submit
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Pendaftaran berhasil! Silakan login.', 'success');
    document.getElementById('tab-login').click();
});

// Dashboard Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const target = e.currentTarget.dataset.target;

        if (target === 'profile') {
            modalProfile.classList.add('active');
            return;
        }

        // Update Nav Active
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Update View
        Object.values(views).forEach(v => v.classList.remove('active'));
        if (views[target]) {
            views[target].classList.add('active');
            if (target === 'presensi') startCamera('video-presensi', 'overlay-presensi');
            else if (target === 'formulir') startCamera('video-formulir', 'overlay-formulir');
            else stopCamera();
        }
    });
});

// Profile Modal
document.getElementById('close-profile').addEventListener('click', () => modalProfile.classList.remove('active'));
document.getElementById('btn-save-profile').addEventListener('click', () => {
    showToast('Profil berhasil disimpan!', 'success');
    modalProfile.classList.remove('active');
});
document.getElementById('btn-logout').addEventListener('click', () => {
    modalProfile.classList.remove('active');
    screens.dashboard.classList.remove('active');
    screens.auth.classList.add('active');
    state.currentUser = null;
    stopCamera();
    showToast('Anda telah keluar.', 'info');
});

// ================= AI & FACE RECOGNITION =================
async function loadModels() {
    try {
        // Menggunakan model dari CDN Face-API.js
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        state.isModelLoaded = true;
        document.getElementById('loading-ai').style.display = 'none';
        document.getElementById('loading-ai-form').style.display = 'none';
        showToast('Model AI berhasil dimuat!', 'success');
    } catch (error) {
        console.error("Gagal memuat model AI:", error);
        showToast('Gagal memuat model AI. Periksa koneksi internet.', 'error');
    }
}

async function startCamera(videoId, overlayId) {
    stopCamera(); // Hentikan kamera sebelumnya
    const video = document.getElementById(videoId);
    const overlay = document.getElementById(overlayId);

    try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
        video.srcObject = state.stream;

        // Mulai deteksi setelah video siap
        video.onloadedmetadata = () => {
            video.play();
            startDetection(video, overlay);
        };
    } catch (err) {
        showToast('Akses kamera ditolak atau tidak tersedia.', 'error');
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

        // Update status and progress for Formulir
        const aiProgress = document.getElementById('ai-progress');
        const aiPercent = document.getElementById('ai-percent');
        if (aiProgress && aiPercent) {
            if (detections.length > 0) {
                // Simulasi analisis akurasi berdasarkan jumlah landmark dan confidence
                const confidence = Math.round(detections[0].detection.score * 100);
                aiProgress.style.width = `${confidence}%`;
                aiPercent.textContent = `${confidence}%`;
                if (confidence > 80) {
                    document.getElementById('status-formulir')?.textContent = 'Wajah Terdeteksi dengan Baik';
                }
            } else {
                aiProgress.style.width = '0%';
                aiPercent.textContent = '0%';
            }
        }

        // Logika Presensi (Mencocokkan Wajah)
        if (video.id === 'video-presensi' && detections.length > 0) {
            const statusBadge = document.getElementById('status-presensi');
            if (state.registeredFaces.length === 0) {
                statusBadge.textContent = 'Belum ada data siswa terdaftar!';
                statusBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
            } else {
                const labeledDescriptors = state.registeredFaces.map(f =>
                    new faceapi.LabeledFaceDescriptors(f.nisn, [new Float32Array(f.descriptor)])
                );
                const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
                const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);

                if (bestMatch.label !== 'unknown') {
                    const student = state.registeredFaces.find(f => f.nisn === bestMatch.label);
                    statusBadge.textContent = `Selamat datang, ${student.nama}!`;
                    statusBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.8)';

                    // Simpan ke database presensi (hanya sekali per detik)
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
                        showToast(`Presensi ${student.nama} berhasil!`, 'success');
                    }
                } else {
                    statusBadge.textContent = 'Wajah tidak dikenali!';
                    statusBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
                }
            }
        }
    }, 500); // Deteksi setiap 0.5 detik
}

// Simpan Data Siswa & Wajah (Formulir)
document.getElementById('btn-save-siswa').addEventListener('click', async () => {
    const nisn = document.getElementById('input-nisn').value;
    const nama = document.getElementById('input-nama').value;
    const kelas = document.getElementById('input-kelas').value;
    const video = document.getElementById('video-formulir');

    if (!nisn || !nama || !kelas) {
        showToast('Harap isi semua data identitas siswa!', 'error');
        return;
    }

    if (!state.isModelLoaded) {
        showToast('Model AI belum siap. Tunggu sebentar.', 'error');
        return;
    }

    // Ambil descriptor wajah dari video
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (!detections) {
        showToast('Wajah tidak terdeteksi! Pastikan wajah terlihat jelas.', 'error');
        return;
    }

    // Simpan data siswa dan wajah ke state
    state.registeredFaces.push({
        nisn: nisn,
        nama: nama,
        kelas: kelas,
        descriptor: Array.from(detections.descriptor) // Konversi Float32Array ke Array untuk penyimpanan
    });

    showToast(`Siswa ${nama} berhasil didaftarkan!`, 'success');
    document.getElementById('input-nisn').value = '';
    document.getElementById('input-nama').value = '';
    document.getElementById('input-kelas').value = '';

    // Update Statistik Database
    updateStats();
});

// ================= DATABASE & STATISTIK =================
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
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">Belum ada data presensi<br><small>Data akan muncul setelah siswa melakukan verifikasi wajah.</small></td></tr>`;
        return;
    }

    tbody.innerHTML = state.attendanceData.map((data, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${data.nisn}</td>
            <td>${data.nama}</td>
            <td>${data.kelas}</td>
            <td><span style="color: var(--success); font-weight: bold;">${data.status}</span></td>
            <td>${new Date(data.timestamp).toLocaleDateString('id-ID')}</td>
            <td>${new Date(data.timestamp).toLocaleTimeString('id-ID')}</td>
            <td>Face Recognition</td>
            <td>${data.confidence}%</td>
            <td><button class="btn-text" style="color: var(--danger);">Hapus</button></td>
        </tr>
    `).join('');
    updateStats();
}

// ================= INISIALISASI DASHBOARD =================
function initDashboard() {
    // Load model AI saat dashboard dibuka
    loadModels();
    // Tampilkan view presensi secara default
    document.querySelector('[data-target="presensi"]').click();
}

// Handle capture button
document.getElementById('btn-capture-presensi').addEventListener('click', () => {
    showToast('Gambar diambil! Memproses verifikasi...', 'info');
    // Logika capture tambahan bisa ditambahkan di sini
});