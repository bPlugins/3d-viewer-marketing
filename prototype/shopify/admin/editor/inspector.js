// Right panel: one collapsible card per concern, in the WooCommerce editor's order.
import { html } from '../../../js/core/ui.js';
import { useStore } from '../../core/store.js';
import { Banner } from '../../ui/polaris.js';
import { useEd, rawConfig, onVariant, currentLayer } from './state.js';
import { Section, OverrideBadge } from './fields.js';
import { ModelPanel, MaterialPanel, ScenePanel, CameraPanel, AnimationsPanel, ArPanel, PerformancePanel } from './panels-basic.js';
import { OptionsPanel, PricingPanel } from './panels-options.js';
import { PersonalizationPanel, HotspotsPanel, ImportExportPanel } from './panels-more.js';

export function Inspector({ product }) {
	const s = useStore();
	const ed = useEd();
	const raw = rawConfig(ed);
	const ov = (...keys) => html`<${OverrideBadge} on=${onVariant(ed) && keys.some((k) => raw[k] !== undefined)} />`;
	const enabled = s.configs[product.id]?.enabled;
	const modelOv = !!currentLayer(ed)?.modelFileId;
	return html`
		${enabled
			? null
			: html`<div class="ed-pad-card"><${Banner} tone="warning" title="3D is off for this product" action=${{ content: 'Open product', href: `#admin.product.${product.id}` }}>Shoppers won't see the viewer until you turn 3D on.<//></div>`}
		<${Section} id="model" title="Model" icon="cube" open badge=${html`<${OverrideBadge} on=${modelOv} />`}><${ModelPanel} product=${product} /><//>
		<${Section} id="material" title="Material" icon="palette" open badge=${html`<${OverrideBadge} on=${onVariant(ed) && !!ed.selection && raw.materials?.[ed.selection] !== undefined} />`}><${MaterialPanel} /><//>
		<${Section} id="options" title="Customer options" icon="layers" badge=${ov('options')}><${OptionsPanel} product=${product} /><//>
		<${Section} id="pricing" title="Pricing" icon="tag"><${PricingPanel} /><//>
		<${Section} id="personalization" title="Personalization" icon="text" badge=${ov('decals')}><${PersonalizationPanel} /><//>
		<${Section} id="hotspots" title="Hotspots" icon="hotspot" badge=${ov('hotspots')}><${HotspotsPanel} product=${product} /><//>
		<${Section} id="scene" title="Scene & lighting" icon="sun" badge=${ov('environment')}><${ScenePanel} /><//>
		<${Section} id="camera" title="Camera" icon="camera" badge=${ov('camera', 'gallery_presets')}><${CameraPanel} /><//>
		${ed.clips.length ? html`<${Section} id="animations" title="Animations" icon="play" badge=${ov('animations')}><${AnimationsPanel} /><//>` : null}
		<${Section} id="ar" title="AR" icon="ar" badge=${ov('ar')}><${ArPanel} /><//>
		<${Section} id="performance" title="Performance & health" icon="bolt" badge=${ov('optimization')}><${PerformancePanel} /><//>
		<${Section} id="import" title="Import / export" icon="code"><${ImportExportPanel} /><//>
	`;
}
