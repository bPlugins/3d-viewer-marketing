// Demo-wide filters on reused configurator code (../js/shared/slots.js).
import { html } from '../../js/core/ui.js';
import { useStore } from '../../js/core/store.js';
import { addFilter, registerSlot } from '../../js/shared/slots.js';
import { extActive } from './plan.js';
import { LINKS } from './links.js';

// Configurator modules exist only while the extension is installed and active.
addFilter('feature.on', (on, id, state) => on && extActive(state));

// In-page notes of the reused screens are demo notes here, not prototype notes.
addFilter('proto.label', () => 'Demo');

// Storefront menu: the page that shows the 3D Viewer blocks.
registerSlot('store.nav', ({ isCurrent, onNavigate }) => html`<a href="#store.viewer" class=${isCurrent('store.viewer') ? 'is-current' : undefined} onClick=${onNavigate}>3D Showcase</a>`);

/** Licensing.php copy for the configurator while it cannot run: [message, link label, href]. */
export function extNotice(plan, ext, off) {
	if (plan !== 'pro') return ['3D Product Configurator for WooCommerce is inactive: it comes with the 3D Viewer Pro plan or higher. Bought it on its own before? Use its "Activate License" link on the Plugins screen.', 'See 3D Viewer plans', LINKS.pricing];
	if (ext === 'none') return ['3D Product Configurator for WooCommerce is not installed. It comes with 3D Viewer Pro: install it on the 3D Viewer Extensions page.', 'Open Extensions', '#v3d.extensions'];
	if (ext === 'installed') return ['3D Product Configurator for WooCommerce is installed but not active. Activate it on the 3D Viewer Extensions page.', 'Open Extensions', '#v3d.extensions'];
	if (off) return ['3D Product Configurator for WooCommerce is installed but not enabled. Enable it on the 3D Viewer Extensions page.', 'Open Extensions', '#v3d.extensions'];
	return null;
}

// Licensing::render_parent_notice(): with the plugin active but not running, every admin screen gets a warning.
registerSlot('wp-admin.notices', () => {
	const lv = useStore((s) => s.lv || {});
	const n = lv.ext === 'active' && extNotice(lv.plan, lv.ext, lv.extOff);
	if (!n) return null;
	return html`<div class="notice notice-warning ld-ext-notice"><p>${n[0]} <a href=${n[2]} ...${n[2].startsWith('#') ? {} : { target: '_blank', rel: 'noopener' }}>${n[1]}</a></p></div>`;
});

// OrderPreview.php hooks only run while the configurator does: no "View 3D Preview" button otherwise.
addFilter('wc3d.order-preview', (on) => on && extActive());
