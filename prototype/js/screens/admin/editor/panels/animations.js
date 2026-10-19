// Port of components/AnimationEditor: autoplay clip, loop, speed. The viewport plays the
// effective `animations` config, so every change previews live.
import { html } from '../../../../core/ui.js';
import { editor, useEditor } from '../editor-store.js';
import { CLIP_DURATIONS } from '../../../../engine/demo-models.js';
import { DIVIDER_CLASS, EmptyState, LABEL_CLASS, LINK_DANGER_CLASS, SELECT_CLASS, SliderRow, ToggleRow, formatMultiplier, useId } from '../../../../shared/editor-ui.js';
import { PresetsManager } from './presets.js';

const DIVIDED_ROW = `pt-3 ${DIVIDER_CLASS}`;
const patchAnim = (patch) => editor.patch('animations', patch);

/** scene_schema.animations[] equivalent: [{name, duration?}] from the loaded model. */
export function clipList(info, viewer) {
	if (Array.isArray(info?.clips) && info.clips.length) return info.clips;
	const live = viewer?.getAnimations?.();
	if (live?.length) return live;
	return (info?.animations || []).map((name) => (typeof name === 'string' ? { name, duration: CLIP_DURATIONS[name] } : name));
}

export default function AnimationsPanel() {
	const info = useEditor((s) => s.modelInfo);
	const viewer = useEditor((s) => s.viewer);
	const target = useEditor((s) => s.target);
	const animations = useEditor(() => editor.raw()?.animations);
	const selectId = useId();
	const isVariation = target !== 'default' && target != null;

	const isOverridden = isVariation && animations !== undefined && animations !== null;
	const autoplay = animations?.autoplay ?? '';
	const loop = animations?.loop !== false;
	const speed = animations?.speed ?? 1;
	const clips = clipList(info, viewer);

	if (!clips.length) {
		return html`<div class="px-4 py-3"><${EmptyState} variant="dashed" title="No animations found in this model." /></div>`;
	}

	return html`<div class="px-4 py-3">
		<div class="space-y-3">
			<div>
				<label for=${selectId} class=${LABEL_CLASS}>Autoplay Clip</label>
				<div class="flex items-center gap-3">
					<select id=${selectId} value=${autoplay} onChange=${(e) => patchAnim(e.currentTarget.value ? { autoplay: e.currentTarget.value } : null)} class=${`${SELECT_CLASS} flex-1 min-w-0`}>
						<option value="">None (Static)</option>
						${clips.map((c) => html`<option key=${c.name} value=${c.name}>${c.duration ? `${c.name} (${Number(c.duration).toFixed(1)}s)` : c.name}</option>`)}
					</select>
					${isOverridden &&
					html`<button type="button" onClick=${() => patchAnim(null)} class=${`${LINK_DANGER_CLASS} flex-shrink-0`} title="Clear variant override">Reset</button>`}
				</div>
			</div>

			${autoplay &&
			html`
				<${ToggleRow} label="Loop playback" class=${DIVIDED_ROW} checked=${loop} onChange=${(c) => patchAnim({ loop: c })} />
				<${SliderRow} label="Playback Speed" value=${speed} onChange=${(v) => patchAnim({ speed: v })} min=${0.1} max=${3} step=${0.1} format=${formatMultiplier} class=${DIVIDED_ROW} />
			`}
		</div>

		<${PresetsManager} type="animation" getData=${() => (autoplay ? { autoplay, loop, speed } : null)} onApply=${(data) => data && patchAnim(data)} />
	</div>`;
}
