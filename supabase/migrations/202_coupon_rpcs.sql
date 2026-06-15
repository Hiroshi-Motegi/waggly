CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id uuid)
RETURNS boolean AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE coupons SET used_count = used_count + 1
  WHERE id = p_coupon_id AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_coupon_usage(p_coupon_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE coupons SET used_count = used_count - 1
  WHERE id = p_coupon_id AND used_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
