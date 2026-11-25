import type { FilterQuery, HydratedDocument } from 'mongoose';
import { NotFoundError } from '../../utils/AppError.js';
import type { Content } from './content.model.js';
import { contentRepository } from './content.repository.js';
import type { CreateContentInput, ListContentInput } from './content.schema.js';

export interface ContentDto {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const toDto = (doc: HydratedDocument<Content>): ContentDto => ({
  id: String(doc._id),
  title: doc.title,
  body: doc.body,
  tags: doc.tags,
  createdBy: String(doc.createdBy),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function createContent(
  input: CreateContentInput,
  userId: string,
): Promise<ContentDto> {
  const doc = await contentRepository.create({ ...input, createdBy: userId });
  return toDto(doc);
}

export async function getContentById(id: string): Promise<ContentDto> {
  const doc = await contentRepository.findById(id);
  if (!doc) throw new NotFoundError('Content not found');
  return toDto(doc);
}

export async function listContent(input: ListContentInput): Promise<Page<ContentDto>> {
  const filter: FilterQuery<Content> = {};
  if (input.tag) filter.tags = input.tag;
  if (input.q) filter.$text = { $search: input.q };

  const skip = (input.page - 1) * input.limit;
  const [docs, total] = await Promise.all([
    contentRepository.find(filter, skip, input.limit),
    contentRepository.count(filter),
  ]);

  return {
    data: docs.map(toDto),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}
