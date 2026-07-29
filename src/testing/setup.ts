import { stubCanvas2dContext } from './canvas-context.stub';
import { stubPointerCapture } from './pointer-capture.stub';
import { stubResizeObserver } from './resize-observer.stub';

/**
 * Global test setup — fills the gaps between jsdom and a real browser.
 *
 * Any spec that renders the workspace, directly or through the shell, creates a
 * Konva stage and observes its host's size. jsdom offers neither a 2D canvas
 * context nor `ResizeObserver`, and neither is a behaviour under test, so both
 * are shimmed once here rather than spec by spec. Specs that need to *drive* a
 * resize install their own {@link stubResizeObserver} over this one.
 */
stubCanvas2dContext();
stubResizeObserver();
stubPointerCapture();
