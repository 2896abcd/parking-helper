# 🚀 停車小幫手 - GitHub 上傳完整指南

本指南將手把手教您如何將停車小幫手專案上傳到 GitHub。

---

## 📋 目錄

1. [準備工作](#準備工作)
2. [方法一：使用 GitHub 網頁介面（最簡單）](#方法一使用-github-網頁介面最簡單)
3. [方法二：使用 Git 指令列（專業方式）](#方法二使用-git-指令列專業方式)
4. [方法三：使用 GitHub Desktop（圖形化介面）](#方法三使用-github-desktop圖形化介面)
5. [設定 GitHub Pages（免費部署）](#設定-github-pages免費部署)
6. [常見問題解答](#常見問題解答)

---

## 準備工作

### ✅ 檢查清單

在開始之前，請確認您已經：

- [ ] 註冊 GitHub 帳號（https://github.com/signup）
- [ ] 準備好專案檔案（已經在本地資料夾）
- [ ] 確認專案包含以下檔案：
  ```
  ✅ index.html
  ✅ css/style.css
  ✅ js/app.js
  ✅ README.md
  ✅ LICENSE
  ✅ .gitignore
  ```

### 📦 下載專案檔案

如果您的專案還在 GenSpark 平台上，請先下載：

1. 在 GenSpark 專案頁面
2. 點擊右上角的選單（...）
3. 選擇「Export」或「Download」
4. 下載 ZIP 檔並解壓縮到您的電腦

---

## 方法一：使用 GitHub 網頁介面（最簡單）

### ⭐ 適合對象
- 第一次使用 GitHub
- 不想安裝額外軟體
- 只需要上傳一次檔案

### 📝 步驟說明

#### 1. 建立新的儲存庫（Repository）

1. 登入 GitHub：https://github.com
2. 點擊右上角的 **+** 圖示
3. 選擇 **New repository**

![建立儲存庫](https://docs.github.com/assets/cb-11427/images/help/repository/repo-create.png)

#### 2. 填寫儲存庫資訊

填寫以下資訊：

- **Repository name**：`parking-helper`
  - 只能使用英文、數字、連字號、底線
  - 建議使用小寫字母

- **Description**（選填）：
  ```
  🚗 停車小幫手 - 幫助您在大型停車場快速找到愛車的 Web 應用程式
  ```

- **Public / Private**：
  - **Public**：所有人都能看到（推薦）
  - **Private**：只有您能看到

- **Initialize this repository with**：
  - ❌ **不要勾選** "Add a README file"（我們已經有了）
  - ❌ **不要勾選** "Add .gitignore"（我們已經有了）
  - ✅ **可以選擇** "Choose a license" → **MIT License**

#### 3. 建立儲存庫

點擊綠色按鈕 **Create repository**

#### 4. 上傳專案檔案

現在您會看到一個空的儲存庫頁面，選擇上傳方式：

**方式 A：拖曳上傳**

1. 找到 **uploading an existing file** 連結並點擊
2. 將所有專案檔案和資料夾拖曳到頁面上
   - 確保包含資料夾結構：`css/`, `js/`
3. 在 "Commit changes" 區域填寫：
   ```
   Initial commit - 停車小幫手完整功能
   ```
4. 點擊 **Commit changes**

**方式 B：手動上傳**

1. 點擊 **Add file** → **Upload files**
2. 點擊 **choose your files** 選擇檔案
3. 選擇所有檔案（包含資料夾）
4. 填寫 Commit message：
   ```
   Initial commit - 停車小幫手完整功能
   ```
5. 點擊 **Commit changes**

#### 5. 完成！

您的專案現在已經在 GitHub 上了！

網址格式：
```
https://github.com/您的使用者名稱/parking-helper
```

---

## 方法二：使用 Git 指令列（專業方式）

### ⭐ 適合對象
- 需要經常更新程式碼
- 想要學習專業的版本控制
- 熟悉指令列操作

### 📝 步驟說明

#### 1. 安裝 Git

**Windows：**
1. 下載 Git：https://git-scm.com/download/win
2. 執行安裝檔，全部選預設選項
3. 安裝完成後，開啟 **Git Bash**

**Mac：**
1. 開啟「終端機」
2. 輸入以下指令安裝 Homebrew（如果還沒有）：
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. 安裝 Git：
   ```bash
   brew install git
   ```

**驗證安裝：**
```bash
git --version
```
應該會顯示類似：`git version 2.43.0`

#### 2. 設定 Git 身份

第一次使用 Git 需要設定您的名字和 Email：

```bash
git config --global user.name "您的名字"
git config --global user.email "your.email@example.com"
```

驗證設定：
```bash
git config --global --list
```

#### 3. 在 GitHub 建立儲存庫

1. 登入 GitHub：https://github.com
2. 點擊右上角 **+** → **New repository**
3. 填寫資料：
   - **Repository name**：`parking-helper`
   - **Description**：`🚗 停車小幫手 Web 應用程式`
   - 選擇 **Public**
   - ❌ **不要勾選** "Initialize this repository with:"
4. 點擊 **Create repository**

#### 4. 記下儲存庫網址

建立完成後，GitHub 會顯示儲存庫網址，例如：
```
https://github.com/您的使用者名稱/parking-helper.git
```

**複製這個網址，等等會用到！**

#### 5. 在本地初始化 Git

開啟 **Git Bash**（Windows）或**終端機**（Mac），進入專案資料夾：

```bash
# 進入專案資料夾（修改成您的實際路徑）
cd /path/to/parking-helper

# 如果您還沒有專案資料夾，從 GenSpark 下載後解壓縮
# 然後用 cd 指令進入該資料夾
```

#### 6. 初始化 Git 儲存庫

```bash
# 初始化 Git 儲存庫
git init

# 查看目前狀態
git status
```

您會看到所有未追蹤的檔案列表（紅色）。

#### 7. 新增檔案到暫存區

```bash
# 新增所有檔案
git add .

# 或者個別新增
# git add index.html
# git add css/
# git add js/
# git add README.md
# git add LICENSE
# git add .gitignore

# 再次查看狀態
git status
```

現在檔案應該變成綠色（已暫存）。

#### 8. 提交變更

```bash
git commit -m "Initial commit - 停車小幫手完整功能"
```

提交訊息說明：
- 使用 `-m` 參數直接輸入提交訊息
- 第一次提交通常寫 "Initial commit"
- 可以加上簡短的功能說明

#### 9. 設定預設分支名稱

```bash
# 將主分支名稱改為 main（GitHub 新標準）
git branch -M main
```

#### 10. 連結到 GitHub 遠端儲存庫

```bash
# 新增遠端儲存庫（修改成您的 GitHub 網址）
git remote add origin https://github.com/您的使用者名稱/parking-helper.git

# 驗證遠端設定
git remote -v
```

應該會顯示：
```
origin  https://github.com/您的使用者名稱/parking-helper.git (fetch)
origin  https://github.com/您的使用者名稱/parking-helper.git (push)
```

#### 11. 推送到 GitHub

```bash
# 第一次推送需要使用 -u 參數
git push -u origin main
```

**第一次推送時，可能會要求登入 GitHub：**

- **使用者名稱**：您的 GitHub 使用者名稱
- **密碼**：❌ 不是 GitHub 密碼！需要使用 **Personal Access Token**

#### 12. 建立 Personal Access Token（如果需要）

如果推送時要求輸入密碼：

1. 前往 GitHub：https://github.com/settings/tokens
2. 點擊 **Generate new token** → **Generate new token (classic)**
3. 填寫資料：
   - **Note**：`parking-helper-upload`
   - **Expiration**：選擇有效期限
   - **Select scopes**：勾選 `repo`（完整儲存庫控制）
4. 滾動到最下方，點擊 **Generate token**
5. **複製 Token**（只會顯示一次，請儲存好！）
6. 在 Git 要求輸入密碼時，貼上 Token

#### 13. 完成！

前往您的 GitHub 儲存庫頁面：
```
https://github.com/您的使用者名稱/parking-helper
```

您應該會看到所有檔案都已經上傳成功！🎉

---

## 方法三：使用 GitHub Desktop（圖形化介面）

### ⭐ 適合對象
- 不喜歡指令列操作
- 想要視覺化管理版本
- 需要經常更新程式碼

### 📝 步驟說明

#### 1. 安裝 GitHub Desktop

1. 下載：https://desktop.github.com/
2. 安裝並開啟 GitHub Desktop
3. 點擊 **Sign in to GitHub.com**
4. 登入您的 GitHub 帳號

#### 2. 建立新儲存庫

1. 點擊 **File** → **New repository**
2. 填寫資料：
   - **Name**：`parking-helper`
   - **Description**：`🚗 停車小幫手 Web 應用程式`
   - **Local path**：選擇專案資料夾的**上一層**
     - 例如專案在 `C:\Users\You\parking-helper`
     - 就選擇 `C:\Users\You\`
   - **Initialize this repository with a README**：❌ 不要勾選
   - **Git ignore**：選擇 None
   - **License**：選擇 MIT License
3. 點擊 **Create repository**

#### 3. 複製專案檔案

如果您選擇了新建儲存庫的路徑：

1. GitHub Desktop 會在該路徑建立 `parking-helper` 資料夾
2. 將您的專案檔案全部複製到這個資料夾
3. GitHub Desktop 會自動偵測到新檔案

#### 4. 提交變更

1. 左側會顯示所有變更的檔案列表
2. 確認所有檔案都已勾選
3. 左下角填寫 Commit message：
   ```
   Initial commit - 停車小幫手完整功能
   ```
4. 點擊 **Commit to main**

#### 5. 發布到 GitHub

1. 點擊右上角 **Publish repository**
2. 確認資訊：
   - **Name**：`parking-helper`
   - **Description**：自動填入
   - **Keep this code private**：不要勾選（選擇 Public）
3. 點擊 **Publish repository**

#### 6. 完成！

GitHub Desktop 會自動上傳所有檔案到 GitHub。

前往您的 GitHub 儲存庫頁面：
```
https://github.com/您的使用者名稱/parking-helper
```

---

## 設定 GitHub Pages（免費部署）

上傳到 GitHub 後，您可以使用 GitHub Pages 免費託管您的網站！

### 📝 步驟說明

#### 1. 進入儲存庫設定

1. 前往您的 GitHub 儲存庫
2. 點擊 **Settings**（設定）
3. 左側選單找到 **Pages**

#### 2. 設定 GitHub Pages

1. **Source**（來源）：
   - 選擇 **Deploy from a branch**
   
2. **Branch**（分支）：
   - 選擇 **main**
   - 資料夾選擇 **/ (root)**

3. 點擊 **Save**

#### 3. 等待部署

- GitHub 會開始建置您的網站
- 通常需要 1-3 分鐘
- 重新整理頁面後，會顯示您的網站網址

#### 4. 取得網站網址

您的網站網址格式：
```
https://您的使用者名稱.github.io/parking-helper/
```

例如：
```
https://john-doe.github.io/parking-helper/
```

#### 5. 訪問您的網站

在瀏覽器輸入網址，您應該會看到停車小幫手應用程式！

---

## 未來如何更新程式碼？

### 使用 Git 指令列

```bash
# 1. 進入專案資料夾
cd /path/to/parking-helper

# 2. 查看變更
git status

# 3. 新增變更
git add .

# 4. 提交變更
git commit -m "新增功能：地圖視覺化"

# 5. 推送到 GitHub
git push
```

### 使用 GitHub Desktop

1. 修改檔案後，GitHub Desktop 會自動偵測
2. 左側勾選要提交的檔案
3. 填寫 Commit message
4. 點擊 **Commit to main**
5. 點擊 **Push origin**

### 使用 GitHub 網頁

1. 前往儲存庫頁面
2. 找到要修改的檔案
3. 點擊檔案名稱
4. 點擊鉛筆圖示（Edit）
5. 修改內容
6. 填寫 Commit message
7. 點擊 **Commit changes**

---

## 常見問題解答

### ❓ 推送時出現 "authentication failed"

**原因：** GitHub 不再接受密碼登入。

**解決：** 使用 Personal Access Token（參考方法二步驟 12）

### ❓ 推送時出現 "remote origin already exists"

**原因：** 已經設定過遠端儲存庫。

**解決：**
```bash
# 刪除舊的遠端設定
git remote remove origin

# 重新新增
git remote add origin https://github.com/您的使用者名稱/parking-helper.git
```

### ❓ 推送時出現 "failed to push some refs"

**原因：** 遠端有您本地沒有的變更。

**解決：**
```bash
# 先拉取遠端變更
git pull origin main --allow-unrelated-histories

# 再推送
git push -u origin main
```

### ❓ GitHub Pages 顯示 404 Not Found

**可能原因：**

1. **還在建置中**
   - 等待 3-5 分鐘後重新整理

2. **分支設定錯誤**
   - 確認 Pages 設定選擇了正確的分支（main）

3. **檔案名稱錯誤**
   - 確認首頁檔案名稱是 `index.html`（小寫）

4. **快取問題**
   - 按 Ctrl+Shift+R 強制重新整理
   - 或嘗試無痕模式

### ❓ 如何刪除 GitHub 上的儲存庫？

1. 前往儲存庫頁面
2. 點擊 **Settings**
3. 滾動到最下方 **Danger Zone**
4. 點擊 **Delete this repository**
5. 輸入 `您的使用者名稱/parking-helper` 確認
6. 點擊 **I understand the consequences, delete this repository**

### ❓ 如何將儲存庫改為 Private？

1. 前往儲存庫頁面
2. 點擊 **Settings**
3. 滾動到 **Danger Zone**
4. 點擊 **Change visibility**
5. 選擇 **Make private**
6. 輸入儲存庫名稱確認

### ❓ 如何協作開發（多人編輯）？

1. 前往儲存庫頁面
2. 點擊 **Settings** → **Collaborators**
3. 點擊 **Add people**
4. 輸入對方的 GitHub 使用者名稱或 Email
5. 點擊邀請，對方接受後即可協作

---

## 🎉 恭喜完成！

您已經成功將停車小幫手專案上傳到 GitHub！

### 接下來可以做什麼？

- ✅ 分享您的 GitHub 儲存庫連結
- ✅ 設定 GitHub Pages 部署網站
- ✅ 邀請朋友一起開發
- ✅ 繼續開發新功能並推送更新
- ✅ 在 README.md 加入專案截圖
- ✅ 加入 GitHub Actions 自動化測試

---

## 📚 延伸學習資源

- **Git 官方文件**：https://git-scm.com/doc
- **GitHub 使用指南**：https://docs.github.com/zh
- **互動式 Git 教學**：https://learngitbranching.js.org/?locale=zh_TW
- **Markdown 語法**：https://markdown.tw/

---

## 💡 小技巧

### 常用 Git 指令速查

```bash
# 查看狀態
git status

# 查看提交歷史
git log
git log --oneline --graph

# 查看遠端設定
git remote -v

# 拉取遠端更新
git pull

# 推送到遠端
git push

# 建立新分支
git checkout -b feature/new-feature

# 切換分支
git checkout main

# 合併分支
git merge feature/new-feature

# 復原變更（未 commit）
git checkout -- 檔案名稱

# 復原最後一次 commit（保留變更）
git reset --soft HEAD~1

# 查看差異
git diff
```

### GitHub README.md 美化

在 README.md 中加入 Badge（徽章）：

```markdown
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)
```

---

**需要更多協助嗎？隨時提問！** 😊
