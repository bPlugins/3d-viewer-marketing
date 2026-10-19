// Extension points for other entries (live-demo.html). Nothing is registered in the dev prototype,
// so every <Slot> renders nothing and every applyFilter returns its value unchanged.
import { html } from '../core/ui.js';

const slots = new Map();
const filters = new Map();

/** registerSlot('product-edit.after-data', (props) => html`…`) */
export function registerSlot(name, Comp) {
	slots.set(name, Comp);
}

export function Slot({ name, ...props }) {
	const Comp = slots.get(name);
	return Comp ? html`<${Comp} ...${props} />` : null;
}

/** addFilter('product-edit.show-3d-tab', (value, ...args) => next) */
export function addFilter(name, fn) {
	filters.set(name, [...(filters.get(name) || []), fn]);
}

export function applyFilter(name, value, ...args) {
	return (filters.get(name) || []).reduce((v, fn) => fn(v, ...args), value);
}

/** Tag on in-page notes: "Prototype" here, renamed by the live demo through the 'proto.label' filter. */
export const protoLabel = () => applyFilter('proto.label', 'Prototype');
