-- Customer/quote snapshots remain historical even after cancellation. Only the
-- explicit cancellation fields may change; no service can rewrite past prices.
CREATE FUNCTION protect_order_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (
    to_jsonb(NEW) - ARRAY['state', 'cancelled_at', 'cancelled_by_admin_id', 'cancellation_reason']
  ) IS DISTINCT FROM (
    to_jsonb(OLD) - ARRAY['state', 'cancelled_at', 'cancelled_by_admin_id', 'cancellation_reason']
  ) THEN
    RAISE EXCEPTION 'Booking identity, customer and quote snapshots are immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.state = 'cancelled' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Cancelled booking history is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER immutable_order_snapshot BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION protect_order_snapshot();
--> statement-breakpoint
CREATE TRIGGER retain_order_history BEFORE DELETE ON orders FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
