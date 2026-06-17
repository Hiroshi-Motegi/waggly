-- ヘッドの並び順カラム追加
ALTER TABLE club_spec_heads ADD COLUMN sort_order integer;

-- 既存データにスマートソート順を設定
-- アイアン: 数字部分で昇順、PW=10, AW/GW=11, SW=12, LW=13, UW=14, 度数=そのまま
UPDATE club_spec_heads SET sort_order = CASE
  WHEN club_number ~ '^\d+[iI]$' THEN CAST(regexp_replace(club_number, '[^0-9]', '', 'g') AS integer)
  WHEN club_number ~ '^\d+[wW]$' THEN CAST(regexp_replace(club_number, '[^0-9]', '', 'g') AS integer)
  WHEN club_number ~ '^\d+[uUhH]$' THEN CAST(regexp_replace(club_number, '[^0-9]', '', 'g') AS integer)
  WHEN upper(club_number) = 'PW' THEN 100
  WHEN upper(club_number) IN ('AW', 'GW') THEN 110
  WHEN upper(club_number) = 'SW' THEN 120
  WHEN upper(club_number) = 'LW' THEN 130
  WHEN upper(club_number) = 'UW' THEN 140
  WHEN club_number ~ '^\d+°?$' THEN CAST(regexp_replace(club_number, '[^0-9]', '', 'g') AS integer) + 100
  ELSE 999
END
WHERE club_number IS NOT NULL;
