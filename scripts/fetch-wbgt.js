async function getWBGTData() {
  try {
    // 方法1: 環境省サイトから直接スクレイピング（最も正確だが失敗の可能性あり）
    return await fetchWBGTFromEnvMinistry();
  } catch (error) {
    console.log('Failed to fetch from environment ministry, trying method 2...');
    
    try {
      // 方法2: 気象庁データから計算
      return await calculateWBGTFromJMA();
    } catch (error) {
      console.log('Failed to calculate from JMA data, trying method 3...');
      
      try {
        // 方法3: OpenWeatherMapから計算
        return await calculateWBGTFromWeatherAPI();
      } catch (error) {
        console.log('All methods failed, using fallback data...');
        
        // すべての方法が失敗した場合のフォールバック
        return {
          location: "甲府",
          wbgt: 28.5,  // 季節に応じた適切なデフォルト値を設定
          timestamp: new Date().toISOString(),
          unit: "°C",
          source: "デフォルト値（取得失敗）",
          error: true
        };
      }
    }
  }
}
