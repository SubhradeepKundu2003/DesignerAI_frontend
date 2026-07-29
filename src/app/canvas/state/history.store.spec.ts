import { TestBed } from '@angular/core/testing';

import { Command } from '../models/commands.model';
import { HISTORY_LIMIT } from '../models/editor-config';
import { HistoryStore } from './history.store';

/** A command that records what was asked of it, and nothing else. */
function fakeCommand(label: string, mergeWith?: (next: Command) => boolean): Command {
  return { label, execute: () => undefined, undo: () => undefined, mergeWith };
}

describe('HistoryStore', () => {
  let history: HistoryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    history = TestBed.inject(HistoryStore);
  });

  it('should start with nothing to undo or redo', () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undoLabel()).toBeNull();
  });

  it('should expose the newest command as the undo label', () => {
    history.record(fakeCommand('Add Rectangle 1'));
    history.record(fakeCommand('Move element'));

    expect(history.undoLabel()).toBe('Move element');
    expect(history.depth()).toBe(2);
  });

  it('should move commands between the stacks', () => {
    const command = fakeCommand('Move element');
    history.record(command);

    expect(history.takeUndo()).toBe(command);
    expect(history.canUndo()).toBe(false);
    expect(history.redoLabel()).toBe('Move element');

    expect(history.takeRedo()).toBe(command);
    expect(history.canRedo()).toBe(false);
    expect(history.undoLabel()).toBe('Move element');
  });

  it('should return nothing when a stack is empty', () => {
    expect(history.takeUndo()).toBeUndefined();
    expect(history.takeRedo()).toBeUndefined();
  });

  it('should discard the redo branch once a new command is recorded', () => {
    history.record(fakeCommand('First'));
    history.takeUndo();
    expect(history.canRedo()).toBe(true);

    history.record(fakeCommand('Second'));

    expect(history.canRedo()).toBe(false);
    expect(history.undoLabel()).toBe('Second');
  });

  it('should let the previous command absorb the next one', () => {
    const absorbed: Command[] = [];
    history.record(fakeCommand('Change fill', (next) => (absorbed.push(next), true)));

    const follower = fakeCommand('Change fill');
    expect(history.record(follower)).toBe(false);

    expect(absorbed).toEqual([follower]);
    expect(history.depth()).toBe(1);
  });

  it('should keep both commands when the merge is declined', () => {
    history.record(fakeCommand('Change fill', () => false));

    expect(history.record(fakeCommand('Change fill'))).toBe(true);
    expect(history.depth()).toBe(2);
  });

  it('should cap the undo stack, dropping the oldest entries', () => {
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      history.record(fakeCommand(`Step ${index}`));
    }

    expect(history.depth()).toBe(HISTORY_LIMIT);
    expect(history.undoLabel()).toBe(`Step ${HISTORY_LIMIT + 4}`);
  });

  it('should clear both stacks', () => {
    history.record(fakeCommand('First'));
    history.takeUndo();

    history.clear();

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });
});
