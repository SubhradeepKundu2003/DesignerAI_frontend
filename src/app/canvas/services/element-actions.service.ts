import { Injectable, computed, inject } from '@angular/core';

import { AddGroupCommand } from '../commands/add-group.command';
import { CommandBus } from '../commands/command-bus.service';
import { CompositeCommand } from '../commands/composite.command';
import { CreateFrameCommand } from '../commands/create-frame.command';
import { DeleteElementCommand } from '../commands/delete-element.command';
import { DeleteGroupCommand } from '../commands/delete-group.command';
import { DissolveFrameCommand } from '../commands/dissolve-frame.command';
import { Duplicate, DuplicateElementCommand } from '../commands/duplicate-element.command';
import { GroupElementsCommand } from '../commands/group-elements.command';
import { ReorderElementCommand } from '../commands/reorder-element.command';
import { UngroupElementsCommand } from '../commands/ungroup-elements.command';
import { UpdateElementCommand } from '../commands/update-element.command';
import { CanvasElement, FrameElement, FrameLayout, GroupElement } from '../models/canvas-element.model';
import { Command } from '../models/commands.model';
import { ElementFactory } from './element-factory.service';
import { CanvasStore } from '../state/canvas.store';
import { SelectionStore } from '../state/selection.store';
import { computeBoundingBox } from '../utils/geometry.util';
import { generateId } from '../utils/id.util';

/**
 * Selection-driven mutations shared by the toolbar and the keyboard shortcuts.
 *
 * Both callers need the exact same "what can currently be done to the
 * selection" logic — this is the one place that owns it, so the toolbar's
 * disabled states and the keyboard's no-ops can never drift apart.
 */
@Injectable({ providedIn: 'root' })
export class ElementActions {
  private readonly canvas = inject(CanvasStore);
  private readonly selection = inject(SelectionStore);
  private readonly factory = inject(ElementFactory);
  private readonly commands = inject(CommandBus);

  readonly canDelete = this.selection.hasSelection;
  readonly canDuplicate = this.selection.hasSelection;

  readonly canBringForward = computed(() => {
    const element = this.selection.primary();
    if (!element || element.parentId || this.selection.primaryGroup()) {
      return false;
    }
    return this.canvas.indexOf(element.id) < this.canvas.elementCount() - 1;
  });

  readonly canSendBackward = computed(() => {
    const element = this.selection.primary();
    if (!element || element.parentId || this.selection.primaryGroup()) {
      return false;
    }
    return this.canvas.indexOf(element.id) > 0;
  });

  /** At least two top-level, unlocked, ungrouped elements are selected. */
  readonly canGroup = computed(() => {
    const ids = this.selection.selectedIds();
    if (ids.length < 2) {
      return false;
    }
    return ids.every((id) => {
      const element = this.canvas.elementById(id);
      return !!element && !element.parentId && !element.locked;
    });
  });

  /** At least one selected id is a group. */
  readonly canUngroup = computed(() =>
    this.selection.selectedIds().some((id) => !!this.canvas.groupById(id)),
  );

  /** At least two top-level, unlocked elements are selected, none already framed. */
  readonly canFrame = computed(() => {
    const ids = this.selection.selectedIds();
    if (ids.length < 2) {
      return false;
    }
    return ids.every((id) => {
      const element = this.canvas.elementById(id);
      return !!element && !element.parentId && !element.locked && !this.canvas.frameContaining(id);
    });
  });

  /** At least one selected id is a frame. */
  readonly canDissolveFrame = computed(() =>
    this.selection.selectedIds().some((id) => this.canvas.elementById(id)?.type === 'frame'),
  );

  /** Deletes the whole selection as one undo step — grouped selections take their group record with them. */
  deleteSelection(): void {
    const ids = this.selection.selectedIds();
    const elements = this.selection.selectedElements();
    const groups = ids
      .map((id) => this.canvas.groupById(id))
      .filter((group): group is GroupElement => !!group);

    if (elements.length === 0 && groups.length === 0) {
      return;
    }

    const parts: Command[] = [];
    if (elements.length > 0) {
      parts.push(new DeleteElementCommand(this.canvas, elements));
    }
    parts.push(...groups.map((group) => new DeleteGroupCommand(this.canvas, group)));

    this.commands.dispatch(
      parts.length === 1 ? parts[0] : new CompositeCommand(parts, `Delete ${ids.length} items`),
    );
    this.selection.clear();
    this.selection.exitGroup();
  }

  /**
   * Duplicates the whole selection and selects the copies. A selected group is
   * duplicated with its members into a fresh group of its own; loose elements
   * duplicate exactly as before.
   */
  duplicateSelection(): void {
    const ids = this.selection.selectedIds();
    const groups = new Map(
      ids
        .map((id) => [id, this.canvas.groupById(id)] as const)
        .filter((entry): entry is [string, GroupElement] => !!entry[1]),
    );

    const sourceGroupOf = new Map<string, string>();
    // The original index of each group's topmost member — every copy of that
    // group's members inserts relative to this *shared* base rather than each
    // member's own index, which is what keeps the new group's copies landing
    // as one contiguous run instead of interleaving with the originals.
    const topmostIndexOfGroup = new Map<string, number>();
    for (const [groupId, group] of groups) {
      for (const childId of group.childIds) {
        sourceGroupOf.set(childId, groupId);
      }
      topmostIndexOfGroup.set(
        groupId,
        Math.max(...group.childIds.map((childId) => this.canvas.indexOf(childId))),
      );
    }

    const looseIds = ids.filter((id) => !groups.has(id));
    const elementIds = new Set([...looseIds, ...sourceGroupOf.keys()]);
    // In canvas paint order, so the insertion-offset math below matches a
    // plain single-selection duplicate exactly (see the loop comment).
    const elements = this.canvas.elements().filter((element) => elementIds.has(element.id));
    if (elements.length === 0) {
      return;
    }

    const newGroupIdOf = new Map([...groups.keys()].map((groupId) => [groupId, generateId('group')]));

    // Each copy is inserted directly above its cluster's topmost original
    // member — its own original for a loose element, or the group's topmost
    // member for a grouped one; `i` accounts for copies already inserted
    // ahead of later ones in this same batch. `factory.duplicate` names each
    // copy from the *document's* current elements, which none of this
    // batch's other copies are part of yet, so a same-named collision within
    // the batch is resolved locally against `usedNames`.
    const usedNames = new Set<string>();
    const duplicates: Duplicate[] = elements.map((element, i) => {
      const copy = this.factory.duplicate(element);
      if (usedNames.has(copy.name)) {
        copy.name = nextFreeName(copy.name, usedNames);
      }
      usedNames.add(copy.name);

      const ownerGroupId = sourceGroupOf.get(element.id);
      copy.parentId = ownerGroupId ? newGroupIdOf.get(ownerGroupId) : undefined;
      const baseIndex = ownerGroupId
        ? topmostIndexOfGroup.get(ownerGroupId)!
        : this.canvas.indexOf(element.id);
      return { element: copy, index: baseIndex + 1 + i };
    });

    const parts: Command[] = [new DuplicateElementCommand(this.canvas, duplicates)];
    const newTopIds = duplicates.filter(({ element }) => !element.parentId).map(({ element }) => element.id);

    for (const [groupId, group] of groups) {
      const newGroupId = newGroupIdOf.get(groupId)!;
      const children = duplicates
        .filter(({ element }) => element.parentId === newGroupId)
        .map(({ element }) => element);
      parts.push(
        new AddGroupCommand(this.canvas, {
          ...group,
          id: newGroupId,
          ...computeBoundingBox(children),
          childIds: children.map((child) => child.id),
        }),
      );
      newTopIds.push(newGroupId);
    }

    this.commands.dispatch(
      parts.length === 1 ? parts[0] : new CompositeCommand(parts, `Duplicate ${ids.length} items`),
    );
    this.selection.selectMany(newTopIds);
  }

  bringForward(): void {
    const element = this.selection.primary();
    if (!element || !this.canBringForward()) {
      return;
    }

    this.commands.dispatch(new ReorderElementCommand(this.canvas, element.id, 'forward'));
  }

  sendBackward(): void {
    const element = this.selection.primary();
    if (!element || !this.canSendBackward()) {
      return;
    }

    this.commands.dispatch(new ReorderElementCommand(this.canvas, element.id, 'backward'));
  }

  /** Groups the selection into one new group and selects it. */
  groupSelection(): void {
    if (!this.canGroup()) {
      return;
    }

    const elements = this.selection
      .selectedIds()
      .map((id) => this.canvas.elementById(id))
      .filter((element): element is CanvasElement => !!element);

    const command = new GroupElementsCommand(this.canvas, elements);
    this.commands.dispatch(command);
    this.selection.select(command.groupId);
  }

  /** Dissolves every selected group and selects their (now loose) members. */
  ungroupSelection(): void {
    const groups = this.selection
      .selectedIds()
      .map((id) => this.canvas.groupById(id))
      .filter((group): group is GroupElement => !!group);
    if (groups.length === 0) {
      return;
    }

    const ungroupCommands = groups.map((group) => new UngroupElementsCommand(this.canvas, group));
    this.commands.dispatch(
      ungroupCommands.length === 1
        ? ungroupCommands[0]
        : new CompositeCommand(ungroupCommands, `Ungroup ${ungroupCommands.length} groups`),
    );
    this.selection.selectMany(ungroupCommands.flatMap((command) => [...command.childIds]));
    this.selection.exitGroup();
  }

  /** Wraps the selection in a new auto-arranging frame and selects it. */
  frameSelection(layout: FrameLayout): void {
    if (!this.canFrame()) {
      return;
    }

    const elements = this.selection
      .selectedIds()
      .map((id) => this.canvas.elementById(id))
      .filter((element): element is CanvasElement => !!element);

    const command = new CreateFrameCommand(this.canvas, elements, layout);
    this.commands.dispatch(command);
    this.selection.select(command.frameId);
  }

  /** Dissolves every selected frame and selects their (now loose) children. */
  dissolveFrameSelection(): void {
    const frames = this.selection
      .selectedIds()
      .map((id) => this.canvas.elementById(id))
      .filter((element): element is FrameElement => element?.type === 'frame');
    if (frames.length === 0) {
      return;
    }

    const dissolveCommands = frames.map((frame) => new DissolveFrameCommand(this.canvas, frame));
    this.commands.dispatch(
      dissolveCommands.length === 1
        ? dissolveCommands[0]
        : new CompositeCommand(dissolveCommands, `Dissolve ${dissolveCommands.length} frames`),
    );
    this.selection.selectMany(dissolveCommands.flatMap((command) => [...command.childIds]));
  }

  /**
   * Nudges every selected, unlocked element by the same amount.
   *
   * `mergeKey`, when given, is shared across the whole key-repeat so holding
   * an arrow down collapses into a single undo step per element.
   */
  nudgeSelection(dx: number, dy: number, mergeKey?: string): void {
    for (const element of this.selection.selectedElements()) {
      if (element.locked) {
        continue;
      }

      this.commands.dispatch(
        new UpdateElementCommand(
          this.canvas,
          element.id,
          { x: element.x + dx, y: element.y + dy },
          { label: 'Nudge element', mergeKey: mergeKey ? `${mergeKey}:${element.id}` : undefined },
        ),
      );
    }
  }
}

/** Bumps the trailing number in `name` until it is not in `used`. */
function nextFreeName(name: string, used: ReadonlySet<string>): string {
  const match = /^(.*) (\d+)$/.exec(name);
  const base = match ? match[1] : name;
  let n = match ? Number(match[2]) : 1;
  let candidate = name;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${base} ${n}`;
  }
  return candidate;
}
