# パフォーマンス改善 + セキュリティ修正

## 概要

アプリ全体の速度改善とセキュリティ修正。UIの変更はなし、コード内部のみ。

## 1. セキュリティ: SQLインジェクション修正

### 対象
- `src/lib/api-client.ts`

### 問題
ローカルモード（Capacitor SQLite）のクエリで文字列を直接埋め込んでいる。

**クラブ一覧ハンドラ（114行目付近）:**
```typescript
if (status) conds.push(`status = '${status}'`);
if (bagNum) conds.push(`bag_number = ${bagNum}`);
```

**アクセサリー一覧ハンドラ（445行目付近）:**
```typescript
if (status) sql += ` WHERE status = '${status}'`;
```

**PATCHハンドラ（155-159行目）:**
```typescript
const fields = Object.keys(body).filter((k) => k !== "id");
const sets = fields.map((k) => `${k} = ?`).join(", ");
```
値は `?` でパラメータ化されているが、カラム名（`${k}`）がクライアント入力からそのまま組み立てられている。ローカルSQLiteなのでリスクは低いが、修正対象に含める。

### 修正方針

**クエリパラメータの文字列埋め込み → パラメータ化:**
```typescript
// クラブ一覧
if (status) { conds.push(`status = ?`); values.push(status); }
if (bagNum) { conds.push(`bag_number = ?`); values.push(Number(bagNum)); }

// アクセサリー一覧
if (status) { sql += " WHERE status = ?"; params.push(status); }
```

**PATCHハンドラ → カラム名ホワイトリスト検証:**
```typescript
const CLUB_COLUMNS = new Set([
  "category", "club_number", "maker", "model", "shaft_name", "shaft_flex",
  "loft", "lie", "length", "distance", "release_year", "memo",
  "purchase_date", "purchase_shop", "purchase_price", "status", "bag_number",
  "weight", "swing_weight", "frequency", "kick_point", "head_volume",
  "head_weight", "rating", "sort_order", "avatar_url",
]);

const fields = Object.keys(body).filter((k) => k !== "id" && CLUB_COLUMNS.has(k));
```

アクセサリーの PATCH ハンドラにも同様のホワイトリストを追加。

## 2. N+1 クエリ修正（クラブの画像取得）

### 対象
- `src/lib/api-client.ts` — ローカルモードの `/api/clubs` ハンドラ（一覧）
- `src/lib/api-client.ts` — ローカルモードの `/api/clubs/:id` ハンドラ（単体、143-150行目付近）

### 問題

**一覧（N+1）:** クラブ一覧取得後、クラブごとに画像を1クエリずつ取得している（14クラブ = 14クエリ）。

```typescript
for (const c of clubs) {
  const imgs = await q("SELECT * FROM club_images WHERE club_id = ? ...", [c.id]);
  c.club_images = imgs;
}
```

**単体（3クエリ直列）:** 単体取得でもクラブ本体・画像・メンテナンスを3回の別クエリで直列取得。

```typescript
const rows = await q("SELECT * FROM clubs WHERE id = ?", [match[1]]);
const images = await q("SELECT * FROM club_images WHERE club_id = ? ...", [match[1]]);
const maintenances = await q("SELECT * FROM maintenances WHERE club_id = ? ...", [match[1]]);
```

### 修正方針

**一覧:** 1回の IN クエリで全クラブの画像を取得し、JS側でグルーピング。

```typescript
const clubIds = clubs.map((c: any) => c.id);
if (clubIds.length > 0) {
  const placeholders = clubIds.map(() => "?").join(",");
  const allImages = await q(
    `SELECT * FROM club_images WHERE club_id IN (${placeholders}) ORDER BY is_primary DESC`,
    clubIds
  );
  const imagesByClub = new Map<string, any[]>();
  for (const img of allImages) {
    if (!imagesByClub.has(img.club_id)) imagesByClub.set(img.club_id, []);
    imagesByClub.get(img.club_id)!.push(img);
  }
  for (const c of clubs) {
    c.club_images = imagesByClub.get(c.id) ?? [];
  }
}
```

**単体:** 画像とメンテナンスを `Promise.all` で並列取得。

```typescript
const rows = await q("SELECT * FROM clubs WHERE id = ?", [match[1]]);
if (!rows.length) return null;
const [images, maintenances] = await Promise.all([
  q("SELECT * FROM club_images WHERE club_id = ? ORDER BY is_primary DESC", [match[1]]),
  q("SELECT * FROM maintenances WHERE club_id = ? ORDER BY done_at DESC", [match[1]]),
]);
return { ...rows[0], club_images: images, maintenances };
```

## 3. API 呼び出し並列化（クラブ詳細ページ）

### 対象
- `src/app/bag/[clubId]/page-client.tsx`

### 問題
summary と history の API を fire-and-forget × 2 で呼んでいる。`Promise.all` ではないため、一方が遅い場合に loading 状態が正しく管理されない（history の完了だけで loading を切っている可能性）。

### 修正方針
`Promise.all` で並列化し、両方の完了を待ってから状態を更新。

```typescript
useEffect(() => {
  if (!club) return;
  Promise.all([
    apiFetch(`/api/clubs/${clubId}/summary`).then((r) => r.ok ? r.json() : null),
    apiFetch(`/api/clubs/${clubId}/history`).then((r) => r.ok ? r.json() : []),
  ]).then(([summaryData, historyData]) => {
    if (summaryData) setSummary(summaryData);
    if (historyData) setHistory(historyData);
  }).catch(() => {});
}, [clubId, club]);
```

## 4. チャートデータの useMemo 化

### 対象
- `src/app/bag/page.tsx`

### 問題
`bagClubs` が `.filter()` で毎レンダー新配列を生成するため、下流の計算も毎回再実行される。

### useClubs の参照安定性
`useClubs` は SWR ベース。SWR はデータが変わらない限り同じ参照を返すので、`clubs` の参照は安定している。`bagClubs` を `useMemo([clubs, statusFilter])` でメモ化すれば下流も安定する。

### 修正方針
`bagClubs` 自体を `useMemo` でメモ化し、下流もチェーンで `useMemo` する。

```typescript
const bagClubs = useMemo(
  () => clubs.filter((c) => c.status === "bag" && c.bag_number === (statusFilter === "bag2" ? 2 : 1)),
  [clubs, statusFilter]
);
const distanceData = useMemo(() => getDistanceStaircaseData(bagClubs), [bagClubs]);
const weightData = useMemo(() => getWeightFlowData(bagClubs), [bagClubs]);
const distanceInsights = useMemo(() => getDistanceInsights(distanceData), [distanceData]);
const weightInsights = useMemo(() => getWeightInsights(weightData), [weightData]);
```

## テスト

- セキュリティ修正: 既存の `api-client.test.ts` が通ること + ホワイトリスト外のカラム名が無視されることを確認
- N+1 修正: 結果が同一であることを手動確認（クラブ一覧に画像が表示されること）
- 並列化・useMemo: ビルド成功 + 動作確認
