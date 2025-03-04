function convertToKST(utcTime) {
  const date = new Date(utcTime);
  // UTC 시간을 Date 객체로 변환

  // KST (UTC+9) 변환
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  // KST 시간을 YYYY-MM-DD HH:MM:SS 형식으로 반환
  return kstTime.toISOString().replace("T", " ").slice(0, 19);
}


function isJSON(str) {
try {
  JSON.parse(str);
  return true;
} catch (e) {
  return false;
}
}

function sendToServerWebhook(jsonMessage) {
  const webhookUrl = 'http://127.0.0.1:5000/webhook';  // TradingView 웹훅 URL

  const payload = JSON.parse(jsonMessage);
  console.log('🚀 웹훅 신호 전송:', payload);
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

  /*
  실제 json 데이터 예시
  {
    "id": 189,
    "channel": "private_G-dVFA61MF8zneyz6P4yt2-Ole1276V1qXpaSFviirQ",
    "text": {
        "content": {
            "m": "alert_fired",
            "p": {
                "fire_id": 31659826109,
                "sound_file": null,
                "symbol": "={\"adjustment\":\"splits\",\"currency-id\":\"XTVCUSDT\",\"session\":\"extended\",\"symbol\":\"BINANCE:XRPUSDT\"}",
                "cross_interval": false,
                "popup": true,
                "message": "{\"type\":\"LongTakeProfit1\",\"price\":2.0554,\"stop\":2.0500046495,\"takeProfit\":2.0553387347}",
                "alert_id": 1981512860,
                "sound_duration": 0,
                "fire_time": "2025-02-28T09:54:01Z",
                "kinds": [
                    "regular"
                ],
                "name": "MinAlert Strategy (26, 52, 18, 12, 26, 9, 20, 2, 14, 1): alert() 펑크션 콜 온리",
                "resolution": "1",
                "bar_time": "2025-02-28T09:53:00Z"
            },
            "id": "6wjy-3911738"
        },
        "channel": "pricealerts"
    }
}
    */

chrome.webNavigation.onCompleted.addListener(function(details) {
    if (details.url.includes('kr.tradingview.com')) {
      chrome.debugger.attach({tabId: details.tabId}, '1.0', function() {
        chrome.debugger.sendCommand({tabId: details.tabId}, 'Network.enable');
        chrome.debugger.sendCommand({tabId: details.tabId}, 'Network.setRequestInterception', {
          patterns: [{urlPattern: 'wss://pushstream.tradingview.com/*', resourceType: 'WebSocket'}]
        });
      });
    }
  }, {url: [{urlMatches: 'https://kr.tradingview.com'}]});
  
  chrome.debugger.onEvent.addListener(function(debuggeeId, message, params) {
    if (message === 'Network.webSocketFrameReceived' && params.response) {
      // 웹소켓 데이터의 payloadData를 파싱
      const payloadData = params.response.payloadData;

    try {
        // payloadData가 JSON 형식인 경우에만 파싱 후 처리
        if (isJSON(payloadData)) {
          const parsedData = JSON.parse(payloadData);
    
          // "channel" 속성이 있고, "private_"로 시작하는 경우만 필터링
          if (parsedData.channel && parsedData.channel.startsWith("private_")) {
            console.log('Filtered WebSocket Frame private_로 시작하는:', parsedData);
            if(parsedData.text?.content?.m !== 'alert_fired') return;

            const alertMessageStr = parsedData.text?.content?.p?.message;
            const alertNameStr = parsedData.text?.content?.p?.name;
            const alertTimeStr = convertToKST(parsedData.text?.content?.p?.fire_time);
            console.log('📌alertNameStr:', alertNameStr);
            console.log('alertTimeStr:', alertTimeStr);
            const messageData = JSON.parse(alertMessageStr);
            console.log("Alert Type:", messageData.type);
            console.log("Price:", messageData.price);
            console.log("Stop:", messageData.stop);
            console.log("Take Profit:", messageData.takeProfit);
            sendToServerWebhook(alertMessageStr);
  
            
          }
          
          }   
  
      } catch (error) {
        console.error('❌ JSON Parsing Error:', error);
      }
      

    }
  });



