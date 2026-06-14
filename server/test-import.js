import { PrismaClient } from '@prisma/client';
import { confirmImport } from './src/services/import.service.js';

const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.user.deleteMany({ where: { email: 'test_import_user@example.com' } });
    await prisma.group.deleteMany({ where: { name: 'Test Group' } });

    // 1. Create a fake group
    const user = await prisma.user.create({
      data: { name: 'Piyush', email: 'test_import_user@example.com', passwordHash: 'hash' }
    });
    const group = await prisma.group.create({
      data: { name: 'Test Group', creator: { connect: { id: user.id } } }
    });
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id }
    });

    // 2. Dummy rows based on the user's data
    const rows = [
      {
        id: 1,
        userDecision: 'Approve',
        parsed: {
          description: 'Wifi bill Feb',
          amount: 1199,
          currency: 'INR',
          date: new Date().toISOString(),
          paidBy: 'Rohan',
          splitType: 'equal',
          splitWith: ['Rohan', 'Aisha', 'Priya', 'Dev'],
          splitDetails: {},
          notes: ''
        }
      },
      {
        id: 2,
        userDecision: 'Import as Settlement',
        suggestedAction: 'Import as Settlement',
        parsed: {
          description: 'Rohan paid Aisha back',
          amount: 1000,
          currency: 'INR',
          date: new Date().toISOString(),
          paidBy: 'Rohan',
          splitType: '',
          splitWith: ['Aisha'],
          splitDetails: {},
          notes: ''
        }
      },
      {
        id: 3,
        userDecision: 'Approve',
        parsed: {
          description: 'Scooter rentals',
          amount: 3000,
          currency: 'INR',
          date: new Date().toISOString(),
          paidBy: 'Meera',
          splitType: 'share',
          splitWith: ['Aisha', 'Rohan', 'Priya', 'Dev'],
          splitDetails: { 'Aisha': 1, 'Rohan': 2, 'Priya': 1, 'Dev': 2 },
          notes: ''
        }
      }
    ];

    console.log('Running confirmImport...');
    const result = await confirmImport(group.id, rows, 83);
    console.log('Success:', result);
  } catch (err) {
    console.error('Error during confirmImport:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
