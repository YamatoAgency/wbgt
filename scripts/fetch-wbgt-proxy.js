// fetch-wbgt-proxy.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// 環境省サイトからWBGTデータを取得する関数
async function fetchWBGTWithProxy() {
  try {
    console.log('Starting WBGT data fetch using ScrapingBee proxy...');
    
    // ScrapingBeeのAPIキーを環境変数から取得
    const apiKey = process.env.SCRAPING_BEE_API_KEY;
    if (!apiKey) {
      throw new Error('SCRAPING_BEE_API_KEY environment variable is not set');
    }
    
    // 環境省の甲府WBGTデータURL
    const targetUrl = 'https://www.wbgt.env.go.jp/graph_ref_td.php?region=07&prefecture=61&point=61286';
    console.log(`Target URL: ${targetUrl}`);
    
    // ScrapingBeeを使ってリクエスト
    const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
      params: {
        api_key: apiKey,
        url: targetUrl,
        premium_proxy: 'true',
        country_code: 'jp',
        // ブラウザのエミュレーション
        render_js: 'false',
        // キャッシュの設定（1時間）
        cache: 'true',
        cache_ttl: '3600'
      },
      // タイムアウト（30秒）
      timeout: 30000
    });
    
    console.log(`Response received, status: ${response.status}`);
    
    // cheerioでHTMLを解析
    const $ = cheerio.load(response.data);
    console.log('HTML parsed successfully');
    
    // ページからWBGT値と更新時間を取得
    // 注意: 実際のHTMLセレクタは環境省サイトの構造に合わせて調整が必要
    
    // 方法1: テーブル内のWBGT値を探す
    let wbgtValue = null;
    let updateTime = null;
    
    // テーブルのテキストからWBGT値を探す
    $('table').each((i, table) => {
      const tableText = $(table).text();
      
      // テーブルにWBGTや暑さ指数という文字が含まれているか確認
      if (tableText.includes('WBGT') || tableText.includes('暑さ指数')) {
        console.log('Found table with WBGT data');
        
        // テーブル内の行をループ
        $(table).find('tr').each((j, row) => {
          const rowText = $(row).text().trim();
          
          // WBGT値を含む行を探す
          if (rowText.includes('WBGT') || rowText.includes('暑さ指数')) {
            // 数値パターンを抽出
            const matches = rowText.match(/(\d+\.\d+|\d+)/);
            if (matches && matches[1]) {
              wbgtValue = parseFloat(matches[1]);
              console.log(`Found WBGT value: ${wbgtValue}°C`);
            }
          }
          
          // 更新時間を含む行を探す
          if (rowText.includes('時点') || rowText.includes('更新')) {
            // 日時パターンを抽出（例: 2023年5月15日 14:00）
            const timeMatches = rowText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
            if (timeMatches) {
              const [_, year, month, day, hour, minute] = timeMatches;
              // 日本時間として解釈
              updateTime = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute)
              ).toISOString();
              console.log(`Found update time: ${updateTime}`);
            }
          }
        });
      }
    });
    
    // 方法2: WBGTの値が表示されている特定の要素を直接探す
    if (!wbgtValue) {
      // ページ内のすべてのテキストノードを走査して数値を探す
      // 実際のDOM構造に応じて調整が必要
      $('div, span, p').each((i, elem) => {
        const text = $(elem).text().trim();
        if ((text.includes('WBGT') || text.includes('暑さ指数')) && text.match(/\d+\.\d+|\d+/)) {
          const matches = text.match(/(\d+\.\d+|\d+)/);
          if (matches && matches[1]) {
            wbgtValue = parseFloat(matches[1]);
            console.log(`Found WBGT value from element: ${wbgtValue}°C`);
          }
        }
      });
    }
    
    // 更新時間が見つからない場合は現在時刻を使用
    if (!updateTime) {
      updateTime = new Date().toISOString();
      console.log(`Using current time: ${updateTime}`);
    }
    
    // WBGT値が見つからない場合はエラー
    if (wbgtValue === null) {
      console.log('WBGT value not found in the page. Page content sample:');
      console.log(response.data.substring(0, 500) + '...');
      throw new Error('WBGT value not found in the scraped data');
    }
    
    // データ構造を作成
    const wbgtData = {
      location: "甲府",
      wbgt: wbgtValue,
      timestamp: updateTime,
      unit: "°C",
      source: "環境省熱中症予防情報サイト",
      fetched_at: new Date().toISOString(),
      fetch_method: "proxy"
    };
    
    // データディレクトリの作成
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }
    
    // JSONファイルに保存
    const filePath = path.join(dataDir, 'latest-wbgt.json');
    fs.writeFileSync(filePath, JSON.stringify(wbgtData, null, 2));
    console.log(`Data saved to: ${filePath}`);
    
    return wbgtData;
  } catch (error) {
    console.error('Error in fetchWBGTWithProxy:');
    console.error(`  Message: ${error.message}`);
    
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      // レスポンスのサンプルを出力（大きすぎる場合は一部だけ）
      const responseData = typeof error.response.data === 'string' 
        ? error.response.data.substring(0, 1000) + '...' 
        : JSON.stringify(error.response.data).substring(0, 1000) + '...';
      console.error(`  Response sample: ${responseData}`);
    }
    
    throw error;
  }
}

// フォールバックメカニズムを実装した主関数
async function main() {
  try {
    // プロキシを使ってWBGTデータを取得
    await fetchWBGTWithProxy();
    console.log('Process completed successfully');
  } catch (error) {
    console.error(`Process failed: ${error.message}`);
    
    // フォールバックデータを保存
    try {
      const dataDir = path.join(__dirname, '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // 季節に応じたデフォルト値を設定（実際の季節に合わせて調整可能）
      const currentMonth = new Date().getMonth() + 1; // 1-12
      let defaultWbgt;
      
      // 季節ごとのおおよそのWBGT値（実際の地域の気候に合わせて調整）
      if (currentMonth >= 6 && currentMonth <= 9) {
        // 夏（6月〜9月）
        defaultWbgt = 28.5;
      } else if (currentMonth >= 4 && currentMonth <= 5) {
        // 春（4月〜5月）
        defaultWbgt = 22.0;
      } else if (currentMonth >= 10 && currentMonth <= 11) {
        // 秋（10月〜11月）
        defaultWbgt = 20.0;
      } else {
        // 冬（12月〜3月）
        defaultWbgt = 15.0;
      }
      
      // フォールバックデータ
      const fallbackData = {
        location: "甲府",
        wbgt: defaultWbgt,
        timestamp: new Date().toISOString(),
        unit: "°C",
        source: "デフォルト値（取得エラー）",
        error: true,
        error_message: error.message,
        fetched_at: new Date().toISOString()
      };
      
      const filePath = path.join(dataDir, 'latest-wbgt.json');
      fs.writeFileSync(filePath, JSON.stringify(fallbackData, null, 2));
      console.log(`Fallback data saved to: ${filePath}`);
    } catch (fsError) {
      console.error(`Failed to save fallback data: ${fsError.message}`);
    }
    
    // エラーを示す終了コードでプロセスを終了
    process.exit(1);
  }
}

// スクリプトを実行
main();
