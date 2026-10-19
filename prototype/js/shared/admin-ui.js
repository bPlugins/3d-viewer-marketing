// Widgets of the PHP-rendered .wc3d-ui screens (ModelsListPage.php, templates/admin/settings.php).
// Styles: css/wp-admin.css (.wc3d-ui shared components + WP notices).
import { html, useState, cx } from '../core/ui.js';
import { BrandLogo, PhpIcon, YouTubeIcon } from './icons.js';
import { useFeature } from '../core/features.js';

export const VIDEO_GUIDE_URL = 'https://youtu.be/xl99YlbFw18';

const PAGE_TABS = [
	['models', 'Models', 'box', 'admin.models'],
	['settings', 'Settings', 'settings', 'admin.settings'],
];
// Module tabs (wc3d/admin/models_tabs) sit between Models and Settings, in module-id order.
const COVERAGE_TAB = ['coverage', 'Coverage', 'layers', 'admin.coverage'];
const DESIGNS_TAB = ['designs', 'Saved designs', 'save', 'admin.designs'];

/** header.wc3d-head: logo + "3D Models", Models/Settings switch, "Watch Video Guide". */
export function PageHead({ active = 'models', videoUrl = VIDEO_GUIDE_URL }) {
	const coverage = useFeature('coverage');
	const designs = useFeature('saved-designs');
	const tabs = [PAGE_TABS[0], coverage && COVERAGE_TAB, designs && DESIGNS_TAB, PAGE_TABS[1]].filter(Boolean);
	return html`<header class="wc3d-head">
		<div class="wc3d-head__brand">
			<${BrandLogo} class="wc3d-head__logo" />
			<h1 class="wc3d-page-title">3D Models</h1>
		</div>
		<nav class="nav-tab-wrapper wp-clearfix" aria-label="Secondary menu">
			${tabs.map(
				([slug, label, icon, route]) => html`<a
					key=${slug}
					href=${'#' + route}
					class=${cx('nav-tab', slug === active && 'nav-tab-active')}
					aria-current=${slug === active ? 'page' : undefined}
				>
					<${PhpIcon} name=${icon} size=${15} />
					${label}
				</a>`
			)}
		</nav>
		<div class="wc3d-head__actions">
			${videoUrl &&
			html`<a href=${videoUrl} class="wc3d-how-it-works wc3d-btn wc3d-btn-ghost" target="_blank" rel="noopener noreferrer">
				<span class="wc3d-how-it-works__icon" aria-hidden="true"><${YouTubeIcon} /></span>
				<span class="wc3d-how-it-works__text">Watch Video Guide</span>
			</a>`}
		</div>
	</header>`;
}

/**
 * The whole tabbed page frame: .wrap.wc3d-ui-wrap (hidden WP heading anchors, notices)
 * › .wc3d-ui › PageHead + .wc3d-tab-panel. Put it inside <WpAdmin current="wc3d-models">.
 */
export function ModelsPage({ active = 'models', notices, children }) {
	return html`<div class="wrap wc3d-ui-wrap">
		<h1 class="wp-heading-inline" style="display:none;"></h1>
		<hr class="wp-header-end" style="display:none;" />
		${notices}
		<div class="wc3d-ui">
			<${PageHead} active=${active} />
			<div class="wc3d-tab-panel">${children}</div>
		</div>
	</div>`;
}

/**
 * PHP .wc3d-toggle: invisible checkbox over a 41×24 track + "Enabled"/"Disabled"
 * (danger: "Yes"/"No"). Name it with labelledBy (the row title id) or label.
 */
export function WcToggle({ checked, onChange, danger = false, id, name, labelledBy, describedBy, label, disabled = false }) {
	return html`<label class=${cx('wc3d-toggle', danger && 'wc3d-toggle--danger')}>
		<input
			type="checkbox"
			role="switch"
			id=${id}
			name=${name}
			value="1"
			aria-labelledby=${labelledBy}
			aria-describedby=${describedBy}
			aria-label=${labelledBy ? undefined : label}
			checked=${!!checked}
			disabled=${disabled}
			onChange=${(e) => onChange?.(e.currentTarget.checked)}
		/>
		<span class="wc3d-toggle__track" aria-hidden="true"></span>
		<span class="wc3d-toggle__label" aria-hidden="true">
			<span class="wc3d-toggle__on">${danger ? 'Yes' : 'Enabled'}</span>
			<span class="wc3d-toggle__off">${danger ? 'No' : 'Disabled'}</span>
		</span>
	</label>`;
}

/**
 * WordPress admin notice: <Notice type="warning" dismissible>…</Notice>.
 * type: success | warning | error | info. Strings are wrapped in <p>. `inline` = .inline
 * (stays where rendered). Dismissing hides it locally unless onDismiss is given.
 */
export function Notice({ type = 'info', dismissible = false, onDismiss, inline = false, alt = false, class: cls, children }) {
	const [gone, setGone] = useState(false);
	if (gone) return null;
	const body = typeof children === 'string' ? html`<p>${children}</p>` : children;
	const dismiss = () => (onDismiss ? onDismiss() : setGone(true));
	return html`<div class=${cx('notice', 'notice-' + type, alt && 'notice-alt', inline && 'inline', dismissible && 'is-dismissible', cls)}>
		${body}
		${dismissible &&
		html`<button type="button" class="notice-dismiss" onClick=${dismiss}>
			<span class="screen-reader-text">Dismiss this notice.</span>
		</button>`}
	</div>`;
}
