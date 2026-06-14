import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';

const DEMO_USERS = [
  { name: 'Aisha', email: 'aisha@splitwise.demo' },
  { name: 'Rohan', email: 'rohan@splitwise.demo' },
  { name: 'Priya', email: 'priya@splitwise.demo' },
  { name: 'Meera', email: 'meera@splitwise.demo' },
  { name: 'Dev', email: 'dev@splitwise.demo' },
  { name: 'Sam', email: 'sam@splitwise.demo' },
  { name: 'Kabir', email: 'kabir@splitwise.demo' },
];

export async function seedDemoUsers() {
  const passwordHash = await bcrypt.hash('password123', 10);
  let created = 0;

  for (const user of DEMO_USERS) {
    const result = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: { name: user.name, email: user.email, passwordHash },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    }
  }

  console.log(`✅ Demo users ready (${DEMO_USERS.length} total, ${created} newly created).`);
}
