import {
  PromptNotFoundError,
  PromptVersionNotFoundError,
} from '@pvs/prompts-domain';
import { eq } from 'drizzle-orm';
import { db, pool } from './client';
import { PromptsRepository } from './prompts.repository';
import { prompts, promptVersions } from './schema';

/**
 * Integration test against the real Neon database (DATABASE_URL). Runs
 * against a disposable, uniquely-keyed fixture prompt so it never touches
 * real data, and hard-deletes that fixture (versions first, then the
 * prompt) in `afterAll`, verifying the cleanup actually took.
 */
describe('PromptsRepository', () => {
  const repository = new PromptsRepository(db);
  const promptKey = `test-prompt-${Date.now()}`;

  afterAll(async () => {
    const [promptRow] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.promptKey, promptKey))
      .limit(1);

    if (promptRow) {
      // Clear the production pointer first: prompt_versions rows can't be
      // deleted while a prompts row still references one via FK.
      await db
        .update(prompts)
        .set({ productionVersionId: null })
        .where(eq(prompts.id, promptRow.id));
      await db
        .delete(promptVersions)
        .where(eq(promptVersions.promptId, promptRow.id));
      await db.delete(prompts).where(eq(prompts.id, promptRow.id));
    }

    const [remaining] = await db
      .select()
      .from(prompts)
      .where(eq(prompts.promptKey, promptKey))
      .limit(1);
    expect(remaining).toBeUndefined();

    await pool.end();
  });

  it('creates a prompt with version 1 tagged production', async () => {
    const created = await repository.create({
      promptKey,
      name: 'Test Prompt',
      content: 'v1 content',
    });

    expect(created.promptKey).toBe(promptKey);
    expect(created.productionVersion?.version).toBe(1);
    expect(created.productionVersion?.content).toBe('v1 content');
  });

  it('appends a new immutable version without moving production', async () => {
    const version2 = await repository.createVersion({
      promptKey,
      content: 'v2 content',
    });
    expect(version2.version).toBe(2);

    const production = await repository.getVersion(promptKey, 'production');
    expect(production.version).toBe(1);
    expect(production.content).toBe('v1 content');

    const versions = await repository.listVersions(promptKey);
    expect(versions.map((v) => v.version).sort()).toEqual([1, 2]);
  });

  it('never mutates an existing version row', async () => {
    const before = await repository.getVersion(promptKey, 1);
    await repository.createVersion({ promptKey, content: 'v3 content' });
    const after = await repository.getVersion(promptKey, 1);

    expect(after.content).toBe(before.content);
    expect(after.id).toBe(before.id);
  });

  it('repoints production to a different immutable version', async () => {
    const updated = await repository.setProductionVersion(promptKey, 2);
    expect(updated.productionVersion?.version).toBe(2);

    const production = await repository.getVersion(promptKey, 'production');
    expect(production.content).toBe('v2 content');
  });

  it('throws PromptNotFoundError for an unknown prompt key', async () => {
    await expect(
      repository.getVersion('does-not-exist', 'production')
    ).rejects.toBeInstanceOf(PromptNotFoundError);
  });

  it('throws PromptVersionNotFoundError for an out-of-range version', async () => {
    await expect(
      repository.getVersion(promptKey, 999)
    ).rejects.toBeInstanceOf(PromptVersionNotFoundError);
  });
});
