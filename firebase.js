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
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    get,
    update,
    onValue,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
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
		// Том 2 fix: дублируем ник в базу, чтобы точно был
        if (nickname) {
            await update(ref(db, 'users/' + user.uid), { nickname: nickname });
        }
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

// ============================================================
// === СОЦСЕТЬ (ТОМ 1) ===
// ============================================================

// --- ГЕНЕРАЦИЯ 9-ЗНАЧНОГО ИГРОВОГО ID ---
window.fbGenerateGameId = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const userSnap = await get(ref(db, 'users/' + user.uid + '/gameId'));
        if (userSnap.exists() && userSnap.val()) {
            return { success: true, gameId: userSnap.val(), existed: true };
        }
        let attempts = 0;
        while (attempts < 20) {
            let id = String(Math.floor(100000000 + Math.random() * 900000000));
            let idSnap = await get(ref(db, 'social/gameIds/' + id));
            if (!idSnap.exists()) {
                await set(ref(db, 'social/gameIds/' + id), user.uid);
                await update(ref(db, 'users/' + user.uid), { gameId: id });
                return { success: true, gameId: id, existed: false };
            }
            attempts++;
        }
        return { success: false, error: 'Не удалось сгенерировать ID' };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ОБНОВЛЕНИЕ ПУБЛИЧНОГО ПРОФИЛЯ ---
window.fbUpdatePublicProfile = async function(data) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        let updates = {
            nickname: user.displayName || user.email.split('@')[0],
            lastOnline: Date.now(),
            status: 'online'
        };
        if (data) {
            if (data.level !== undefined) updates.level = data.level;
            if (data.prestige !== undefined) updates.prestige = data.prestige;
            if (data.evolution !== undefined) updates.evolution = data.evolution;
            if (data.avatar !== undefined) updates.avatar = data.avatar;
            if (data.gameId !== undefined) updates.gameId = data.gameId;
        }
        await update(ref(db, 'social/profiles/' + user.uid), updates);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ПОЛУЧИТЬ ПУБЛИЧНЫЙ ПРОФИЛЬ ---
window.fbGetPublicProfile = async function(uid) {
    try {
        const snapshot = await get(ref(db, 'social/profiles/' + uid));
        if (!snapshot.exists()) return { success: false, error: 'Профиль не найден' };
        return { success: true, data: snapshot.val() };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ПОИСК ПОЛЬЗОВАТЕЛЯ ---
window.fbFindUser = async function(queryStr) {
    try {
        queryStr = queryStr.trim();
        if (!queryStr) return { success: false, error: 'Пустой запрос' };
        if (/^\d{9}$/.test(queryStr)) {
            const idSnap = await get(ref(db, 'social/gameIds/' + queryStr));
            if (idSnap.exists()) {
                const uid = idSnap.val();
                const profSnap = await get(ref(db, 'social/profiles/' + uid));
                if (profSnap.exists()) {
                    return { success: true, user: { uid: uid, ...profSnap.val() } };
                }
            }
            return { success: false, error: 'Игрок с таким ID не найден' };
        }
        const snap = await get(ref(db, 'social/profiles'));
        if (!snap.exists()) return { success: false, error: 'Профили не найдены' };
        let found = null;
        snap.forEach(child => {
            const data = child.val();
            if (data.nickname && data.nickname.toLowerCase() === queryStr.toLowerCase()) {
                found = { uid: child.key, ...data };
                return true;
            }
        });
        if (found) return { success: true, user: found };
        return { success: false, error: 'Игрок не найден' };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ДРУЗЬЯ ---
window.fbSendFriendRequest = async function(toUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (toUid === user.uid) return { success: false, error: 'Нельзя добавить себя' };
    try {
        // Проверка: уже друзья?
        const friendSnap = await get(ref(db, 'social/friends/' + user.uid + '/list/' + toUid));
        if (friendSnap.exists()) return { success: false, error: 'Уже в друзьях' };
        // Проверка: уже отправлена заявка?
        const outSnap = await get(ref(db, 'social/friends/' + user.uid + '/requests/outgoing/' + toUid));
        if (outSnap.exists()) return { success: false, error: 'Заявка уже отправлена' };
        // Проверка: а есть ли входящая от него? Тогда сразу принимаем
        const inSnap = await get(ref(db, 'social/friends/' + user.uid + '/requests/incoming/' + toUid));
        if (inSnap.exists()) {
            return await window.fbAcceptFriendRequest(toUid);
        }
        // Отправляем заявку
        const now = Date.now();
        await set(ref(db, 'social/friends/' + user.uid + '/requests/outgoing/' + toUid), now);
        await set(ref(db, 'social/friends/' + toUid + '/requests/incoming/' + user.uid), now);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbAcceptFriendRequest = async function(fromUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const listSnap = await get(ref(db, 'social/friends/' + user.uid + '/list'));
        if (listSnap.exists() && Object.keys(listSnap.val()).length >= 200) {
            return { success: false, error: 'Лимит друзей (200)' };
        }
        const otherSnap = await get(ref(db, 'social/friends/' + fromUid + '/list'));
        if (otherSnap.exists() && Object.keys(otherSnap.val()).length >= 200) {
            return { success: false, error: 'У друга лимит друзей' };
        }
        const now = Date.now();
        await set(ref(db, 'social/friends/' + user.uid + '/list/' + fromUid), now);
        await set(ref(db, 'social/friends/' + fromUid + '/list/' + user.uid), now);
        await remove(ref(db, 'social/friends/' + user.uid + '/requests/incoming/' + fromUid));
        await remove(ref(db, 'social/friends/' + fromUid + '/requests/outgoing/' + user.uid));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbDeclineFriendRequest = async function(fromUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        await remove(ref(db, 'social/friends/' + user.uid + '/requests/incoming/' + fromUid));
        await remove(ref(db, 'social/friends/' + fromUid + '/requests/outgoing/' + user.uid));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbRemoveFriend = async function(friendUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        await remove(ref(db, 'social/friends/' + user.uid + '/list/' + friendUid));
        await remove(ref(db, 'social/friends/' + friendUid + '/list/' + user.uid));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbGetFriends = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snap = await get(ref(db, 'social/friends/' + user.uid + '/list'));
        if (!snap.exists()) return { success: true, friends: [] };
        let friends = [];
        for (let uid of Object.keys(snap.val())) {
            const profSnap = await get(ref(db, 'social/profiles/' + uid));
            if (profSnap.exists()) friends.push({ uid: uid, ...profSnap.val() });
            else friends.push({ uid: uid, nickname: '—', lastOnline: 0 });
        }
        friends.sort((a, b) => (b.lastOnline || 0) - (a.lastOnline || 0));
        return { success: true, friends };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbGetFriendRequests = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const inSnap = await get(ref(db, 'social/friends/' + user.uid + '/requests/incoming'));
        const outSnap = await get(ref(db, 'social/friends/' + user.uid + '/requests/outgoing'));
        let incoming = [], outgoing = [];
        if (inSnap.exists()) {
            for (let uid of Object.keys(inSnap.val())) {
                const p = await get(ref(db, 'social/profiles/' + uid));
                incoming.push({ uid: uid, ...(p.exists() ? p.val() : { nickname: '—' }), timestamp: inSnap.val()[uid] });
            }
        }
        if (outSnap.exists()) {
            for (let uid of Object.keys(outSnap.val())) {
                const p = await get(ref(db, 'social/profiles/' + uid));
                outgoing.push({ uid: uid, ...(p.exists() ? p.val() : { nickname: '—' }), timestamp: outSnap.val()[uid] });
            }
        }
        return { success: true, incoming, outgoing };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ПОДАРКИ ---
window.fbSendGift = async function(toUid, type, amount) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (amount < 100 || amount > 1000000) return { success: false, error: 'Сумма: 100 – 1 000 000' };
    try {
        const today = new Date().toISOString().slice(0, 10);
        const dailySnap = await get(ref(db, 'social/friends/' + user.uid + '/dailyGift'));
        let daily = dailySnap.exists() ? dailySnap.val() : { date: today, cha: 0, mush: 0 };
        if (daily.date !== today) daily = { date: today, cha: 0, mush: 0 };
        if (type === 'cha' && daily.cha + amount > 10000000) return { success: false, error: 'Лимит чачи: 10 000 000 в день' };
        if (type === 'mush' && daily.mush + amount > 10000000) return { success: false, error: 'Лимит грибочков: 10 000 000 в день' };
        const giftRef = push(ref(db, 'social/friends/' + toUid + '/giftsIn'));
        await set(giftRef, {
            from: user.uid,
            fromNickname: user.displayName || user.email.split('@')[0],
            type: type,
            amount: amount,
            timestamp: Date.now(),
            claimed: false
        });
        if (type === 'cha') daily.cha += amount;
        else daily.mush += amount;
        await set(ref(db, 'social/friends/' + user.uid + '/dailyGift'), daily);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbClaimGift = async function(giftId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snap = await get(ref(db, 'social/friends/' + user.uid + '/giftsIn/' + giftId));
        if (!snap.exists()) return { success: false, error: 'Подарок не найден' };
        const gift = snap.val();
        if (gift.claimed) return { success: false, error: 'Уже забран' };
        await update(ref(db, 'social/friends/' + user.uid + '/giftsIn/' + giftId), { claimed: true });
        return { success: true, gift };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbGetGifts = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snap = await get(ref(db, 'social/friends/' + user.uid + '/giftsIn'));
        if (!snap.exists()) return { success: true, gifts: [] };
        let gifts = [];
        snap.forEach(child => {
            const d = child.val();
            if (!d.claimed) gifts.push({ id: child.key, ...d });
        });
        gifts.sort((a, b) => b.timestamp - a.timestamp);
        return { success: true, gifts };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbWatchGifts = function(callback) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    const r = ref(db, 'social/friends/' + user.uid + '/giftsIn');
    return onValue(r, (snap) => {
        if (!snap.exists()) { callback([]); return; }
        let gifts = [];
        snap.forEach(child => {
            const d = child.val();
            if (!d.claimed) gifts.push({ id: child.key, ...d });
        });
        callback(gifts);
    });
};

// ============================================================
// === SHERWO (ТОМ 2: ЛИЧНЫЕ ЧАТЫ) ===
// ============================================================

// --- Получить/создать чат между двумя игроками ---
window.fbGetOrCreateChat = async function(otherUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (otherUid === user.uid) return { success: false, error: 'Нельзя чат с собой' };
    try {
        // chatId — отсортированные uid, соединённые "_"
        let ids = [user.uid, otherUid].sort();
        let chatId = ids[0] + '_' + ids[1];
        let chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) {
            // Создаём чат
            await set(ref(db, 'social/chats/' + chatId), {
                type: 'private',
                members: { [user.uid]: true, [otherUid]: true },
                createdAt: Date.now(),
                lastMessage: '',
                lastMessageTs: 0,
                lastMessageFrom: ''
            });
            // Добавляем в userChats обоим
            await set(ref(db, 'social/userChats/' + user.uid + '/' + chatId), { lastRead: 0 });
            await set(ref(db, 'social/userChats/' + otherUid + '/' + chatId), { lastRead: 0 });
        }
        return { success: true, chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Отправить сообщение ---
window.fbSendMessage = async function(chatId, text, imageUrl) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (!text && !imageUrl) return { success: false, error: 'Пустое сообщение' };
    try {
        const msgRef = push(ref(db, 'social/chats/' + chatId + '/messages'));
        const msgId = msgRef.key;
        const now = Date.now();

        // Том 4 fix: в канале новостей автора всегда пишем "Разработчик"
        let authorName = user.displayName || user.email.split('@')[0];
        if (chatId === 'news') {
            authorName = 'Разработчик';
        }

        await set(msgRef, {
            from: user.uid,
            fromNickname: authorName,
            text: text || '',
            image: imageUrl || '',
            timestamp: now,
            edited: false,
            deleted: false
        });
        // Обновляем lastMessage
        await update(ref(db, 'social/chats/' + chatId), {
            lastMessage: text ? (text.length > 50 ? text.slice(0, 50) + '…' : text) : '🖼 Картинка',
            lastMessageTs: now,
            lastMessageFrom: user.uid
        });
        return { success: true, msgId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Редактировать сообщение ---
window.fbEditMessage = async function(chatId, msgId, newText) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const msgSnap = await get(ref(db, 'social/chats/' + chatId + '/messages/' + msgId));
        if (!msgSnap.exists()) return { success: false, error: 'Сообщение не найдено' };
        const m = msgSnap.val();
        if (m.from !== user.uid) return { success: false, error: 'Это не твоё сообщение' };
        await update(ref(db, 'social/chats/' + chatId + '/messages/' + msgId), {
            text: newText,
            edited: true,
            editedAt: Date.now()
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Удалить сообщение ---
window.fbDeleteMessage = async function(chatId, msgId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const msgSnap = await get(ref(db, 'social/chats/' + chatId + '/messages/' + msgId));
        if (!msgSnap.exists()) return { success: false, error: 'Сообщение не найдено' };
        const m = msgSnap.val();
        if (m.from !== user.uid) return { success: false, error: 'Это не твоё сообщение' };
        
        // Помечаем как удалённое
        await update(ref(db, 'social/chats/' + chatId + '/messages/' + msgId), {
            deleted: true,
            text: '',
            image: ''
        });

        // Том 4 fix: Если это было последнее сообщение — очищаем lastMessage
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (chatSnap.exists()) {
            const chat = chatSnap.val();
            // Если удалённое сообщение было последним (по времени)
            if (chat.lastMessageTs === m.timestamp) {
                // Ищем предыдущее сообщение
                const allMsgsSnap = await get(ref(db, 'social/chats/' + chatId + '/messages'));
                let prevMsg = null;
                if (allMsgsSnap.exists()) {
                    allMsgsSnap.forEach(child => {
                        const cm = child.val();
                        if (!cm.deleted && cm.timestamp < m.timestamp) {
                            if (!prevMsg || cm.timestamp > prevMsg.timestamp) {
                                prevMsg = cm;
                            }
                        }
                    });
                }
                
                if (prevMsg) {
                    // Ставим предыдущее сообщение как последнее
                    await update(ref(db, 'social/chats/' + chatId), {
                        lastMessage: prevMsg.text || (prevMsg.image ? '🖼 Картинка' : ''),
                        lastMessageTs: prevMsg.timestamp,
                        lastMessageFrom: prevMsg.from
                    });
                } else {
                    // Больше нет сообщений — очищаем
                    // Том 13: также сбрасываем lastRead, чтобы бейдж не висел
                    await update(ref(db, 'social/chats/' + chatId), {
                        lastMessage: '',
                        lastMessageTs: 0,
                        lastMessageFrom: ''
                    });
                }
            }
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Поставить/снять реакцию ---
window.fbToggleReaction = async function(chatId, msgId, emoji) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const r = ref(db, 'social/chats/' + chatId + '/messages/' + msgId + '/reactions/' + emoji + '/' + user.uid);
        const snap = await get(r);
        if (snap.exists()) {
            await remove(r);
        } else {
            await set(r, true);
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Отметить сообщение как прочитанное (Том 3.4: с трекингом) ---
window.fbMarkRead = async function(chatId, msgTs) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    
    try {
        // 2. Том 3.4: Отмечаем прочитанными последние 10 сообщений
        const msgsSnap = await get(ref(db, 'social/chats/' + chatId + '/messages'));
        if (msgsSnap.exists()) {
            let allMsgs = [];
            msgsSnap.forEach(child => {
                allMsgs.push({ id: child.key, ...child.val() });
            });
            // Сортируем по времени (новые в конце)
            allMsgs.sort((a, b) => a.timestamp - b.timestamp);
            // Берём последние 10
            let last10 = allMsgs.slice(-10);
            
            let updates = {};
            last10.forEach(m => {
                if (m.timestamp <= (msgTs || Date.now())) {
                    updates[m.id + '/readBy/' + user.uid] = true;
                }
            });
            if (Object.keys(updates).length > 0) {
                await update(ref(db, 'social/chats/' + chatId + '/messages'), updates);
            }
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Список чатов игрока ---
window.fbGetUserChats = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snap = await get(ref(db, 'social/userChats/' + user.uid));
        if (!snap.exists()) return { success: true, chats: [] };
        let chats = [];
        for (let chatId of Object.keys(snap.val())) {
            const chatSnap = await get(ref(db, 'social/chats/' + chatId));
            if (!chatSnap.exists()) continue;
            const c = chatSnap.val();
            // Для личных чатов — имя собеседника
            let displayName = c.name || '—';
            let displayAvatar = c.avatar || '';
            if (c.type === 'private' && c.members) {
                let otherUid = Object.keys(c.members).find(u => u !== user.uid);
                if (otherUid) {
                    const profSnap = await get(ref(db, 'social/profiles/' + otherUid));
                    if (profSnap.exists()) {
                        displayName = profSnap.val().nickname || '—';
                        displayAvatar = profSnap.val().avatar || '';
                    }
                }
            }
            chats.push({
                chatId,
                type: c.type,
                name: displayName,
                avatar: displayAvatar,
                lastMessage: c.lastMessage || '',
                lastMessageTs: c.lastMessageTs || 0,
                lastMessageFrom: c.lastMessageFrom || '',
                lastRead: snap.val()[chatId].lastRead || 0
            });
        }
        chats.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));
        return { success: true, chats };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- Подписка на сообщения чата ---
window.fbWatchMessages = function(chatId, callback) {
    const user = auth.currentUser;
    if (!user) return null;
    const r = ref(db, 'social/chats/' + chatId + '/messages');
    return onValue(r, (snap) => {
        if (!snap.exists()) { callback([]); return; }
        let msgs = [];
        snap.forEach(child => {
            msgs.push({ id: child.key, ...child.val() });
        });
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        callback(msgs);
    });
};

// --- Подписка на список чатов игрока ---
window.fbWatchUserChats = function(callback) {
    const user = auth.currentUser;
    if (!user) return null;
    const r = ref(db, 'social/userChats/' + user.uid);
    return onValue(r, () => {
        window.fbGetUserChats().then(res => {
            if (res.success) callback(res.chats);
        });
    });
};

// --- Загрузка картинки на imgbb ---
window.fbUploadImage = async function(file) {
    const IMGBB_API_KEY = '2d17465f93a17e6dec336033521e00bb';
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (ev) => {
            let img = new Image();
            img.onload = () => {
                // Сжимаем до 800x800
                let canvas = document.createElement('canvas');
                let maxSize = 800;
                let w = img.width, h = img.height;
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
                    else { w = Math.round(w * maxSize / h); h = maxSize; }
                }
                canvas.width = w; canvas.height = h;
                let ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                let dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                let base64 = dataUrl.split(',')[1];
                // Отправляем на imgbb
                let formData = new FormData();
                formData.append('key', IMGBB_API_KEY);
                formData.append('image', base64);
                fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) resolve({ success: true, url: data.data.url });
                        else resolve({ success: false, error: 'Ошибка imgbb' });
                    })
                    .catch(err => resolve({ success: false, error: err.message }));
            };
            img.src = ev.target.result;
        };
        reader.onerror = () => resolve({ success: false, error: 'Ошибка чтения файла' });
        reader.readAsDataURL(file);
    });
};

// --- ТОМ 3.2: ПОЛУЧЕНИЕ ДАННЫХ ЧАТА ---
window.fbGetChat = async function(chatId) {
    try {
        const snap = await get(ref(db, 'social/chats/' + chatId));
        if (!snap.exists()) return { success: false, error: 'Чат не найден' };
        return { success: true, data: snap.val() };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ТОМ 3.2: ОБНОВЛЕНИЕ ГРУППЫ ---
window.fbUpdateGroup = async function(chatId, updates) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snap = await get(ref(db, 'social/chats/' + chatId));
        if (!snap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = snap.val();
        // Проверяем, что это группа и игрок — владелец
        if (chat.type !== 'group') return { success: false, error: 'Это не группа' };
        if (chat.owner !== user.uid) return { success: false, error: 'Только владелец может менять настройки' };
        
        // Разрешаем менять только name, avatar, description
        let allowed = {};
        if (updates.name !== undefined) allowed.name = updates.name;
        if (updates.avatar !== undefined) allowed.avatar = updates.avatar;
        if (updates.description !== undefined) allowed.description = updates.description;
        
        await update(ref(db, 'social/chats/' + chatId), allowed);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 3: ГРУППЫ (Создание, Участники, Выход, Удаление) ===
// ============================================================

// --- СОЗДАНИЕ ГРУППЫ ---
window.fbCreateGroup = async function(name, avatar, memberUids, type = 'group', description = '') {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (!name || name.trim().length === 0) return { success: false, error: 'Пустое название' };
    if (!memberUids || memberUids.length === 0) return { success: false, error: 'Нет участников' };
    if (memberUids.length > 50) return { success: false, error: 'Максимум 50 участников' };

    try {
        const chatRef = push(ref(db, 'social/chats'));
        const chatId = chatRef.key;
        const now = Date.now();

        // Собираем участников: создатель + выбранные друзья
        let members = {};
        members[user.uid] = 'owner';
        memberUids.forEach(uid => {
            if (uid !== user.uid) members[uid] = 'member';
        });

        // Создаём чат
        await set(chatRef, {
            type: type, // 'group' или 'channel'
            name: name.trim(),
            avatar: avatar || '👥',
            description: description.trim(),
            owner: user.uid,
            members: members,
            createdAt: now,
            lastMessage: '',
            lastMessageTs: now,
            lastMessageFrom: 'system'
        });

        // Добавляем чат в список чатов каждому участнику
        for (let uid in members) {
            await set(ref(db, 'social/userChats/' + uid + '/' + chatId), { lastRead: 0 });
        }

        return { success: true, chatId: chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ПОЛУЧЕНИЕ УЧАСТНИКОВ ГРУППЫ ---
window.fbGetGroupMembers = async function(chatId) {
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        if (chat.type !== 'group') return { success: false, error: 'Это не группа' };
        if (!chat.members) return { success: false, error: 'Нет участников' };

        let members = [];
        for (let uid in chat.members) {
            let role = chat.members[uid];
            let profSnap = await get(ref(db, 'social/profiles/' + uid));
            let nickname = '—';
            let avatar = 'iconsc.png';
            if (profSnap.exists()) {
                let p = profSnap.val();
                nickname = p.nickname || '—';
                avatar = p.avatar || 'iconsc.png';
            }
            members.push({ uid, role, nickname, avatar });
        }
        // Сортируем: сначала owner, потом все остальные
        members.sort((a, b) => {
            if (a.role === 'owner') return -1;
            if (b.role === 'owner') return 1;
            return 0;
        });
        return { success: true, members };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ВЫХОД ИЗ ГРУППЫ ---
window.fbLeaveGroup = async function(chatId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        
        if (chat.owner === user.uid) {
            return { success: false, error: 'Владелец не может выйти. Удалите группу.' };
        }

        // Удаляем себя из участников
        await remove(ref(db, 'social/chats/' + chatId + '/members/' + user.uid));
        // Удаляем чат из своего списка
        await remove(ref(db, 'social/userChats/' + user.uid + '/' + chatId));

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- УДАЛЕНИЕ ГРУППЫ (только владелец) ---
window.fbDeleteGroup = async function(chatId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        
        if (chat.owner !== user.uid) {
            return { success: false, error: 'Только владелец может удалить группу' };
        }

        // Удаляем чат у всех участников
        for (let uid in chat.members) {
            await remove(ref(db, 'social/userChats/' + uid + '/' + chatId));
        }

        // Удаляем сам чат
        await remove(ref(db, 'social/chats/' + chatId));

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 2.5: МУЛЬТИАККАУНТ ===
// ============================================================

// Сохранить текущую сессию в localStorage
window.fbSaveSession = function() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        let accounts = JSON.parse(localStorage.getItem('sherwo_accounts') || '[]');
        // Убираем старую запись об этом аккаунте, если есть
        accounts = accounts.filter(a => a.uid !== user.uid);
        // Добавляем новую
        accounts.push({
            uid: user.uid,
            email: user.email,
            nickname: user.displayName || user.email.split('@')[0]
        });
        // Ограничиваем до 5 аккаунтов
        if (accounts.length > 5) accounts = accounts.slice(-5);
        localStorage.setItem('sherwo_accounts', JSON.stringify(accounts));
    } catch (e) {}
};

// Получить список сохранённых аккаунтов
window.fbGetSavedAccounts = function() {
    try {
        return JSON.parse(localStorage.getItem('sherwo_accounts') || '[]');
    } catch (e) {
        return [];
    }
};

// Удалить аккаунт из сохранённых
window.fbRemoveSavedAccount = function(uid) {
    try {
        let accounts = JSON.parse(localStorage.getItem('sherwo_accounts') || '[]');
        accounts = accounts.filter(a => a.uid !== uid);
        localStorage.setItem('sherwo_accounts', JSON.stringify(accounts));
    } catch (e) {}
};

// Выход из текущего аккаунта (без удаления из памяти)
window.fbLogoutCurrent = async function() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 3.3: РОЛИ И КИК ===
// ============================================================

// Назначить роль участнику (только владелец)
window.fbSetGroupRole = async function(chatId, targetUid, role) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        
        if (chat.type !== 'group') return { success: false, error: 'Это не группа' };
        if (chat.owner !== user.uid) return { success: false, error: 'Только владелец может назначать админов' };
        if (targetUid === chat.owner) return { success: false, error: 'Нельзя изменить роль владельца' };

        await update(ref(db, 'social/chats/' + chatId + '/members'), {
            [targetUid]: role
        });

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Кикнуть участника (владелец или админ)
window.fbKickGroupMember = async function(chatId, targetUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        
        let myRole = chat.members[user.uid];
        if (chat.owner !== user.uid && myRole !== 'admin') {
            return { success: false, error: 'Только владелец или админ может кикать' };
        }
        if (targetUid === chat.owner) return { success: false, error: 'Нельзя кикнуть владельца' };
        if (targetUid === user.uid) return { success: false, error: 'Нельзя кикнуть себя' };

        // Удаляем из участников
        await remove(ref(db, 'social/chats/' + chatId + '/members/' + targetUid));
        // Удаляем чат из списка у кикнутого
        await remove(ref(db, 'social/userChats/' + targetUid + '/' + chatId));

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Удаление чужого сообщения (владелец или админ)
window.fbAdminDeleteMessage = async function(chatId, msgId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        
        let myRole = chat.members[user.uid];
        if (chat.owner !== user.uid && myRole !== 'admin') {
            return { success: false, error: 'Только владелец или админ может удалять' };
        }

        await update(ref(db, 'social/chats/' + chatId + '/messages/' + msgId), {
            deleted: true,
            text: 'Сообщение удалено администратором',
            image: ''
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 3.5: ССЫЛКИ-ПРИГЛАШЕНИЯ ===
// ============================================================

// Создать ссылку-приглашение
window.fbCreateInviteLink = async function(chatId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        
        if (chat.type !== 'group') return { success: false, error: 'Это не группа' };
        if (chat.owner !== user.uid) return { success: false, error: 'Только владелец может создавать ссылки' };

        // Генерируем случайный токен
        let token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
        
        // Сохраняем в базу
        await set(ref(db, 'social/invites/' + token), {
            chatId: chatId,
            createdBy: user.uid,
            createdAt: Date.now()
        });

        return { success: true, token: token };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// Вступить по ссылке
window.fbJoinByInvite = async function(token) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const inviteSnap = await get(ref(db, 'social/invites/' + token));
        if (!inviteSnap.exists()) return { success: false, error: 'Ссылка недействительна' };
        const invite = inviteSnap.val();
        const chatId = invite.chatId;

        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();

        // Проверяем, не в группе ли уже
        if (chat.members && chat.members[user.uid]) {
            return { success: false, error: 'Вы уже в этой группе' };
        }

        // Лимит участников
        if (Object.keys(chat.members || {}).length >= 50) {
            return { success: false, error: 'В группе уже 50 участников' };
        }

        // Добавляем в участники
        await update(ref(db, 'social/chats/' + chatId + '/members'), {
            [user.uid]: 'member'
        });

        // Добавляем чат в список
        await set(ref(db, 'social/userChats/' + user.uid + '/' + chatId), { lastRead: 0 });

        return { success: true, chatId: chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

console.log('🔥 Firebase-модуль v3.1 (Sherwo) загружен');