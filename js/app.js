document.addEventListener('DOMContentLoaded', function() {
  // DOM要素の取得
  const locationElement = document.getElementById('location');
  const timestampElement = document.getElementById('timestamp');
  const currentWbgtElement = document.getElementById('current-wbgt');
  const wbgtLevelElement = document.getElementById('wbgt-level');
  const wbgtAdviceElement = document.getElementById('wbgt-advice');
  const errorMessageElement = document.getElementById('error-message');
  const retryButtonElement = document.getElementById('retry-button');
  const forecastElement = document.getElementById('forecast');
  
  // 再試行ボタンのイベントリスナー
  retryButtonElement.addEventListener('click', function() {
    errorMessageElement.style.display = 'none';
    fetchWBGTData();
  });
  
  // 最新のWBGTデータを取得する関数
  async function fetchWBGTData() {
    try {
      // GitHub Actionsで生成されたJSONファイルを取得
      const response = await fetch('data/latest_data.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      displayWBGT(data);
    } catch (error) {
      console.error('Error fetching WBGT data:', error);
      errorMessageElement.style.display = 'block';
      currentWbgtElement.innerHTML = '<p>データを取得できませんでした</p>';
    }
  }
  
  // WBGTデータを表示する関数
  function displayWBGT(data) {
    // タイムスタンプの表示
    const updateTime = new Date(data.updateTime);
    timestampElement.textContent = `最終更新: ${formatDate(updateTime)}`;
    
    // 最新のWBGT値を取得
    let currentWbgt = null;
    
    // 実況値がある場合はそれを使用
    if (data.actual && data.actual.actualValues && data.actual.actualValues.length > 0) {
      // 値が存在する最新の実況値を探す
      for (let i = data.actual.actualValues.length - 1; i >= 0; i--) {
        if (data.actual.actualValues[i].wbgt !== null) {
          currentWbgt = data.actual.actualValues[i].wbgt;
          break;
        }
      }
    }
    
    // 実況値がない場合は予測値を使用
    if (currentWbgt === null && data.prediction && data.prediction.predictions && data.prediction.predictions.length > 0) {
      currentWbgt = data.prediction.predictions[0].wbgt;
    }
    
    // WBGT値がない場合
    if (currentWbgt === null) {
      currentWbgtElement.innerHTML = '<p>現在の暑さ指数データがありません</p>';
      return;
    }
    
    // WBGT値の表示
    currentWbgtElement.innerHTML = `
      <div class="wbgt-value">${currentWbgt}<span class="wbgt-unit">°C</span></div>
    `;
    
    // WBGT値に基づく警告レベルとアドバイスを設定
    let level, levelClass, advice;
    
    if (currentWbgt < 21) {
      level = "ほぼ安全";
      levelClass = "level-safe";
      advice = "熱中症の危険性は低いですが、激しい運動時は水分補給を忘れないようにしましょう。";
    } else if (currentWbgt < 25) {
      level = "注意";
      levelClass = "level-caution";
      advice = "熱中症の危険性があります。運動時は定期的に休憩を取り、こまめに水分補給をしましょう。";
    } else if (currentWbgt < 28) {
      level = "警戒";
      levelClass = "level-warning";
      advice = "熱中症の危険性が高まっています。激しい運動は避け、屋外での長時間の活動は控えましょう。";
    } else if (currentWbgt < 31) {
      level = "厳重警戒";
      levelClass = "level-danger";
      advice = "熱中症の危険性が非常に高いです。外出は避け、涼しい場所で過ごしましょう。特に高齢者や子供は注意が必要です。";
    } else {
      level = "危険";
      levelClass = "level-extreme";
      advice = "熱中症の危険性が極めて高いです。屋外での活動は原則中止しましょう。室内でも室温の上昇に注意し、水分をこまめに摂取してください。";
    }
    
    // レベルの表示
    wbgtLevelElement.innerHTML = `<span class="wbgt-level ${levelClass}">${level}</span>`;
    
    // アドバイスの表示
    wbgtAdviceElement.innerHTML = `
      <h3>熱中症予防のアドバイス</h3>
      <p>${advice}</p>
    `;
    
    // 予測グラフの表示
    if (data.prediction && data.prediction.predictions && data.prediction.predictions.length > 0) {
      displayForecastChart(data.prediction.predictions);
      forecastElement.style.display = 'block';
    } else {
      forecastElement.style.display = 'none';
    }
    
    // エラーメッセージを非表示
    errorMessageElement.style.display = 'none';
  }
  
  // 予測グラフを表示する関数
  function displayForecastChart(predictions) {
    const labels = [];
    const data = [];
    
    // 予測データを整形
    predictions.forEach(pred => {
      // 時刻フォーマット: "2024062415" -> "15:00"
      const timeStr = pred.time;
      if (timeStr && timeStr.length >= 10) {
        const hour = timeStr.substring(8, 10);
        labels.push(`${hour}:00`);
        data.push(pred.wbgt);
      }
    });
    
    // 既存のチャートを破棄
    if (window.forecastChart) {
      window.forecastChart.destroy();
    }
    
    // チャートの描画
    const ctx = document.getElementById('wbgt-chart').getContext('2d');
    window.forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'WBGT予測 (°C)',
          data: data,
          fill: false,
          backgroundColor: '#1a6e39',
          borderColor: '#1a6e39',
          tension: 0.1,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            suggestedMin: Math.max(0, Math.min(...data) - 5),
            suggestedMax: Math.max(...data) + 5,
            title: {
              display: true,
              text: 'WBGT (°C)'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                return `WBGT: ${context.parsed.y}°C`;
              }
            }
          }
        }
      }
    });
  }
  
  // 日付をフォーマットする関数
  function formatDate(date) {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  // ページ読み込み時にデータを取得
  fetchWBGTData();
  
  // 30分ごとにデータを更新
  setInterval(fetchWBGTData, 30 * 60 * 1000);
});
