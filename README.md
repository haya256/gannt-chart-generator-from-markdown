# Gantt Chart Generator from Markdown

雑な Markdown（企画メモ・プロジェクト計画など）から、見やすいガントチャートを生成するツールです。

## 概要

2段階のパイプラインで動作します。

```
雑な Markdown
    ↓  Stage 1: Claude Code が AI でスケジュールを解釈
構造化 YAML スペック
    ↓  Stage 2: ブラウザアプリで表示・カスタマイズ
ガントチャート（SVG / HTML / PNG）
```

## 特徴

- **柔軟な入力**: 「6月第1週」「約2週間」「〜完了後」など、曖昧な日付・期間表現をAIが解釈
- **2つのレイアウト**: タスクごとに1行の展開表示と、フェーズごとに1行のコンパクト表示を切り替え可能
- **ブラウザで完結**: アップロードからエクスポートまでサーバー不要
- **3形式でエクスポート**: SVG・自己完結HTML・PNG

## 使い方

### Stage 1: Markdown → YAML（Claude Code）

1. 企画メモを Markdown で書く（フォーマット自由）
2. Claude Code に「`your-plan.md` をガントチャートにして」と指示
3. `data/your-plan.yaml` が生成される

> 詳細な解釈ルールは [`docs/procedure.md`](docs/procedure.md) を参照

### Stage 2: YAML → ガントチャート（ブラウザ）

1. `app/index.html` をブラウザで開く
2. 生成された YAML ファイルをアップロード（またはテキストを貼り付け）
3. 表示設定（時間単位・レイアウト・カラーテーマ・列幅）を調整
4. SVG / HTML / PNG でエクスポート

## YAML フォーマット

手動で YAML を作成・編集することもできます。詳細は [`docs/spec-format.md`](docs/spec-format.md) を参照。

```yaml
title: "プロジェクト名"
display:
  unit: week   # day / week / month
groups:
  - id: phase1
    name: "フェーズ1"
    color: "#2c5f8a"
tasks:
  - id: t01
    name: "要件定義"
    group: phase1
    start: "2026-06-08"
    end: "2026-06-19"
    dependencies: []
milestones:
  - id: m1
    name: "要件確定"
    date: "2026-06-19"
    group: phase1
```

## サンプル

| ファイル | 内容 |
|----------|------|
| [`sample/sample-input.md`](sample/sample-input.md) | 曖昧な表現を含む企画メモの例 |
| [`sample/sample-output.yaml`](sample/sample-output.yaml) | Stage 1 の出力例 |

## ファイル構成

```
├── app/
│   ├── index.html       # ブラウザアプリ
│   ├── gantt.js         # SVG ガントチャートレンダラー
│   └── style.css        # スタイル
├── docs/
│   ├── procedure.md     # Claude Code 向け変換手順書
│   └── spec-format.md   # YAML フォーマット仕様
└── sample/
    ├── sample-input.md  # サンプル入力
    └── sample-output.yaml
```

## ライセンス

MIT License — [LICENSE](LICENSE)
