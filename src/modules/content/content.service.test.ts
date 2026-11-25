import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '../../utils/AppError.js';
import { contentRepository } from './content.repository.js';
import { createContent, getContentById, listContent } from './content.service.js';

vi.mock('./content.repository.js', () => ({
  contentRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    count: vi.fn(),
  },
}));

type StoredContent = Awaited<ReturnType<typeof contentRepository.findById>>;

const makeDoc = (): StoredContent =>
  ({
    _id: '507f1f77bcf86cd799439011',
    title: 'A title',
    body: 'Some body',
    tags: ['guide'],
    createdBy: '507f1f77bcf86cd799439012',
    createdAt: new Date('2026-11-25T10:00:00Z'),
    updatedAt: new Date('2026-11-25T10:00:00Z'),
  }) as unknown as StoredContent;

describe('content service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets createdBy from the authenticated user', async () => {
    vi.mocked(contentRepository.create).mockResolvedValue(makeDoc());

    const result = await createContent(
      { title: 'A title', body: 'Some body', tags: ['guide'] },
      '507f1f77bcf86cd799439012',
    );

    expect(contentRepository.create).toHaveBeenCalledWith({
      title: 'A title',
      body: 'Some body',
      tags: ['guide'],
      createdBy: '507f1f77bcf86cd799439012',
    });
    expect(result.id).toBe('507f1f77bcf86cd799439011');
  });

  it('builds tag/text filters and bounded pagination metadata', async () => {
    vi.mocked(contentRepository.find).mockResolvedValue([makeDoc()]);
    vi.mocked(contentRepository.count).mockResolvedValue(25);

    const result = await listContent({ tag: 'guide', q: 'body', page: 2, limit: 10 });

    expect(contentRepository.find).toHaveBeenCalledWith(
      { tags: 'guide', $text: { $search: 'body' } },
      10,
      10,
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(result.data).toHaveLength(1);
  });

  it('throws 404 for an unknown id', async () => {
    vi.mocked(contentRepository.findById).mockResolvedValue(null);
    await expect(getContentById('507f1f77bcf86cd799439011')).rejects.toBeInstanceOf(NotFoundError);
  });
});
