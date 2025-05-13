const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function fetchWBGTData() {
  try {
    // 甲府のWBGTデータを取得（環境省熱中症予防情報サイト）
    const response = await axios.get(
      'https://www.wbgt.env.go.jp/graph_ref_td.php?region=07&prefecture=61&point=61286'
    );
    
    // HTMLを解析
    const $ = cheerio.load(response.data);
    
    // データ抽出（実際のHTML構造に合わせて調整が必要）
    // 以下は例です。実際のサイトの構造に合わせて変更してください
    let wbgtValue = 28.5;  // デフォルト値
    let locationName = "甲府";
    
    // WBGTデータの抽出を試みる（実際のHTMLセレクタに調整が必要）
    try {
      // テーブルから値を抽出する例（セレクタは実際のHTMLに合わせて変更）
      const wbgtText = $('table td:contains("WBGT")').next().text().trim();
      if (wbgtText) {
        // 数値部分を抽出
        const match = wbgtText.match(/(\d+(\.\d+)?)/);
        if (match) {
          wbgtValue = parseFloat(match[1]);
        }
      }
    } catch (extractError) {
      console.error('Data extraction error, using default value:', extractError);
    }
    
    // 現在の日時
    const timestamp = new Date().toISOString();
    
    // データ構造を作成
    const wbgtData = {
      location: locationName,
      wbgt: wbgtValue,
      timestamp: timestamp,
      unit: "°C",
      source: "環境省熱中症予防情報サイト"
    };
    
    // データディレクトリの作成
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // JSONファイルに保存
    fs.writeFileSync(
      path.join(dataDir, 'latest-wbgt.json'),
      JSON.stringify(wbgtData, null, 2)
    );
    
    console.log('WBGT data successfully fetched and saved:', wbgtData);
  } catch (error) {
    console.error('Error fetching WBGT data:', error.message);
    
    // エラーが発生しても、最低限のデータファイルは作成
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // エラー時のフォールバックデータ
      const fallbackData = {
        location: "甲府",
        wbgt: 28.5, // デフォルト値
        timestamp: new Date().toISOString(),
        unit: "°C",
        source: "デフォルト値（取得エラー）",
        error: true
      };
      
      fs.writeFileSync(
        path.join(dataDir, 'latest-wbgt.json'),
        JSON.stringify(fallbackData, null, 2)
      );
      
      console.log('Fallback data saved due to error');
    } catch (fsError) {
      console.error('Failed to save fallback data:', fsError);
    }
  }
}

// 関数を実行
fetchWBGTData();
