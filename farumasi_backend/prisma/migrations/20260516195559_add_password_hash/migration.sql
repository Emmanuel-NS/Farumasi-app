-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "supabase_id" DROP NOT NULL;
