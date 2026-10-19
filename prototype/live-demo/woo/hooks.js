// Registers the live demo's slots and filters on reused configurator screens (../js/shared/slots.js):
// the configurator only runs while the extension is active; 3D Viewer's own Woo metabox, product viewer and shop icon.
import { html } from '../../js/core/ui.js';
import { store } from '../../js/core/store.js';
import { registerSlot, addFilter } from '../../js/shared/slots.js';
import { extActive } from '../core/plan.js';
import { V3dMetabox, saveMetaDraft, InterfaceRow } from './metabox.js';
import { ProductGallery, TabViewer, ShopCard3D, hasTab } from './viewer.js';

// Configurator (ProductViewerSettings::is_available()) off while the extension is not active.
addFilter('wc3d.available', (available) => available && extActive());

// Product data tabs: the "3D Model" tab (and its Open 3D Customizer button) belongs to the extension.
addFilter('product-edit.tabs', (tabs) => (extActive() ? tabs : tabs.filter((t) => t.key !== 'wc3d_model_viewer')));

registerSlot('product-edit.after-data', V3dMetabox);
registerSlot('product-edit.misc-actions', InterfaceRow);
addFilter('product-edit.saved', (id, key) => (saveMetaDraft(id, key), id));

// Single product: 3D Viewer's viewer around the gallery when the configurator is not running for it.
addFilter('store.product.gallery', (gallery, ctx) => (ctx.has3D ? gallery : html`<${ProductGallery} gallery=${gallery} product=${ctx.product} chosen=${ctx.chosen} />`));
addFilter('store.product.viewer-tab', (tab, ctx) => (tab || ctx.has3D || !hasTab(store.get(), ctx.product) ? tab : () => html`<${TabViewer} product=${ctx.product} chosen=${ctx.chosen} />`));

registerSlot('store.shop.card-image', ShopCard3D);
