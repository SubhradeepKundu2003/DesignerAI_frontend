import { TestBed } from '@angular/core/testing';

import { groupElement, shapeElement, textElement } from '../../../testing/canvas-fixtures';
import { Page } from '../models/canvas-document.model';
import { PAGE_SIZE } from '../models/editor-config';
import { CanvasStore } from './canvas.store';

describe('CanvasStore', () => {
  let store: CanvasStore;

  const ids = () => store.elements().map((element) => element.id);

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(CanvasStore);
  });

  it('should open with one empty A4 page', () => {
    expect(store.document().version).toBe(1);
    expect(store.activePage().width).toBe(PAGE_SIZE.width);
    expect(store.activePage().height).toBe(PAGE_SIZE.height);
    expect(store.elements()).toEqual([]);
  });

  it('should add elements on top of the stack by default', () => {
    const first = shapeElement();
    const second = textElement();

    store.insertElement(first);
    store.insertElement(second);

    expect(ids()).toEqual([first.id, second.id]);
  });

  it('should insert at a given index, since the index is the z-order', () => {
    const bottom = shapeElement();
    const top = shapeElement();
    store.insertElement(bottom);
    store.insertElement(top);

    const middle = textElement();
    store.insertElement(middle, 1);

    expect(ids()).toEqual([bottom.id, middle.id, top.id]);
  });

  it('should patch type-specific properties without touching the rest', () => {
    const element = textElement({ text: 'Before', fontSize: 16 });
    store.insertElement(element);

    store.patchElement(element.id, { text: 'After' });

    const patched = store.elementById(element.id);
    expect(patched).toMatchObject({ text: 'After', fontSize: 16, x: element.x });
  });

  it('should publish a new document on every change, so views can diff by reference', () => {
    const element = shapeElement();
    store.insertElement(element);
    const before = store.document();

    store.patchElement(element.id, { x: 99 });

    expect(store.document()).not.toBe(before);
    expect(before.pages[0].elements[0].x).toBe(element.x);
  });

  it('should leave the document untouched when a change hits nothing', () => {
    const before = store.document();

    store.patchElement('missing', { x: 1 });
    store.removeElement('missing');
    store.moveElement('missing', 0);

    expect(store.document()).toBe(before);
  });

  it('should reorder elements for bring-forward and send-backward', () => {
    const bottom = shapeElement();
    const middle = shapeElement();
    const top = shapeElement();
    [bottom, middle, top].forEach((element) => store.insertElement(element));

    store.moveElement(bottom.id, 2);

    expect(ids()).toEqual([middle.id, top.id, bottom.id]);
    expect(store.indexOf(bottom.id)).toBe(2);
  });

  it('should clamp a reorder to the ends of the stack', () => {
    const first = shapeElement();
    const second = shapeElement();
    store.insertElement(first);
    store.insertElement(second);

    store.moveElement(second.id, 99);
    expect(ids()).toEqual([first.id, second.id]);

    store.moveElement(second.id, -5);
    expect(ids()).toEqual([second.id, first.id]);
  });

  it('should remove elements', () => {
    const kept = shapeElement();
    const removed = shapeElement();
    store.insertElement(kept);
    store.insertElement(removed);

    store.removeElement(removed.id);

    expect(ids()).toEqual([kept.id]);
    expect(store.elementById(removed.id)).toBeUndefined();
  });

  describe('pages', () => {
    it('should add a page and switch to it', () => {
      const firstPageId = store.activePage().id;

      store.insertPage({ id: 'page-2', name: 'Page 2', width: 794, height: 1123, background: '#fff', elements: [], groups: [] });
      store.setActivePage('page-2');

      expect(store.pageCount()).toBe(2);
      expect(store.activePage().id).toBe('page-2');
      expect(store.activePageIndex()).toBe(1);

      store.setActivePage(firstPageId);
      expect(store.activePage().id).toBe(firstPageId);
    });

    it('should scope elements to the page they were inserted on', () => {
      const firstPageId = store.activePage().id;
      store.insertPage({ id: 'page-2', name: 'Page 2', width: 794, height: 1123, background: '#fff', elements: [], groups: [] });

      const onFirstPage = shapeElement();
      store.insertElement(onFirstPage);

      store.setActivePage('page-2');
      expect(store.elements()).toEqual([]);

      const onSecondPage = shapeElement();
      store.insertElement(onSecondPage);
      expect(store.elements()).toEqual([onSecondPage]);

      store.setActivePage(firstPageId);
      expect(store.elements()).toEqual([onFirstPage]);
    });

    it('should keep element mutators correct after switching pages, for undo', () => {
      const firstPageId = store.activePage().id;
      const element = shapeElement();
      store.insertElement(element);

      store.insertPage({ id: 'page-2', name: 'Page 2', width: 794, height: 1123, background: '#fff', elements: [], groups: [] });
      store.setActivePage('page-2');

      // Simulates an undo firing while a different page is now active: the
      // mutator must still find the element on its own page, not silently
      // no-op against the (now active) empty page.
      store.patchElement(element.id, { x: 500 });
      expect(store.elementById(element.id)?.x).toBe(500);

      store.removeElement(element.id);
      expect(store.elementById(element.id)).toBeUndefined();

      store.setActivePage(firstPageId);
      expect(store.elements()).toEqual([]);
    });

    it('should refuse to remove the last page', () => {
      store.removePage(store.activePage().id);
      expect(store.pageCount()).toBe(1);
    });

    it('should fall back to a neighbouring page when the active page is removed', () => {
      const firstPageId = store.activePage().id;
      store.insertPage({ id: 'page-2', name: 'Page 2', width: 794, height: 1123, background: '#fff', elements: [], groups: [] });
      store.setActivePage('page-2');

      store.removePage('page-2');

      expect(store.pageCount()).toBe(1);
      expect(store.activePage().id).toBe(firstPageId);
    });

    it('should keep the active page identity stable when a page before it is reordered or removed', () => {
      store.insertPage({ id: 'page-2', name: 'Page 2', width: 794, height: 1123, background: '#fff', elements: [], groups: [] });
      store.insertPage({ id: 'page-3', name: 'Page 3', width: 794, height: 1123, background: '#fff', elements: [], groups: [] });
      store.setActivePage('page-3');

      store.movePage('page-2', 2);
      expect(store.activePage().id).toBe('page-3');

      store.removePage('page-2');
      expect(store.activePage().id).toBe('page-3');
      expect(store.pageCount()).toBe(2);
    });
  });

  describe('groups', () => {
    it('should read groups as empty on a document saved before groups existed', () => {
      // Simulates an old document loaded from storage: no `groups` array at all.
      const legacyPage: Partial<Page> = { ...store.activePage() };
      delete legacyPage.groups;
      store.replaceDocument({ version: 1, pages: [legacyPage as Page] });

      expect(store.groups()).toEqual([]);
    });

    it('should gather members into a contiguous run and tag them with parentId', () => {
      const a = shapeElement({ name: 'A' });
      const b = shapeElement({ name: 'B' });
      const c = shapeElement({ name: 'C' });
      store.insertElement(a);
      store.insertElement(b);
      store.insertElement(c);

      const group = groupElement({ id: 'g1', childIds: [a.id, c.id] });
      store.groupElements(group, [a.id, c.id]);

      expect(ids()).toEqual([b.id, a.id, c.id]);
      expect(store.elementById(a.id)?.parentId).toBe('g1');
      expect(store.elementById(c.id)?.parentId).toBe('g1');
      expect(store.elementById(b.id)?.parentId).toBeUndefined();
      expect(store.groupById('g1')).toEqual(group);
    });

    it('should resolve a grouped element up to its group, and a top-level element to itself', () => {
      const a = shapeElement();
      const loose = shapeElement();
      store.insertElement(a);
      store.insertElement(loose);
      store.groupElements(groupElement({ id: 'g1', childIds: [a.id] }), [a.id]);

      expect(store.topLevelIdOf(a.id)).toBe('g1');
      expect(store.topLevelIdOf(loose.id)).toBe(loose.id);
    });

    it('should recompute a group box when a member is patched', () => {
      const a = shapeElement({ x: 0, y: 0, width: 50, height: 50 });
      const b = shapeElement({ x: 100, y: 100, width: 50, height: 50 });
      store.insertElement(a);
      store.insertElement(b);
      store.groupElements(groupElement({ id: 'g1', childIds: [a.id, b.id] }), [a.id, b.id]);

      store.patchElement(a.id, { x: -50, y: -50 });

      expect(store.groupById('g1')).toMatchObject({ x: -50, y: -50, width: 200, height: 200 });
    });

    it('should remove a group record and stop finding it', () => {
      const a = shapeElement();
      store.insertElement(a);
      store.groupElements(groupElement({ id: 'g1', childIds: [a.id] }), [a.id]);

      store.removeGroup('g1');

      expect(store.groupById('g1')).toBeUndefined();
    });

    it('should patch a group in place', () => {
      const a = shapeElement();
      store.insertElement(a);
      store.groupElements(groupElement({ id: 'g1', name: 'Group 1', childIds: [a.id] }), [a.id]);

      store.patchGroup('g1', { name: 'Renamed', locked: true });

      expect(store.groupById('g1')).toMatchObject({ name: 'Renamed', locked: true });
    });
  });
});
