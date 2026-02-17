-- CreateEnum
CREATE TYPE "ImageUploader" AS ENUM ('OWNER', 'GUEST');

-- AlterEnum
ALTER TYPE "NotificationEvent" ADD VALUE 'GALLERY_INVITE';

-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "uploadedBy" "ImageUploader" NOT NULL DEFAULT 'OWNER';

-- CreateIndex
CREATE INDEX "GalleryImage_bookingId_idx" ON "GalleryImage"("bookingId");

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
