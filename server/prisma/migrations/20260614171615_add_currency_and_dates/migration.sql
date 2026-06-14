/*
  Warnings:

  - You are about to drop the column `amount` on the `Expense` table. All the data in the column will be lost.
  - Added the required column `amountInInr` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "amount",
ADD COLUMN     "amountInInr" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "exchangeRate" DECIMAL(10,6),
ADD COLUMN     "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "originalAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "leftAt" TIMESTAMP(3);
