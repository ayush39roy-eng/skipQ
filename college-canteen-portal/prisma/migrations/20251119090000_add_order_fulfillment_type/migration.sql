-- Add fulfillmentType column to Order table
ALTER TABLE "Order" ADD COLUMN "fulfillmentType" TEXT NOT NULL DEFAULT 'TAKEAWAY';
