CREATE OR REPLACE FUNCTION set_grace_period(p_customer_id text, p_grace_end timestamptz)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET grace_period_end = p_grace_end
  WHERE payjp_customer_id = p_customer_id AND status = 'active' AND grace_period_end IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
