CREATE TYPE "public"."audit_actor_kind" AS ENUM('guest', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."booking_order_state" AS ENUM('reserved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."booking_window_state" AS ENUM('closed', 'open');--> statement-breakpoint
CREATE TYPE "public"."layout_state" AS ENUM('draft', 'published', 'retired');--> statement-breakpoint
CREATE TYPE "public"."prototype_payment_state" AS ENUM('not_integrated');--> statement-breakpoint
CREATE TYPE "public"."reservation_state" AS ENUM('reserved', 'released');--> statement-breakpoint
CREATE TABLE "approved_stretches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"row_id" uuid NOT NULL,
	"start_mm" integer NOT NULL,
	"end_mm" integer NOT NULL,
	"default_frontage_mm" integer NOT NULL,
	"default_depth_mm" integer NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approval_note" text,
	"footprint" geometry(Polygon,4326) NOT NULL,
	CONSTRAINT "stretch_layout_identity" UNIQUE("id","layout_id","event_id"),
	CONSTRAINT "stretch_interval_valid" CHECK ("approved_stretches"."start_mm" >= 0 AND "approved_stretches"."end_mm" > "approved_stretches"."start_mm"),
	CONSTRAINT "stretch_defaults_valid" CHECK ("approved_stretches"."default_frontage_mm" > 0 AND "approved_stretches"."default_depth_mm" > 0),
	CONSTRAINT "stretch_geometry_valid" CHECK (ST_IsValid("approved_stretches"."footprint") AND NOT ST_IsEmpty("approved_stretches"."footprint") AND ST_Area("approved_stretches"."footprint"::geography) > 0)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"actor_kind" "audit_actor_kind" NOT NULL,
	"actor_id" text NOT NULL,
	"operation" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"previous_values" jsonb,
	"new_values" jsonb,
	"correlation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"slot_code" varchar(40) NOT NULL,
	"route_name" varchar(160) NOT NULL,
	"frontage_mm" integer NOT NULL,
	"depth_mm" integer NOT NULL,
	"unit_price_idr" bigint NOT NULL,
	"slot_revision" integer NOT NULL,
	"footprint" geometry(Polygon,4326) NOT NULL,
	CONSTRAINT "order_item_slot_unique" UNIQUE("order_id","slot_id"),
	CONSTRAINT "order_item_values_valid" CHECK ("order_items"."frontage_mm" > 0 AND "order_items"."depth_mm" > 0 AND "order_items"."slot_revision" > 0 AND "order_items"."unit_price_idr" BETWEEN 1 AND 1000000000000),
	CONSTRAINT "order_item_geometry_valid" CHECK (ST_IsValid("order_items"."footprint") AND NOT ST_IsEmpty("order_items"."footprint") AND ST_Area("order_items"."footprint"::geography) > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"guest_session_id" uuid NOT NULL,
	"booking_reference" varchar(40) NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"submission_payload_hash" varchar(64) NOT NULL,
	"contact_name" varchar(200) NOT NULL,
	"business_name" varchar(200) NOT NULL,
	"email" varchar(254) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"state" "booking_order_state" DEFAULT 'reserved' NOT NULL,
	"payment_state" "prototype_payment_state" DEFAULT 'not_integrated' NOT NULL,
	"total_price_idr" bigint NOT NULL,
	"layout_revision" integer NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_admin_id" text,
	"cancellation_reason" text,
	CONSTRAINT "orders_booking_reference_unique" UNIQUE("booking_reference"),
	CONSTRAINT "order_layout_identity" UNIQUE("id","layout_id","event_id"),
	CONSTRAINT "order_guest_idempotency" UNIQUE("guest_session_id","idempotency_key"),
	CONSTRAINT "order_total_valid" CHECK ("orders"."total_price_idr" BETWEEN 1 AND 100000000000000),
	CONSTRAINT "order_revision_valid" CHECK ("orders"."layout_revision" > 0),
	CONSTRAINT "order_payload_hash_valid" CHECK ("orders"."submission_payload_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "order_cancellation_valid" CHECK (("orders"."state" = 'reserved' AND "orders"."cancelled_at" IS NULL AND "orders"."cancelled_by_admin_id" IS NULL AND "orders"."cancellation_reason" IS NULL) OR ("orders"."state" = 'cancelled' AND "orders"."cancelled_at" >= "orders"."reserved_at" AND "orders"."cancelled_at" IS NOT NULL AND "orders"."cancelled_by_admin_id" IS NOT NULL AND length(trim("orders"."cancelled_by_admin_id")) > 0 AND "orders"."cancellation_reason" IS NOT NULL AND length(trim("orders"."cancellation_reason")) > 0))
);
--> statement-breakpoint
CREATE TABLE "booth_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"label" varchar(120) NOT NULL,
	"footprint_side" varchar(5) NOT NULL,
	"centerline" geometry(LineString,4326) NOT NULL,
	CONSTRAINT "row_layout_identity" UNIQUE("id","layout_id","event_id"),
	CONSTRAINT "row_side_valid" CHECK ("booth_rows"."footprint_side" IN ('left', 'right')),
	CONSTRAINT "row_geometry_valid" CHECK (ST_IsValid("booth_rows"."centerline") AND ST_IsSimple("booth_rows"."centerline") AND NOT ST_IsEmpty("booth_rows"."centerline") AND ST_Length("booth_rows"."centerline"::geography) > 0)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"booking_opens_at" timestamp with time zone NOT NULL,
	"booking_closes_at" timestamp with time zone NOT NULL,
	"booking_window_state" "booking_window_state" DEFAULT 'closed' NOT NULL,
	"default_slot_frontage_mm" integer NOT NULL,
	"default_slot_depth_mm" integer NOT NULL,
	"default_slot_price_idr" bigint NOT NULL,
	"is_illustrative" boolean DEFAULT false NOT NULL,
	"booking_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "event_dates_valid" CHECK ("events"."ends_at" > "events"."starts_at"),
	CONSTRAINT "event_booking_window_valid" CHECK ("events"."booking_closes_at" > "events"."booking_opens_at" AND "events"."booking_closes_at" <= "events"."ends_at"),
	CONSTRAINT "event_defaults_valid" CHECK ("events"."default_slot_frontage_mm" > 0 AND "events"."default_slot_depth_mm" > 0 AND "events"."default_slot_price_idr" BETWEEN 1 AND 1000000000000)
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"row_id" uuid NOT NULL,
	"start_mm" integer NOT NULL,
	"end_mm" integer NOT NULL,
	"reason" text NOT NULL,
	"footprint" geometry(Polygon,4326),
	CONSTRAINT "exclusion_interval_valid" CHECK ("exclusions"."start_mm" >= 0 AND "exclusions"."end_mm" > "exclusions"."start_mm"),
	CONSTRAINT "exclusion_reason_required" CHECK (length(trim("exclusions"."reason")) > 0),
	CONSTRAINT "exclusion_geometry_valid" CHECK ("exclusions"."footprint" IS NULL OR (ST_IsValid("exclusions"."footprint") AND NOT ST_IsEmpty("exclusions"."footprint") AND ST_Area("exclusions"."footprint"::geography) > 0))
);
--> statement-breakpoint
CREATE TABLE "guest_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "guest_sessions_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "guest_token_hash_valid" CHECK ("guest_sessions"."token_hash" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "guest_expiry_valid" CHECK ("guest_sessions"."expires_at" > "guest_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "route_layout_identity" UNIQUE("id","layout_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "layout_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"state" "layout_state" DEFAULT 'draft' NOT NULL,
	"approval_note" text,
	"published_at" timestamp with time zone,
	CONSTRAINT "layout_event_identity" UNIQUE("id","event_id"),
	CONSTRAINT "layout_event_version" UNIQUE("event_id","version"),
	CONSTRAINT "layout_revision_positive" CHECK ("layout_versions"."version" > 0 AND "layout_versions"."revision" > 0),
	CONSTRAINT "published_layout_timestamp" CHECK ("layout_versions"."state" <> 'published' OR "layout_versions"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"state" "reservation_state" DEFAULT 'reserved' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "reservations_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "reservation_layout_identity" UNIQUE("id","layout_id","event_id"),
	CONSTRAINT "reservation_release_valid" CHECK (("reservations"."state" = 'reserved' AND "reservations"."released_at" IS NULL) OR ("reservations"."state" = 'released' AND "reservations"."released_at" IS NOT NULL AND "reservations"."released_at" >= "reservations"."reserved_at"))
);
--> statement-breakpoint
CREATE TABLE "slot_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"slot_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone,
	CONSTRAINT "reservation_slot_unique" UNIQUE("reservation_id","slot_id"),
	CONSTRAINT "claim_release_valid" CHECK ("slot_claims"."released_at" IS NULL OR "slot_claims"."released_at" >= "slot_claims"."reserved_at")
);
--> statement-breakpoint
CREATE TABLE "slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"layout_id" uuid NOT NULL,
	"approved_stretch_id" uuid NOT NULL,
	"code" varchar(40) NOT NULL,
	"display_order" integer NOT NULL,
	"start_mm" integer NOT NULL,
	"end_mm" integer NOT NULL,
	"base_frontage_mm" integer NOT NULL,
	"base_depth_mm" integer NOT NULL,
	"frontage_override_mm" integer,
	"depth_override_mm" integer,
	"base_price_idr" bigint NOT NULL,
	"price_override_idr" bigint,
	"footprint" geometry(Polygon,4326) NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_reason" text,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "slot_layout_identity" UNIQUE("id","layout_id","event_id"),
	CONSTRAINT "slot_code_per_layout" UNIQUE("layout_id","code"),
	CONSTRAINT "slot_dimensions_valid" CHECK ("slots"."base_frontage_mm" > 0 AND "slots"."base_depth_mm" > 0 AND ("slots"."frontage_override_mm" IS NULL OR "slots"."frontage_override_mm" > 0) AND ("slots"."depth_override_mm" IS NULL OR "slots"."depth_override_mm" > 0)),
	CONSTRAINT "slot_interval_matches_frontage" CHECK ("slots"."start_mm" >= 0 AND "slots"."end_mm" - "slots"."start_mm" = COALESCE("slots"."frontage_override_mm", "slots"."base_frontage_mm")),
	CONSTRAINT "slot_prices_valid" CHECK ("slots"."base_price_idr" BETWEEN 1 AND 1000000000000 AND ("slots"."price_override_idr" IS NULL OR "slots"."price_override_idr" BETWEEN 1 AND 1000000000000)),
	CONSTRAINT "slot_block_reason_valid" CHECK (("slots"."is_blocked" AND length(trim("slots"."blocked_reason")) > 0 AND "slots"."blocked_reason" IS NOT NULL) OR (NOT "slots"."is_blocked" AND "slots"."blocked_reason" IS NULL)),
	CONSTRAINT "slot_revision_positive" CHECK ("slots"."revision" > 0),
	CONSTRAINT "slot_geometry_valid" CHECK (ST_IsValid("slots"."footprint") AND NOT ST_IsEmpty("slots"."footprint") AND ST_Area("slots"."footprint"::geography) > 0)
);
--> statement-breakpoint
ALTER TABLE "approved_stretches" ADD CONSTRAINT "approved_stretches_row_id_layout_id_event_id_booth_rows_id_layout_id_event_id_fk" FOREIGN KEY ("row_id","layout_id","event_id") REFERENCES "public"."booth_rows"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_layout_id_event_id_orders_id_layout_id_event_id_fk" FOREIGN KEY ("order_id","layout_id","event_id") REFERENCES "public"."orders"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_slot_id_layout_id_event_id_slots_id_layout_id_event_id_fk" FOREIGN KEY ("slot_id","layout_id","event_id") REFERENCES "public"."slots"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_session_id_guest_sessions_id_fk" FOREIGN KEY ("guest_session_id") REFERENCES "public"."guest_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_layout_id_event_id_layout_versions_id_event_id_fk" FOREIGN KEY ("layout_id","event_id") REFERENCES "public"."layout_versions"("id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booth_rows" ADD CONSTRAINT "booth_rows_route_id_layout_id_event_id_routes_id_layout_id_event_id_fk" FOREIGN KEY ("route_id","layout_id","event_id") REFERENCES "public"."routes"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_row_id_layout_id_event_id_booth_rows_id_layout_id_event_id_fk" FOREIGN KEY ("row_id","layout_id","event_id") REFERENCES "public"."booth_rows"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_layout_id_event_id_layout_versions_id_event_id_fk" FOREIGN KEY ("layout_id","event_id") REFERENCES "public"."layout_versions"("id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layout_versions" ADD CONSTRAINT "layout_versions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_order_id_layout_id_event_id_orders_id_layout_id_event_id_fk" FOREIGN KEY ("order_id","layout_id","event_id") REFERENCES "public"."orders"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_reservation_id_layout_id_event_id_reservations_id_layout_id_event_id_fk" FOREIGN KEY ("reservation_id","layout_id","event_id") REFERENCES "public"."reservations"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_claims" ADD CONSTRAINT "slot_claims_slot_id_layout_id_event_id_slots_id_layout_id_event_id_fk" FOREIGN KEY ("slot_id","layout_id","event_id") REFERENCES "public"."slots"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slots" ADD CONSTRAINT "slots_approved_stretch_id_layout_id_event_id_approved_stretches_id_layout_id_event_id_fk" FOREIGN KEY ("approved_stretch_id","layout_id","event_id") REFERENCES "public"."approved_stretches"("id","layout_id","event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stretch_footprint_gist" ON "approved_stretches" USING gist ("footprint");--> statement-breakpoint
CREATE INDEX "row_centerline_gist" ON "booth_rows" USING gist ("centerline");--> statement-breakpoint
CREATE INDEX "exclusion_footprint_gist" ON "exclusions" USING gist ("footprint");--> statement-breakpoint
CREATE UNIQUE INDEX "one_published_layout_per_event" ON "layout_versions" USING btree ("event_id") WHERE "layout_versions"."state" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_claim_per_slot" ON "slot_claims" USING btree ("slot_id") WHERE "slot_claims"."released_at" IS NULL;--> statement-breakpoint
CREATE INDEX "slot_footprint_gist" ON "slots" USING gist ("footprint");