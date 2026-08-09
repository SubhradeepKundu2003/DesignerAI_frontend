import { firstValueFrom } from 'rxjs';

import { DEFAULT_THEME } from '../data/design-themes';
import { PAGE_MARGIN } from '../models/editor-config';
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

  it('resolves with elements sized and positioned inside the page margins', async () => {
    const result = await firstValueFrom(client.generate(request));

    expect(result.elements.length).toBeGreaterThan(0);
    for (const element of result.elements) {
      expect(element.x).toBeGreaterThanOrEqual(PAGE_MARGIN);
      expect(element.x + element.width).toBeLessThanOrEqual(request.page.width - PAGE_MARGIN + 1);
      expect(element.y).toBeGreaterThanOrEqual(PAGE_MARGIN);
    }
  });

  it('mentions the prompt in the summary', async () => {
    const result = await firstValueFrom(client.generate(request));

    expect(result.summary).toContain('a bold summer sale flyer');
  });

  it('gives every generated element a unique id', async () => {
    const result = await firstValueFrom(client.generate(request));

    const ids = new Set(result.elements.map((element) => element.id));
    expect(ids.size).toBe(result.elements.length);
  });

  it('resolves theme colour refs against the request theme', async () => {
    const result = await firstValueFrom(client.generate(request));

    const heading = result.elements.find((element) => element.name === 'Heading');
    expect(heading?.type).toBe('text');
    if (heading?.type === 'text') {
      expect(heading.fill).toBe(DEFAULT_THEME.colors.ink);
      expect(heading.fillRef).toBe('ink');
    }
  });

  it('falls back to a generic headline for an empty prompt', async () => {
    const result = await firstValueFrom(client.generate({ ...request, prompt: '   ' }));

    const heading = result.elements.find((element) => element.name === 'Heading');
    expect(heading?.type).toBe('text');
    if (heading?.type === 'text') {
      expect(heading.text).toBe('New design');
    }
  });
});
