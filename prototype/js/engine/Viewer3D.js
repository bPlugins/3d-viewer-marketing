// Preact wrapper around createViewer(): mounts once, re-applies props on change, disposes on unmount.
import { html, useRef, useEffect, cx } from '../core/ui.js';
import { createViewer } from './viewer.js';

const same = (a, b) => a === b || JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const modelKey = (m) => (m ? m.demo || m.url || '' : '');

/**
 * <Viewer3D config model custom interactive editor selection outline autoRotate background loadDelay
 *           onReady(controller, info) onSelect({mesh, additive, point}) onProgress(pct) onError(err) onCamera(controller)
 *           class style>children (overlays)</Viewer3D>
 */
export function Viewer3D(props) {
	const {
		config,
		model,
		custom,
		interactive = true,
		editor = false,
		selection,
		outline = true,
		autoRotate,
		background,
		loadDelay,
		class: cls,
		className,
		style,
		children,
	} = props;
	const host = useRef(null);
	const ctl = useRef(null);
	const last = useRef({});
	const cbs = useRef(props);
	cbs.current = props;

	useEffect(() => {
		const v = createViewer(host.current, { config, custom, interactive, editor, background, loadDelay });
		ctl.current = v;
		last.current = { config, custom };
		const offs = [
			v.on('ready', (info) => cbs.current.onReady?.(v, info)),
			v.on('select', (e) => cbs.current.onSelect?.(e)),
			v.on('progress', (p) => cbs.current.onProgress?.(p)),
			v.on('error', (e) => cbs.current.onError?.(e)),
			v.on('camera', () => cbs.current.onCamera?.(v)),
		];
		if (model) v.setModel(model);
		last.current.model = modelKey(model);
		if (selection) v.setSelection(selection);
		v.setOutline(outline);
		if (autoRotate) v.setAutoRotate(true);
		return () => {
			offs.forEach((off) => off());
			v.dispose();
			ctl.current = null;
		};
	}, []);

	useEffect(() => {
		const v = ctl.current;
		if (!v || same(config, last.current.config)) return;
		last.current.config = config;
		v.setConfig(config);
	}, [config]);

	useEffect(() => {
		const v = ctl.current;
		if (!v || same(custom, last.current.custom)) return;
		last.current.custom = custom;
		v.setCustom(custom);
	}, [custom]);

	useEffect(() => {
		const v = ctl.current;
		const key = modelKey(model);
		if (!v || key === last.current.model) return;
		last.current.model = key;
		v.setModel(model);
	}, [modelKey(model)]);

	useEffect(() => {
		ctl.current?.setSelection(selection || []);
	}, [JSON.stringify(selection || [])]);

	useEffect(() => {
		ctl.current?.setOutline(outline);
	}, [outline]);

	useEffect(() => {
		if (autoRotate !== undefined) ctl.current?.setAutoRotate(!!autoRotate);
	}, [autoRotate]);

	return html`
		<div class=${cx('wc3d-viewer3d', cls, className)} style=${typeof style === 'string' ? 'position:relative;overflow:hidden;' + style : { position: 'relative', overflow: 'hidden', ...(style || {}) }}>
			<div ref=${host} style="position:absolute;inset:0;"></div>
			${children}
		</div>
	`;
}

export default Viewer3D;
