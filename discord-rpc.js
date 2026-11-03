// discord-rpc.js
(function() {
    const CLIENT_ID = '1567140647348076564';
    let ws = null;
    let isConnected = false;
    let statusInterval = null;
    let reconnectTimer = null;

    function log(msg) { console.log(`[RPC] ${msg}`); }

    function updateStatus() {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;

        // Берем уровень из глобальной переменной игры (если есть)
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

    function connect(port) {
        if (port > 6472) {
            log('Discord не найден на портах 6463-6472');
            return;
        }

        log(`Пробую порт ${port}...`);
        try {
            // Используем 127.0.0.1 для надежности
            ws = new WebSocket(`ws://127.0.0.1:${port}/?v=1&client_id=${CLIENT_ID}&encoding=json`);

            ws.onopen = () => {
                log(`✅ Подключено к порту ${port}`);
                isConnected = true;
                updateStatus();
                if (statusInterval) clearInterval(statusInterval);
                statusInterval = setInterval(updateStatus, 15000);
            };

            ws.onerror = (e) => {
                // Ошибка соединения (например, порт закрыт)
                ws.close();
                if (!isConnected) connect(port + 1);
            };

            ws.onclose = () => {
                if (isConnected) {
                    log('⚠️ Соединение потеряно. Переподключение через 10 сек...');
                    isConnected = false;
                    if (statusInterval) clearInterval(statusInterval);
                    if (reconnectTimer) clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(() => connect(6463), 10000);
                }
            };

        } catch (e) {
            log(`Ошибка на порту ${port}: ${e.message}`);
            if (!isConnected) connect(port + 1);
        }
    }

    // --- ЗАЩИТА ОТ ТИШИНЫ ---
    log('Скрипт Discord RPC загружен и ожидает запуска...');
    
    // Запускаем поиск строго через 3 секунды после полной загрузки страницы
    if (document.readyState === 'complete') {
        setTimeout(() => connect(6463), 3000);
    } else {
        window.addEventListener('load', () => {
            setTimeout(() => connect(6463), 3000);
        });
    }
})();