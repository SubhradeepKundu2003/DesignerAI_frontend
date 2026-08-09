import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import {
  AgentClient,
  AgentGenerateFromDocumentRequest,
  AgentGenerateRequest,
  AgentGenerateResult,
} from '../../../canvas/agent/agent-client';
import { DocumentGenerateResult } from '../../../canvas/agent/document-generate.model';
import { CommandBus } from '../../../canvas/commands/command-bus.service';
import { CanvasStore } from '../../../canvas/state/canvas.store';
import { pageFixture } from '../../../../testing/canvas-fixtures';
import { GenerateMenu } from './generate-menu';

class FakeAgentClient extends AgentClient {
  response: Observable<AgentGenerateResult> = of({
    summary: 'Generated a starter layout',
    elements: [],
  });
  lastRequest: AgentGenerateRequest | undefined;

  override generate(request: AgentGenerateRequest): Observable<AgentGenerateResult> {
    this.lastRequest = request;
    return this.response;
  }

  override generateFromDocument(_request: AgentGenerateFromDocumentRequest): Observable<DocumentGenerateResult> {
    return of({ pages: [] });
  }
}

describe('GenerateMenu', () => {
  let fixture: ComponentFixture<GenerateMenu>;
  let canvas: CanvasStore;
  let bus: CommandBus;
  let agentClient: FakeAgentClient;

  const trigger = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[aria-label="Generate design"]');
  const panel = (): HTMLElement | null => fixture.nativeElement.querySelector('.generate-menu__panel');
  const promptField = (): HTMLTextAreaElement => fixture.nativeElement.querySelector('.generate-menu__prompt');
  const confirmButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.generate-menu__confirm');

  const typePrompt = async (value: string) => {
    const textarea = promptField();
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    agentClient = new FakeAgentClient();

    await TestBed.configureTestingModule({
      imports: [GenerateMenu],
      providers: [{ provide: AgentClient, useValue: agentClient }],
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateMenu);
    canvas = TestBed.inject(CanvasStore);
    bus = TestBed.inject(CommandBus);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('opens the flyout from the trigger button and seeds the active page', async () => {
    expect(panel()).toBeNull();

    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
  });

  it('disables Generate until a prompt is entered', async () => {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(confirmButton().disabled).toBe(true);

    await typePrompt('a bold summer sale flyer');

    expect(confirmButton().disabled).toBe(false);
  });

  it('dispatches the generated elements as one undo step and closes the panel', async () => {
    const spy = vi.spyOn(bus, 'dispatch');

    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await typePrompt('a bold summer sale flyer');

    confirmButton().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(panel()).toBeNull();
    expect(agentClient.lastRequest?.prompt).toBe('a bold summer sale flyer');
    expect(agentClient.lastRequest?.page.id).toBe(canvas.activePage().id);
  });

  it('switches to the target page before applying the result', async () => {
    const otherPage = pageFixture({ name: 'Page 2' });
    canvas.insertPage(otherPage);
    expect(canvas.activePage().id).not.toBe(otherPage.id);

    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    const select = fixture.nativeElement.querySelector('.generate-menu__panel select') as HTMLSelectElement;
    select.value = otherPage.id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    await typePrompt('a bold summer sale flyer');
    confirmButton().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(canvas.activePage().id).toBe(otherPage.id);
  });

  it('shows an error and keeps the panel open when generation fails', async () => {
    agentClient.response = throwError(() => new Error('network down'));

    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    await typePrompt('a bold summer sale flyer');

    confirmButton().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.generate-menu__error')?.textContent).toContain(
      'Could not generate',
    );
  });
});
