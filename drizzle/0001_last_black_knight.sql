CREATE TABLE "admin_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"status" text NOT NULL,
	"password_hash" text NOT NULL,
	"must_change_password" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "admin_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admin_activity" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_activity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"target" text,
	"ip" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_login_failures" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_login_failures_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"factors" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text NOT NULL,
	"ip" text NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_account_id_admin_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."admin_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_activity_at_idx" ON "admin_activity" USING btree ("at");--> statement-breakpoint
CREATE INDEX "admin_login_failures_key_idx" ON "admin_login_failures" USING btree ("kind","key","at");--> statement-breakpoint
CREATE INDEX "admin_sessions_account_idx" ON "admin_sessions" USING btree ("account_id");