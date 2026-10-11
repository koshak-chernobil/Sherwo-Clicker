// ============================================================
// МОДУЛЬ FIREBASE ДЛЯ «ШЕРВО КЛИКЕР»
// Автор: Koshak-Chernobil (_MASHK273_)
// Версия: 1.0
// ============================================================

// Конфиг (твой, из Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyBF79O8U6KPBzvwGn5XxP1lamkOZXe051s",
    authDomain: "sherwo-clicker.firebaseapp.com",
    databaseURL: "https://sherwo-clicker-default-rtdb.firebaseio.com",
    projectId: "sherwo-clicker",
    storageBucket: "sherwo-clicker.firebasestorage.app",
    messagingSenderId: "470667278642",
    appId: "1:470667278642:web:8c45110368d99187ba7f2b"
};

// Импорты Firebase (через CDN, без npm)
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

// Инициализация
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ============================================================
// ПУБЛИЧНЫЕ ФУНКЦИИ (используются в игре)
// ============================================================

// --- РЕГИСТРАЦИЯ ---
window.fbRegister = async function(email, password, nickname) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (nickname) {
            await updateProfile(user, { displayName: nickname });
        }
        // Создаём пустую запись в БД
        await set(ref(db, 'users/' + user.uid), {
            nickname: nickname || email.split('@')[0],
            email: email,
            createdAt: Date.now(),
            save: null
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

// --- СОХРАНЕНИЕ ПРОГРЕССА ---
window.fbSave = async function(saveData) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        await update(ref(db, 'users/' + user.uid), {
            save: saveData,
            lastSave: Date.now()
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ЗАГРУЗКА ПРОГРЕССА ---
window.fbLoad = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snapshot = await get(ref(db, 'users/' + user.uid));
        if (snapshot.exists()) {
            return { success: true, data: snapshot.val() };
        } else {
            return { success: false, error: 'Данные не найдены' };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ ---
window.fbGetUser = function() {
    return auth.currentUser;
};

// --- СЛЕЖЕНИЕ ЗА АВТОРИЗАЦИЕЙ ---
window.fbOnAuthChange = function(callback) {
    onAuthStateChanged(auth, callback);
};

console.log('🔥 Firebase-модуль загружен');
