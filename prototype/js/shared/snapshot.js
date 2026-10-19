// order-snapshot: the configured-product picture taken on Add to cart (the plugin uploads it to
// uploads/wc3d/snapshots/ and stores the path as _wc3d_snapshot). Spec: specs/customizer-commerce.md.
import { html, useState, useEffect } from '../core/ui.js';
import { store } from '../core/store.js';
import { useFeature, isOn } from '../core/features.js';
import { renderThumbnail } from '../engine/thumbnail.js';
import { applyShopperChoices } from './effective-config.js';
import { effectiveFor, modelFor } from './product-3d.js';
import { ProductImage } from './product-image.js';
import { isEmptyCustom, lineVariationId } from './options.js';

export const SNAPSHOT_SIZE = 600;

/** Auto-framed like the product thumbnails, product backdrop colour, the line's baked materials/meshes on top. */
export function renderSnapshot(state, productId, variationId, custom) {
	const p = state.products?.[productId];
	const { model } = modelFor(state, productId, variationId);
	if (!p || !model) return Promise.resolve('');
	const config = applyShopperChoices(effectiveFor(state, productId, variationId, { background: false }), custom);
	return renderThumbnail(model, config, { width: SNAPSHOT_SIZE, height: SNAPSHOT_SIZE, bg: p.image?.bg || '#f1f5f9' });
}

/** Stores a picture (an identical one is reused); returns its id. */
export function saveSnapshot(url, productId) {
	if (!url) return 0;
	const hit = Object.values(store.get().snapshots || {}).find((sn) => sn.url === url);
	if (hit) return hit.id;
	const id = store.nextId('snapshots');
	store.patch(['snapshots', String(id)], { id, url, width: SNAPSHOT_SIZE, height: SNAPSHOT_SIZE, productId });
	return id;
}

/** Captures the line's picture and links it to the cart line (no-op with the flag off or no customization). */
export async function attachSnapshot(lineKey, productId, variationId = 0, custom = null) {
	if (!isOn('order-snapshot') || !lineKey || isEmptyCustom(custom)) return 0;
	const url = await renderSnapshot(store.get(), productId, variationId, custom).catch(() => '');
	// The line may have gone, changed or got a picture meanwhile, or the flag been switched off.
	const same = JSON.stringify(custom);
	const line = (store.get().cart?.items || []).find((it) => it.key === lineKey);
	if (!url || !isOn('order-snapshot') || !line || line.snapshotId != null || JSON.stringify(line.custom) !== same) return 0;
	const id = saveSnapshot(url, productId);
	store.set((s) => ({ ...s, cart: { ...s.cart, items: (s.cart?.items || []).map((it) => (it.key === lineKey ? { ...it, snapshotId: id } : it)) } }));
	return id;
}

export function snapshotUrl(state, item) {
	return (item?.snapshotId && state.snapshots?.[item.snapshotId]?.url) || '';
}

/**
 * Picture of a cart/order line: the stored snapshot; a line with `snapshotId: 0` (seeded as captured,
 * picture not shipped with the seed) is rendered on the fly (cached); anything else → ''.
 */
export function useLineSnapshot(state, item) {
	const on = useFeature('order-snapshot');
	const stored = on ? snapshotUrl(state, item) : '';
	const regen = on && !stored && item?.snapshotId === 0 && !isEmptyCustom(item.custom);
	const [url, setUrl] = useState('');
	const key = regen ? JSON.stringify([item.productId, item.variationId, item.custom]) : '';
	useEffect(() => {
		let live = true;
		if (!regen) return;
		renderSnapshot(state, item.productId, lineVariationId(state, item), item.custom).then((u) => live && setUrl(u), () => {});
		return () => (live = false);
	}, [key]);
	return stored || (regen ? url : '');
}

/** <LineImage state item size /> — snapshot when there is one, else the WooCommerce product image. */
export function LineImage({ state, item, size = 64, class: cls }) {
	const url = useLineSnapshot(state, item);
	const p = state.products?.[item.productId];
	if (!p) return null;
	if (!url) return html`<${ProductImage} product=${p} variationId=${lineVariationId(state, item)} size=${size} class=${cls} />`;
	return html`<img class=${'proto-pimg wc3d-snapshot-img' + (cls ? ' ' + cls : '')} src=${url} alt=${p.name} width=${size} height=${size} style=${{ width: size + 'px', height: size + 'px', objectFit: 'cover', background: p.image?.bg }} />`;
}
