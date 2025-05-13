const fs = require('fs');
const path = require('path');
const https = require('https');

// データディレクトリのパス
const dataDir = path.join(__dirname, '..', 'data');

// データディレクトリが存在しなければ作成
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 実況値データを取得する関数
function fetchActualData() {
  return new Promise((resolve, reject) => {
    // 現在の年月を取得
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    // 京都の実況値データを取得（地点番号: 61286）
    const url = `https://www.wbgt.env.go.jp/est15WG/dl/wbgt_61286_${currentYear}${currentMonth}.csv`;
    
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
        
        // 日付ごとのデータを整理
        const dailyData = {};
        
        // ヘッダー行をスキップして2行目から処理
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length < 3) continue;
          
          const date = parts[0]; // 例: 2025/5/13
          const time = parts[1]; // 例: 14:00
          const wbgt = parts[2] ? parseFloat(parts[2]) : null;
          
          if (!dailyData[date]) {
            dailyData[date] = [];
          }
          
          dailyData[date].push({
            time: time,
            wbgt: wbgt
          });
        }
        
        // JSONデータを作成
        const jsonData = {
          point: '京都',
          location: '京都',
          updateTime: new Date().toISOString(),
          days: Object.keys(dailyData).map(date => ({
            date: date,
            values: dailyData[date]
          }))
        };
        
        // 最新値を取得
        let latestWbgt = null;
        let latestTime = null;
        let latestDate = null;
        
        // 日付の降順でソート
        const sortedDates = Object.keys(dailyData).sort().reverse();
        
        for (const date of sortedDates) {
          const values = dailyData[date];
          // 時間の降順でソート
          const sortedValues = [...values].sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
          });
          
          // 最初の有効な値を探す
          for (const value of sortedValues) {
            if (value.wbgt !== null) {
              latestWbgt = value.wbgt;
              latestTime = value.time;
              latestDate = date;
              break;
            }
          }
          
          if (latestWbgt !== null) break;
        }
        
        // 最新値を追加
        jsonData.latestWbgt = latestWbgt;
        jsonData.latestTime = latestTime;
        jsonData.latestDate = latestDate;
        
        const jsonPath = path.join(dataDir, 'latest_data.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
        console.log(`Saved JSON data to ${jsonPath}`);
        
        resolve(jsonData);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// 実測値データを取得する関数
function fetchMonitorData() {
  return new Promise((resolve, reject) => {
    // 現在の年月を取得
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    // 京都の実測値データを取得
    const url = `https://www.wbgt.env.go.jp/mntr/dl/Kyoto_${currentYear}${currentMonth}.csv`;
    
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
        
        // ヘッダー行をスキップして2行目から処理
        const dailyData = {};
        
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length < 3) continue;
          
          const date = parts[0]; // 例: 2025/5/13
          const time = parts[1]; // 例: 14:00
          const wbgt = parts[2] ? parseFloat(parts[2]) : null;
          
          if (!dailyData[date]) {
            dailyData[date] = [];
          }
          
          dailyData[date].push({
            time: time,
            wbgt: wbgt
          });
        }
        
        // JSONデータを作成
        const jsonData = {
          point: '京都',
          location: '京都',
          updateTime: new Date().toISOString(),
          available: true,
          days: Object.keys(dailyData).map(date => ({
            date: date,
            values: dailyData[date]
          }))
        };
        
        // 最新値を取得
        let latestWbgt = null;
        let latestTime = null;
        let latestDate = null;
        
        // 日付の降順でソート
        const sortedDates = Object.keys(dailyData).sort().reverse();
        
        for (const date of sortedDates) {
          const values = dailyData[date];
          // 時間の降順でソート
          const sortedValues = [...values].sort((a, b) => {
            const timeA = a.time.split(':').map(Number);
            const timeB = b.time.split(':').map(Number);
            return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
          });
          
          // 最初の有効な値を探す
          for (const value of sortedValues) {
            if (value.wbgt !== null) {
              latestWbgt = value.wbgt;
              latestTime = value.time;
              latestDate = date;
              break;
            }
          }
          
          if (latestWbgt !== null) break;
        }
        
        // 最新値を追加
        jsonData.latestWbgt = latestWbgt;
        jsonData.latestTime = latestTime;
        jsonData.latestDate = latestDate;
        
        const jsonPath = path.join(dataDir, 'latest_monitor_data.json');
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
    
    // 実況値と実測値を取得
    const actualData = await fetchActualData();
    const monitorData = await fetchMonitorData();
    
    // 最新のWBGT値を特定
    let currentWbgt = null;
    let dataTime = null;
    let dataDate = null;
    let dataSource = '実況値';
    
    // 1. 実測値があればそれを優先
    if (monitorData.available && monitorData.latestWbgt !== null) {
      currentWbgt = monitorData.latestWbgt;
      dataTime = monitorData.latestTime;
      dataDate = monitorData.latestDate;
      dataSource = '実測値';
    } 
    // 2. 実測値がなければ実況値を使用
    else if (actualData.latestWbgt !== null) {
      currentWbgt = actualData.latestWbgt;
      dataTime = actualData.latestTime;
      dataDate = actualData.latestDate;
      dataSource = '実況値';
    }
    
    // 最終データを作成
    const finalData = {
      location: '京都',
      updateTime: new Date().toISOString(),
      currentWbgt: currentWbgt,
      dataTime: dataTime,
      dataDate: dataDate,
      dataSource: dataSource,
      hasMonitorData: monitorData.available
    };
    
    // 最新データをJSONとして保存
    const latestPath = path.join(dataDir, 'latest_data.json');
    fs.writeFileSync(latestPath, JSON.stringify(finalData, null, 2));
    console.log(`Saved final data to ${latestPath}`);
    
    console.log('All data fetched successfully');
  } catch (error) {
    console.error('Error:', error.message);
    
    // エラーが発生しても、最低限のJSONファイルを作成
    try {
      const errorData = {
        location: '京都',
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
