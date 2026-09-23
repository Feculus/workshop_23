/**
 * Domain model for the prompt versioning service.
 *
 * A `Prompt` is a stable identity (`promptKey`) that owns an append-only
 * sequence of immutable `PromptVersion` rows. Editing a prompt never
 * mutates an existing version — it always creates a new one. "Production"
 * is just a pointer (`productionVersionId`) onto one of those immutable
 * versions, so promoting/demoting production never rewrites content.
 */

export interface Prompt {
  id: string;
  promptKey: string;
  name: string;
  description: string | null;
  productionVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PromptWithProductionVersion extends Prompt {
  productionVersion: PromptVersion | null;
}

export interface CreatePromptInput {
  promptKey: string;
  name: string;
  description?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePromptVersionInput {
  promptKey: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Resolves which version of a prompt to fetch.
 * `"production"` resolves to whatever version is currently pointed at by
 * `productionVersionId` — never a hardcoded version number.
 */
export type PromptVersionSelector = number | 'production';
