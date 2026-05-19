# 🚗 停車小幫手 (ParkingHelper)

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)

**一款幫助用戶在大型停車場輕鬆找到愛車的手機 Web 應用程式**

[線上體驗](https://zlowxlxe.gensparkspace.com) | [功能介紹](#-已完成功能) | [安裝說明](#-安裝與使用)

</div>

---

## 📱 專案簡介

停車小幫手是一款專為手機設計的 Web 應用程式，幫助您在大型停車場中快速記錄並找到停車位置。

### ✨ 主要特色

- 🎯 **一鍵記錄**：快速記錄車牌、停車場、樓層、區域等資訊
- 📸 **拍照記憶**：拍攝停車位照片作為視覺標記
- 🧭 **GPS 導航**：自動記錄 GPS 座標並支援導航
- 🔊 **智能提醒**：接近停車位時自動語音提醒（30 公尺內）
- 📊 **使用統計**：分析停車習慣，顯示常用停車場
- 📱 **手機優先**：完全適配手機操作，體驗流暢

---

## ✅ 已完成功能

### 🎯 核心功能
- ✅ **一鍵記錄停車位**：記錄車牌、停車場名稱、樓層、區域、車位編號及備註
- ✅ **車輛類型選擇**：支援汽車 🚗 / 機車 🏍️ 切換
- ✅ **拍攝停車位照片**：支援拍照或上傳圖片作為視覺標記
- ✅ **GPS 座標記錄**：自動記錄停車位的經緯度
- ✅ **即時距離顯示**：顯示您與停車位的距離（公尺 / 公里）
- ✅ **語音提醒功能**：接近停車位 30 公尺內自動語音提示
- ✅ **動態計時器**：首頁顯示已停放時間（例：2 小時 35 分鐘）
- ✅ **找到車了！**：一鍵結束本次停車記錄
- ✅ **歷史記錄管理**：完整瀏覽所有停車記錄（停放中 / 已完成）
- ✅ **單筆刪除 / 全部清除**：靈活管理歷史資料

### 🧭 導航與分享
- ✅ **智能導航**：自動開啟 Apple Maps（iOS）/ Google Maps（Android）
- ✅ **分享位置**：透過 Web Share API 或複製到剪貼簿
- ✅ **一鍵導航模式**：即時更新距離並語音提醒

### 📊 統計與分析
- ✅ **停車次數統計**：總計停車次數
- ✅ **車輛類型比例**：汽車 vs 機車使用比例
- ✅ **平均停放時間**：自動計算平均停車時長
- ✅ **常用停車場排行**：顯示最常使用的停車場

### 🎨 使用者體驗
- ✅ **Toast 通知**：所有操作即時回饋
- ✅ **照片燈箱**：點擊照片可放大檢視
- ✅ **智能提示橫幅**：首次訪問顯示使用提示（可關閉且不再顯示）
- ✅ **響應式設計**：完美適配各種手機螢幕
- ✅ **流暢動畫**：現代化的淡入淡出效果

---

## 📸 功能截圖

<details>
<summary>點擊展開查看功能截圖</summary>

### 主畫面
- 顯示目前停車狀態
- 快速記錄停車位按鈕
- 智能提示橫幅

### 記錄停車位
- 車輛類型選擇（汽車 / 機車）
- 車牌號碼輸入
- 停車場資訊填寫
- GPS 自動定位
- 拍照功能

### 歷史記錄
- 所有停車記錄列表
- 狀態標籤（停放中 / 已完成）
- 快速操作按鈕

### 使用統計
- 停車次數統計圖表
- 車輛類型比例
- 常用停車場排行

</details>

---

## 🚀 安裝與使用

### 線上使用（推薦）

直接在手機瀏覽器開啟：

```
https://zlowxlxe.gensparkspace.com
```

**加入主畫面（像 App 一樣）：**

- **iPhone**：Safari → 分享 → 加入主畫面
- **Android**：Chrome → 選單 → 新增至主畫面

### 本地部署

1. **下載專案**
   ```bash
   git clone https://github.com/您的使用者名稱/parking-helper.git
   cd parking-helper
   ```

2. **開啟網頁**
   - 直接用瀏覽器開啟 `index.html`
   - 或使用本地伺服器：
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (需安裝 http-server)
   npx http-server
   ```

3. **訪問應用程式**
   ```
   http://localhost:8000
   ```

---

## 📁 專案結構

```
parking-helper/
├── index.html              # 主頁面（SPA 架構）
├── css/
│   └── style.css          # 全域樣式與響應式設計
├── js/
│   └── app.js             # 應用程式核心邏輯
├── README.md              # 專案說明文件
├── LICENSE                # MIT 授權條款
└── .gitignore             # Git 忽略檔案設定
```

---

## 🗃️ 資料模型

### 資料表：`parking_records`

| 欄位名稱 | 類型 | 說明 |
|----------|------|------|
| id | text | 唯一識別碼（系統自動產生） |
| vehicle_type | text | 車輛類型：`car` / `motorcycle` |
| license_plate | text | 車牌號碼 |
| parking_lot | text | 停車場名稱 |
| floor | text | 樓層（例：B2） |
| zone | text | 區域（例：A 區） |
| spot_number | text | 車位編號（例：A-025） |
| notes | text | 備註 |
| photo_url | text | 停車位照片（Base64 DataURL） |
| latitude | number | GPS 緯度 |
| longitude | number | GPS 經度 |
| parked_at | datetime | 停車時間（Unix ms） |
| is_active | bool | 是否為目前停車記錄 |

---

## 🌐 RESTful API

本專案使用 RESTful Table API 進行資料管理。

### API 端點

| HTTP 方法 | 路徑 | 說明 |
|-----------|------|------|
| GET | `tables/parking_records` | 讀取所有記錄（含分頁） |
| GET | `tables/parking_records/{id}` | 讀取單筆記錄 |
| POST | `tables/parking_records` | 新增停車記錄 |
| PUT | `tables/parking_records/{id}` | 完整更新記錄 |
| PATCH | `tables/parking_records/{id}` | 部分更新記錄 |
| DELETE | `tables/parking_records/{id}` | 刪除記錄 |

### 查詢參數

- `page`：頁碼（預設：1）
- `limit`：每頁筆數（預設：100）
- `search`：搜尋關鍵字
- `sort`：排序欄位

---

## 🛠️ 技術棧

### 前端技術
- **HTML5**：語意化標籤、Canvas API
- **CSS3**：CSS Variables、Flexbox、Grid、Animations
- **JavaScript (ES6+)**：Vanilla JS（無框架依賴）

### 外部資源
- **字體**：[Noto Sans TC](https://fonts.google.com/noto/specimen/Noto+Sans+TC)（Google Fonts）
- **圖示**：[Font Awesome 6](https://fontawesome.com/)

### Web APIs
- **Geolocation API**：GPS 定位
- **Web Speech API**：語音提醒
- **MediaDevices API**：相機拍照
- **Web Share API**：分享功能
- **Clipboard API**：複製到剪貼簿
- **localStorage**：本地儲存（提示橫幅狀態）

### 資料儲存
- **RESTful Table API**：雲端資料庫

### 設計理念
- **Mobile-First**：優先適配手機裝置
- **Responsive Design**：響應式佈局（最大寬度 430px）
- **Progressive Enhancement**：漸進式增強

---

## 📖 使用說明

### 快速開始

1. **記錄停車位** → 選擇車輛類型 → 填寫資訊 → 拍照（可選） → 儲存
2. **查看停車資訊** → 首頁顯示停車狀態卡片和計時
3. **導航回停車位** → 點擊「開始導航」或「導航模式」
4. **完成停車** → 找到車後點擊「找到了！」

詳細使用說明請參考 [USAGE_GUIDE.md](USAGE_GUIDE.md)

---

## 🔮 未來發展

- [ ] 地圖視覺化顯示停車位置
- [ ] 多車輛同時管理
- [ ] 停車費自動計算
- [ ] 限時停車 Push Notification
- [ ] PWA 離線支援
- [ ] 深色模式（Dark Mode）
- [ ] AR 擴增實境導航

完整開發計畫請參考 [USAGE_GUIDE.md](USAGE_GUIDE.md#-未來發展方向)

---

## 🤝 貢獻指南

歡迎任何形式的貢獻！請參考以下步驟：

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

詳細貢獻指南請參考 [USAGE_GUIDE.md](USAGE_GUIDE.md#-貢獻指南)

---

## 📄 授權條款

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

---

## 🙏 致謝

- [Font Awesome](https://fontawesome.com/) - 圖示庫
- [Google Fonts](https://fonts.google.com/) - 網頁字體
- [Noto Sans TC](https://fonts.google.com/noto/specimen/Noto+Sans+TC) - 繁體中文字體

---

## 📞 聯絡方式

- 🌐 線上展示：[https://zlowxlxe.gensparkspace.com](https://zlowxlxe.gensparkspace.com)
- 🐛 回報問題：[GitHub Issues](https://github.com/您的使用者名稱/parking-helper/issues)
- 💬 討論區：[GitHub Discussions](https://github.com/您的使用者名稱/parking-helper/discussions)

---

<div align="center">

**如果這個專案對您有幫助，歡迎給個 Star ⭐**

Made with ❤️ by ParkingHelper Team

</div>

