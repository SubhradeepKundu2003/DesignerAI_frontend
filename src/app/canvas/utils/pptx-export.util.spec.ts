import JSZip from 'jszip';

import {
  frameElement,
  iconElement,
  pageFixture,
  shapeElement,
  textElement,
} from '../../../testing/canvas-fixtures';
import { buildPptx } from './pptx-export.util';

async function slideXml(blob: Blob, index = 1): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const entry = zip.file(`ppt/slides/slide${index}.xml`);
  if (!entry) {
    throw new Error(`ppt/slides/slide${index}.xml is missing from the exported .pptx`);
  }
  return entry.async('string');
}

describe('buildPptx', () => {
  it('should reject an empty page list', async () => {
    await expect(buildPptx([])).rejects.toThrow('No pages');
  });

  it('should emit one slide per page', async () => {
    const blob = await buildPptx([pageFixture(), pageFixture()]);

    const zip = await JSZip.loadAsync(blob);
    expect(zip.file('ppt/slides/slide1.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide2.xml')).not.toBeNull();
    expect(zip.file('ppt/slides/slide3.xml')).toBeNull();
  });

  it("should flatten a frame: emit its children but no shape for the frame's own box", async () => {
    const child = shapeElement({ id: 'child-1', parentId: 'frame-1' });
    const frame = frameElement({ id: 'frame-1', childIds: ['child-1'] });

    const blob = await buildPptx([pageFixture({ elements: [frame, child] })]);
    const xml = await slideXml(blob);

    expect(xml.match(/<p:sp>/g)).toHaveLength(1);
  });

  it('should skip elements marked not visible', async () => {
    const blob = await buildPptx([pageFixture({ elements: [shapeElement({ visible: false })] })]);

    const xml = await slideXml(blob);

    expect(xml).not.toContain('<p:sp>');
  });

  it('should rasterize an icon to an image rather than skip it', async () => {
    const blob = await buildPptx([pageFixture({ elements: [iconElement()] })]);

    const xml = await slideXml(blob);

    expect(xml).toContain('<p:pic>');
  });

  it('should carry the text content of a text element into the slide', async () => {
    const blob = await buildPptx([pageFixture({ elements: [textElement({ text: 'Hello export' })] })]);

    const xml = await slideXml(blob);

    expect(xml).toContain('Hello export');
  });
});
