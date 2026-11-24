import mongoose from 'mongoose';

export async function connectDB(uri: string, dbName: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
