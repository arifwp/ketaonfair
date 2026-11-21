-- Available inventory stays editable after opening. Active reservations protect
-- their exact slot values in addition to the immutable order snapshots.
CREATE FUNCTION protect_reserved_slot_inventory() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(NEW.event_id, NEW.layout_id, NEW.approved_stretch_id, NEW.code, NEW.start_mm, NEW.end_mm, NEW.base_price_idr, NEW.price_override_idr, NEW.base_frontage_mm, NEW.frontage_override_mm, NEW.base_depth_mm, NEW.depth_override_mm, NEW.footprint, NEW.is_blocked) IS NOT DISTINCT FROM ROW(OLD.event_id, OLD.layout_id, OLD.approved_stretch_id, OLD.code, OLD.start_mm, OLD.end_mm, OLD.base_price_idr, OLD.price_override_idr, OLD.base_frontage_mm, OLD.frontage_override_mm, OLD.base_depth_mm, OLD.depth_override_mm, OLD.footprint, OLD.is_blocked) THEN
    RETURN NEW;
  END IF;
  -- Application writers lock event → slots. Direct SQL still cannot bypass
  -- protection while a concurrent reservation commits ownership.
  PERFORM 1 FROM events WHERE id = OLD.event_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM slot_claims WHERE slot_id = OLD.id AND released_at IS NULL) THEN
    RAISE EXCEPTION 'Reserved slot prices, dimensions, identity and geometry cannot change' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER protect_reserved_slot_inventory BEFORE UPDATE OR DELETE ON slots FOR EACH ROW EXECUTE FUNCTION protect_reserved_slot_inventory();
