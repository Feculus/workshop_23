import {
  DuplicatePromptKeyError,
  PromptNotFoundError,
  PromptVersionNotFoundError,
} from './prompt.errors';

describe('prompt domain errors', () => {
  it('formats PromptNotFoundError with the prompt key', () => {
    expect(new PromptNotFoundError('greeting').message).toContain('greeting');
  });

  it('formats PromptVersionNotFoundError for an explicit version', () => {
    expect(new PromptVersionNotFoundError('greeting', 3).message).toContain(
      'version 3'
    );
  });

  it('formats PromptVersionNotFoundError for the production tag', () => {
    expect(
      new PromptVersionNotFoundError('greeting', 'production').message
    ).toContain('production');
  });

  it('formats DuplicatePromptKeyError with the prompt key', () => {
    expect(new DuplicatePromptKeyError('greeting').message).toContain(
      'greeting'
    );
  });
});
