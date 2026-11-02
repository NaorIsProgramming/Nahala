CREATE TABLE "pallet_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"reference_number" integer NOT NULL,
	"grower_id" uuid NOT NULL,
	"received_on" date NOT NULL,
	"voided" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pallet_sets_id_grower_voided_key" UNIQUE("id","grower_id","voided"),
	CONSTRAINT "pallet_sets_kind_check" CHECK ("pallet_sets"."kind" in ('A', 'B', 'C')),
	CONSTRAINT "pallet_sets_reference_number_check" CHECK ("pallet_sets"."reference_number" >= 1),
	CONSTRAINT "pallet_sets_revision_check" CHECK ("pallet_sets"."revision" >= 1)
);
--> statement-breakpoint
CREATE TABLE "pallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_id" uuid NOT NULL,
	"grower_id" uuid NOT NULL,
	"voided" boolean NOT NULL,
	"pallet_number" integer NOT NULL,
	"yield_type_id" uuid NOT NULL,
	"package_type_id" uuid NOT NULL,
	"pallet_type_id" uuid NOT NULL,
	"package_amount" integer NOT NULL,
	"gross_weight_grams" integer NOT NULL,
	"package_tare_grams" integer NOT NULL,
	"pallet_tare_grams" integer NOT NULL,
	"net_weight_grams" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pallets_pallet_number_check" CHECK ("pallets"."pallet_number" >= 1),
	CONSTRAINT "pallets_package_amount_check" CHECK ("pallets"."package_amount" >= 1 and "pallets"."package_amount" <= 10000),
	CONSTRAINT "pallets_gross_weight_grams_check" CHECK ("pallets"."gross_weight_grams" >= 0 and "pallets"."gross_weight_grams" <= 100000000),
	CONSTRAINT "pallets_package_tare_grams_check" CHECK ("pallets"."package_tare_grams" >= 0 and "pallets"."package_tare_grams" <= 100000),
	CONSTRAINT "pallets_pallet_tare_grams_check" CHECK ("pallets"."pallet_tare_grams" >= 0 and "pallets"."pallet_tare_grams" <= 100000),
	CONSTRAINT "pallets_net_weight_grams_check" CHECK ("pallets"."net_weight_grams" >= 0 and (("pallets"."voided" = false and "pallets"."net_weight_grams" = "pallets"."gross_weight_grams" - "pallets"."package_tare_grams" * "pallets"."package_amount" - "pallets"."pallet_tare_grams") or ("pallets"."voided" = true and "pallets"."net_weight_grams" = greatest(0, "pallets"."gross_weight_grams" - "pallets"."package_tare_grams" * "pallets"."package_amount" - "pallets"."pallet_tare_grams"))))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"summary" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_action_check" CHECK ("audit_events"."action" in ('created', 'updated', 'voided', 'tare_changed'))
);
--> statement-breakpoint
CREATE TABLE "audit_subjects" (
	"event_id" uuid NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_subjects_pkey" PRIMARY KEY("event_id","subject_type","subject_id"),
	CONSTRAINT "audit_subjects_subject_type_check" CHECK ("audit_subjects"."subject_type" in ('pallet_set', 'pallet', 'grower', 'yield_type', 'package_type', 'pallet_type'))
);
--> statement-breakpoint
ALTER TABLE "pallet_sets" ADD CONSTRAINT "pallet_sets_grower_id_growers_id_fk" FOREIGN KEY ("grower_id") REFERENCES "public"."growers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallet_sets" ADD CONSTRAINT "pallet_sets_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallet_sets" ADD CONSTRAINT "pallet_sets_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallet_sets" ADD CONSTRAINT "pallet_sets_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_yield_type_id_yield_types_id_fk" FOREIGN KEY ("yield_type_id") REFERENCES "public"."yield_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_package_type_id_package_types_id_fk" FOREIGN KEY ("package_type_id") REFERENCES "public"."package_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_pallet_type_id_pallet_types_id_fk" FOREIGN KEY ("pallet_type_id") REFERENCES "public"."pallet_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_set_grower_voided_fk" FOREIGN KEY ("set_id","grower_id","voided") REFERENCES "public"."pallet_sets"("id","grower_id","voided") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_subjects" ADD CONSTRAINT "audit_subjects_event_id_audit_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."audit_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pallet_sets_active_reference_number_uidx" ON "pallet_sets" USING btree ("reference_number") WHERE "pallet_sets"."voided" = false;--> statement-breakpoint
CREATE INDEX "pallet_sets_active_received_on_id_idx" ON "pallet_sets" USING btree ("received_on","id") WHERE "pallet_sets"."voided" = false;--> statement-breakpoint
CREATE INDEX "pallet_sets_active_grower_received_on_idx" ON "pallet_sets" USING btree ("grower_id","received_on") WHERE "pallet_sets"."voided" = false;--> statement-breakpoint
CREATE INDEX "pallet_sets_active_kind_received_on_idx" ON "pallet_sets" USING btree ("kind","received_on") WHERE "pallet_sets"."voided" = false;--> statement-breakpoint
CREATE INDEX "pallet_sets_voided_received_on_id_idx" ON "pallet_sets" USING btree ("received_on","id") WHERE "pallet_sets"."voided" = true;--> statement-breakpoint
CREATE INDEX "pallet_sets_grower_id_idx" ON "pallet_sets" USING btree ("grower_id");--> statement-breakpoint
CREATE INDEX "pallet_sets_created_by_idx" ON "pallet_sets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "pallet_sets_updated_by_idx" ON "pallet_sets" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "pallet_sets_voided_by_idx" ON "pallet_sets" USING btree ("voided_by");--> statement-breakpoint
CREATE UNIQUE INDEX "pallets_active_grower_pallet_number_uidx" ON "pallets" USING btree ("grower_id","pallet_number") WHERE "pallets"."voided" = false;--> statement-breakpoint
CREATE INDEX "pallets_set_id_idx" ON "pallets" USING btree ("set_id");--> statement-breakpoint
CREATE INDEX "pallets_set_id_package_type_id_idx" ON "pallets" USING btree ("set_id","package_type_id");--> statement-breakpoint
CREATE INDEX "pallets_set_id_yield_type_id_idx" ON "pallets" USING btree ("set_id","yield_type_id");--> statement-breakpoint
CREATE INDEX "pallets_voided_package_type_id_idx" ON "pallets" USING btree ("package_type_id") WHERE "pallets"."voided";--> statement-breakpoint
CREATE INDEX "pallets_voided_pallet_type_id_idx" ON "pallets" USING btree ("pallet_type_id") WHERE "pallets"."voided";--> statement-breakpoint
CREATE INDEX "pallets_yield_type_id_idx" ON "pallets" USING btree ("yield_type_id");--> statement-breakpoint
CREATE INDEX "pallets_package_type_id_idx" ON "pallets" USING btree ("package_type_id");--> statement-breakpoint
CREATE INDEX "pallets_pallet_type_id_idx" ON "pallets" USING btree ("pallet_type_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_user_id_idx" ON "audit_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_subjects_subject_idx" ON "audit_subjects" USING btree ("subject_type","subject_id","event_id");