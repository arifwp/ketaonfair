-- Geometry writes serialize on the event, matching the future reservation lock order.
CREATE FUNCTION lock_inventory_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM 1 FROM events WHERE id = OLD.event_id FOR UPDATE;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.event_id, NEW.layout_id) IS DISTINCT FROM (OLD.event_id, OLD.layout_id) THEN
    RAISE EXCEPTION 'Inventory event/layout ownership cannot change' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM events WHERE id = NEW.event_id FOR UPDATE;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER lock_slot_event BEFORE INSERT OR UPDATE OR DELETE ON slots FOR EACH ROW EXECUTE FUNCTION lock_inventory_event();
--> statement-breakpoint
CREATE TRIGGER lock_stretch_event BEFORE INSERT OR UPDATE OR DELETE ON approved_stretches FOR EACH ROW EXECUTE FUNCTION lock_inventory_event();
--> statement-breakpoint
CREATE TRIGGER lock_exclusion_event BEFORE INSERT OR UPDATE OR DELETE ON exclusions FOR EACH ROW EXECUTE FUNCTION lock_inventory_event();
--> statement-breakpoint
CREATE TRIGGER lock_row_event BEFORE INSERT OR UPDATE OR DELETE ON booth_rows FOR EACH ROW EXECUTE FUNCTION lock_inventory_event();
--> statement-breakpoint
-- Check final geometry at commit so a later editor can reflow an interval atomically.
-- The 10 mm row-length tolerance handles metric/geodesic conversion only. Polygon
-- containment and interior overlap tests have no overlap tolerance.
CREATE FUNCTION validate_inventory_geometry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  checked_layout_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN checked_layout_id := OLD.layout_id;
  ELSE checked_layout_id := NEW.layout_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM approved_stretches stretch JOIN booth_rows row ON row.id = stretch.row_id
    WHERE stretch.layout_id = checked_layout_id
      AND stretch.end_mm > ST_Length(row.centerline::geography) * 1000 + 10
  ) OR EXISTS (
    SELECT 1 FROM exclusions exclusion JOIN booth_rows row ON row.id = exclusion.row_id
    WHERE exclusion.layout_id = checked_layout_id
      AND exclusion.end_mm > ST_Length(row.centerline::geography) * 1000 + 10
  ) THEN
    RAISE EXCEPTION 'Inventory interval exceeds its row' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM approved_stretches a JOIN approved_stretches b ON a.row_id = b.row_id AND a.id < b.id
    WHERE a.layout_id = checked_layout_id AND int4range(a.start_mm, a.end_mm, '[)') && int4range(b.start_mm, b.end_mm, '[)')
  ) THEN
    RAISE EXCEPTION 'Approved row intervals overlap' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM slots slot JOIN approved_stretches stretch ON stretch.id = slot.approved_stretch_id
    WHERE slot.layout_id = checked_layout_id AND (
      NOT stretch.is_approved OR slot.start_mm < stretch.start_mm OR slot.end_mm > stretch.end_mm
      OR NOT ST_CoveredBy(slot.footprint, stretch.footprint)
    )
  ) THEN
    RAISE EXCEPTION 'Slot is outside an approved footprint or interval' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM slots slot JOIN approved_stretches stretch ON stretch.id = slot.approved_stretch_id
    JOIN exclusions exclusion ON exclusion.layout_id = slot.layout_id
    WHERE slot.layout_id = checked_layout_id AND (
      (exclusion.row_id = stretch.row_id AND int4range(slot.start_mm, slot.end_mm, '[)') && int4range(exclusion.start_mm, exclusion.end_mm, '[)'))
      OR (exclusion.footprint && slot.footprint AND ST_Relate(exclusion.footprint, slot.footprint, 'T********'))
    )
  ) THEN
    RAISE EXCEPTION 'Slot intersects an access gap' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM slots a JOIN slots b ON a.layout_id = b.layout_id AND a.id < b.id
    WHERE a.layout_id = checked_layout_id AND (
      (a.approved_stretch_id = b.approved_stretch_id AND int4range(a.start_mm, a.end_mm, '[)') && int4range(b.start_mm, b.end_mm, '[)'))
      OR (a.footprint && b.footprint AND ST_Relate(a.footprint, b.footprint, 'T********'))
    )
  ) THEN
    RAISE EXCEPTION 'Slot footprints or intervals overlap' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER validate_slot_geometry AFTER INSERT OR UPDATE OR DELETE ON slots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_inventory_geometry();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER validate_stretch_geometry AFTER INSERT OR UPDATE OR DELETE ON approved_stretches DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_inventory_geometry();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER validate_exclusion_geometry AFTER INSERT OR UPDATE OR DELETE ON exclusions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_inventory_geometry();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER validate_row_geometry AFTER INSERT OR UPDATE OR DELETE ON booth_rows DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_inventory_geometry();
--> statement-breakpoint
CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical snapshots and audit records are immutable' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER immutable_order_items BEFORE UPDATE OR DELETE ON order_items FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
--> statement-breakpoint
CREATE TRIGGER immutable_audit_logs BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
