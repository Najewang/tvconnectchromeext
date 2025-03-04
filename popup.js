document.addEventListener('DOMContentLoaded', () => {
    console.log('🌍 트레이딩봇 UI 로드 완료');

   const alertList = document.getElementById('alertList');
    const status = document.getElementById('status');
    const toggleTradingBtn = document.getElementById('toggleTrading');
    const clearAlertsBtn = document.getElementById('clearAlertsBtn');

    let isTradingActive = false;

// 'localStorage'에서 값 가져오기
    const tradeType = localStorage.getItem('tradeType');
    const price = localStorage.getItem('price');
    const stopLoss = localStorage.getItem('stopLoss');
    const takeProfit = localStorage.getItem('takeProfit');

    // 각 입력 필드에 값 세팅
    if (tradeType) {
        document.getElementById('tradeType').value = tradeType;
    }
    if (price) {
        document.getElementById('price').value = price;
    }
    if (stopLoss) {
        document.getElementById('stopLoss').value = stopLoss;
    }
    if (takeProfit) {
        document.getElementById('takeProfit').value = takeProfit;
    }


    // 1. chrome.storage.local에서 상태를 불러옴
    chrome.storage.local.get(['isTradingActive'], (result) => {
        let isTradingActive = result.isTradingActive || false;  // 기본값은 false

        // 2. 초기 상태 반영
        updateStatusText(isTradingActive);
        updateButtonColor(isTradingActive);

        // 📌 "거래 활성화" 버튼 클릭 시 상태 변경
        toggleTradingBtn.addEventListener('click', () => {
            isTradingActive = !isTradingActive;
            chrome.storage.local.set({ isTradingActive }); // 상태를 chrome.storage.local에 저장, 변수명이 키, 변수값이 밸류로 저장

            updateStatusText(isTradingActive);
            updateButtonColor(isTradingActive);

            if (isTradingActive) {
                // 📢 content.js에 메시지 보내기
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: isTradingActive ? "start_observer" : "stop_observer" });
                });
            }
        });
    });


    // 알림 삭제 버튼 클릭 시
    clearAlertsBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "CLEAR_ALERTS" }, (response) => {
            if (response.status === "cleared") {
//                alertList.innerHTML = ''; // UI에서 알림 목록 지우기
                console.log('알림이 삭제되었습니다.');
            }
        });
    });

    function updateStatusText(isTradingActive) {
        status.textContent = isTradingActive ? '🟢 거래 활성화됨' : '⏳ 대기 중...';
        toggleTradingBtn.textContent = isTradingActive ? '거래 비활성화' : '거래 활성화';
        console.log(isTradingActive ? '🚀 거래 활성화됨' : '⏸ 거래 중지됨');
    }


    function updateButtonColor(isTradingActive) {
        if (isTradingActive) {
            toggleTradingBtn.classList.add('inactive'); // 'active' 클래스 추가
            toggleTradingBtn.classList.remove('active'); // 'inactive' 클래스 제거
        } else {
            toggleTradingBtn.classList.add('active'); // 'inactive' 클래스 추가
            toggleTradingBtn.classList.remove('inactive'); // 'active' 클래스 제거
        }
    }


//
//    toggleTradingBtn.addEventListener('click', () => {
//        isTradingActive = !isTradingActive;
//        status.textContent = isTradingActive ? '🟢 거래 활성화됨' : '⏳ 대기 중...';
//        console.log(isTradingActive ? '🚀 거래 활성화됨' : '⏸ 거래 중지됨');
//
//    });




    // 📌 저장된 알람 불러오기
    function loadAlerts() {
        chrome.runtime.sendMessage({ type: "GET_ALERTS" }, (response) => {
            if (response && response.alerts) {
                alertList.innerHTML = ""; // 기존 목록 초기화
                response.alerts.forEach((alert) => addAlertToUI(alert));
            }
        });
    }

    // 📌 UI에 알람 추가하는 함수
    function addAlertToUI(alert) {
        const listItem = document.createElement("li");
        listItem.innerHTML = `<strong>${alert.symbol}</strong>: ${alert.description} <br> ⏰ ${alert.time}`;
        alertList.prepend(listItem);

    }


    // 🔄 페이지 로드 시 저장된 알람 불러오기
    loadAlerts();

    // 백그라운드에서 알림을 받으면 리스트 새로 고침
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "ALERTS_UPDATED") {
            loadAlerts(); // 새로운 알람이 추가되면 리스트를 업데이트
        }
    });

        
    // 웹훅 테스트를 보내는 함수
    function sendWebhookTest() {
        const webhookUrl = 'http://127.0.0.1:5000/webhook';  // TradingView 웹훅 URL


        const payload = {
            "type": document.getElementById("tradeType").value,
            "price": parseFloat(document.getElementById("price").value),
            "stop": parseFloat(document.getElementById("stopLoss").value),
            "takeProfit": parseFloat(document.getElementById("takeProfit").value)
        };

        // const payload = {
        //     "type": "Long",
        //     "price": 2.2039,
        //     "stop": 1.9905218776,
        //     "takeProfit": 2.5039
        //     // 'type': 'Short', 'price': 2.6615, 'stop': 2.6641951762, 'takeProfit': 2.6615          
        // };

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
            console.log('웹훅 신호 전송 성공:', data);
        })
        .catch(error => {
            console.error('웹훅 신호 전송 실패:', error);
        });
    }

    // 버튼 클릭 시 웹훅 테스트 발송
    document.getElementById('testWebhookButton').addEventListener('click', function() {
        const tradeType = document.getElementById('tradeType').value;
        const price = document.getElementById('price').value;
        const stopLoss = document.getElementById('stopLoss').value;
        const takeProfit = document.getElementById('takeProfit').value;

        // 'localStorage'에 값 저장하기
        localStorage.setItem('tradeType', tradeType);
        localStorage.setItem('price', price);
        localStorage.setItem('stopLoss', stopLoss);
        localStorage.setItem('takeProfit', takeProfit);

        sendWebhookTest();
    });








    document.getElementById("startTracking").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "START_TRACKING" }, (response) => {
            console.log("🚀 백그라운드 감시 시작 요청 보냄");
        });
    });
    
    document.getElementById("stopTracking").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "STOP_TRACKING" }, (response) => {
            console.log("🛑 백그라운드 감시 중지 요청 보냄");
        });
    });




});
