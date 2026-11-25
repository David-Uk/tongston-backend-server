import { model, Schema, type InferSchemaType } from 'mongoose';

const contentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true },
    tags: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  },
  { timestamps: true },
);

// Text search on title+body, multikey on tags, and a stable createdAt sort.
contentSchema.index({ title: 'text', body: 'text' });
contentSchema.index({ tags: 1, createdAt: -1, _id: -1 });
contentSchema.index({ createdAt: -1, _id: -1 });

contentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    const plain = ret as Record<string, unknown>;
    plain.id = String(plain._id);
    delete plain._id;
    return plain;
  },
});

export type Content = InferSchemaType<typeof contentSchema>;
export const ContentModel = model<Content>('Content', contentSchema, 'content_items');
