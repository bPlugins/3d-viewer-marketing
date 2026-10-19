// gallery-lane: measures the free lane between the controls stack and the fullscreen button so the
// gallery strip stays on the bottom row (css/gallery-lane.css does the layout from these edges).
import { useLayoutEffect } from '../../core/ui.js';

const EDGE = 10; // overlay inset, the same as the stack and the fullscreen button
const CLEAR = 12; // space between the strip and its neighbours
const MIN_ROW = 4 * 32 + 3 * 6; // four 32px thumbs, 6px gaps
const COL_THUMB = 36;
const COL_HEIGHT = 4 * COL_THUMB + 3 * 6;

/** Sets --wc3d-lane-left/-right/-bottom and data-wc3d-gallery="row|column|none" on the stage. */
export function useGalleryLane(row, on, deps = []) {
	useLayoutEffect(() => {
		const stage = row?.parentElement;
		if (!on || !stage) return;
		const stack = stage.querySelector(':scope > .wc3d-controls-stack');
		const measure = () => {
			const fs = stage.querySelector(':scope > .wc3d-overlay-btn');
			const w = stage.clientWidth;
			const h = stage.clientHeight;
			const left = stack ? stack.offsetLeft + stack.offsetWidth + CLEAR : EDGE;
			const right = fs ? w - fs.offsetLeft + CLEAR : EDGE;
			const bottom = fs ? h - fs.offsetTop + 6 : EDGE;
			const mode = w - left - right >= MIN_ROW ? 'row' : w - left >= COL_THUMB + EDGE && h - bottom - EDGE >= COL_HEIGHT ? 'column' : 'none';
			stage.style.setProperty('--wc3d-lane-left', left + 'px');
			stage.style.setProperty('--wc3d-lane-right', right + 'px');
			stage.style.setProperty('--wc3d-lane-bottom', bottom + 'px');
			stage.dataset.wc3dGallery = mode;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(stage);
		if (stack) ro.observe(stack);
		return () => {
			ro.disconnect();
			delete stage.dataset.wc3dGallery;
			['left', 'right', 'bottom'].forEach((k) => stage.style.removeProperty('--wc3d-lane-' + k));
		};
	}, [row, on, ...deps]);
}
