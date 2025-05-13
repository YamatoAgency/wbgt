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

// 京都のデータを取得する関数
function fetchKyotoData() {
  return new Promise((resolve, reject) => {
    // 京都の地点番号: 61286
    // 環境省マニュアルの別表1から確認可能
    const url = `https://www.wbgt.env.go.jp/prev15WG/dl/yohou_61286.csv`;
    
    console.log(`Fetching data from: ${url}`);
    
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
        const filePath = path.join(dataDir, 'latest_kyoto_prediction.csv');
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
            point: '京都',
            pointNumber: pointNumber,
            updateTime: updateTime,
            predictions: predictions
          };
          
          const jsonPath = path.join(dataDir, 'latest_kyoto_prediction.json');
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
    // 年月を指定してCSVを取得（京都: 61286）
    const url = `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_61286_${year}${month}.csv`;
    
    console.log(`Fetching actual data from: ${url}`);
    
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
        const filePath = path.join(dataDir, `latest_kyoto_actual.csv`);
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
          point: '京都',
          date: `${year}/${month}/${day}`,
          actualValues: actualValues
        };
        
        const jsonPath = path.join(dataDir, 'latest_kyoto_actual.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
        console.log(`Saved actual JSON data to ${jsonPath}`);
        
        resolve(jsonData);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 都道府県データを取得する関数（京都府内の全地点データ）
function fetchPrefectureData() {
  return new Promise((resolve, reject) => {
    // 都道府県単位のデータ取得（京都府: kyoto）
    // 環境省マニュアルの別表2から確認可能
    const url = `https://www.wbgt.env.go.jp/prev15WG/dl/yohou_kyoto.csv`;
    
    console.log(`Fetching prefecture data from: ${url}`);
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch prefecture data: ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // データファイルを保存
        const filePath = path.join(dataDir, 'latest_kyoto_prefecture.csv');
        fs.writeFileSync(filePath, data);
        console.log(`Saved prefecture data to ${filePath}`);
        
        // CSVをパースして府内全地点のデータを抽出
        const lines = data.trim().split('\n');
        if (lines.length >= 2) {
          const headerLine = lines[0];
          const headers = headerLine.split(',');
          
          // 各地点のデータを解析
          const stations = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            
            // 地点番号と更新時刻
            const pointNumber = values[0];
            const updateTime = values[1];
            
            // 予測値を抽出
            const predictions = [];
            for (let j = 2; j < values.length; j++) {
              if (headers[j] && values[j].trim() !== '') {
                predictions.push({
                  time: headers[j],
                  wbgt: parseInt(values[j].trim()) / 10 // 10で割って実際の値に変換
                });
              }
            }
            
            stations.push({
              pointNumber: pointNumber,
              updateTime: updateTime,
              predictions: predictions
            });
          }
          
          // JSON形式で保存
          const jsonData = {
            prefecture: '京都府',
            updateTime: new Date().toISOString(),
            stations: stations
          };
          
          const jsonPath = path.join(dataDir, 'latest_kyoto_prefecture.json');
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
          console.log(`Saved prefecture JSON data to ${jsonPath}`);
          
          resolve(jsonData);
        } else {
          reject(new Error('Invalid prefecture CSV format'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 実測値データを取得する関数
function fetchMonitorData() {
  return new Promise((resolve, reject) => {
    // 京都の実測値データを取得
    // 環境省マニュアルp.4のTable 1から確認可能
    const url = `https://www.wbgt.env.go.jp/mntr/dl/Kyoto_${year}${month}.csv`;
    
    console.log(`Fetching monitor data from: ${url}`);
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log(`Monitor data not available: ${res.statusCode}`);
        // 実測値データがない場合はスキップ（エラーにしない）
        resolve({ available: false });
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // データファイルを保存
        const filePath = path.join(dataDir, `latest_kyoto_monitor.csv`);
        fs.writeFileSync(filePath, data);
        console.log(`Saved monitor data to ${filePath}`);
        
        // CSVをパースして当日のデータを抽出
        const lines = data.trim().split('\n');
        if (lines.length <= 1) {
          resolve({ available: false });
          return;
        }
        
        // ヘッダーを取得
        const headers = lines[0].split(',');
        
        // 当日のデータのみを抽出
        const todayData = lines.filter(line => {
          const parts = line.split(',');
          return parts[0] && parts[0].includes(`${year}/${parseInt(month)}/${parseInt(day)}`);
        });
        
        // JSONに変換
        const monitorValues = todayData.map(line => {
          const parts = line.split(',');
          return {
            date: parts[0],
            time: parts[1],
            wbgt: parts[2] ? parseFloat(parts[2]) : null,
            tg: parts[3] ? parseFloat(parts[3]) : null
          };
        });
        
        const jsonData = {
          point: '京都',
          date: `${year}/${month}/${day}`,
          available: true,
          monitorValues: monitorValues
        };
        
        const jsonPath = path.join(dataDir, 'latest_kyoto_monitor.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
        console.log(`Saved monitor JSON data to ${jsonPath}`);
        
        resolve(jsonData);
      });
    }).on('error', (error) => {
      console.log(`Error fetching monitor data: ${error.message}`);
      // 実測値データがない場合はスキップ（エラーにしない）
      resolve({ available: false });
    });
  });
}

// メイン処理
async function main() {
  try {
    console.log('Starting data fetch process for Kyoto...');
    
    // 予測値、実況値、府内データ、実測値を取得
    const predictionData = await fetchKyotoData();
    const actualData = await fetchActualData();
    const prefectureData = await fetchPrefectureData();
    const monitorData = await fetchMonitorData();
    
    // 最新のWBGT値を特定
    let currentWbgt = null;
    let dataSource = '予測値';
    
    // 1. 実測値があればそれを優先（最新の値を取得）
    if (monitorData.available && monitorData.monitorValues && monitorData.monitorValues.length > 0) {
      for (let i = monitorData.monitorValues.length - 1; i >= 0; i--) {
        if (monitorData.monitorValues[i].wbgt !== null) {
          currentWbgt = monitorData.monitorValues[i].wbgt;
          dataSource = '実測値';
          break;
        }
      }
    }
    
    // 2. 実況値があればそれを次に優先
    if (currentWbgt === null && actualData.actualValues && actualData.actualValues.length > 0) {
      for (let i = actualData.actualValues.length - 1; i >= 0; i--) {
        if (actualData.actualValues[i].wbgt !== null) {
          currentWbgt = actualData.actualValues[i].wbgt;
          dataSource = '実況値';
          break;
        }
      }
    }
    
    // 3. それでもなければ予測値を使用
    if (currentWbgt === null && predictionData.predictions && predictionData.predictions.length > 0) {
      currentWbgt = predictionData.predictions[0].wbgt;
      dataSource = '予測値';
    }
    
    // 両方のデータを組み合わせて最新情報を作成
    const latestData = {
      point: '京都',
      updateTime: new Date().toISOString(),
      currentWbgt: currentWbgt,
      dataSource: dataSource,
      prediction: predictionData,
      actual: actualData,
      prefecture: prefectureData,
      monitor: monitorData
    };
    
    // 最新データをJSONとして保存
    const latestPath = path.join(dataDir, 'latest_data.json');
    fs.writeFileSync(latestPath, JSON.stringify(latestData, null, 2));
    console.log(`Saved combined data to ${latestPath}`);
    
    console.log('All data fetched successfully');
  } catch (error) {
    console.error('Error:', error.message);
    
    // エラーが発生しても、最低限のJSONファイルを作成
    try {
      const errorData = {
        point: '京都',
        updateTime: new Date().toISOString(),
        error: true,
        errorMessage: error.message
      };
      
      const latestPath = path.join(dataDir, 'latest_data.json');
      fs.writeFileSync(latestPath, JSON.stringify(errorData, null, 2));
      console.log(`Saved error data to ${latestPath}`);
    } catch (fsError) {
      console.error('Failed to save error data:', fsError.message);
    }
    
    process.exit(1);
  }
}

// スクリプト実行
main();
