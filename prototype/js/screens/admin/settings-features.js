// Settings → Features tab (ModuleSettings::render(), specs/modules.md): one card per feature module.
import { html, cx } from '../../core/ui.js';
import { FEATURES, MODULES, moduleCards } from '../../core/features.js';
import { PhpIcon } from '../../shared/icons.js';
import { WcToggle } from '../../shared/admin-ui.js';
import { DEFAULT_MAX_MB } from '../../shared/coverage.js';
import { ArConfiguredRow } from './settings-ar.js';
import { ShareLinksRows } from './settings-saved-designs.js';

// Each module's id(), title(), description(), needs_customizer() / customizer_note() in includes/Modules/*/Module.php.
const PLUGIN = {
	'conditional-logic': { title: 'Conditional logic', description: 'Show an option group, or offer a choice, only for some variations or after other picks. Hidden groups are never charged or required.', needs: true },
	'customizer-modal': { title: 'Customizer modal', description: 'Customize opens a large dialog with a bigger viewer, the options, live total and Add to cart. Off: the side drawer.', needs: true },
	'external-url': { title: 'Model from a URL', description: 'An "External URL" tab next to the Media Library wherever a model or iOS AR file is chosen: use a file hosted on a CDN after a quick check (reachable, size, CORS, file type).' },
	'materials-variants': { title: 'Material variants', description: 'Use the material sets saved in a GLB (KHR_materials_variants): pick one per product or variation, or let customers choose with a "Material variant" option group.', note: 'Letting customers choose a variant needs the customer drawer' },
	coverage: { title: 'Coverage dashboard', description: 'A Coverage tab on WooCommerce → 3D Models: see which products show 3D, what each one is missing (iOS AR file, poster, oversized model) and fix it in bulk.' },
	'option-groups': { title: 'Option groups with swatches', description: 'Build named option groups (color, material or parts) with swatches, thumbnails, buttons or a dropdown, defaults and required picks. They replace the plain mesh lists in the customizer.', needs: true },
	'option-pricing': { title: 'Option pricing', description: 'Charge extra (or give a discount) per color, part or option, as a fixed amount or a percentage. Shoppers see a live total; the cart price is recomputed from your rules.', needs: true },
	'order-snapshot': { title: 'Cart and order snapshot', description: 'A picture of the configured product replaces the product image on the cart line, checkout, order screens and emails.' },
	decals: { title: 'Text and image decals', description: 'Customers put their own text or image on an area of the model you pick, with fonts, colors, required areas and a price per area. The design shows on the cart line and the order.', needs: true },
	block: { title: 'Product viewer block', description: 'A "3D Product Viewer" block for block themes (Single Product template), pages and posts, and an Elementor widget. A viewer block in the Single Product template replaces the product\'s own placement.' },
	'saved-designs': { title: 'Share link and saved designs', description: 'Customers share a short link (with a QR code) that reopens the product with their choices, and logged-in customers keep designs under My Account → Saved designs.', needs: true },
	'undo-redo-drawer': { title: 'Undo and redo for customers', description: 'Undo and Redo buttons (and Ctrl+Z / Ctrl+Shift+Z) in the customizer, so shoppers can step back through their changes.', needs: true },
	'usdz-export': { title: 'AR of the configured product', description: 'iPhone, iPad and Android open AR with the colors, options and parts the shopper picked, and the desktop QR link carries the design. Products can opt out in the 3D editor (AR & Quick Look).' },
};
const pluginId = (id) => MODULES.find((m) => m.id === id)?.pluginId || id;
const titleOf = (id) => PLUGIN[id]?.title || MODULES.find((m) => m.id === id)?.title || id;

/** The form's starting toggles: the stored flag of every installed module. */
export function moduleDraft(flags) {
	return Object.fromEntries(MODULES.map((m) => [m.id, !!flags?.[m.id]]));
}

/** Stored ids that no installed feature knows: a removed module's decision, kept for a reinstall. */
export function removedModuleIds(flags) {
	return Object.keys(flags || {}).filter((id) => !FEATURES.some((f) => f.id === id));
}

/** Model coverage render_settings(): "Flag models over [10] MB". */
function CoverageThreshold({ draft, set }) {
	const id = 'wc3d-model-coverage-max-mb';
	const v = draft.coverage_max_model_mb ?? DEFAULT_MAX_MB;
	return html`<label for=${id}>Flag models over</label>
		<input type="number" id=${id} class="wc3d-input" min="1" max="500" step="1" style="width:80px" name="wc3d_modules[settings][model-coverage][coverage_max_model_mb]" value=${v} onInput=${(e) => set('coverage_max_model_mb', e.currentTarget.value)} />
		MB`;
}

const SETTINGS = {
	coverage: CoverageThreshold,
	'saved-designs': ShareLinksRows,
	'usdz-export': ArConfiguredRow,
};

function Card({ card, set, draft, setSetting, drawerOn }) {
	const id = 'wc3d_module_' + pluginId(card.id);
	const meta = PLUGIN[card.id] || {};
	const dimmed = !drawerOn && !!meta.needs;
	const note = drawerOn ? '' : dimmed ? 'Needs the customer drawer' : meta.note || '';
	const Settings = SETTINGS[card.id];
	return html`<div class=${cx('wc3d-row wc3d-module', 'wc3d-module--' + card.status, dimmed && 'wc3d-module--dimmed')} data-module=${pluginId(card.id)}>
		<span class="wc3d-row__icon"><${PhpIcon} name="puzzle" /></span>
		<div class="wc3d-row__main">
			<label class="wc3d-row__title" for=${id} id=${id + '-title'}>${meta.title || card.title}</label>
			<p class="wc3d-row__desc" id=${id + '-desc'}>${meta.description || card.description}</p>
			${card.requires.length > 0 &&
			html`<p class="wc3d-module__badges">
				${card.requires.map((r) => html`<span key=${r.id} class="wc3d-badge">Requires: ${titleOf(r.id)}${r.installed ? '' : ' (not installed)'}</span>`)}
			</p>`}
			${note &&
			html`<p class="wc3d-module__needs">
				<${PhpIcon} name="info" size=${14} />
				<span>${note} (<a href="#admin.settings.configurator">Settings → Customer Drawer</a>)</span>
			</p>`}
			${card.reason && html`<p class="wc3d-module__reason">${card.reason}</p>`}
			${Settings && html`<div class="wc3d-module__settings"><${Settings} draft=${draft} set=${setSetting} /></div>`}
		</div>
		<div class="wc3d-row__control">
			<input type="hidden" name="wc3d_modules[rendered][]" value=${pluginId(card.id)} />
			<${WcToggle} id=${id} name=${`wc3d_modules[enabled][${pluginId(card.id)}]`} labelledBy=${id + '-title'} describedBy=${id + '-desc'} checked=${card.enabled} onChange=${(v) => set(card.id, v)} />
		</div>
	</div>`;
}

/** Cards in module-id order (Registry::all() ksorts); `drawerOn` = the stored enable_customizer option. */
export function FeaturesRows({ mods, flags, set, draft = {}, setSetting, drawerOn = true }) {
	const cards = moduleCards(mods)
		.map((c) => {
			const missing = c.requires.find((r) => !mods[r.id] || moduleCards(mods).find((x) => x.id === r.id)?.status !== 'active');
			// ModuleSettings::blocked_reason().
			return c.status === 'blocked' && missing ? { ...c, reason: `Not running: needs "${titleOf(missing.id)}" to be on.` } : c;
		})
		.sort((a, b) => pluginId(a.id).localeCompare(pluginId(b.id)));
	const removed = removedModuleIds(flags).length;
	return html`<div class="wc3d-rows wc3d-modules">
			${cards.length
				? cards.map((c) => html`<${Card} key=${c.id} card=${c} set=${set} draft=${draft} setSetting=${setSetting} drawerOn=${drawerOn} />`)
				: html`<p class="wc3d-modules__empty">No feature modules are installed.</p>`}
		</div>
		${removed > 0 && html`<p class="wc3d-modules__note">Saved settings kept for ${removed} removed feature ${removed === 1 ? 'module' : 'modules'}.</p>`}
		<input type="hidden" name="wc3d_modules[_form]" value="1" />`;
}
