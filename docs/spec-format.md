# ガントチャート YAML スペックフォーマット

Claude が出力し、ブラウザアプリが読み込む構造化データの仕様。

---

## トップレベル

```yaml
title: "プロジェクト名"           # 必須
description: "概要メモ"           # 任意
display:
  unit: week                      # day / week / month（省略時: week）
  start: "2026-06-01"             # 表示開始日（省略時: 最初のタスク開始日 - 3日）
  end: "2026-08-31"               # 表示終了日（省略時: 最後のタスク終了日 + 3日）

groups: [...]      # フェーズ・カテゴリ定義
tasks: [...]       # タスク一覧
milestones: [...]  # マイルストーン一覧
```

---

## groups（フェーズ定義）

```yaml
groups:
  - id: phase1              # 英数字・ハイフン・アンダースコアのみ（一意）
    name: "フェーズ1: 要件定義"
    color: "#2c5f8a"        # 任意。省略時はテーマのデフォルト色
```

---

## tasks（タスク）

```yaml
tasks:
  - id: t01                 # 一意なID（英数字・ハイフン）
    name: "要件定義"
    group: phase1            # groups のidを参照（省略可）
    start: "2026-06-08"     # ISO 8601形式 YYYY-MM-DD（必須）
    end: "2026-06-19"       # ISO 8601形式 YYYY-MM-DD（必須）
    milestone: false        # trueにするとマイルストーンとして表示（省略時: false）
    dependencies: [t00]     # このタスクが依存するタスクのid一覧（省略時: []）
    note: "自由記述メモ"    # 任意
```

### 日付ルール
- `start` ≤ `end` であること
- 同日（`start == end`）は1日のタスクとして扱う
- `milestone: true` の場合、`end` は `start` と同じ日でも可

---

## milestones（マイルストーン）

```yaml
milestones:
  - id: m1                  # 一意なID
    name: "要件確定"
    date: "2026-06-19"      # ISO 8601形式（必須）
    group: phase1            # 任意（どのグループの行に表示するか）
    note: "ステークホルダー承認"  # 任意
```

---

## 完全な例

```yaml
title: "ECサイトリニューアル"
description: "6月〜8月の3ヶ月プロジェクト"
display:
  unit: week
  start: "2026-06-01"
  end: "2026-08-31"

groups:
  - id: phase1
    name: "フェーズ1: 要件定義・設計"
    color: "#2c5f8a"
  - id: phase2
    name: "フェーズ2: 開発"
    color: "#276749"
  - id: phase3
    name: "フェーズ3: テスト・リリース"
    color: "#744210"

tasks:
  - id: t01
    name: "キックオフMTG"
    group: phase1
    start: "2026-06-01"
    end: "2026-06-03"
    dependencies: []
  - id: t02
    name: "要件定義"
    group: phase1
    start: "2026-06-08"
    end: "2026-06-19"
    dependencies: [t01]
  - id: t03
    name: "フロントエンド開発"
    group: phase2
    start: "2026-07-06"
    end: "2026-08-07"
    dependencies: [t02]
    note: "約5週間"

milestones:
  - id: m1
    name: "要件確定"
    date: "2026-06-19"
    group: phase1
  - id: m2
    name: "リリース"
    date: "2026-08-31"
    group: phase3
```

---

## display.unit の選び方ガイド

| プロジェクト期間 | 推奨 unit |
|-----------------|-----------|
| ～2週間         | day       |
| 2週間〜3ヶ月    | week      |
| 3ヶ月以上       | month     |
