import requests
import pandas as pd
from datetime import datetime
import os

# 現在の年月を取得
now = datetime.now()
year_month = now.strftime("%Y%m")

# URLを作成
url = f"https://www.wbgt.env.go.jp/mntr/dl/Kyoto_{year_month}.csv"

try:
    # データを取得
    response = requests.get(url)
    response.raise_for_status()
    
    # データディレクトリを作成（存在しない場合）
    os.makedirs("data", exist_ok=True)
    
    # CSVファイルとして保存
    with open(f"data/latest_wbgt.csv", "wb") as f:
        f.write(response.content)
    
    print(f"データを更新しました: {url}")
    
except Exception as e:
    print(f"エラーが発生しました: {e}")
