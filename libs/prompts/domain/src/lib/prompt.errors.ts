export class PromptNotFoundError extends Error {
  constructor(promptKey: string) {
    super(`Prompt "${promptKey}" was not found`);
    this.name = 'PromptNotFoundError';
  }
}

export class PromptVersionNotFoundError extends Error {
  constructor(promptKey: string, version: number | 'production') {
    super(
      version === 'production'
        ? `Prompt "${promptKey}" has no production version tagged`
        : `Prompt "${promptKey}" has no version ${version}`
    );
    this.name = 'PromptVersionNotFoundError';
  }
}

export class DuplicatePromptKeyError extends Error {
  constructor(promptKey: string) {
    super(`Prompt key "${promptKey}" already exists`);
    this.name = 'DuplicatePromptKeyError';
  }
}
