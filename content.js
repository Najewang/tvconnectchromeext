//확장프로그램 기본적으로 돌아가는 곳.
//테스트 순서는 코드수정 -> 확장프로그램 새로고침버튼 -> 확장프로그램 작동테스트 진행



// chrome.storage.local에서 'isTradingActive' 값을 가져옴
chrome.storage.local.get(['isTradingActive'], (result) => {
    // 만약 isTradingActive가 true로 저장되어 있으면 startObserver를 실행
    if (result.isTradingActive) {
        console.log('🚀 거래 활성화됨, Observer 잠시 후 (5초) 시작!');

        //2초후에 startObserver 실행
        setTimeout(() => {
            startObserver();
        }, 7000);
    } else {
        console.log('⏳ 거래 대기 중...');
    }
});

// 📌 메시지 수신 & MutationObserver 실행
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start_observer") {
        console.log("🔍 트레이딩뷰 알람 감지 시작...");
        startObserver();
    } else if (message.action === "stop_observer") {
        console.log("⏹️ 감지 중지됨.");
        stopObserver();
    }
});

// 전역 MutationObserver 변수
let observer = null;



function startObserver() {
    if (observer) {
        console.log("⚠️ 이미 실행 중...");
        return;
    }

    console.log("✅ MutationObserver 시작!");

    // 감시할 부모 요소 선택
    const targetNode = document.querySelector('[class*="scrollContainer"]');

    if (!targetNode) {
        console.log("❌ 대상 요소를 찾을 수 없음!");
        return;
    }

    observer = new MutationObserver((mutations) => {

        const alerts = []; // 감지된 알람을 저장할 배열


        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.matches('[data-name="alert-log-item"]')) {
                    console.log("✅ 새로운 알림 감지!");

                    const nameNode = node.querySelector('[class^="name"]');
                    const messageNode = node.querySelector('[class^="message"]');
                    const timeNodes = node.querySelectorAll('[class^="attribute"]');

                    const symbol = nameNode?.innerText || '알 수 없음';
                    const description = messageNode?.innerText || '설명 없음';
                    const time = timeNodes.length > 1 ? timeNodes[timeNodes.length - 1].innerText : '시간 없음';

                    // 현재 날짜와 시간 가져오기
                    const currentDate = new Date();
                    const formattedDate = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;

                    // 알람 시간과 날짜 결합
                    // const fullTime = `${formattedDate} ${time}`;
                    console.log(`📌 종목: ${symbol}`);
                    console.log(`📜 설명: ${description}`);
                    console.log(`⏰ 시간: ${time} , 파싱시간: ${formattedDate}`);

                    // 알람 데이터를 배열에 저장
                    alerts.push({ symbol, description, time });
                    // 필요하면 백그라운드로 데이터 전송
                    // sendAlertToBackground(symbol, description, time);
                }
            }
        }

        // 일정 간격(예: 100ms)으로 알람을 하나씩 처리
        function processAlerts(index = 0) {
            if (index >= alerts.length) return; // 모든 알람을 처리했으면 종료

            const { symbol, description, time } = alerts[index];
            sendAlertToBackground(symbol, description, time);

            setTimeout(() => processAlerts(index + 1), 200); // 100ms 간격으로 다음 알람 처리
        }

        // 첫 번째 알람 처리 시작
        if (alerts.length > 0) {
            processAlerts();
        }
    });

    // MutationObserver 설정 및 실행
    observer.observe(targetNode, { childList: true, subtree: true });
}



// 🛑 MutationObserver 정지 함수
function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
        console.log("🔴 MutationObserver 정지됨.");
    }
}

//트레이딩뷰 웹페이지에서 감지한 알람 데이터를 popup.html의 <ul id="alertList">에 추가하려면 content.js → background.js → popup.js로 데이터 전달해야 해.
function sendAlertToBackground(symbol, description, time) {
    chrome.runtime.sendMessage({
        type: "NEW_ALERT",
        symbol: symbol,
        description: description,
        time: time
    });
}











//console.log("트레이딩뷰 알람 감지 시작!");



//// 1. 알람 리스트가 포함된 부모 요소 선택
//const targetNode = document.querySelector('[class*="toastListScroll"]');
//
//if (targetNode) {
//    console.log('🔍 MutationObserver 시작됨!');
//
//    let lastUpdate = 0;  // 디바운싱을 위한 시간 저장
//    const debounceTime = 1000;  // 1초에 한 번만 실행
//
//    // 2. MutationObserver 생성
//    const observer = new MutationObserver((mutations) => {
//        const now = Date.now();
//        if (now - lastUpdate < debounceTime) return;  // 디바운싱 적용
//        lastUpdate = now;
//
//        mutations.forEach((mutation) => {
//            mutation.addedNodes.forEach((node) => {
//                // 3. 새로운 알람이 contentContainerInner로 시작하는 클래스 포함 여부 확인
//                if (
//                    node.nodeType === 1 &&
//                    Array.from(node.classList).some(cls => cls.startsWith('contentContainerInner'))
//                ) {
//                    const symbol = node.querySelector('[class^="text"]')?.innerText || '알 수 없음';
//                    const description = node.querySelector('[class^="description"]')?.innerText || '설명 없음';
//                    const time = node.querySelector('[class^="time"]')?.innerText || '시간 없음';
//
//                    console.log(`🚀 새로운 알람 감지!`);
//                    console.log(`📌 종목: ${symbol}`);
//                    console.log(`📜 설명: ${description}`);
//                    console.log(`⏰ 시간: ${time}`);
//                }
//            });
//        });
//    });
//
//    // 4. MutationObserver를 대상 노드에 적용
//    observer.observe(targetNode, { childList: true });
//
//} else {
//    console.log('⚠️ 감시할 요소(.toastListScroll)를 찾을 수 없습니다!');
//}


//
//
//document.addEventListener('DOMContentLoaded', () => {
//    console.log('🌍 DOM 완전히 로드됨! MutationObserver 시작 준비 완료.');
//
//    waitForElement('.toastListScroll', (targetNode) => {
//        console.log('✅ 감시할 요소 발견! MutationObserver 시작!');
//
//        let lastUpdate = 0;
//        const debounceTime = 1000;
//
//        const observer = new MutationObserver((mutations) => {
//            const now = Date.now();
//            if (now - lastUpdate < debounceTime) return;
//            lastUpdate = now;
//
//            mutations.forEach((mutation) => {
//                mutation.addedNodes.forEach((node) => {
//                    if (node.nodeType === 1 && node.classList.contains('contentContainerInner-ZZzgDlel')) {
//                        const symbol = node.querySelector('.text-LoO6TyUc')?.innerText || '알 수 없음';
//                        const description = node.querySelector('.description-FoZESLBk')?.innerText || '설명 없음';
//                        const time = node.querySelector('.time-m_7l3VrU')?.innerText || '시간 없음';
//
//                        console.log(`🚀 새로운 알람 감지!`);
//                        console.log(`📌 종목: ${symbol}`);
//                        console.log(`📜 설명: ${description}`);
//                        console.log(`⏰ 시간: ${time}`);
//                    }
//                });
//            });
//        });
//
//        observer.observe(targetNode, { childList: true });
//    });
//});