import { performance } from 'node:perf_hooks';
import { Types, type FilterQuery, type HydratedDocument } from 'mongoose';
import type { Config } from '../../config/index.js';
import { withTransaction } from '../../db/transaction.js';
import {
  ProviderError,
  type AiProvider,
  type SummarizeInput,
} from '../../providers/ai/ai.provider.js';
import { ForbiddenError, NotFoundError } from '../../utils/AppError.js';
import { UserModel, type UserRole } from '../auth/user.model.js';
import type { ContentDto } from '../content/content.service.js';
import { TokenTransactionModel } from '../tokens/token-transaction.model.js';
import { AiRunModel, type AiRun } from './ai-run.model.js';
import type { ListAiRunsInput, SummarizeInputDto } from './ai.schema.js';
import { buildPrompt, PROMPT_VERSION } from './prompt.js';

type RunStatus = 'SUCCESS' | 'FALLBACK' | 'TIMEOUT' | 'FAILED';

export interface SummarizeResponse {
  output: string;
  latencyMs: number;
  tokensAwarded: number;
  totalTokenBalance: number;
  status?: RunStatus;
  reason?: string;
}

export interface AiRunDto {
  id: string;
  contentId: string;
  userId: string;
  promptVersion: string;
  status: RunStatus;
  output: string;
  latencyMs: number;
  tokensAwarded: number;
  reason?: string;
  createdAt: Date;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ProviderResult {
  text?: string;
  status: 'SUCCESS' | 'TIMEOUT' | 'FAILED';
  reason?: string;
}

function fallbackOutput(body: string): string {
  const firstLines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .slice(0, 200);
  return `Summary is temporarily unavailable. First lines of the content: ${firstLines || '(no content)'}`;
}

/** Timeout + bounded retry with backoff; timeouts are terminal to avoid long waits. */
async function callProvider(
  provider: AiProvider,
  input: SummarizeInput,
  config: Config,
): Promise<ProviderResult> {
  const attempts = config.AI_MAX_RETRIES + 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.AI_TIMEOUT_MS);
    try {
      const result = await provider.summarize(input, controller.signal);
      return { text: result.text, status: 'SUCCESS' };
    } catch (error) {
      if (controller.signal.aborted) return { status: 'TIMEOUT', reason: 'AI_TIMEOUT' };
      const transient = error instanceof ProviderError && error.transient;
      if (!transient || attempt === attempts - 1) {
        return { status: 'FAILED', reason: 'AI_FAILED' };
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: 'FAILED', reason: 'AI_FAILED' };
}

export async function summarizeContent(
  content: ContentDto,
  userId: string,
  options: SummarizeInputDto,
  provider: AiProvider,
  config: Config,
): Promise<SummarizeResponse> {
  const input: SummarizeInput = {
    title: content.title,
    body: content.body,
    tone: options.tone,
    length: options.length,
    prompt: buildPrompt({
      title: content.title,
      body: content.body,
      tone: options.tone,
      length: options.length,
    }),
  };

  const started = performance.now();
  const result = await callProvider(provider, input, config);
  const latencyMs = Math.round(performance.now() - started);

  if (result.status === 'SUCCESS' && result.text !== undefined) {
    const tokensAwarded = config.TOKENS_PER_AI_RUN;
    // Balance, ledger row and run record commit together — or none of them do.
    return withTransaction(async (session) => {
      const [run] = await AiRunModel.create(
        [
          {
            contentId: new Types.ObjectId(content.id),
            userId: new Types.ObjectId(userId),
            promptVersion: PROMPT_VERSION,
            status: 'SUCCESS',
            output: result.text!,
            latencyMs,
            tokensAwarded,
          },
        ],
        { session },
      );

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { $inc: { tokenBalance: tokensAwarded } },
        { new: true, session },
      );
      if (!user) throw new NotFoundError('User not found');

      await TokenTransactionModel.create(
        [
          {
            userId: new Types.ObjectId(userId),
            type: 'EARN',
            source: 'AI_USAGE',
            amount: tokensAwarded,
            balanceAfter: user.tokenBalance,
            referenceId: run._id,
          },
        ],
        { session },
      );

      return {
        output: result.text!,
        latencyMs,
        tokensAwarded,
        totalTokenBalance: user.tokenBalance,
      };
    });
  }

  const output = fallbackOutput(content.body);
  await AiRunModel.create([
    {
      contentId: new Types.ObjectId(content.id),
      userId: new Types.ObjectId(userId),
      promptVersion: PROMPT_VERSION,
      status: result.status,
      output,
      latencyMs,
      tokensAwarded: 0,
      reason: result.reason,
    },
  ]);
  const user = await UserModel.findById(userId).select('tokenBalance');
  return {
    output,
    latencyMs,
    tokensAwarded: 0,
    totalTokenBalance: user?.tokenBalance ?? 0,
    status: 'FALLBACK',
    reason: result.reason,
  };
}

const toDto = (doc: HydratedDocument<AiRun>): AiRunDto => ({
  id: String(doc._id),
  contentId: String(doc.contentId),
  userId: String(doc.userId),
  promptVersion: doc.promptVersion,
  status: doc.status as RunStatus,
  output: doc.output,
  latencyMs: doc.latencyMs,
  tokensAwarded: doc.tokensAwarded,
  reason: doc.reason ?? undefined,
  createdAt: doc.createdAt,
});

export async function listAiRuns(
  userId: string,
  role: UserRole,
  input: ListAiRunsInput,
): Promise<Page<AiRunDto>> {
  const filter: FilterQuery<AiRun> = {};
  if (role !== 'admin') filter.userId = new Types.ObjectId(userId);
  if (input.contentId) filter.contentId = new Types.ObjectId(input.contentId);

  const skip = (input.page - 1) * input.limit;
  const [docs, total] = await Promise.all([
    AiRunModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(input.limit),
    AiRunModel.countDocuments(filter),
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

export async function getAiRun(id: string, userId: string, role: UserRole): Promise<AiRunDto> {
  const doc = await AiRunModel.findById(id);
  if (!doc) throw new NotFoundError('AI run not found');
  if (role !== 'admin' && String(doc.userId) !== userId) throw new ForbiddenError();
  return toDto(doc);
}
