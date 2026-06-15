-- ensure_usage_counter: カウンター行の初期化
CREATE OR REPLACE FUNCTION ensure_usage_counter(p_user_id uuid, p_source text, p_month text)
RETURNS void AS $$
BEGIN
  INSERT INTO ai_usage_counters (user_id, source, month, count)
  VALUES (p_user_id, p_source, p_month, 0)
  ON CONFLICT (user_id, source, month) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- increment_usage_counter: 原子的インクリメント
CREATE OR REPLACE FUNCTION increment_usage_counter(p_user_id uuid, p_source text, p_month text, p_limit integer)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE ai_usage_counters
  SET count = count + 1
  WHERE user_id = p_user_id AND source = p_source AND month = p_month AND count < p_limit
  RETURNING count INTO new_count;

  RETURN new_count;  -- NULL if no row updated (limit reached)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- decrement_usage_counter: 失敗時の補正
CREATE OR REPLACE FUNCTION decrement_usage_counter(p_user_id uuid, p_source text, p_month text)
RETURNS void AS $$
BEGIN
  UPDATE ai_usage_counters
  SET count = count - 1
  WHERE user_id = p_user_id AND source = p_source AND month = p_month AND count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
