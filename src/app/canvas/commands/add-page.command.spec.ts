import { TestBed } from '@angular/core/testing';

import { groupElement, pageFixture, textElement } from '../../../testing/canvas-fixtures';
import { CanvasStore } from '../state/canvas.store';
import { AddPageCommand } from './add-page.command';

describe('AddPageCommand', () => {
  let canvas: CanvasStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    canvas = TestBed.inject(CanvasStore);
  });

  it('should insert a page carrying its own elements/groups exactly once, not doubled', () => {
    // Regression test: `generate-document-menu.ts`'s `buildInsertPagesCommand` used to
    // dispatch a separate `AddElementsCommand`/`AddGroupCommand` right after this one for
    // a page that already had those same elements/groups embedded (see
    // `NewsletterAssembler.finishPage`'s `{ ...page, elements, groups }`, the same
    // "arrives fully populated" shape `PageFactory.duplicate()` produces) -- silently
    // doubling every generated page's content in storage. `insertPage` inserts the page
    // object as-is, so nothing else should touch its elements/groups afterwards.
    const element = textElement({ id: 'el-1' });
    const group = groupElement({ id: 'group-1', childIds: ['el-1'] });
    const page = pageFixture({ id: 'page-generated', elements: [element], groups: [group] });

    new AddPageCommand(canvas, page).execute();

    const inserted = canvas.pages().find((p) => p.id === 'page-generated');
    expect(inserted?.elements.map((e) => e.id)).toEqual(['el-1']);
    expect(inserted?.groups.map((g) => g.id)).toEqual(['group-1']);
  });

  it('should remove the whole page, contents included, on undo', () => {
    const element = textElement({ id: 'el-1' });
    const page = pageFixture({ id: 'page-generated', elements: [element] });
    const command = new AddPageCommand(canvas, page);

    command.execute();
    expect(canvas.pages().some((p) => p.id === 'page-generated')).toBe(true);

    command.undo();
    expect(canvas.pages().some((p) => p.id === 'page-generated')).toBe(false);
  });
});
