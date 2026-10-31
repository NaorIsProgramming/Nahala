ALTER TABLE "package_types" ALTER COLUMN "tare_grams" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "package_types" ADD COLUMN "net_weight_grams" integer;--> statement-breakpoint
ALTER TABLE "package_types" ADD COLUMN "recommended_package_amount" integer;--> statement-breakpoint
ALTER TABLE "package_types" ADD CONSTRAINT "package_types_net_weight_grams_check" CHECK ("package_types"."net_weight_grams" >= 0 and "package_types"."net_weight_grams" <= 100000);--> statement-breakpoint
ALTER TABLE "package_types" ADD CONSTRAINT "package_types_recommended_package_amount_check" CHECK ("package_types"."recommended_package_amount" >= 1 and "package_types"."recommended_package_amount" <= 10000);