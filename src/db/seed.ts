import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { loadConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { UserModel } from '../modules/auth/user.model.js';
import { connectDB, disconnectDB } from './connection.js';

// Demo credentials — development only; never seed these into production.
const demoUsers = [
  { email: 'admin@example.com', password: 'Admin@12345', role: 'admin' as const },
  { email: 'user1@example.com', password: 'User@12345', role: 'user' as const },
  { email: 'user2@example.com', password: 'User@12345', role: 'user' as const },
];

const sampleContent = [
  {
    title: 'Welcome to T-World',
    body: 'T-World lets you publish content, generate AI summaries and earn tokens for every successful run.',
    tags: ['welcome', 'platform'],
  },
  {
    title: 'How token rewards work',
    body: 'A successful AI summarization awards five tokens. Fallbacks and failures award nothing.',
    tags: ['tokens', 'guide'],
  },
  {
    title: 'From tokens to mock assets',
    body: 'Convert tokens to MOCK_USDT or MOCK_ETH, then simulate a withdrawal from the ledger.',
    tags: ['tokens', 'web3'],
  },
];

async function seed(): Promise<void> {
  const config = loadConfig();
  if (config.NODE_ENV === 'production') throw new Error('Refusing to seed demo data in production');

  await connectDB(config.MONGODB_URI, config.MONGODB_DB_NAME);
  try {
    // $setOnInsert makes re-runs safe: existing passwords and balances are untouched.
    for (const { email, password, role } of demoUsers) {
      const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
      await UserModel.updateOne(
        { email },
        { $setOnInsert: { email, passwordHash, role, tokenBalance: 0 } },
        { upsert: true },
      );
    }

    const admin = await UserModel.findOne({ email: demoUsers[0].email });
    const content = mongoose.connection.collection('content_items');
    const now = new Date();
    for (const item of sampleContent) {
      await content.updateOne(
        { title: item.title },
        { $setOnInsert: { ...item, createdBy: admin!._id, createdAt: now, updatedAt: now } },
        { upsert: true },
      );
    }

    logger.info('Seed complete: 3 users and 3 sample content items are ready');
  } finally {
    await disconnectDB();
  }
}

seed().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Seed failed');
  process.exitCode = 1;
});
