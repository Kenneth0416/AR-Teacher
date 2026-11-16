# AR Teacher · WebAR 課本原型

用手機鏡頭對準印刷好的課本頁面，瀏覽器會辨認出是哪一頁（圖像追蹤），然後在頁面上疊加該頁專屬的 Three.js 3D 動畫，動畫錨定在紙上隨頁面移動。

示範內容：HKDSE Chemistry「13.2 Rate equation」共 10 頁（`assets/pages/page-01.jpg` … `page-10.jpg`）。

## 製作流程

```
Fable（總指揮 / orchestrator）
  ├─ Sonnet：逐頁理解課本 → content/pages/page-XX.json（標題、文字區塊 bbox、數據表、重點、動畫構思）
  └─ Opus：按規格撰寫 Three.js 場景 → src/scenes/page-XX.js（遵守 docs/SCENE_CONTRACT.md）
執行時：MindAR 辨認頁面 → 載入對應場景 → 錨定在頁面上播放
```

- 執行核心：`src/runtime/`（AR 模式、預覽模式、場景生命週期、HUD）
- 共用場景工具包：`src/kit/`（文字標籤、Graph2D 圖表、粒子箱、玻璃器皿、箭頭、高亮框、時間軸、配色）
- 場景規範：[`docs/SCENE_CONTRACT.md`](docs/SCENE_CONTRACT.md)
- 圖像追蹤：MindAR 1.2.5（已內置於 `src/vendor/mindar/`，MIT 授權，附三處小修補說明）

## 執行

需要 Node 20+。

```sh
npm install
npm run dev              # 桌面預覽：http://localhost:5173/?mode=preview&page=1
npm run build            # 輸出到 dist/
npm run preview          # 本機預覽 build 結果
```

| 指令 | 用途 |
|---|---|
| `npm run compile-targets` | 用 headless Chrome 把 10 張頁面圖編譯成 `public/targets/pages.mind`（約 30 秒；已提交，換圖時才需重跑）。後備方案：開 `/compile.html` 在瀏覽器內編譯並下載。 |
| `npm run screenshots -- 5 --t 6` | 預覽模式截圖第 5 頁、時間 6 秒 → `screenshots/page-05_t6.png` |
| `npm run test:ar -- 1 5` | 用假鏡頭（ffmpeg 把頁面圖轉成影片）測試 AR 辨認是否觸發正確頁面 |
| `npm run dev:https` | 自簽 HTTPS 開發伺服器，讓同一 Wi-Fi 的手機可直接測試鏡頭 |

預覽模式網址參數：`?mode=preview&page=3`、`&t=12.5`（凍結時間）、`&view=top`、`&hud=0`、`page=kit`（工具包示範）。

## 用手機測試

1. 鏡頭需要 HTTPS。最簡單：push 到 GitHub，在 repo 的 Settings → Pages 選「GitHub Actions」，`.github/workflows/deploy.yml` 會自動 build 並部署，然後用手機開 `https://<user>.github.io/<repo>/`。
   或在同一 Wi-Fi 下執行 `npm run dev:https`，手機開 `https://<電腦 IP>:5173/`（需接受自簽憑證）。
2. 把 `assets/pages/` 的頁面打印出來（Letter / A4 皆可），或在另一個螢幕上全螢幕顯示。
3. 手機開網頁（觸控裝置預設 AR 模式，也可加 `?mode=ar`），允許鏡頭權限，對準頁面。
4. 點畫面任意處可重播動畫；頁面離開鏡頭會暫停，2.5 秒後卸載。

## 限制

- 追蹤檔 `pages.mind` 約 6.4 MB，首次開啟 AR 需下載；MindAR（含 TensorFlow.js）約 1.3 MB（gzip 後約 0.3 MB），只在 AR 模式載入。
- 文字為主的頁面可追蹤特徵較少（第 2、6 頁最少），光線差、反光、角度太斜或頁面只佔畫面一小部分時較難辨認。已修補 MindAR 改用 256px 追蹤關鍵幀（原 128px 幾乎無法追蹤文字頁），但仍需在真機上驗證。
- 假鏡頭測試只證明正面、清晰影像能正確辨認 10 頁；真實手機（對焦、晃動、透視變形）尚未測試。
- 一次只追蹤一頁（`maxTrack: 1`）。
- 目前 10 個場景都是佔位動畫，將由 Opus 按規格逐頁替換。
