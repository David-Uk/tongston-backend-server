import { model, Schema, type InferSchemaType } from 'mongoose';

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'user', required: true },
    tokenBalance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

// One safe shape for every response: id instead of _id, no internals, no password.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    const plain = ret as Record<string, unknown>;
    plain.id = String(plain._id);
    delete plain._id;
    delete plain.passwordHash;
    return plain;
  },
});

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model<User>('User', userSchema);
