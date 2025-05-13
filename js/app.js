document.addEventListener('DOMContentLoaded', function() {
  // DOM要素の取得
  const locationElement = document.getElementById('location');
  const dataTimeElement = document.getElementById('data-time');
  const dataSourceElement = document.getElementById('data-source');
  const currentWbgtElement = document.getElementById('current-wbgt');
  const wbgtLevelElement = document.getElementById('wbgt-level');
  const wbgtAdviceElement = document.getElementById('wbgt-advice');
  const updateTimeElement = document.getElementById('update-time');
  const errorMessageElement = document.getElementById('error-message');
  const retryButtonElement = document.getElementById('retry-button');
  
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
      
      // エラーがある場合は表示
      if (data.error) {
        throw new Error(data.errorMessage || 'データの取得に失敗しました');
      }
      
      displayWBGT(data);
    } catch (error) {
      console.error('Error fetching WBGT data:', error);
      errorMessageElement.style.display = 'block';
      currentWbgtElement.innerHTML = '<p>データを取得できませんでした</p>';
    }
  }
  
  // WBGTデータを表示する関数
  function displayWBGT(data) {
    // 場所を表示
    locationElement.textContent = data.location || '京都';
    
    // データ取得時刻を表示
    if (data.dataDate && data.dataTime) {
      dataTimeElement.textContent = `観測時刻: ${data.dataDate} ${data.dataTime}`;
    } else {
      dataTimeElement.textContent = '観測時刻: 不明';
    }
    
    // データソースを表示
    dataSourceElement.textContent = `データソース: ${data.dataSource || '不明'}`;
    
    // 更新時刻を表示
    if (data.updateTime) {
      const updateTime = new Date(data.updateTime);
      updateTimeElement.textContent = formatDateTime(updateTime);
    } else {
      updateTimeElement.textContent = '不明';
    }
    
    // 最新のWBGT値を取得
    const currentWbgt = data.currentWbgt;
    
    // WBGT値がない場合
    if (currentWbgt === null || currentWbgt === undefined) {
      currentWbgtElement.innerHTML = '<p>現在の暑さ指数データがありません

       // WBGT値がない場合
    if (currentWbgt === null) {
      currentWbgtElement.innerHTML = '<p>現在の暑さ指数データがありません</p>';
      wbgtLevelElement.innerHTML = '';
      wbgtAdviceElement.innerHTML = '';
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
      advice = "熱中症の危険性は低いですが、激しい運動時は水分補給を忘れないようにしましょう。運動時の水分補給を心がけてください。";
    } else if (currentWbgt < 25) {
      level = "注意";
      levelClass = "level-caution";
      advice = "熱中症の危険性があります。運動時は定期的に休憩を取り、こまめに水分補給をしましょう。激しい運動や長時間の屋外活動時には特に注意が必要です。";
    } else if (currentWbgt < 28) {
      level = "警戒";
      levelClass = "level-warning";
      advice = "熱中症の危険性が高まっています。激しい運動は避け、屋外での長時間の活動は控えましょう。30分おきに休憩を取り、水分と塩分をこまめに補給してください。特に高齢者や子どもは注意が必要です。";
    } else if (currentWbgt < 31) {
      level = "厳重警戒";
      levelClass = "level-danger";
      advice = "熱中症の危険性が非常に高いです。外出は避け、涼しい場所で過ごしましょう。どうしても外出が必要な場合は、日陰を選び、帽子や日傘を使用し、こまめに水分を摂取してください。エアコン等を活用し、暑さを避けることが重要です。";
    } else {
      level = "危険";
      levelClass = "level-extreme";
      advice = "熱中症の危険性が極めて高いです。屋外での活動は原則中止しましょう。涼しい室内で過ごし、外出は避けてください。室内でも室温の上昇に注意し、エアコン等を使って温度調節をし、水分をこまめに摂取してください。体調が悪くなった場合は、すぐに医療機関を受診してください。";
    }
    
    // レベルの表示
    wbgtLevelElement.innerHTML = `<span class="wbgt-level ${levelClass}">${level}</span>`;
    
    // アドバイスの表示
    wbgtAdviceElement.innerHTML = `
      <h3>熱中症予防のアドバイス</h3>
      <p>${advice}</p>
    `;
    
    // 予測データを表示
    displayForecastData(data);
    
    // エラーメッセージを非表示
    errorMessageElement.style.display = 'none';
  }
  
  // 予測データを表示する関数
  function displayForecastData(data) {
    // 予測データが存在するか確認
    if (data.prediction && data.prediction.predictions && data.prediction.predictions.length > 0) {
      // 予測グラフを表示
      displayForecastChart(data.prediction.predictions);
      forecastElement.style.display = 'block';
    } else {
      forecastElement.style.display = 'none';
    }
  }
  
  // 予測グラフを表示する関数
  function displayForecastChart(predictions) {
    const labels = [];
    const data = [];
    const backgroundColors = [];
    
    // 予測データを整形
    predictions.forEach(pred => {
      // 時刻フォーマット: "2024062415" -> "15:00"
      const timeStr = pred.time;
      if (timeStr && timeStr.length >= 10) {
        const hour = timeStr.substring(8, 10);
        labels.push(`${hour}:00`);
        data.push(pred.wbgt);
        
        // WBGTレベルに応じた色を設定
        let color;
        if (pred.wbgt < 21) {
          color = 'rgba(144, 238, 144, 0.8)'; // level-safe
        } else if (pred.wbgt < 25) {
          color = 'rgba(255, 255, 0, 0.8)'; // level-caution
        } else if (pred.wbgt < 28) {
          color = 'rgba(255, 165, 0, 0.8)'; // level-warning
        } else if (pred.wbgt < 31) {
          color = 'rgba(255, 69, 0, 0.8)'; // level-danger
        } else {
          color = 'rgba(128, 0, 0, 0.8)'; // level-extreme
        }
        backgroundColors.push(color);
      }
    });
    
    // 既存のチャートを破棄
    if (window.forecastChart) {
      window.forecastChart.destroy();
    }
    
    // チャートの描画
    const ctx = document.getElementById('wbgt-chart').getContext('2d');
    window.forecastChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'WBGT予測 (°C)',
          data: data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
          borderWidth: 1,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            suggestedMin: Math.max(0, Math.min(...data) - 5),
            suggestedMax: Math.max(35, Math.max(...data) + 2),
            title: {
              display: true,
              text: 'WBGT (°C)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = `WBGT: ${context.parsed.y}°C`;
                
                // WBGTレベルを追加
                let level;
                if (context.parsed.y < 21) {
                  level = "ほぼ安全";
                } else if (context.parsed.y < 25) {
                  level = "注意";
                } else if (context.parsed.y < 28) {
                  level = "警戒";
                } else if (context.parsed.y < 31) {
                  level = "厳重警戒";
                } else {
                  level = "危険";
                }
                
                return [label, `レベル: ${level}`];
              }
            }
          },
          legend: {
            display: false
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
