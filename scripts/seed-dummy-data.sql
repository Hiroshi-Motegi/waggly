-- Dummy data for user 118dc9b6-deff-4d05-9015-a7d39bf01d0f
-- Supabase Dashboard > SQL Editor に貼り付けて実行

-- RLSをバイパス（SQL Editorではデフォルトでanon roleのため）
SET LOCAL role = 'postgres';

-- ===== CLUBS =====
INSERT INTO clubs (user_id, category, club_number, maker, model, shaft_name, shaft_flex, loft, lie, length, distance, weight, swing_weight, head_volume, head_weight, face_angle, shaft_weight, kick_point, grip_name, grip_size, status, bag_number, sort_order) VALUES
-- ※ bag_number=1 がマイバッグ、2が予備バッグ
-- Driver
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'driver', '1W', 'WAGGLE', 'DUMMY-DR-1', 'WAGGLE DUMMY-S65', 'S', 10.5, 59, 45.5, 230, 305, 'D2', 460, 198, -0.5, 65, '中調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 0),
-- Fairway Woods
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'fairway_wood', '3W', 'WAGGLE', 'DUMMY-FW-3', 'WAGGLE DUMMY-S65', 'S', 15, 58, 43, 210, 315, 'D1', 175, 205, NULL, 65, '中調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 1),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'fairway_wood', '5W', 'WAGGLE', 'DUMMY-FW-5', 'WAGGLE DUMMY-S65', 'S', 18, 58.5, 42.5, 195, 320, 'D1', 155, 210, NULL, 65, '中調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 2),
-- Utilities
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'utility', '4U', 'WAGGLE', 'DUMMY-UT-4', 'WAGGLE DUMMY-S75', 'S', 22, 60, 39.5, 185, 345, 'D1', NULL, 230, NULL, 75, '中元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 3),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'utility', '5U', 'WAGGLE', 'DUMMY-UT-5', 'WAGGLE DUMMY-S75', 'S', 25, 60.5, 39, 175, 350, 'D1', NULL, 235, NULL, 75, '中元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 4),
-- Irons
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'iron', '6I', 'WAGGLE', 'DUMMY-IR-6', 'WAGGLE DUMMY-T90', 'S', 26, 61, 37.5, 165, 395, 'D2', NULL, 255, NULL, 90, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 5),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'iron', '7I', 'WAGGLE', 'DUMMY-IR-7', 'WAGGLE DUMMY-T90', 'S', 30, 61.5, 37, 155, 405, 'D2', NULL, 262, NULL, 90, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 6),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'iron', '8I', 'WAGGLE', 'DUMMY-IR-8', 'WAGGLE DUMMY-T90', 'S', 34, 62, 36.5, 145, 415, 'D2', NULL, 269, NULL, 90, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 7),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'iron', '9I', 'WAGGLE', 'DUMMY-IR-9', 'WAGGLE DUMMY-T90', 'S', 38, 62.5, 36, 135, 425, 'D2', NULL, 276, NULL, 90, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 8),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'iron', 'PW', 'WAGGLE', 'DUMMY-IR-PW', 'WAGGLE DUMMY-T90', 'S', 43, 63, 35.5, 120, 435, 'D2', NULL, 283, NULL, 90, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 9),
-- Wedges
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'wedge', 'AW', 'WAGGLE', 'DUMMY-WG-50', 'WAGGLE DUMMY-W75', 'S', 50, 63.5, 35.25, 100, 460, 'D3', NULL, 290, NULL, 75, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 10),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'wedge', 'SW', 'WAGGLE', 'DUMMY-WG-56', 'WAGGLE DUMMY-W75', 'S', 56, 63.5, 35.25, 80, 465, 'D3', NULL, 294, NULL, 75, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 11),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'wedge', 'LW', 'WAGGLE', 'DUMMY-WG-58', 'WAGGLE DUMMY-W75', 'S', 58, 63.5, 35, 60, 468, 'D3', NULL, 296, NULL, 75, '元調子', 'WAGGLE DUMMY-GRIP', 'M60', 'bag', 1, 12),
-- Putter
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'putter', 'PT', 'WAGGLE', 'DUMMY-PT-1', NULL, NULL, 3, 70, 34, NULL, 540, 'E2', NULL, 350, NULL, NULL, NULL, 'WAGGLE DUMMY-PUTTER-GRIP', NULL, 'bag', 1, 13);

-- Wedge bounce/sole_shape
UPDATE clubs SET bounce = 10, sole_shape = 'セミグラインド' WHERE user_id = '118dc9b6-deff-4d05-9015-a7d39bf01d0f' AND model = 'DUMMY-WG-50';
UPDATE clubs SET bounce = 12, sole_shape = 'フルソール' WHERE user_id = '118dc9b6-deff-4d05-9015-a7d39bf01d0f' AND model = 'DUMMY-WG-56';
UPDATE clubs SET bounce = 8, sole_shape = 'ローバウンス' WHERE user_id = '118dc9b6-deff-4d05-9015-a7d39bf01d0f' AND model = 'DUMMY-WG-58';

-- ===== ACCESSORIES =====
INSERT INTO accessories (user_id, category, brand, model, memo, status) VALUES
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'glove', 'WAGGLE', 'DUMMY-GLOVE-01', '合成皮革、左手用、白', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'apparel', 'WAGGLE', 'DUMMY-HAT-01', 'バケットハット、ベージュ', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'apparel', 'WAGGLE', 'DUMMY-SHOES-01', 'スパイクレス、白/紺', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'apparel', 'WAGGLE', 'DUMMY-CAP-01', 'キャップ、白', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'ball', 'WAGGLE', 'DUMMY-BALL-V3', '3ピース、カラーボール', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'ball', 'WAGGLE', 'DUMMY-BALL-X1', '4ピース、ツアーモデル、白', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'tee', 'WAGGLE', 'DUMMY-TEE-SET', 'ロング&ショート各色セット', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'rangefinder', 'WAGGLE', 'DUMMY-RF-200', 'レーザー距離計、手ブレ補正付き', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'other', 'WAGGLE', 'DUMMY-TOWEL-01', 'マイクロファイバー、黒', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'apparel', 'WAGGLE', 'DUMMY-WATCH-01', 'GPSゴルフウォッチ', 'active'),
('118dc9b6-deff-4d05-9015-a7d39bf01d0f', 'apparel', 'WAGGLE', 'DUMMY-RAIN-01', 'レインウェア上下セット、グレー', 'active');
