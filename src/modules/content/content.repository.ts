import { Types, type FilterQuery, type HydratedDocument } from 'mongoose';
import { ContentModel, type Content } from './content.model.js';

export interface NewContent {
  title: string;
  body: string;
  tags: string[];
  createdBy: string;
}

const STABLE_SORT = { createdAt: -1, _id: -1 } as const;

/** The only module that talks to MongoDB for content. */
export const contentRepository = {
  async create(input: NewContent): Promise<HydratedDocument<Content>> {
    return ContentModel.create({
      ...input,
      createdBy: new Types.ObjectId(input.createdBy),
    });
  },

  async findById(id: string): Promise<HydratedDocument<Content> | null> {
    return ContentModel.findById(id);
  },

  async find(filter: FilterQuery<Content>, skip: number, limit: number) {
    return ContentModel.find(filter).sort(STABLE_SORT).skip(skip).limit(limit);
  },

  async count(filter: FilterQuery<Content>): Promise<number> {
    return ContentModel.countDocuments(filter);
  },
};
