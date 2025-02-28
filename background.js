


const ALERT_STORAGE_KEY = "alerts"; // 저장할 키 이름

// 📌 저장된 알람 불러오기
function getSavedAlerts(callback) {
    chrome.storage.local.get(ALERT_STORAGE_KEY, (data) => {
        const alerts = data[ALERT_STORAGE_KEY] || [];
        callback(alerts);
    });
}

// 📌 새 알람 저장하기
function saveAlert(alert) {
    getSavedAlerts((alerts) => {
        alerts.push(alert); // 새 알람 추가
        chrome.storage.local.set({ [ALERT_STORAGE_KEY]: alerts }, () => {
            console.log("✅ 알람 저장됨:", alert);

             // 새로운 알람이 저장되었음을 popup.js에 알리기
            chrome.runtime.sendMessage({ type: "ALERTS_UPDATED" });
        });
    });
}

// 알림 삭제하기 (CLEAR_ALERTS)
function clearAlerts() {
    chrome.storage.local.remove([ALERT_STORAGE_KEY], () => {
        console.log("알림이 모두 삭제되었습니다.");

        // 새로운 알람이 저장되었음을 popup.js에 알리기
            chrome.runtime.sendMessage({ type: "ALERTS_UPDATED" });
    });
}

// 📌 메시지 리스너 설정
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NEW_ALERT") {
        saveAlert({
            symbol: message.symbol,
            description: message.description,
            time: message.time
        });
        sendResponse({ status: "saved" });
        
        sendToServerWebhook(message.description);

    } else if (message.type === "GET_ALERTS") {
        getSavedAlerts((alerts) => {
            sendResponse({ alerts });
        });

    } else if (message.type === "CLEAR_ALERTS") {
        clearAlerts();
        sendResponse({ status: "cleared" });
    } else if (message.action === "START_TRACKING") {
        startTracking();
    } else if (message.action === "STOP_TRACKING") {
        stopTracking();
    } else if (message.type === 'websocket-message') {
        console.log("WebSocket 메시지 수신:", message.data);
        // 여기서 데이터를 필터링하거나 처리할 수 있습니다.
      }
    return true; // 🔥 비동기 응답을 위해 `true` 반환
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
  });



// 웹훅 테스트를 보내는 함수
function sendToServerWebhook(jsonMessage) {
    const webhookUrl = 'http://127.0.0.1:5000/webhook';  // TradingView 웹훅 URL

    const payload = JSON.parse(jsonMessage);

    // 웹훅 신호를 POST로 보내기
    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })
    .then(response => response.json())
    .then(data => {
        //UI에 뜨면 좋겠군. 개발필요.
        console.log('웹훅 신호 전송 성공:', data);
    })
    .catch(error => {
        console.error('웹훅 신호 전송 실패:', error);
    });
}






let intervalId = null;
let lastAlerts = new Set(); // 이전 알람을 저장할 Set


// 🛠 TradingView 페이지를 강제로 활성화하는 함수
function activateTradingViewTab(tabId) {
    chrome.debugger.attach({ tabId: tabId }, "1.2", () => {
        chrome.debugger.sendCommand({ tabId: tabId }, "Page.setWebLifecycleState", { state: "active" }, () => {
            console.log("✅ TradingView 탭이 강제 활성화되었습니다!");
            chrome.debugger.detach({ tabId: tabId }); // 작업 완료 후 detach
        });
    });
}

// 1분마다 감시하는 함수
function startTracking() {
    if (intervalId) {
        console.log("⚠️ 이미 감시 중...");
        return;
    }

    intervalId = setInterval(() => {
        console.log("🔄 (백그라운드) 1분마다 알람 리스트 요청...");

        chrome.tabs.query({ url: "*://*.tradingview.com/*" }, (tabs) => {
            if (tabs.length === 0) {
                console.log("⚠️ 바이낸스 관련 탭이 열려 있지 않음.");
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: fetchAlertsFromPage
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error("❌ 실행 오류:", chrome.runtime.lastError);
                    return;
                }
                if (results && results[0] && results[0].result) {
                    console.log("📢 받은 알람 데이터:");
                    results[0].result.forEach((alert, index) => {
                        console.log(`📌 [${index + 1}] ${alert}`);
                    });
                } else {
                    console.log("⚠️ 알람 데이터를 받지 못함!");
                }
            });
        });
    }, 60000); // 1분마다 실행

    console.log("✅ 백그라운드 감시 시작됨!");
}

// 감시 중지 함수
function stopTracking() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log("🛑 백그라운드 감시 중지됨!");
    } else {
        console.log("⚠️ 백그라운드 감시가 이미 중지 상태입니다.");
    }
}

// 메시지 리스너: popup.js에서 온 요청 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

});





// 🛠 content.js 없이 페이지에서 직접 실행할 함수
function fetchAlertsFromPage() {
    console.log("📢 (탭 내 실행) 알람 리스트 가져오기...");


    const alerts = [];
    document.querySelectorAll('[data-name="alert-log-item"]').forEach((item) => {
        alerts.push(item.innerText.trim());
    });
    console.log(`✅ 총 ${alerts.length}개의 알람 감지됨.`);
    return alerts;
}






