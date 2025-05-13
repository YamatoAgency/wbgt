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
