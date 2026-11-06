// ============================================================
// МОДУЛЬ FIREBASE ДЛЯ «ШЕРВО КЛИКЕР»
// Версия: 3.2 (3 профиля + active_mode + Sherwo)
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
            return { success: true, avatar: data.avatar || '', createdAt: data.createdAt || 0, selectedBadge: data.selected_badge || 0 };
        }
        return { success: true, avatar: '', createdAt: 0 };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// --- ТОМ 14: АДМИН-КОНСОЛЬ ---

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

window.fbAdminLoadUser = async function(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (!snapshot.exists()) return { success: false, error: 'Пользователь не найден' };
        return { success: true, data: snapshot.val() };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbAdminSaveUser = async function(uid, updates) {
    try {
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
        updates._freezeUntil = Date.now() + 3 * 1000;
        await update(ref(db, 'users/' + uid), updates);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbAdminResetSave = async function(uid, mode) {
    try {
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
let _saveUnsubscribe = null;

window.fbWatchSave = function(mode, callback) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (_saveUnsubscribe) {
        _saveUnsubscribe();
        _saveUnsubscribe = null;
    }
    try {
        const userRef = ref(db, 'users/' + user.uid);
        _saveUnsubscribe = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            const save = data['save_' + mode];
            if (!save) return;
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

window.fbGetPublicProfile = async function(uid) {
    try {
        const snapshot = await get(ref(db, 'social/profiles/' + uid));
        if (!snapshot.exists()) return { success: false, error: 'Профиль не найден' };
        return { success: true, data: snapshot.val() };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

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
        const friendSnap = await get(ref(db, 'social/friends/' + user.uid + '/list/' + toUid));
        if (friendSnap.exists()) return { success: false, error: 'Уже в друзьях' };
        const outSnap = await get(ref(db, 'social/friends/' + user.uid + '/requests/outgoing/' + toUid));
        if (outSnap.exists()) return { success: false, error: 'Заявка уже отправлена' };
        const inSnap = await get(ref(db, 'social/friends/' + user.uid + '/requests/incoming/' + toUid));
        if (inSnap.exists()) {
            return await window.fbAcceptFriendRequest(toUid);
        }
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

window.fbGetOrCreateChat = async function(otherUid) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (otherUid === user.uid) return { success: false, error: 'Нельзя чат с собой' };
    try {
        let ids = [user.uid, otherUid].sort();
        let chatId = ids[0] + '_' + ids[1];
        let chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) {
            await set(ref(db, 'social/chats/' + chatId), {
                type: 'private',
                members: { [user.uid]: true, [otherUid]: true },
                createdAt: Date.now(),
                lastMessage: '',
                lastMessageTs: 0,
                lastMessageFrom: ''
            });
            await set(ref(db, 'social/userChats/' + user.uid + '/' + chatId), { lastRead: 0 });
            await set(ref(db, 'social/userChats/' + otherUid + '/' + chatId), { lastRead: 0 });
        }
        return { success: true, chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbSendMessage = async function(chatId, text, imageUrl) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    if (!text && !imageUrl) return { success: false, error: 'Пустое сообщение' };
    try {
        const msgRef = push(ref(db, 'social/chats/' + chatId + '/messages'));
        const msgId = msgRef.key;
        const now = Date.now();
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

window.fbDeleteMessage = async function(chatId, msgId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const msgSnap = await get(ref(db, 'social/chats/' + chatId + '/messages/' + msgId));
        if (!msgSnap.exists()) return { success: false, error: 'Сообщение не найдено' };
        const m = msgSnap.val();
        if (m.from !== user.uid) return { success: false, error: 'Это не твоё сообщение' };
        await update(ref(db, 'social/chats/' + chatId + '/messages/' + msgId), {
            deleted: true,
            text: '',
            image: ''
        });
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (chatSnap.exists()) {
            const chat = chatSnap.val();
            if (chat.lastMessageTs === m.timestamp) {
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
                    await update(ref(db, 'social/chats/' + chatId), {
                        lastMessage: prevMsg.text || (prevMsg.image ? '🖼 Картинка' : ''),
                        lastMessageTs: prevMsg.timestamp,
                        lastMessageFrom: prevMsg.from
                    });
                } else {
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

window.fbMarkRead = async function(chatId, msgTs) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const msgsSnap = await get(ref(db, 'social/chats/' + chatId + '/messages'));
        if (msgsSnap.exists()) {
            let allMsgs = [];
            msgsSnap.forEach(child => {
                allMsgs.push({ id: child.key, ...child.val() });
            });
            allMsgs.sort((a, b) => a.timestamp - b.timestamp);
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
            
            // ФИКС: если в чате нет сообщений, но есть превью — чистим его
            let lastMsgText = c.lastMessage || '';
            if (lastMsgText && c.lastMessageTs > 0) {
                const msgsSnap = await get(ref(db, 'social/chats/' + chatId + '/messages'));
                // Если сообщений вообще нет или все удалены
                let hasValidMessages = false;
                if (msgsSnap.exists()) {
                    msgsSnap.forEach(child => {
                        const m = child.val();
                        if (!m.deleted && (m.text || m.image)) {
                            hasValidMessages = true;
                        }
                    });
                }
                if (!hasValidMessages) {
                    lastMsgText = '';
                    // Обновляем базу, чтобы больше не грузить пустое превью
                    await update(ref(db, 'social/chats/' + chatId), {
                        lastMessage: '',
                        lastMessageTs: 0,
                        lastMessageFrom: ''
                    });
                }
            }

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
                lastMessage: lastMsgText,
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

window.fbUploadImage = async function(file) {
    const IMGBB_API_KEY = '2d17465f93a17e6dec336033521e00bb';
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (ev) => {
            let img = new Image();
            img.onload = () => {
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

window.fbGetChat = async function(chatId) {
    try {
        const snap = await get(ref(db, 'social/chats/' + chatId));
        if (!snap.exists()) return { success: false, error: 'Чат не найден' };
        return { success: true, data: snap.val() };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

window.fbUpdateGroup = async function(chatId, updates) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const snap = await get(ref(db, 'social/chats/' + chatId));
        if (!snap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = snap.val();
        if (chat.type !== 'group') return { success: false, error: 'Это не группа' };
        if (chat.owner !== user.uid) return { success: false, error: 'Только владелец может менять настройки' };
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
// === ТОМ 3: ГРУППЫ ===
// ============================================================

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
        let members = {};
        members[user.uid] = 'owner';
        memberUids.forEach(uid => {
            if (uid !== user.uid) members[uid] = 'member';
        });
        await set(chatRef, {
            type: type,
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
        for (let uid in members) {
            await set(ref(db, 'social/userChats/' + uid + '/' + chatId), { lastRead: 0 });
        }
        return { success: true, chatId: chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

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
        await remove(ref(db, 'social/chats/' + chatId + '/members/' + user.uid));
        await remove(ref(db, 'social/userChats/' + user.uid + '/' + chatId));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

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
        for (let uid in chat.members) {
            await remove(ref(db, 'social/userChats/' + uid + '/' + chatId));
        }
        await remove(ref(db, 'social/chats/' + chatId));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 2.5: МУЛЬТИАККАУНТ ===
// ============================================================

window.fbSaveSession = function() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        let accounts = JSON.parse(localStorage.getItem('sherwo_accounts') || '[]');
        let existingIdx = accounts.findIndex(a => a.uid === user.uid || (a.email && a.email === user.email));
        let accountData = {
            uid: user.uid,
            email: user.email,
            nickname: user.displayName || user.email.split('@')[0]
        };
        if (existingIdx !== -1) {
            accounts[existingIdx] = accountData;
        } else {
            accounts.push(accountData);
        }
        if (accounts.length > 5) accounts = accounts.slice(-5);
        localStorage.setItem('sherwo_accounts', JSON.stringify(accounts));
    } catch (e) {
        console.error('Ошибка сохранения сессии:', e);
    }
};

window.fbGetSavedAccounts = function() {
    try {
        return JSON.parse(localStorage.getItem('sherwo_accounts') || '[]');
    } catch (e) {
        return [];
    }
};

window.fbRemoveSavedAccount = function(uid) {
    try {
        let accounts = JSON.parse(localStorage.getItem('sherwo_accounts') || '[]');
        accounts = accounts.filter(a => a.uid !== uid);
        localStorage.setItem('sherwo_accounts', JSON.stringify(accounts));
    } catch (e) {}
};

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
        await remove(ref(db, 'social/chats/' + chatId + '/members/' + targetUid));
        await remove(ref(db, 'social/userChats/' + targetUid + '/' + chatId));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

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

window.fbCreateInviteLink = async function(chatId) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const chatSnap = await get(ref(db, 'social/chats/' + chatId));
        if (!chatSnap.exists()) return { success: false, error: 'Группа не найдена' };
        const chat = chatSnap.val();
        if (chat.type !== 'group') return { success: false, error: 'Это не группа' };
        if (chat.owner !== user.uid) return { success: false, error: 'Только владелец может создавать ссылки' };
        let token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
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
        if (chat.members && chat.members[user.uid]) {
            return { success: false, error: 'Вы уже в этой группе' };
        }
        if (Object.keys(chat.members || {}).length >= 50) {
            return { success: false, error: 'В группе уже 50 участников' };
        }
        await update(ref(db, 'social/chats/' + chatId + '/members'), {
            [user.uid]: 'member'
        });
        await set(ref(db, 'social/userChats/' + user.uid + '/' + chatId), { lastRead: 0 });
        return { success: true, chatId: chatId };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 4: КАНАЛ НОВОСТЕЙ ===
// ============================================================

window.fbGetOrCreateNewsChat = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const newsRef = ref(db, 'social/chats/news');
        const snap = await get(newsRef);
        
        if (!snap.exists()) {
            await set(newsRef, {
                type: 'channel',
                name: '📢 Новости игры',
                description: 'Официальные новости и обновления Шерво Кликер',
                owner: 'system',
                avatar: 'iconsc.png',
                members: { 'system': 'owner' },
                createdAt: Date.now(),
                lastMessage: 'Добро пожаловать в канал новостей!',
                lastMessageTs: Date.now(),
                lastMessageFrom: 'system'
            });
        }
        
        await set(ref(db, 'social/userChats/' + user.uid + '/news'), { lastRead: 0 });
        
        return { success: true };
    } catch (err) {
        console.error('Ошибка создания канала новостей:', err);
        return { success: false, error: err.message };
    }
};

// ============================================================
// === ТОМ 4: КАНАЛ НОВОСТЕЙ ===
// ============================================================

window.fbGetOrCreateNewsChat = async function() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Не авторизован' };
    try {
        const newsRef = ref(db, 'social/chats/news');
        const snap = await get(newsRef);
        
        // Если канала нет — создаём его
        if (!snap.exists()) {
            await set(newsRef, {
                type: 'channel',
                name: '📢 Новости игры',
                description: 'Официальные новости и обновления Шерво Кликер',
                owner: 'system',
                avatar: 'iconsc.png',
                members: { 'system': 'owner' },
                createdAt: Date.now(),
                lastMessage: 'Добро пожаловать в канал новостей!',
                lastMessageTs: Date.now(),
                lastMessageFrom: 'system'
            });
        }
        
        // Добавляем канал в список чатов пользователя
        await set(ref(db, 'social/userChats/' + user.uid + '/news'), { lastRead: 0 });
        
        return { success: true };
    } catch (err) {
        console.error('Ошибка создания канала новостей:', err);
        return { success: false, error: err.message };
    }
};

console.log('🔥 Firebase-модуль v3.2 (Sherwo + канал новостей) загружен');