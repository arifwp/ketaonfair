ALTER TABLE "orders" ALTER COLUMN "business_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "selling_description" varchar(200);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "note" varchar(1000) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "order_customer_description_valid" CHECK (("orders"."selling_description" IS NOT NULL AND length(trim("orders"."selling_description")) > 0) OR ("orders"."business_name" IS NOT NULL AND length(trim("orders"."business_name")) > 0));