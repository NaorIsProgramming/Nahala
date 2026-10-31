CREATE TABLE "growers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "growers_name_check" CHECK (char_length("growers"."name") between 1 and 200 and "growers"."name" = btrim("growers"."name") and "growers"."name" !~ '[[:cntrl:]]')
);
--> statement-breakpoint
CREATE TABLE "package_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tare_grams" integer NOT NULL,
	"counts_in_grower_inventory" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_types_name_check" CHECK (char_length("package_types"."name") between 1 and 200 and "package_types"."name" = btrim("package_types"."name") and "package_types"."name" !~ '[[:cntrl:]]'),
	CONSTRAINT "package_types_tare_grams_check" CHECK ("package_types"."tare_grams" >= 0 and "package_types"."tare_grams" <= 100000)
);
--> statement-breakpoint
CREATE TABLE "pallet_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tare_grams" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pallet_types_name_check" CHECK (char_length("pallet_types"."name") between 1 and 200 and "pallet_types"."name" = btrim("pallet_types"."name") and "pallet_types"."name" !~ '[[:cntrl:]]'),
	CONSTRAINT "pallet_types_tare_grams_check" CHECK ("pallet_types"."tare_grams" >= 0 and "pallet_types"."tare_grams" <= 100000)
);
--> statement-breakpoint
CREATE TABLE "yield_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "yield_types_name_check" CHECK (char_length("yield_types"."name") between 1 and 200 and "yield_types"."name" = btrim("yield_types"."name") and "yield_types"."name" !~ '[[:cntrl:]]')
);
--> statement-breakpoint
CREATE TABLE "access_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"access" text NOT NULL,
	"grower_id" uuid,
	"kind" text,
	"reference_table" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_grants_scope_check" CHECK ("access_grants"."scope" in ('global', 'palletSets', 'reference')),
	CONSTRAINT "access_grants_access_check" CHECK ("access_grants"."access" in ('read', 'write')),
	CONSTRAINT "access_grants_kind_check" CHECK ("access_grants"."kind" is null or "access_grants"."kind" in ('A', 'B', 'C')),
	CONSTRAINT "access_grants_reference_table_check" CHECK ("access_grants"."reference_table" is null or "access_grants"."reference_table" in ('growers', 'yield_types', 'package_types', 'pallet_types')),
	CONSTRAINT "access_grants_shape_check" CHECK ((
        ("access_grants"."scope" = 'global' and "access_grants"."grower_id" is null and "access_grants"."kind" is null and "access_grants"."reference_table" is null)
        or ("access_grants"."scope" = 'reference' and "access_grants"."access" = 'write' and "access_grants"."reference_table" is not null and "access_grants"."grower_id" is null and "access_grants"."kind" is null)
        or ("access_grants"."scope" = 'palletSets' and "access_grants"."reference_table" is null)
      ))
);
--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_grower_id_growers_id_fk" FOREIGN KEY ("grower_id") REFERENCES "public"."growers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "growers_active_name_uidx" ON "growers" USING btree ("name") WHERE "growers"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "package_types_active_name_uidx" ON "package_types" USING btree ("name") WHERE "package_types"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "pallet_types_active_name_uidx" ON "pallet_types" USING btree ("name") WHERE "pallet_types"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "yield_types_active_name_uidx" ON "yield_types" USING btree ("name") WHERE "yield_types"."is_active" = true;--> statement-breakpoint
CREATE INDEX "access_grants_user_id_idx" ON "access_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "access_grants_grower_id_idx" ON "access_grants" USING btree ("grower_id");--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_one_global_write_uidx" ON "access_grants" USING btree ("user_id") WHERE "access_grants"."scope" = 'global' and "access_grants"."access" = 'write';--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_one_global_read_uidx" ON "access_grants" USING btree ("user_id") WHERE "access_grants"."scope" = 'global' and "access_grants"."access" = 'read';--> statement-breakpoint
CREATE UNIQUE INDEX "access_grants_one_reference_uidx" ON "access_grants" USING btree ("user_id","reference_table") WHERE "access_grants"."scope" = 'reference';