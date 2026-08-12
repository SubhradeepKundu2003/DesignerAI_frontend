import { CanvasElement, GroupElement } from '../models/canvas-element.model';
import { DesignTheme } from '../models/design-theme.model';
import { InfographicTemplate } from '../models/infographic-template.model';
import { computeBoundingBox } from './geometry.util';
import { generateId } from './id.util';

export interface TemplatePlacement {
  readonly elements: readonly CanvasElement[];
  readonly group?: GroupElement;
}

/**
 * Builds a template's elements at `origin` (optionally with a generation-time
 * `content` override, see `InfographicTemplate.build`), grouped into one
 * {@link GroupElement} when it has more than one part.
 *
 * Shared by the Assets panel's manual "place template" flow
 * (`assets-panel.ts`) and the document-generation `NewsletterAssembler`, so a
 * generated infographic moves/deletes/duplicates as one unit exactly like a
 * manually-placed one does — and so the design linter's group-aware overlap
 * check (`DesignLintService`) can treat it as a single placed block rather
 * than N independently-colliding parts.
 */
export function buildTemplatePlacement(
  template: InfographicTemplate,
  origin: { x: number; y: number },
  content?: unknown,
  theme?: DesignTheme,
): TemplatePlacement {
  const built = template.build(origin, content, theme);
  if (built.length < 2) {
    return { elements: built };
  }

  const groupId = generateId('group');
  const elements = built.map((element) => ({ ...element, parentId: groupId }));
  const group: GroupElement = {
    id: groupId,
    type: 'group',
    name: template.label,
    ...computeBoundingBox(elements),
    locked: false,
    visible: true,
    childIds: elements.map((element) => element.id),
  };
  return { elements, group };
}
