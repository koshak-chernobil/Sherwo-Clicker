// discord-rpc.js
(function() {
    const CLIENT_ID = '1567140647348076564';
    
    // Сначала стандартные порты Discord, потом твои дополнительные
    const PORTS = [
        6463, 6464, 6465, 6466, // Стандартные Discord RPC
        1024, 1934, 1936, 65535 // Твои дополнительные порты
    ];
    
    let ws = null;
    let isConnected = false;
    let statusInterval = null;
    let reconnectTimer = null;

    function log(msg) { console.log(`[RPC] ${msg}`); }

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
        // Если все порты перебрали — ждем минуту и начинаем заново
        if (portIndex >= PORTS.length) {
            log('⏳ Discord не найден. Повторная попытка через 60 сек...');
            if (reconnectTimer) clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => tryPort(0), 60000);
            return;
        }

        let port = PORTS[portIndex];
        log(`Пробую порт ${port}...`);

        try {
            let testWs = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=${CLIENT_ID}&encoding=json`);

            // Таймаут на подключение (500 мс)
            let timeout = setTimeout(() => {
                if (testWs.readyState === WebSocket.CONNECTING) {
                    testWs.close();
                }
            }, 500);

            testWs.onopen = () => {
                clearTimeout(timeout);
                log(`✅ Подключено к порту ${port}`);
                ws = testWs;
                isConnected = true;
                
                // Отправляем статус сразу и потом каждые 15 секунд
                updateStatus();
                if (statusInterval) clearInterval(statusInterval);
                statusInterval = setInterval(updateStatus, 15000);
            };

            testWs.onerror = () => {
                clearTimeout(timeout);
                if (!isConnected) {
                    // Пробуем следующий порт
                    setTimeout(() => tryPort(portIndex + 1), 100);
                }
            };

            testWs.onclose = () => {
                clearTimeout(timeout);
                if (!isConnected) {
                    // Если не подключились — пробуем следующий порт
                    setTimeout(() => tryPort(portIndex + 1), 100);
                } else {
                    // Если потеряли связь — переподключаемся
                    log('⚠️ Соединение потеряно. Переподключение...');
                    isConnected = false;
                    if (statusInterval) clearInterval(statusInterval);
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => tryPort(0), 10000);
                }
            };

        } catch (e) {
            setTimeout(() => tryPort(portIndex + 1), 100);
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

console.log('🚀 discord-rpc.js загружен!');