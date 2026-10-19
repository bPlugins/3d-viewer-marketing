// The prototype's own roadmap page (not product UI): every planned feature, its status and its flag.
import { html, cx } from '../core/ui.js';
import { useStore } from '../core/store.js';
import { FEATURES, toggleFeature, dependencyNote, canToggle, alwaysOn } from '../core/features.js';

const GROUPS = [
	{ status: 'prototyped', title: 'Prototyped', note: 'Built here behind a flag. Switch it on to try it; off shows the shipped product.' },
	{ status: 'planned', title: 'Planned', note: 'No prototype UI yet, so the switch stays off.' },
	{ status: 'shipped', title: 'Shipped', note: 'In the plugin. The flag is gone and the UI is always on, except feature modules: their switch is the Settings → Features toggle.' },
];

const STEPS = [
	html`Set its <code>status</code> to <code>'prototyped'</code> in <code>js/core/features.js</code>.`,
	html`Gate every new piece of UI with <code>${"useFeature('<id>')"}</code>, so switching the flag off shows the shipped product.`,
	html`Put new data under new keys (additive), give it seed values, bump <code>VERSION</code> in <code>core/store.js</code>.`,
	html`When the feature ships in the plugin, set <code>status: 'shipped'</code> and remove the flag checks. A feature module (<code>module: true</code>) keeps its flag; it mirrors the Settings → Features toggle.`,
];

function Switch({ feature, on }) {
	const disabled = !canToggle(feature);
	const shown = alwaysOn(feature) || on;
	const id = 'roadmap-flag-' + feature.id;
	return html`
		<label class=${cx('proto-switch', disabled && 'is-disabled')} for=${id} title=${feature.status === 'planned' ? 'Not prototyped yet' : alwaysOn(feature) ? 'Shipped: always on' : on ? 'Switch off' : 'Switch on'}>
			<input
				id=${id}
				type="checkbox"
				role="switch"
				checked=${shown}
				disabled=${disabled}
				aria-label=${feature.title}
				onChange=${(e) => toggleFeature(feature.id, e.currentTarget.checked)}
			/>
			<span class="proto-switch__track" aria-hidden="true"><span class="proto-switch__thumb"></span></span>
			<span class="proto-switch__text">${shown ? 'On' : 'Off'}</span>
		</label>
	`;
}

export default function Roadmap() {
	const flags = useStore((s) => s.flags || {});
	const count = (st) => FEATURES.filter((f) => f.status === st).length;
	return html`
		<div class="proto-roadmap">
			<div class="proto-roadmap__inner">
				<header class="proto-roadmap__head">
					<span class="proto-bar__brand">Prototype</span>
					<h1>Roadmap</h1>
					<p>
						Features planned for WC 3D Model Viewer Pro, from the competitor analysis. Each one moves from
						<span class="proto-chip proto-chip--planned">planned</span> to
						<span class="proto-chip proto-chip--prototyped">prototyped</span> to
						<span class="proto-chip proto-chip--shipped">shipped</span>.
					</p>
					<dl class="proto-roadmap__stats">
						${GROUPS.map((g) => html`<div key=${g.status}><dt>${g.title}</dt><dd>${count(g.status)}</dd></div>`)}
					</dl>
				</header>

				${GROUPS.map((g) => {
					const list = FEATURES.filter((f) => f.status === g.status);
					return html`
						<section key=${g.status} class="proto-roadmap__group" aria-labelledby=${'rg-' + g.status}>
							<div class="proto-roadmap__group-head">
								<h2 id=${'rg-' + g.status}>${g.title} <span class="proto-roadmap__count">${list.length}</span></h2>
								<p>${g.note}</p>
							</div>
							${list.length
								? html`<ul class="proto-roadmap__list">
										${list.map(
											(f) => html`<li key=${f.id} class=${cx('proto-roadmap__item', 'is-' + f.status)}>
												<div class="proto-roadmap__main">
													<div class="proto-roadmap__title">
														<strong>${f.title}</strong>
														<span class="proto-roadmap__area">${f.area}</span>
													</div>
													<p>${f.summary}</p>
													${dependencyNote(f) && html`<p class=${cx('proto-flag__req', flags[f.id] && (f.requires || []).some((r) => !flags[r]) && 'is-unmet')}>${dependencyNote(f)}</p>`}
													<code class="proto-roadmap__id">${f.id}</code>
												</div>
												<${Switch} feature=${f} on=${!!flags[f.id]} />
											</li>`
										)}
									</ul>`
								: html`<p class="proto-roadmap__empty">None yet.</p>`}
						</section>
					`;
				})}

				<section class="proto-roadmap__group proto-roadmap__how" aria-labelledby="rg-how">
					<div class="proto-roadmap__group-head"><h2 id="rg-how">How to prototype a feature</h2></div>
					<ol>
						${STEPS.map((s, i) => html`<li key=${i}>${s}</li>`)}
					</ol>
					<p class="proto-roadmap__foot">Full rules, file owners and data shapes are in <code>prototype/ARCHITECTURE.md</code>.</p>
				</section>
			</div>
		</div>
	`;
}
