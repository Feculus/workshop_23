import {
  CreatePromptInput,
  CreatePromptVersionInput,
  DuplicatePromptKeyError,
  Prompt,
  PromptNotFoundError,
  PromptVersion,
  PromptVersionNotFoundError,
  PromptVersionSelector,
  PromptWithProductionVersion,
} from '@pvs/prompts-domain';
import { and, desc, eq, max } from 'drizzle-orm';
import { Database } from './client';
import { prompts, promptVersions } from './schema';

type PromptRow = typeof prompts.$inferSelect;
type PromptVersionRow = typeof promptVersions.$inferSelect;

function toPrompt(row: PromptRow): Prompt {
  return {
    id: String(row.id),
    promptKey: row.promptKey,
    name: row.name,
    description: row.description,
    productionVersionId:
      row.productionVersionId === null ? null : String(row.productionVersionId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPromptVersion(row: PromptVersionRow): PromptVersion {
  return {
    id: String(row.id),
    promptId: String(row.promptId),
    version: row.version,
    content: row.content,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

/**
 * Data-access layer for the prompt versioning domain. `prompt_versions`
 * rows are only ever inserted, never updated or deleted — every write path
 * below that touches an existing version row is limited to reading it.
 */
export class PromptsRepository {
  constructor(private readonly db: Database) {}

  private async findPromptRowByKey(
    promptKey: string
  ): Promise<PromptRow | undefined> {
    const [row] = await this.db
      .select()
      .from(prompts)
      .where(eq(prompts.promptKey, promptKey))
      .limit(1);
    return row;
  }

  async findByKey(
    promptKey: string
  ): Promise<PromptWithProductionVersion | null> {
    const promptRow = await this.findPromptRowByKey(promptKey);
    if (!promptRow) return null;

    let productionVersion: PromptVersion | null = null;
    if (promptRow.productionVersionId !== null) {
      const [versionRow] = await this.db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.id, promptRow.productionVersionId))
        .limit(1);
      productionVersion = versionRow ? toPromptVersion(versionRow) : null;
    }

    return { ...toPrompt(promptRow), productionVersion };
  }

  async listVersions(promptKey: string): Promise<PromptVersion[]> {
    const promptRow = await this.findPromptRowByKey(promptKey);
    if (!promptRow) throw new PromptNotFoundError(promptKey);

    const rows = await this.db
      .select()
      .from(promptVersions)
      .where(eq(promptVersions.promptId, promptRow.id))
      .orderBy(desc(promptVersions.version));

    return rows.map(toPromptVersion);
  }

  /**
   * Resolves a version by explicit number, or by the "production" tag,
   * which follows the prompt's current `productionVersionId` pointer.
   */
  async getVersion(
    promptKey: string,
    selector: PromptVersionSelector
  ): Promise<PromptVersion> {
    const promptRow = await this.findPromptRowByKey(promptKey);
    if (!promptRow) throw new PromptNotFoundError(promptKey);

    if (selector === 'production') {
      if (promptRow.productionVersionId === null) {
        throw new PromptVersionNotFoundError(promptKey, 'production');
      }
      const [row] = await this.db
        .select()
        .from(promptVersions)
        .where(eq(promptVersions.id, promptRow.productionVersionId))
        .limit(1);
      if (!row) throw new PromptVersionNotFoundError(promptKey, 'production');
      return toPromptVersion(row);
    }

    const [row] = await this.db
      .select()
      .from(promptVersions)
      .where(
        and(
          eq(promptVersions.promptId, promptRow.id),
          eq(promptVersions.version, selector)
        )
      )
      .limit(1);
    if (!row) throw new PromptVersionNotFoundError(promptKey, selector);
    return toPromptVersion(row);
  }

  /**
   * Creates a brand-new prompt with its first immutable version (version 1)
   * and immediately tags that version as production, since it is the only
   * version that exists.
   */
  async create(input: CreatePromptInput): Promise<PromptWithProductionVersion> {
    const existing = await this.findPromptRowByKey(input.promptKey);
    if (existing) throw new DuplicatePromptKeyError(input.promptKey);

    return this.db.transaction(async (tx) => {
      const [promptRow] = await tx
        .insert(prompts)
        .values({
          promptKey: input.promptKey,
          name: input.name,
          description: input.description ?? null,
        })
        .returning();

      const [versionRow] = await tx
        .insert(promptVersions)
        .values({
          promptId: promptRow.id,
          version: 1,
          content: input.content,
          metadata: input.metadata ?? null,
        })
        .returning();

      const [updatedPromptRow] = await tx
        .update(prompts)
        .set({ productionVersionId: versionRow.id, updatedAt: new Date() })
        .where(eq(prompts.id, promptRow.id))
        .returning();

      return {
        ...toPrompt(updatedPromptRow),
        productionVersion: toPromptVersion(versionRow),
      };
    });
  }

  /**
   * "Editing" a prompt: appends a new immutable version. Never touches an
   * existing `prompt_versions` row and never moves the production pointer.
   */
  async createVersion(
    input: CreatePromptVersionInput
  ): Promise<PromptVersion> {
    return this.db.transaction(async (tx) => {
      const [promptRow] = await tx
        .select()
        .from(prompts)
        .where(eq(prompts.promptKey, input.promptKey))
        .limit(1);
      if (!promptRow) throw new PromptNotFoundError(input.promptKey);

      const [{ latest }] = await tx
        .select({ latest: max(promptVersions.version) })
        .from(promptVersions)
        .where(eq(promptVersions.promptId, promptRow.id));

      const nextVersion = (latest ?? 0) + 1;

      const [versionRow] = await tx
        .insert(promptVersions)
        .values({
          promptId: promptRow.id,
          version: nextVersion,
          content: input.content,
          metadata: input.metadata ?? null,
        })
        .returning();

      return toPromptVersion(versionRow);
    });
  }

  /**
   * Repoints the production pointer at an existing, already-immutable
   * version. Never inserts, updates, or deletes a `prompt_versions` row.
   */
  async setProductionVersion(
    promptKey: string,
    version: number
  ): Promise<PromptWithProductionVersion> {
    return this.db.transaction(async (tx) => {
      const [promptRow] = await tx
        .select()
        .from(prompts)
        .where(eq(prompts.promptKey, promptKey))
        .limit(1);
      if (!promptRow) throw new PromptNotFoundError(promptKey);

      const [versionRow] = await tx
        .select()
        .from(promptVersions)
        .where(
          and(
            eq(promptVersions.promptId, promptRow.id),
            eq(promptVersions.version, version)
          )
        )
        .limit(1);
      if (!versionRow) throw new PromptVersionNotFoundError(promptKey, version);

      const [updatedPromptRow] = await tx
        .update(prompts)
        .set({ productionVersionId: versionRow.id, updatedAt: new Date() })
        .where(eq(prompts.id, promptRow.id))
        .returning();

      return {
        ...toPrompt(updatedPromptRow),
        productionVersion: toPromptVersion(versionRow),
      };
    });
  }
}
