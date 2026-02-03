# 日本の系統接続検討状況 ダッシュボード (Grid Connection Dashboard)

日本の電力系統における蓄電池・再生可能エネルギー（太陽光・風力）の接続検討状況を可視化するダッシュボードです。

**Live Site:** [https://grid-connection-dashboard.vercel.app/](https://grid-connection-dashboard.vercel.app/)

## 特徴
- **10電力エリアごとの状況可視化**: 地図とグラフで接続申込状況を直感的に把握
- **変動電源比率(VRE) vs 蓄電池**: 再エネ導入率と蓄電池需要の関係性を分析
- **時系列推移**: 接続検討・契約・運転開始の推移をグラフ表示

## データ出典
- [経済産業省 再エネ大量導入・次世代電力ネットワーク小委員会](https://www.meti.go.jp/shingikai/enecho/denryoku_gas/saisei_kano/index.html)
- [電力広域的運営推進機関(OCCTO) 系統情報](https://www.occto.or.jp/keito/jouhou/index.html)
- [ISEP 自然エネルギー・データ集](https://www.isep.or.jp/archives/library/14441)

## 技術スタック
- HTML5 / CSS3 (Variables, Flexbox/Grid)
- JavaScript (ES6+)
- [D3.js](https://d3js.org/) (グラフ描画)
- [Leaflet](https://leafletjs.com/) (地図表示)
- [TopoJSON](https://github.com/topojson/topojson) (地図データ)

## ライセンス
MIT License
