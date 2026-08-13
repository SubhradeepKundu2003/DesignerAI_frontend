import { firstValueFrom } from 'rxjs';

import { DEFAULT_THEME } from '../data/design-themes';
import { AgentGenerateRequest } from './agent-client';
import { MockAgentClient } from './mock-agent-client';

describe('MockAgentClient', () => {
  let client: MockAgentClient;
  let request: AgentGenerateRequest;

  beforeEach(() => {
    client = new MockAgentClient();
    request = {
      prompt: 'a bold summer sale flyer',
      page: { id: 'page-1', width: 794, height: 1123 },
      theme: DEFAULT_THEME,
    };
  });

  it('resolves with a heading and a body block', async () => {
    const result = await firstValueFrom(client.generate(request));

    expect(result.blocks.map((block) => block.kind)).toEqual(['heading', 'body']);
    expect(result.warnings).toEqual([]);
  });

  it('mentions the prompt in the summary', async () => {
    const result = await firstValueFrom(client.generate(request));

    expect(result.summary).toContain('a bold summer sale flyer');
  });

  it('mentions the prompt in the heading text', async () => {
    const result = await firstValueFrom(client.generate(request));

    const heading = result.blocks.find((block) => block.kind === 'heading');
    expect(heading?.text).toBe('A bold summer sale flyer');
  });

  it('falls back to a generic headline for an empty prompt', async () => {
    const result = await firstValueFrom(client.generate({ ...request, prompt: '   ' }));

    const heading = result.blocks.find((block) => block.kind === 'heading');
    expect(heading?.text).toBe('New design');
  });
});
