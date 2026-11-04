// discord-rpc.js
(function() {
    const CLIENT_ID = '1567140647348076564';
    // Оставляем только стандартные порты Discord
    const PORTS = [6463, 6464, 6465, 6466];
    
    let ws = null;
    let isConnected = false;
    let statusInterval = null;
    let reconnectTimer = null;

    function log(msg) { console.warn(`[RPC] ${msg}`); }

    function updateStatus() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        const lvl = (typeof _l !== 'undefined') ? _l : 1;

        const payload = {
            cmd: "SET_ACTIVITY",
            args: {
                pid: 9999,
                activity: {
                    details: "Шерво Кликер",
                    state: "Уровень: " + lvl,
                    assets: {
                        large_image: "mushroom",
                        large_text: "Шерво Кликер"
                    },
                    buttons: [{ label: "Присоединиться", url: "https://sherwoclicker.srula.online/" }],
                    instance: false
                }
            },
            nonce: Date.now().toString()
        };

        ws.send(JSON.stringify(payload));
        log('Статус отправлен (Уровень: ' + lvl + ')');
    }

    function tryPort(portIndex) {
        if (portIndex >= PORTS.length) {
            log('⏳ Discord не найден. Повторная попытка через 60 сек...');
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => tryPort(0), 60000);
            return;
        }

        let port = PORTS[portIndex];
        log(`Пробую порт ${port}...`);

        try {
            // Убрали кастомный таймаут. Браузер сам закроет, если не выйдет.
            // Добавили параметры, которые любит Discord
            let testWs = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=${CLIENT_ID}&encoding=json`);

            testWs.onopen = () => {
                log(`✅ Подключено к порту ${port}`);
                ws = testWs;
                isConnected = true;
                
                updateStatus();
                if (statusInterval) clearInterval(statusInterval);
                statusInterval = setInterval(updateStatus, 15000);
            };

            testWs.onerror = () => {
                // Просто молча пробуем следующий
            };

            testWs.onclose = () => {
                if (!isConnected) {
                    // Если не подключились — пробуем следующий порт
                    setTimeout(() => tryPort(portIndex + 1), 500);
                } else {
                    // Если потеряли связь
                    log('⚠️ Соединение потеряно. Переподключение...');
                    isConnected = false;
                    if (statusInterval) clearInterval(statusInterval);
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => tryPort(0), 10000);
                }
            };

        } catch (e) {
            setTimeout(() => tryPort(portIndex + 1), 500);
        }
    }

    // Запуск
    log('Скрипт Discord RPC загружен. Ожидание...');
    if (document.readyState === 'complete') {
        setTimeout(() => tryPort(0), 3000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => tryPort(0), 3000);
        });
    }
})();