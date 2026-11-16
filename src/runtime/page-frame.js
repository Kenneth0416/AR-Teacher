import { PAGE_ASPECT } from '../pages.js';

/**
 * The page coordinate frame, identical in AR (MindAR anchor) and preview:
 *   origin = centre of the printed page, page width = 1 unit, height = PAGE_ASPECT (1.294),
 *   +X = right, +Y = towards the top of the page, +Z = out of the paper towards the viewer.
 * Spec bboxes are normalised [x0, y0, x1, y1] measured from the TOP-LEFT of the page image
 * (y downwards), as written by the page-understanding step in content/pages/*.json.
 */
export function createPageFrame() {
  const width = 1;
  const height = PAGE_ASPECT;
  /** Normalised image coords (u right, v down, 0..1) -> page units {x, y}. */
  const uvToXY = (u, v) => ({ x: (u - 0.5) * width, y: (0.5 - v) * height });
  /** bbox [x0,y0,x1,y1] (normalised, top-left origin) -> rect in page units. */
  const bboxToRect = (bbox) => {
    const [x0, y0, x1, y1] = Array.isArray(bbox) ? bbox : [bbox.x, bbox.y, bbox.x + bbox.w, bbox.y + bbox.h];
    const a = uvToXY(Math.min(x0, x1), Math.min(y0, y1));
    const b = uvToXY(Math.max(x0, x1), Math.max(y0, y1));
    return {
      x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      width: b.x - a.x, height: a.y - b.y,
      left: a.x, right: b.x, top: a.y, bottom: b.y,
    };
  };
  return Object.freeze({ width, height, uvToXY, bboxToRect });
}
