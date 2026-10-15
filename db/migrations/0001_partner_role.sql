ALTER TYPE "public"."admin_role" ADD VALUE 'PARTNER';--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "partner_code" text;