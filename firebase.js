// ============================================================
// МОДУЛЬ FIREBASE ДЛЯ «ШЕРВО КЛИКЕР»
// Версия: 2.0 (3 профиля + active_mode)
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBF79O8U6KPBzvwGn5XxP1lamkOZXe051s",
    authDomain: "sherwo-clicker.firebaseapp.com",
    databaseURL: "https://sherwo-clicker-default-rtdb.firebaseio.com",
    projectId: "sherwo-clicker",
    storageBucket: "sherwo-clicker.firebasestorage.app",
    messagingSenderId: "470667278642",
    appId: "1:470667278642:web:8c45110368d99187ba7f2b"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- РЕГИСТРАЦИЯ ---
window.fbRegister = async function(email, password, nickname) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (nickname) await updateProfile(user, { displayName: nickname });
		await set(ref(db, 'users/' + user.uid), {
            nickname: nickname || email.split('@')[0],
            email: email,
            active_mode: 'normal',
            createdAt: Date.now(),
            lastSave: null,
            save_normal: null,
            save_hardcore: null,
            save_developer: null
        });
        return { success: true, user };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ВХОД ---
window.fbLogin = async function(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ВЫХОД ---
window.fbLogout = async function() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- СОХРАНЕНИЕ ПРОГРЕССА (по режиму) ---
window.fbSave = async function(mode, saveData) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        // Том 2 fix: гарантируем, что nickname и email всегда в базе
        await update(ref(db, 'users/' + user.uid), {
            nickname: user.displayName || user.email.split('@')[0],
            email: user.email,
            ['save_' + mode]: saveData,
            lastSave: Date.now()
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ЗАГРУЗКА ПРОГРЕССА (по режиму) ---
window.fbLoad = async function(mode) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snapshot = await get(ref(db, 'users/' + user.uid));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return { success: true, data: data['save_' + mode] || null, mode: data.active_mode || 'normal' };
        } else {
            return { success: false, error: 'Данные не найдены' };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- СОХРАНИТЬ АКТИВНЫЙ РЕЖИМ ---
window.fbSetActiveMode = async function(mode) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        await update(ref(db, 'users/' + user.uid), { active_mode: mode });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- СОХРАНИТЬ АВАТАР ---
window.fbSaveAvatar = async function(avatarData) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        await update(ref(db, 'users/' + user.uid), { avatar: avatarData || null });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ЗАГРУЗИТЬ АВАТАР ---
window.fbLoadAvatar = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snapshot = await get(ref(db, 'users/' + user.uid));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return { success: true, avatar: data.avatar || '', createdAt: data.createdAt || 0 };
        }
        return { success: true, avatar: '', createdAt: 0 };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ТОМ 14: АДМИН-КОНСОЛЬ ---

// Загрузить список всех пользователей
window.fbAdminListUsers = async function() {
    try {
        const snapshot = await get(ref(db, 'users'));
        if (!snapshot.exists()) return { success: true, users: [] };
        let users = [];
        snapshot.forEach(child => {
            let data = child.val();
            users.push({
                uid: child.key,
                nickname: data.nickname || '—',
                email: data.email || '—',
                active_mode: data.active_mode || 'normal'
            });
        });
        return { success: true, users };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Загрузить данные конкретного пользователя
window.fbAdminLoadUser = async function(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (!snapshot.exists()) return { success: false, error: 'Пользователь не найден' };
        return { success: true, data: snapshot.val() };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Сохранить изменения в конкретного пользователя
window.fbAdminSaveUser = async function(uid, updates) {
    try {
        await update(ref(db, 'users/' + uid), updates);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Сбросить сохранение конкретного режима
window.fbAdminResetSave = async function(uid, mode) {
    try {
        await update(ref(db, 'users/' + uid), { ['save_' + mode]: null });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ---
window.fbGetUser = function() { return auth.currentUser; };

// --- ОБНОВИТЬ ПРОФИЛЬ (ник) ---
window.fbUpdateProfile = async function(nickname) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        await updateProfile(user, { displayName: nickname });
        await update(ref(db, 'users/' + user.uid), { nickname: nickname });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- СЛЕЖЕНИЕ ЗА АВТОРИЗАЦИЕЙ ---
window.fbOnAuthChange = function(callback) { onAuthStateChanged(auth, callback); };

console.log('🔥 Firebase-модуль v2.0 загружен');