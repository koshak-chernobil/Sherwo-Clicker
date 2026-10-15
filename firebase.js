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
    update,
    onValue
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
        // Том 11 fix: свои сохранения не должны восприниматься как "админские".
        // Ставим штамп 0 — игрок сам не должен триггерить подхват.
        // Но если админ уже ставил штамп — не затираем его при сохранении.
        if (saveData && typeof saveData === 'object') {
            if (!saveData._adminEditStamp) saveData._adminEditStamp = 0;
        }
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
        // Том 11 fix: ставим штамп админской правки, чтобы игра подхватила изменения
        if (updates && typeof updates === 'object') {
            for (let key in updates) {
                if (key.startsWith('save_') && updates[key] && typeof updates[key] === 'object') {
                    updates[key]._adminEditStamp = Date.now();
                }
            }
        }
        let stampApplied = false;
        for (let key in updates) {
            if (key.startsWith('save_') && updates[key] && updates[key]._adminEditStamp) {
                stampApplied = true;
                break;
            }
        }
        if (!stampApplied) {
            updates._adminEditStamp = Date.now();
        }
        // Том 11 fix: заморозка автосейва игрока на 60 секунд
		updates._freezeUntil = Date.now() + 3 * 1000;
        await update(ref(db, 'users/' + uid), updates);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Сбросить сохранение конкретного режима
window.fbAdminResetSave = async function(uid, mode) {
    try {
        // Том 11 fix: ставим штамп, чтобы игра подхватила сброс
        await update(ref(db, 'users/' + uid), {
            ['save_' + mode]: { _adminEditStamp: Date.now() }
        });
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

// --- ТОМ 11 fix: мгновенная подписка на изменения сохранения ---
// Работает через onValue (push-уведомления Firebase).
// Любое изменение в базе прилетает на все устройства этого аккаунта за ~0.1 сек.
let _saveUnsubscribe = null;

window.fbWatchSave = function(mode, callback) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (_saveUnsubscribe) {
        _saveUnsubscribe();
        _saveUnsubscribe = null;
    }
    try {
        // Слушаем весь узел пользователя, чтобы видеть и save_*, и _adminEditStamp
        const userRef = ref(db, 'users/' + user.uid);
        _saveUnsubscribe = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            // Достаём сохранение нужного режима
            const save = data['save_' + mode];
            if (!save) return;
            // Если на верхнем уровне есть штамп — он главнее
            const topStamp = data._adminEditStamp || 0;
            if (topStamp > (save._adminEditStamp || 0)) {
                save._adminEditStamp = topStamp;
            }
            callback(save);
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbUnwatchSave = function() {
    if (_saveUnsubscribe) {
        _saveUnsubscribe();
        _saveUnsubscribe = null;
    }
};

// --- Том 11 fix: проверка заморозки автосейва ---
// Админ после сохранения ставит _freezeUntil = Date.now() + 60сек.
// Игрок до этого времени НЕ сохраняет — чтобы не затереть админскую правку.
window.fbIsFrozen = async function() {
    const user = auth.currentUser;
    if (!user) return false;
    try {
        const snapshot = await get(ref(db, 'users/' + user.uid));
        if (!snapshot.exists()) return false;
        const data = snapshot.val();
        const freeze = data._freezeUntil || 0;
        return freeze > Date.now();
    } catch (err) {
        return false;
    }
};

console.log('🔥 Firebase-модуль v2.0 загружен');