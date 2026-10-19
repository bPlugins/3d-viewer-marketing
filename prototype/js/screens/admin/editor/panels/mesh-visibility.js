// Port of components/MeshVisibilityEditor: selected mesh/group header, frontend flags,
// colour and texture overrides for every selected mesh.
import { html } from '../../../../core/ui.js';
import { editor, useEditor } from '../editor-store.js';
import { ColorField, EmptyState, FieldRow, FIELD_LABEL_CLASS, HELP_CLASS, LINK_MUTED_CLASS, ToggleRow } from '../../../../shared/editor-ui.js';
import { CursorIcon, FolderIcon, MeshNodeIcon } from '../../../../shared/icons.js';
import { useMediaPicker } from './alt-model.js';

const ROW_CLASS = 'py-2 border-b border-[color:var(--wc3d-ui-rule)]';
const STATUS_CLASS = {
	on: 'text-[color:var(--wc3d-ui-on-text)]',
	off: 'text-[color:var(--wc3d-ui-desc)]',
	mixed: 'text-[color:var(--wc3d-ui-warn-fg)]',
};

function commonValue(meshes, get) {
	if (!meshes.length) return undefined;
	const first = get(meshes[0]);
	for (let i = 1; i < meshes.length; i++) if (get(meshes[i]) !== first) return undefined;
	return first;
}

const meshesOf = (node) => (node.children || []).flatMap((c) => (c.mesh ? [c.mesh, ...meshesOf(c)] : meshesOf(c)));
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

/** {name, isGroup} for the selection: a tree group whose meshes match it, else the mesh itself. */
export function describeSelection(names, hierarchy) {
	if (!names?.length) return null;
	const walk = (nodes) => {
		for (const n of nodes || []) {
			if (!n.mesh && n.children) {
				if (sameSet(meshesOf(n), names)) return n;
				const hit = walk(n.children);
				if (hit) return hit;
			}
		}
		return null;
	};
	const group = names.length > 1 ? walk(hierarchy) : null;
	if (group) return { name: group.name, isGroup: true };
	if (names.length === 1) return { name: names[0], isGroup: false };
	return { name: names.join(', '), isGroup: true };
}

export default function MeshVisibilityPanel() {
	const meshes = useEditor((s) => s.selection) || [];
	const target = useEditor((s) => s.target);
	const viewer = useEditor((s) => s.viewer);
	const info = useEditor((s) => s.modelInfo);
	const selName = useEditor((s) => s.selectionName);
	const selIsGroup = useEditor((s) => s.selectionIsGroup);
	const cfg = useEditor(() => editor.raw()) || {};
	const isVariation = target !== 'default' && target != null;

	const texturePicker = useMediaPicker({
		title: 'Choose a texture image',
		button: 'Use this image',
		filter: 'image',
		onSelect: (att) => att?.url && editor.patchMeshes(meshes, { texture: { attachment_id: att.id, url: att.url } }),
	});

	if (!meshes.length && selIsGroup) return html`<${EmptyGroup} />`;
	if (!meshes.length) {
		return html`<${EmptyState} icon=${html`<${CursorIcon} size=${18} />`} title="Select a mesh or group from the tree to edit its appearance." />`;
	}

	const hierarchy = info?.hierarchy || viewer?.getHierarchy?.() || [];
	const selection = selName ? { name: selName, isGroup: !!selIsGroup } : describeSelection(meshes, hierarchy);
	const m = (name) => cfg.meshes?.[name] || {};

	const visibleCommon = commonValue(meshes, (n) => m(n).visible !== false);
	const colorCommon = commonValue(meshes, (n) => m(n).color ?? '');
	const textureCommon = commonValue(meshes, (n) => m(n).texture?.url ?? '');
	const customizableCommon = commonValue(meshes, (n) => m(n).customizable === true);
	const optionalCommon = commonValue(meshes, (n) => m(n).optional === true);
	const isMixed = (common) => common === undefined && meshes.length > 1;

	const renderToggle = (flag, label, common, onLabel, offLabel) => {
		const state = common === undefined ? 'mixed' : common ? 'on' : 'off';
		const text = { on: onLabel, off: offLabel, mixed: 'Mixed' }[state];
		return html`<${ToggleRow}
			class=${ROW_CLASS}
			label=${label}
			checked=${common === true}
			indeterminate=${common === undefined}
			onChange=${(checked) => editor.patchMeshes(meshes, { [flag]: checked })}
			status=${html`<span class=${`text-[12px] font-medium min-w-[44px] ${STATUS_CLASS[state]}`}>${text}</span>`}
		/>`;
	};

	const colorStatus = colorCommon
		? html`<button type="button" onClick=${() => editor.patchMeshes(meshes, { color: undefined })} class=${LINK_MUTED_CLASS}>clear</button>`
		: isMixed(colorCommon)
			? html`<span class="text-[12px] text-[color:var(--wc3d-ui-warn-fg)]">mixed</span>`
			: html`<span class="text-[12px] text-[color:var(--wc3d-ui-desc)]">none</span>`;

	const texturePreview = textureCommon
		? html`<img src=${textureCommon} alt="" class="block w-full max-h-[110px] object-cover rounded-lg border border-[color:var(--wc3d-ui-border)]" />`
		: isMixed(textureCommon)
			? html`<${EmptyState} variant="slot" tone="warning" title="Mixed textures across selection." />`
			: html`<${EmptyState} variant="slot" title="No texture override." />`;

	return html`
		<div class="flex items-center gap-2.5 px-4 pt-4 pb-3">
			<span class="wc3d-icon-tile wc3d-icon-tile-brand" aria-hidden="true">
				${selection.isGroup ? html`<${FolderIcon} size=${15} />` : html`<${MeshNodeIcon} size=${15} />`}
			</span>
			<div class="flex-1 min-w-0">
				<div class="flex items-center gap-2 text-[11.5px] leading-tight text-[color:var(--wc3d-ui-desc)]">
					<span>Selected mesh</span>
					${isVariation && html`<span class="ms-auto font-mono text-[11px]">#${target}</span>`}
				</div>
				<div class="flex items-center gap-2 mt-0.5">
					<h3 class="flex-1 min-w-0 m-0 text-[14px] leading-snug font-semibold text-[color:var(--wc3d-ui-title)] truncate" title=${selection.name}>${selection.name}</h3>
					${selection.isGroup && html`<span class="wc3d-badge flex-shrink-0">${meshes.length === 1 ? '1 mesh' : `${meshes.length} meshes`}</span>`}
				</div>
			</div>
		</div>

		<div class="px-4 pb-3">
			${renderToggle('visible', 'Visible', visibleCommon, 'Shown', 'Hidden')}
			${renderToggle('optional', 'Toggleable on Frontend', optionalCommon, 'Yes', 'No')}
			${renderToggle('customizable', 'Customizable on Frontend', customizableCommon, 'Yes', 'No')}

			<${FieldRow} label="Color override" class=${ROW_CLASS}>
				<${ColorField} label="Color override" value=${colorCommon ?? ''} onChange=${(hex) => editor.patchMeshes(meshes, { color: hex })} showHexInput=${false}>
					${colorStatus}
				<//>
			<//>

			<div class="flex flex-col gap-2 py-2.5">
				<div class="flex items-center justify-between gap-3">
					<span class=${FIELD_LABEL_CLASS}>Texture (image)</span>
					<div class="flex items-center gap-1.5">
						<button type="button" onClick=${texturePicker.open} class="wc3d-btn wc3d-btn-sm wc3d-btn-soft">${textureCommon ? 'Replace' : 'Choose…'}</button>
						${textureCommon &&
						html`<button type="button" onClick=${() => editor.patchMeshes(meshes, { texture: undefined })} class="wc3d-btn wc3d-btn-sm wc3d-btn-muted">Clear</button>`}
					</div>
				</div>
				${texturePreview}
			</div>
		</div>
		${texturePicker.modal}
	`;
}

// Kept for parity with the source: an empty group renders this instead of the controls.
export const EmptyGroup = () => html`<div class=${`px-5 py-6 text-center ${HELP_CLASS}`}>This group has no meshes.</div>`;
