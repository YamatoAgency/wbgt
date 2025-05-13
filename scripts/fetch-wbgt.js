const fs = require('fs');
const path = require('path');
const https = require('https');

// データディレクトリのパス
const dataDir = path.join(__dirname, '..', 'data');

// データディレクトリが存在しなければ作成
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 現在の日付情報を取得
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const dateStr = `${year}${month}${day}`;

// 甲府のデータを取得する関数
function fetchKofuData() {
  return new Promise((resolve, reject) => {
    // 甲府の地点番号: 49142
    const url = `https://www.wbgt.env.go.jp/prev15WG/dl/yohou_49142.csv`;
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch data: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // データファイルを保存
        const filePath = path.join(dataDir, 'latest_kofu_prediction.csv');
        fs.writeFileSync(filePath, data);
        console.log(`Saved prediction data to ${filePath}`);
        
        // CSVをパースして最新のWBGT値を抽出
        const lines = data.trim().split('\n');
        if (lines.length >= 2) {
          const headerLine = lines[0];
          const dataLine = lines[1];
          
          // ヘッダーから日時の位置を特定
          const headers = headerLine.split(',');
          
          // データ行から値を取得
          const values = dataLine.split(',');
          
          // 地点番号と更新時刻
          const pointNumber = values[0];
          const updateTime = values[1];
          
          // 予測値を抽出
          const predictions = [];
          for (let i = 2; i < values.length; i++) {
            if (headers[i] && values[i].trim() !== '') {
              predictions.push({
                time: headers[i],
                wbgt: parseInt(values[i].trim()) / 10 // 10で割って実際の値に変換
              });
            }
          }
          
          // JSON形式で保存
          const jsonData = {
            point: '甲府',
            pointNumber: pointNumber,
            updateTime: updateTime,
            predictions: predictions
          };
          
          const jsonPath = path.join(dataDir, 'latest_kofu_prediction.json');
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
          console.log(`Saved JSON data to ${jsonPath}`);
          
          resolve(jsonData);
        } else {
          reject(new Error('Invalid CSV format'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 実況値データを取得する関数
function fetchActualData() {
  return new Promise((resolve, reject) => {
    // 年月を指定してCSVを取得
    const url = `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_49142_${year}${month}.csv`;
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch actual data: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // データファイルを保存
        const filePath = path.join(dataDir, `latest_kofu_actual.csv`);
        fs.writeFileSync(filePath, data);
        console.log(`Saved actual data to ${filePath}`);
        
        // CSVをパースして当日のデータを抽出
        const lines = data.trim().split('\n');
        
        // 当日のデータのみを抽出
        const todayData = lines.filter(line => line.includes(`${year}/${parseInt(month)}/${parseInt(day)}`));
        
        // JSONに変換
        const actualValues = todayData.map(line => {
          const parts = line.split(',');
          return {
            date: parts[0],
            time: parts[1],
            wbgt: parts[2] ? parseFloat(parts[2]) : null
          };
        });
        
        const jsonData = {
          point: '甲府',
          date: `${year}/${month}/${day}`,
          actualValues: actualValues
        };
        
        const jsonPath = path.join(dataDir, 'latest_kofu_actual.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
        console.log(`Saved actual JSON data to ${jsonPath}`);
        
        resolve(jsonData);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// メイン処理
async function main() {
  try {
    // 予測値と実況値を取得
    const predictionData = await fetchKofuData();
    const actualData = await fetchActualData();
    
    // 両方のデータを組み合わせて最新情報を作成
    const latestData = {
      point: '甲府',
      updateTime: new Date().toISOString(),
      prediction: predictionData,
      actual: actualData
    };
    
    // 最新データをJSONとして保存
    const latestPath = path.join(dataDir, 'latest_data.json');
    fs.writeFileSync(latestPath, JSON.stringify(latestData, null, 2));
    console.log(`Saved combined data to ${latestPath}`);
    
    console.log('All data fetched successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// スクリプト実行
main();
