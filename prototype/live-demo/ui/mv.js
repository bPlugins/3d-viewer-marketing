// Preact wrapper around Google <model-viewer> (3D Viewer's "Lite" engine), loaded on first use.
import { html, useEffect, useRef, useState } from '../../js/core/ui.js';
import { modelSrc } from './models.js';

const MV_URL = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
let loading = null;
export function ensureModelViewer() {
	loading ||= customElements.get('model-viewer') ? Promise.resolve() : import(MV_URL);
	return loading;
}

/**
 * <ModelViewer model="fox" attrs=${{ 'camera-controls': true, 'auto-rotate': true, exposure: 1 }}
 *   style="height:400px" onLoad=${(el) => …} onReady=${(el) => …}>${hotspot buttons with slot="hotspot-…"}<//>
 * `model` is a key of MODELS or any URL. `attrs` are model-viewer attributes: true → present,
 * false/null/undefined → removed, anything else → stringified. `onReady(el)` fires once the element exists;
 * `onLoad(el)` after each model load. The element is in `ref.current` too (pass `elRef`).
 */
export function ModelViewer({ model, attrs = {}, style, class: cls, alt = '3D model', elRef, onLoad, onReady, children }) {
	const ref = useRef(null);
	const [ready, setReady] = useState(!!customElements.get('model-viewer'));
	const [src, setSrc] = useState('');

	useEffect(() => {
		let live = true;
		ensureModelViewer().then(() => live && setReady(true));
		return () => (live = false);
	}, []);

	useEffect(() => {
		let live = true;
		modelSrc(model).then((s) => live && setSrc(s));
		return () => (live = false);
	}, [model]);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (elRef) elRef.current = el;
		// Only real changes: re-setting an unchanged attribute resets state set on the element (e.g. animationName).
		for (const [k, v] of Object.entries(attrs)) {
			if (v === false || v == null) el.removeAttribute(k);
			else if (el.getAttribute(k) !== (v === true ? '' : String(v))) el.setAttribute(k, v === true ? '' : String(v));
		}
	});

	useEffect(() => {
		const el = ref.current;
		if (!el || !ready) return undefined;
		onReady?.(el);
		const f = () => onLoad?.(el);
		el.addEventListener('load', f);
		return () => el.removeEventListener('load', f);
	}, [ready]);

	return html`<model-viewer ref=${ref} class=${cls} style=${style} alt=${alt} src=${src || undefined}>${children}</model-viewer>`;
}
