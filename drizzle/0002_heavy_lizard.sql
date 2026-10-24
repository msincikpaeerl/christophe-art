CREATE TABLE "admin_recovery_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_recovery_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "admin_accounts" ADD COLUMN "totp_secret" text;--> statement-breakpoint
ALTER TABLE "admin_accounts" ADD COLUMN "totp_pending_secret" text;--> statement-breakpoint
ALTER TABLE "admin_accounts" ADD COLUMN "totp_last_step" integer;--> statement-breakpoint
ALTER TABLE "admin_accounts" ADD COLUMN "totp_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_accounts" ADD COLUMN "totp_locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_recovery_codes" ADD CONSTRAINT "admin_recovery_codes_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_recovery_codes_account_idx" ON "admin_recovery_codes" USING btree ("account_id","code_hash");