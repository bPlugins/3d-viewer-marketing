// 3D Viewer → Help & Demos: the plugin's dashboard app (3d-viewer-premium/src/admin/dashboard), tab = route param.
// Live data the real screens fetch (Freemius plans, WordPress.org plugins) is copied in as it was on 17 Oct 2026.
import { html, useState, useEffect, useMemo, useRef, cx } from '../../js/core/ui.js';
import { WpAdmin } from '../../js/screens/admin/chrome.js';
import { useIsPro, setPlan } from '../core/plan.js';
import { toast } from '../core/bus.js';
import { LINKS } from '../core/links.js';
import { ExtensionsScreen } from './extensions.js';

const VERSION = '2.0.0';
const img = (name) => new URL(`../img/dashboard/${name}.webp`, import.meta.url).href;
export const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' };

export const PAGES = {
	org: LINKS.wporg,
	docs: LINKS.docs,
	pricing: LINKS.pricing,
	support: LINKS.support,
	community: 'https://facebook.com/groups/1828495198556137',
	review: 'https://wordpress.org/support/plugin/3d-viewer/reviews/#new-post',
};
const LINKS_ADMIN = { newViewer: '#v3d.edit.new', viewers: '#v3d.list', settings: '#v3d.settings' };

/* ---- icons (dash/icons.tsx): Lucide + the .fig glyphs; stroke follows the design's pixel weight ---- */
const ICONS = {
	Box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
	CircleX: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
	Check: '<path d="M20 6 9 17l-5-5"/>',
	X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	Blocks: '<path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"/><rect x="14" y="2" width="8" height="8" rx="1"/>',
	List: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
	Search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
	Cuboid: '<path d="M10 22v-8"/><path d="M2.336 8.89 10 14l11.715-7.029"/><path d="M22 14a2 2 0 0 1-.971 1.715l-10 6a2 2 0 0 1-2.138-.05l-6-4A2 2 0 0 1 2 16v-6a2 2 0 0 1 .971-1.715l10-6a2 2 0 0 1 2.138.05l6 4A2 2 0 0 1 22 8z"/>',
	RefreshCw: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
	ZoomIn: '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
	ZoomOut: '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>',
	ChevronDown: '<path d="m6 9 6 6 6-6"/>',
	ChevronUp: '<path d="m18 15-6-6-6 6"/>',
	ChevronRight: '<path d="m9 18 6-6-6-6"/>',
	EllipsisVertical: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
	ArrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
	CircleHelp: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
	ExternalLink: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
	Mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
	Power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
	Puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
	Maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
	ShoppingCart: '<path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/><circle cx="18" cy="20" r="2"/><circle cx="8" cy="20" r="2"/>',
	Compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
	Lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
	Star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
	ShieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
	Headset: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
	Lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
	Plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
	Eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
	Rocket: '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/>',
	Book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
	MessageCircle: '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
	Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
	Heart: '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/>',
	Zap: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
	CircleCheck: '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
	CursorSelect: '<path d="M8.55 4.97L13.93 7.07C17.01 8.28 18.56 8.88 18.51 9.84C18.46 10.8 16.84 11.24 13.61 12.13C12.65 12.38 12.18 12.52 11.84 12.84C11.51 13.18 11.37 13.66 11.12 14.63C10.23 17.85 9.79 19.47 8.83 19.52C7.87 19.56 7.27 18.02 6.06 14.93L3.96 9.56C2.7 6.33 2.05 4.7 2.88 3.89C3.69 3.06 5.32 3.71 8.55 4.97" fill="currentColor" stroke-linecap="butt"/><path d="M20.51 18.02L13.51 18.02"/>',
	CodeBrackets: '<path d="M16.23 6.53L19.3 9.16C20.6 10.27 21.24 10.83 21.24 11.52C21.24 12.21 20.6 12.77 19.3 13.88L16.23 16.51"/><path d="M8.24 6.53L5.16 9.16C3.88 10.27 3.23 10.83 3.23 11.52C3.23 12.21 3.88 12.77 5.16 13.88L8.24 16.51"/>',
	Settings02: '<path d="M15.49 11.73C15.49 13.66 13.94 15.23 11.99 15.23C10.06 15.23 8.49 13.66 8.49 11.73C8.49 9.79 10.06 8.23 11.99 8.23C13.94 8.23 15.49 9.79 15.49 11.73" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M21.01 13.82C21.53 13.68 21.79 13.61 21.9 13.48C21.99 13.34 21.99 13.12 21.99 12.69L21.99 10.75C21.99 10.32 21.99 10.11 21.9 9.98C21.79 9.83 21.53 9.77 21.01 9.62C19.05 9.1 17.84 7.06 18.34 5.13C18.48 4.59 18.56 4.33 18.48 4.17C18.42 4.01 18.23 3.9 17.85 3.68L16.13 2.71C15.75 2.49 15.57 2.39 15.4 2.42C15.23 2.43 15.04 2.62 14.67 3C13.21 4.46 10.79 4.46 9.33 3C8.96 2.62 8.77 2.43 8.6 2.42C8.43 2.39 8.25 2.49 7.87 2.71L6.15 3.68C5.77 3.9 5.58 4.01 5.52 4.17C5.46 4.33 5.52 4.59 5.66 5.13C6.16 7.06 4.93 9.1 2.99 9.62C2.47 9.77 2.21 9.83 2.1 9.98C2.01 10.11 2.01 10.32 2.01 10.75L2.01 12.69C2.01 13.12 2.01 13.34 2.1 13.48C2.21 13.61 2.47 13.68 2.99 13.82C4.93 14.34 6.16 16.38 5.65 18.33C5.52 18.86 5.44 19.11 5.52 19.27C5.58 19.43 5.77 19.54 6.15 19.76L7.87 20.73C8.25 20.95 8.43 21.05 8.6 21.03C8.76 21.01 8.96 20.82 9.33 20.44C10.79 18.98 13.21 18.98 14.67 20.44C15.04 20.82 15.24 21.01 15.4 21.03C15.57 21.05 15.75 20.95 16.13 20.73L17.85 19.76C18.23 19.54 18.42 19.43 18.48 19.27C18.56 19.11 18.48 18.85 18.35 18.33C17.84 16.38 19.07 14.34 21.01 13.82" stroke-linejoin="miter"/>',
	File01: '<path d="M7.51 6.72L15.51 6.72"/><path d="M7.51 10.72L11.51 10.72"/><path d="M12.5 21.22L12.5 20.72C12.5 17.89 12.5 16.48 13.39 15.6C14.27 14.72 15.68 14.72 18.51 14.72L19.01 14.72M19.52 13.06L19.52 9.72C19.52 5.95 19.52 4.07 18.34 2.89C17.17 1.73 15.29 1.73 11.51 1.73C7.74 1.73 5.86 1.73 4.68 2.89C3.51 4.07 3.51 5.95 3.51 9.72L3.51 14.27C3.51 17.51 3.51 19.14 4.4 20.23C4.58 20.45 4.78 20.66 4.99 20.84C6.1 21.73 7.72 21.73 10.96 21.73C11.67 21.73 12.03 21.73 12.35 21.61C12.42 21.58 12.48 21.56 12.54 21.52C12.86 21.38 13.1 21.13 13.6 20.63L18.34 15.89C18.92 15.31 19.2 15.03 19.36 14.66C19.52 14.29 19.52 13.88 19.52 13.06"/>',
	Plug01: '<path d="M15.74 1.73L15.74 5.72M8.74 5.72L8.74 1.73"/><path d="M6.25 7.34C6.17 6.46 6.88 5.72 7.77 5.72L16.71 5.72C17.6 5.72 18.3 6.46 18.23 7.34L18.05 9.71C17.91 11.42 17.34 13.08 16.37 14.5L15.77 15.38C15.2 16.22 14.24 16.72 13.22 16.72L11.25 16.72C10.23 16.72 9.27 16.22 8.7 15.38L8.11 14.5C7.13 13.08 6.56 11.42 6.43 9.71L6.25 7.34" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M12.24 16.72L12.24 21.73"/><path d="M11.24 8.73L13.23 8.73"/>',
	Rotate3d: '<path d="M11.99 16.51C6.46 16.51 1.99 14.28 1.99 11.52C1.99 10.12 3.15 8.86 4.99 7.95M19.36 14.9C20.99 14.01 21.99 12.82 21.99 11.52C21.99 8.76 17.51 6.53 11.99 6.53C11.4 6.53 10.83 6.55 10.27 6.6"/><path d="M7.05 12.52C7.01 12.05 6.99 11.57 6.99 11.08C6.99 5.8 9.34 1.52 12.24 1.52C13.71 1.52 15.04 2.62 15.99 4.4"/><path d="M16.88 9.51C16.95 10.21 16.99 10.91 16.99 11.64C16.99 17.1 14.75 21.52 11.99 21.52"/><path d="M9.99 13.53L10.85 14.18C12.29 15.26 12.99 15.8 12.99 16.51C12.99 17.24 12.29 17.78 10.85 18.86L9.99 19.52"/>',
	StarRound: '<path d="M11.52 0.95C11.57 0.87 11.63 0.79 11.72 0.73C11.8 0.69 11.9 0.66 12.01 0.66C12.1 0.66 12.2 0.69 12.28 0.73C12.37 0.79 12.43 0.87 12.48 0.95L14.78 5.64C14.94 5.94 15.16 6.21 15.44 6.4C15.72 6.61 16.04 6.74 16.38 6.79L21.55 7.54C21.64 7.57 21.74 7.6 21.81 7.67C21.89 7.73 21.94 7.82 21.98 7.91C22 8.01 22.01 8.1 21.99 8.2C21.96 8.29 21.91 8.38 21.84 8.45L18.1 12.08C17.86 12.33 17.68 12.63 17.56 12.95C17.46 13.28 17.44 13.63 17.49 13.97L18.38 19.11C18.4 19.2 18.39 19.3 18.34 19.4C18.31 19.49 18.24 19.57 18.16 19.63C18.08 19.69 17.99 19.72 17.89 19.73C17.79 19.73 17.69 19.72 17.61 19.66L12.99 17.23C12.68 17.08 12.34 17 11.99 17C11.66 17 11.32 17.08 11.01 17.23L6.39 19.66C6.31 19.72 6.21 19.73 6.11 19.73C6.01 19.72 5.92 19.69 5.84 19.63C5.76 19.57 5.69 19.49 5.66 19.4C5.62 19.3 5.61 19.2 5.62 19.11L6.51 13.97C6.56 13.63 6.54 13.28 6.44 12.95C6.32 12.63 6.14 12.33 5.9 12.08L2.16 8.45C2.09 8.38 2.03 8.3 2.01 8.2C1.99 8.11 2 8.01 2.02 7.91C2.06 7.82 2.11 7.73 2.19 7.67C2.26 7.6 2.36 7.56 2.45 7.54L7.62 6.79C7.96 6.74 8.28 6.61 8.56 6.4C8.84 6.21 9.07 5.94 9.22 5.64L11.52 0.95" stroke-linejoin="miter"/>',
	SettingsRound: '<path d="M9.67 2.76C9.73 2.19 9.99 1.64 10.42 1.25C10.86 0.86 11.42 0.65 11.99 0.65C12.58 0.65 13.14 0.86 13.58 1.25C14.01 1.64 14.27 2.19 14.33 2.76C14.37 3.13 14.48 3.49 14.69 3.82C14.89 4.13 15.16 4.4 15.49 4.58C15.81 4.78 16.18 4.88 16.56 4.89C16.93 4.92 17.3 4.83 17.65 4.67C18.18 4.44 18.77 4.41 19.33 4.58C19.88 4.75 20.36 5.14 20.65 5.63C20.93 6.14 21.03 6.73 20.9 7.3C20.78 7.87 20.45 8.37 19.97 8.71C19.67 8.93 19.42 9.22 19.25 9.54C19.07 9.88 18.98 10.25 18.98 10.63C18.98 11 19.07 11.37 19.25 11.71C19.42 12.04 19.67 12.33 19.97 12.54C20.45 12.88 20.78 13.38 20.9 13.95C21.03 14.52 20.93 15.12 20.65 15.61C20.36 16.12 19.88 16.49 19.33 16.67C18.77 16.85 18.18 16.82 17.65 16.57C17.3 16.41 16.93 16.34 16.56 16.35C16.18 16.38 15.81 16.48 15.49 16.67C15.16 16.85 14.89 17.12 14.69 17.44C14.48 17.75 14.37 18.11 14.33 18.49C14.27 19.07 14.01 19.6 13.58 20C13.14 20.39 12.58 20.61 11.99 20.61C11.42 20.61 10.86 20.39 10.42 20C9.99 19.6 9.73 19.07 9.67 18.49C9.63 18.11 9.52 17.75 9.31 17.44C9.11 17.12 8.84 16.85 8.51 16.67C8.18 16.48 7.82 16.38 7.44 16.35C7.07 16.34 6.69 16.41 6.35 16.57C5.82 16.82 5.22 16.85 4.67 16.67C4.12 16.49 3.64 16.12 3.35 15.61C3.07 15.12 2.97 14.52 3.1 13.95C3.22 13.38 3.55 12.88 4.03 12.54C4.33 12.33 4.58 12.04 4.75 11.71C4.93 11.37 5.02 11 5.02 10.63C5.02 10.25 4.93 9.88 4.75 9.54C4.58 9.22 4.33 8.93 4.03 8.71C3.55 8.37 3.22 7.87 3.1 7.3C2.97 6.73 3.07 6.14 3.35 5.64C3.64 5.14 4.12 4.77 4.67 4.58C5.22 4.41 5.82 4.44 6.35 4.67C6.69 4.83 7.07 4.92 7.44 4.89C7.82 4.88 8.18 4.78 8.5 4.58C8.84 4.4 9.1 4.13 9.31 3.82C9.51 3.49 9.63 3.13 9.67 2.76M15 10.63C15 12.28 13.66 13.63 11.99 13.63C10.34 13.63 9 12.28 9 10.63C9 8.98 10.34 7.62 11.99 7.62C13.66 7.62 15 8.98 15 10.63" stroke-linejoin="miter"/>',
	Grid: '<path d="M3 7.62L21 7.62M3 13.63L21 13.63M9 1.63L9 19.63M15 1.63L15 19.63M5 1.63L19 1.63C20.1 1.63 21 2.52 21 3.62L21 17.63C21 18.73 20.1 19.63 19 19.63L5 19.63C3.9 19.63 3 18.73 3 17.63L3 3.62C3 2.52 3.9 1.63 5 1.63" stroke-linejoin="miter"/>',
	CrownLine: '<path d="M8.4 10.96L2 8.1L4.54 20M8.4 10.96L12.01 4M4.54 20C6.98 19.25 9.5 18.88 12.01 18.88M15.6 10.96L22 8.1L19.46 20C17.02 19.25 14.5 18.88 11.99 18.88M15.6 10.96L12.01 4"/>',
};

export function DIcon({ name, size = 16, weight = 1.5, color, class: cls }) {
	return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=${(weight * 24) / size} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class=${cls} style=${color ? { color } : undefined} dangerouslySetInnerHTML=${{ __html: ICONS[name] || ICONS.Box }}></svg>`;
}

const SquareCheckFilled = ({ size = 16 }) =>
	html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.99 0C4.4 0 2.89 0.63 1.76 1.76C0.63 2.89 0 4.4 0 5.99L0 17.99C0 19.6 0.63 21.11 1.76 22.24C2.89 23.36 4.4 24 5.99 24L17.99 24C19.6 24 21.11 23.36 22.24 22.24C23.36 21.11 24 19.6 24 17.99L24 5.99C24 4.4 23.36 2.89 22.24 1.76C21.11 0.63 19.6 0 17.99 0L5.99 0M16.48 10.43C16.58 10.31 16.67 10.16 16.72 10.02C16.78 9.87 16.8 9.71 16.8 9.57C16.8 9.4 16.75 9.24 16.7 9.1C16.62 8.97 16.53 8.84 16.42 8.72C16.3 8.62 16.17 8.53 16.02 8.47C15.88 8.41 15.72 8.4 15.56 8.4C15.4 8.4 15.25 8.44 15.11 8.5C14.96 8.57 14.83 8.66 14.73 8.78L11.02 12.73L9.2 11.1C8.95 10.91 8.65 10.8 8.34 10.83C8.03 10.85 7.74 10.99 7.54 11.23C7.32 11.46 7.22 11.77 7.23 12.07C7.25 12.39 7.38 12.69 7.6 12.89L10.31 15.3C10.54 15.5 10.85 15.62 11.15 15.6C11.46 15.59 11.77 15.44 11.97 15.22L16.48 10.43"/></svg>`;

export const Crown = ({ width = 19.46, height = 15.57, weight = 2.19 }) =>
	html`<svg width=${width} height=${height} viewBox="0 0 19.46 15.57" fill="none" overflow="visible" aria-hidden="true"><defs><linearGradient id="bp3d-crown-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B5CF0"/><stop offset="1" stop-color="#FDD2F0"/></linearGradient></defs><path d="M6.23 6.77L0 3.99L2.47 15.57M6.23 6.77L9.74 0M2.47 15.57C4.85 14.84 7.29 14.48 9.74 14.48M13.23 6.77L19.46 3.99L16.99 15.57C14.61 14.84 12.16 14.48 9.72 14.48M13.23 6.77L9.74 0" stroke="url(#bp3d-crown-grad)" stroke-width=${weight} stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---- shared.tsx ---- */
export function HeroArt({ blobs, model, degree, large = false, children }) {
	return html`<div class="bp3d-dash-hero__art" aria-hidden="true">
		<span class="bp3d-dash-hero__blob bp3d-dash-hero__blob--a" style=${blobs[0]}></span>
		<span class="bp3d-dash-hero__blob bp3d-dash-hero__blob--b" style=${blobs[1]}></span>
		<div class="bp3d-dash-hero__model" style=${model}><img src=${img('headphones')} alt="" /></div>
		<span class=${large ? 'bp3d-dash-degree bp3d-dash-degree--lg' : 'bp3d-dash-degree'} style=${degree}>360°</span>
		${children}
	</div>`;
}

function ViewerControls({ style, icons, large = false }) {
	const [r, zi, zo] = icons;
	return html`<div class=${large ? 'bp3d-dash-ctrls bp3d-dash-ctrls--lg' : 'bp3d-dash-ctrls'} style=${style}>
		<span class="bp3d-dash-ctrl"><${DIcon} name="RefreshCw" ...${r} /></span>
		<span class="bp3d-dash-ctrl"><${DIcon} name="ZoomIn" ...${zi} /></span>
		<span class="bp3d-dash-ctrl"><${DIcon} name="ZoomOut" ...${zo} /></span>
	</div>`;
}

export const Tag = ({ children, bg, color, class: cls = '' }) => html`<span class=${'bp3d-dash-tag ' + cls} style=${{ background: bg, color }}>${children}</span>`;

export function SearchField({ placeholder, label, iconSize, weight, value, onChange }) {
	return html`<label class="bp3d-dash-search">
		<${DIcon} name="Search" size=${iconSize} weight=${weight} />
		<input type="text" placeholder=${placeholder} value=${value} aria-label=${label} onInput=${(e) => onChange(e.currentTarget.value)} />
	</label>`;
}

const PlanTags = ({ isPremium }) => html`<div class="bp3d-dash-tags">
	<${Tag} class="bp3d-dash-tag--pill" color="#047857">Plugin Active<//>
	<${Tag} class="bp3d-dash-tag--pill" color="#475569">${isPremium ? 'Pro Plan' : 'Free Plan'}<//>
</div>`;

/** Escape closes, focus moves in and back out (useModalFocus). */
export function useModalFocus(panel, onClose, initial) {
	const close = useRef(onClose);
	close.current = onClose;
	useEffect(() => {
		const opener = document.activeElement;
		(initial?.current || panel.current?.querySelector('a[href], button:not([disabled])'))?.focus();
		const onKey = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				close.current();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
			if (opener && document.contains(opener)) opener.focus();
		};
	}, []);
}

/* ---- Layout.tsx: the top nav ---- */
const TABS = {
	welcome: { label: 'Welcome', w: 63 },
	demos: { label: 'Demos', w: 48 },
	tools: { label: 'Tools', pro: true },
	pricing: { label: 'Pricing', w: 48, free: true },
	'feature-comparison': { label: 'Feature Comparison', w: 138, free: true },
	activation: { label: 'Activation', pro: true },
	'our-plugins': { label: 'Our Plugins' },
	extensions: { label: 'Extensions', w: 75, isNew: true },
};

export const tabIds = (pro) => Object.keys(TABS).filter((id) => (pro ? !TABS[id].free : !TABS[id].pro));

/** The dashboard frame. `standalone`: the Extensions page, whose other tabs open Help & Demos. */
export function DashLayout({ current, standalone = false, children }) {
	const pro = useIsPro();
	const href = (id) => (standalone && id === 'extensions' ? '#v3d.extensions' : '#v3d.help.' + id);
	return html`<div class="bp3d-app bp3d-dash-page ld-dash">
		<div class="bp3d-dash">
			<nav class="bp3d-dash-nav" aria-label="3D Viewer dashboard">
				<div class="bp3d-dash-brand">
					<span class="bp3d-dash-brand__mark"><${DIcon} name="Box" size=${14.81} weight=${1.65} /></span>
					<span class="bp3d-dash-brand__name">${pro ? '3D Viewer Pro' : '3D Viewer'}</span>
					<span class="bp3d-dash-brand__ver">v${VERSION}</span>
				</div>
				<div class="bp3d-dash-tabs">
					${tabIds(pro).map((id) => {
						const t = TABS[id];
						const on = current === id;
						return html`<a key=${id} href=${href(id)} class=${on ? 'bp3d-dash-tab bp3d-dash-tab--current' : 'bp3d-dash-tab'} aria-current=${on ? 'page' : undefined}>
							<span class="bp3d-dash-tab__label" style=${t.w ? { minWidth: t.w } : undefined}>${t.label}</span>
							${t.isNew && html`<span class="bp3d-dash-new">NEW</span>`}
						</a>`;
					})}
				</div>
				${!pro && html`<a href="#v3d.help.pricing" class="bp3d-dash-upgrade">Upgrade <${DIcon} name="CrownLine" size=${16} weight=${1.5} /></a>`}
			</nav>
			${children}
		</div>
	</div>`;
}

/* ---- Welcome.tsx ---- */
const LOG_TAGS = {
	analytics: { label: 'Analytics', bg: '#ecfeff', color: '#0e7490', icon: ['StarRound', 21.25, '#8b5cf6'] },
	viewer: { label: 'Viewer', bg: '#d1fae5', color: '#047857', icon: ['SettingsRound', 20.75, '#1b5cf0'] },
	plugin: { label: 'Plugin', bg: '#ffedd5', color: '#c2410c', icon: ['Grid', 20.75, '#f97316'] },
};
const CHANGELOG = [
	{ version: '2.0.0', date: '2026-11-17', tag: 'plugin', text: 'New admin interface, with a switch back to Classic in Settings' },
	{ version: '2.0.0', date: '2026-11-17', tag: 'analytics', text: 'Redesigned Help & Demos and Analytics screens' },
	{ version: '1.10.0', date: '2026-10-01', tag: 'analytics', text: 'Added 3D Analytics for every model' },
	{ version: '1.10.0', date: '2026-10-01', tag: 'viewer', text: 'Added real-world dimension lines in the viewer' },
];
const STEPS = {
	gutenberg: {
		label: 'Gutenberg',
		steps: [
			{ title: 'Add 3D Viewer Block', body: 'Open the block editor, click <strong>+</strong>, and search for <strong>3D Viewer</strong>.', link: { url: '#v3d.edit.new', label: 'Open Editor' } },
			{ title: 'Upload/Select Model', body: 'Select a 3D model (.glb, .gltf, etc.) from the media library or upload a new one.' },
			{ title: 'Configure Settings', body: 'Adjust width, height, auto-rotate, or model options in the sidebar block settings.' },
			{ title: 'Publish', body: 'Publish or update your page to view the interactive 3D model live.' },
		],
	},
	elementor: {
		label: 'Elementor',
		steps: [
			{ title: 'Edit with Elementor', body: 'Open your page in the Elementor editor and search for <strong>3D Model Viewer</strong> in the widget list.' },
			{ title: 'Drag & Drop Widget', body: 'Drag the <strong>3D Model Viewer</strong> widget to the desired section or column in your layout.' },
			{ title: 'Select 3D Model', body: 'Select single or multiple models, upload files, or configure posters directly in the widget Content controls.' },
			{ title: 'Style & Save', body: 'Use the Style tab to customize margins, height, camera controls, or responsive visibility, then save your changes.' },
		],
	},
	shortcode: {
		label: 'Shortcode',
		steps: [
			{ title: 'Create 3D Viewer CPT', body: 'Navigate to <strong>3D Viewer › Add New</strong> to configure your model viewer.', link: { url: '#v3d.edit.new', label: 'Add New' } },
			{ title: 'Upload & Settings', body: 'Upload your 3D file and configure settings using the metadata options.' },
			{ title: 'Copy Shortcode', body: 'Publish the model viewer, and copy the shortcode (e.g. <code>[3d_viewer id="..."]</code>).' },
			{ title: 'Paste Anywhere', body: 'Paste the copied shortcode into any page, post, or widget area.' },
		],
	},
};
// The free plugin's own steps and changelog (3d-viewer/src/admin/dashboard/utils/data.tsx).
const FREE_STEPS = {
	gutenberg: [
		{ title: 'Add the Block', body: 'In the block editor, click <strong>+</strong> or type <strong>/3D Model Viewer</strong> to insert the block.', link: { url: '#v3d.edit.new', label: 'Open Editor' } },
		{ title: 'Upload & Configure', body: 'Add your 3D file (<code>.glb</code>, <code>.gltf</code>, <code>.obj</code>, and more) and adjust size, camera controls, auto-rotate, and lighting right in the block sidebar.' },
		{ title: 'Publish', body: 'Preview the interactive model, then publish your post or page.' },
	],
	elementor: [
		{ title: 'Add the Widget', body: 'Edit any page with Elementor, search the widget panel for <strong>Model Viewer</strong>, and drag it onto your layout.' },
		{ title: 'Upload & Configure', body: 'Add your 3D file (<code>.glb</code>, <code>.gltf</code>, <code>.obj</code>, and more) and adjust size, camera controls, and auto-rotate in the widget settings.' },
		{ title: 'Publish', body: 'Fine-tune the layout, then click <strong>Publish</strong>.' },
	],
	shortcode: [
		{ title: 'Create a 3D Model', body: 'Go to <strong>3D Viewer &rsaquo; Add New</strong>, upload your file, and publish the model.', link: { url: '#v3d.edit.new', label: 'Add New Model' } },
		{ title: 'Copy the Shortcode', body: 'Use the <strong>Copy Shortcode</strong> button on the model edit screen (or the <strong>ShortCode</strong> column in the models list) to grab its <code>[3d_viewer id="…"]</code> code.' },
		{ title: 'Paste & Publish', body: 'Paste the shortcode into any post, page, or widget, then update to view your interactive 3D model.' },
	],
};
const FREE_CHANGELOG = [
	{ version: '2.0.0', date: '2026-10-15', tag: 'plugin', text: 'New admin interface, with a switch back to Classic in Settings' },
	{ version: '2.0.0', date: '2026-10-15', tag: 'plugin', text: 'Redesigned Help & Demos dashboard' },
	{ version: '1.9.4', date: '2026-09-26', tag: 'plugin', text: 'Redesigned the guided setup as a three-step onboarding' },
	{ version: '1.9.4', date: '2026-09-26', tag: 'plugin', text: 'Added a Monthly billing cycle to the Pricing page' },
];
const PRO_FEATURES = ['Interactive hotspots and annotations', 'Multiple models in one viewer gallery', 'A 3D model for each WooCommerce variation'];

const formatDate = (iso) => {
	try {
		return new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
	} catch {
		return iso;
	}
};

function Welcome({ pro }) {
	const [builder, setBuilder] = useState('gutenberg');
	const quick = [
		{ title: 'Create 3D Viewer', desc: 'Build a new 3D viewer for your product or model.', href: LINKS_ADMIN.newViewer, icon: 'Rotate3d', bg: '#ece4ff', color: '#8b5cf6' },
		{ title: 'View Demos', desc: 'Explore ready-made demos and templates.', href: '#v3d.help.demos', icon: 'CursorSelect', bg: '#f2f6ff', color: '#1b5cf0', descWidth: 194 },
		{ title: 'Shortcodes', desc: "Copy any viewer's shortcode from the 3D Viewer list.", href: LINKS_ADMIN.viewers, icon: 'CodeBrackets', bg: '#b5ffe7', color: '#046143', descWidth: 208 },
		{ title: 'Settings', desc: 'Configure general settings and preferences.', href: LINKS_ADMIN.settings, icon: 'Settings02', bg: '#f2f6ff', color: '#1b5cf0', descWidth: 197 },
		{ title: 'Help & Documentation', desc: 'Get support and find helpful guides.', href: PAGES.docs, external: true, icon: 'File01', bg: '#ece4ff', color: '#8b5cf6', descWidth: 184 },
		{ title: 'Extensions', desc: 'Explore more features with premium extensions.', href: '#v3d.help.extensions', icon: 'Plug01', bg: '#ffefe4', color: '#fd6700', isNew: true },
	];
	const support = [
		{ title: 'Need Any Assistance?', desc: 'Our Expert Support Team is always ready to help you out promptly.', cta: 'Contact Support', href: PAGES.support, icon: ['MessageCircle', 20], descWidth: 255 },
		{ title: 'Join Our Community', desc: 'Get tutorials, plugin updates, and share thoughts with other creators.', cta: 'Join Community', href: PAGES.community, icon: ['Users', 20], descWidth: 245 },
		{ title: 'Request a Feature', desc: 'Have an idea that would make this plugin better? Let us know!', cta: 'Submit Idea', href: PAGES.support, icon: ['Lightbulb', 20], descWidth: 221 },
		{ title: 'Loving This Plugin?', desc: "We're a small team pouring our heart and soul into this plugin.", cta: 'Leave a Review', href: PAGES.review, icon: ['Heart', 20.98, '#f97316'], descWidth: 226 },
	];
	const steps = pro ? STEPS[builder].steps : FREE_STEPS[builder];

	return html`
		<div class=${pro ? 'bp3d-dash-home bp3d-dash-home--no-pro' : 'bp3d-dash-home'}>
			<div class="bp3d-dash-home__main">
				<section class="bp3d-dash-hero">
					<div class="bp3d-dash-hero__copy">
						<${PlanTags} isPremium=${pro} />
						<div class="bp3d-dash-hero__lede">
							<h1>Welcome to 3D Viewer 👋</h1>
							<p class="bp3d-dash-text">Display interactive 3D models on your website with beautiful controls and smooth performance.</p>
						</div>
						<div class="bp3d-dash-hero__actions">
							<a href=${LINKS_ADMIN.newViewer} class="bp3d-dash-btn bp3d-dash-btn--primary"><${DIcon} name="Plus" size=${13.17} weight=${1.65} /> Create 3D Viewer</a>
							<a href="#v3d.help.demos" class="bp3d-dash-btn bp3d-dash-btn--ghost"><${DIcon} name="Eye" size=${13.17} weight=${1.65} /> View Demos</a>
						</div>
						<ul class="bp3d-dash-perks">
							${['Easy to use', 'No coding required', 'Works with any theme'].map((p) => html`<li key=${p} class="bp3d-dash-perk"><${SquareCheckFilled} size=${16.46} /> ${p}</li>`)}
						</ul>
					</div>
					<${HeroArt} blobs=${[{ left: 422.9, top: -166.55 }, { left: 603.94, top: -34.06 }]} model=${{ left: 503, top: 48.4 }} degree=${{ left: 429, top: 119.4 }}>
						<${ViewerControls} style=${{ left: 677, top: 114.4 }} icons=${[{ size: 14.37, weight: 1.42 }, { size: 16.2, weight: 1.23 }, { size: 17.85, weight: 1.23 }]} />
					<//>
				</section>

				<section class="bp3d-dash-quick">
					<header class="bp3d-dash-sechead">
						<h2>Quick Access</h2>
						<p class="bp3d-dash-text">Jump into the most used features and start creating your 3D viewer.</p>
					</header>
					<div class="bp3d-dash-quick__grid">
						${quick.map(
							(c) => html`<a key=${c.title} href=${c.href} class="bp3d-dash-qcard" ...${c.external ? NEW_TAB : {}}>
								<div class="bp3d-dash-qcard__head">
									<span class="bp3d-dash-qcard__icon" style=${{ background: c.bg, color: c.color }}><${DIcon} name=${c.icon} size=${19.75} weight=${1.23} /></span>
									${c.isNew && html`<span class="bp3d-dash-new">NEW</span>`}
								</div>
								<div class="bp3d-dash-qcard__body">
									<h3 class="bp3d-dash-title">${c.title}</h3>
									<p class="bp3d-dash-text" style=${c.descWidth ? { width: c.descWidth } : undefined}>${c.desc}</p>
								</div>
								<${DIcon} name="ArrowRight" class="bp3d-dash-qcard__arrow bp3d-dash-rtl-flip" size=${11.52} weight=${1.65} />
							</a>`
						)}
					</div>
				</section>

				<section class="bp3d-dash-updates">
					<header class="bp3d-dash-updates__head">
						<div class="bp3d-dash-updates__title">
							<h2 class="bp3d-dash-title">Latest Updates & Changelog</h2>
							<${Tag} bg="#d1fae5" color="#047857">New<//>
						</div>
						<a href="https://wordpress.org/plugins/3d-viewer/#developers" class="bp3d-dash-updates__all" ...${NEW_TAB}>View All Updates →</a>
					</header>
					<ul class="bp3d-dash-log">
						${(pro ? CHANGELOG : FREE_CHANGELOG).map((c, i) => {
							const tag = LOG_TAGS[c.tag];
							return html`<li key=${i} style="display:contents">
								${i > 0 && html`<span class="bp3d-dash-log__rule" aria-hidden="true"></span>`}
								<div class="bp3d-dash-log__item">
									<div class="bp3d-dash-log__what">
										<span class="bp3d-dash-log__icon"><${DIcon} name=${tag.icon[0]} size=${tag.icon[1]} weight=${1.5} color=${tag.icon[2]} /></span>
										<span class="bp3d-dash-text">${c.text}</span>
										<${Tag} bg=${tag.bg} color=${tag.color}>${tag.label}<//>
									</div>
									<time class="bp3d-dash-log__when" datetime=${c.date} title=${'Version ' + c.version}>${formatDate(c.date)}</time>
								</div>
							</li>`;
						})}
						<li class="bp3d-dash-log__rule" aria-hidden="true"></li>
					</ul>
				</section>
			</div>

			<aside class="bp3d-dash-home__side">
				<section class="bp3d-dash-steps-card">
					<header class="bp3d-dash-steps-card__head">
						<span class="bp3d-dash-steps-card__icon"><${DIcon} name="Rocket" size=${16.37} weight=${1.5} /></span>
						<div>
							<h2 class="bp3d-dash-title">Getting Started</h2>
							<p class="bp3d-dash-text">Follow these simple setup steps.</p>
						</div>
					</header>
					<div class="bp3d-dash-builders" role="tablist" aria-label="Editor">
						${['gutenberg', 'elementor', 'shortcode'].map(
							(k) => html`<button key=${k} type="button" role="tab" aria-selected=${k === builder} class=${k === builder ? 'bp3d-dash-builder bp3d-dash-builder--on' : 'bp3d-dash-builder'} onClick=${() => setBuilder(k)}>${STEPS[k].label}</button>`
						)}
					</div>
					<ol class="bp3d-dash-steps" role="tabpanel">
						${steps.map(
							(s, i) => html`<li key=${s.title} class="bp3d-dash-step">
								<span class="bp3d-dash-step__num">${i + 1}</span>
								<div>
									<h3 class="bp3d-dash-title">${s.title}</h3>
									<p class="bp3d-dash-text" dangerouslySetInnerHTML=${{ __html: s.body }}></p>
									${s.link && html`<a href=${s.link.url} class="bp3d-dash-step__link">${s.link.label} →</a>`}
								</div>
							</li>`
						)}
					</ol>
				</section>

				<section class="bp3d-dash-docs">
					<h2 class="bp3d-dash-docs__title"><${DIcon} name="Book" size=${16.37} weight=${1.82} /><span class="bp3d-dash-title">Read the Full Documentation</span></h2>
					<p class="bp3d-dash-text">Browse through our guides, settings reference, and examples for every single feature.</p>
					<a href=${PAGES.docs} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--primary">Open Documentation →</a>
				</section>

				${!pro &&
				html`<section class="bp3d-dash-pro">
					<header class="bp3d-dash-pro__head">
						<h2 class="bp3d-dash-title">Go 3D Viewer Pro!</h2>
						<${Crown} />
					</header>
					<p class="bp3d-dash-pro__sub">Unlock advanced rendering & custom features.</p>
					<ul class="bp3d-dash-pro__list">
						${PRO_FEATURES.map((f) => html`<li key=${f} class="bp3d-dash-text"><${DIcon} name="Check" size=${10.91} weight=${1.82} /> ${f}</li>`)}
					</ul>
					<a href="#v3d.help.pricing" class="bp3d-dash-btn bp3d-dash-btn--primary">View Pricing Plan →</a>
				</section>`}
			</aside>
		</div>

		<section class="bp3d-dash-support">
			${support.map(
				(s) => html`<div key=${s.title} class="bp3d-dash-support__col">
					<h3 class="bp3d-dash-support__head"><${DIcon} name=${s.icon[0]} size=${s.icon[1]} weight=${1.5} color=${s.icon[2]} /><span class="bp3d-dash-title">${s.title}</span></h3>
					<p class="bp3d-dash-text" style=${{ width: s.descWidth }}>${s.desc}</p>
					<a href=${s.href} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--ghost">${s.cta}</a>
				</div>`
			)}
		</section>
	`;
}

/* ---- Demos.tsx ---- */
const TONES = { blue: ['#ebf3ff', '#1b5cf0'], green: ['#e6fffa', '#047857'], violet: ['#f3e8ff', '#7c3aed'], orange: ['#fffaf0', '#c2410c'], red: ['#fff5f5', '#c53030'] };
const FILTERS = [
	{ id: 'all', label: 'All', w: 49 },
	{ id: 'camera', label: 'Camera & Controls', w: 147 },
	{ id: 'lighting', label: 'Lighting', w: 88 },
	{ id: 'hotspots', label: 'Hotspots', w: 90 },
	{ id: 'variants', label: 'Variants & Textures', w: 160 },
	{ id: 'performance', label: 'Performance & Mobile', w: 170 },
	{ id: 'more', label: 'More', w: 70 },
];
const demoUrl = (path) => `https://3d-viewer.bplugins.com/${path}/`;
// The free plugin badges every other demo PRO and files the STL viewer under Formats.
const FREE_DEMOS = ['getting-started', 'stl', 'hero', 'skybox'];
const DEMOS = [
	['Add a 3D Model Viewer to WordPress with One Block', 'Add one block, pick one model file, and visitors can spin it right away.', 'Getting started', '3d-model-viewer-for-wordpress', 'getting-started', 'green', 'more'],
	['Camera Controls: Starting View, Reset and Lock', 'Choose the angle a model opens on and stop visitors flipping it upside down.', 'Camera & controls', '3d-viewer-camera-controls', 'camera-controls', 'blue', 'camera'],
	['Customise Your 3D Viewer Control Layout', 'Rename, resize, reorder and move all seven viewer buttons.', 'Camera & controls', '3d-viewer-controls', 'viewer-controls', 'blue', 'camera'],
	['HDR Lighting for 3D Models: Compare Four Setups', 'See one toy car under four lighting setups, from default light to studio HDR.', 'Lighting', '3d-model-lighting', 'hdr-lighting', 'orange', 'lighting'],
	['Choose a Style for Your 3D Model Hotspots', 'Compare four hotspot styles on the same chair, from plain text tags to hover cards.', 'Hotspots', '3d-model-hotspots', 'hotspots', 'violet', 'hotspots'],
	['Show Image and Video Hotspots on a 3D Model', 'Click pins on a watch to open a close-up photo, play a video or follow a link.', 'Hotspots', 'image-and-video-hotspots', 'media-hotspots', 'violet', 'hotspots'],
	['Create an Interactive 3D Product Tour in WordPress', 'Click numbered stops and the camera glides to each close-up in the order you set.', 'Hotspots', 'interactive-3d-product-tour', 'product-tour', 'violet', 'hotspots'],
	['AR Product Viewer for WordPress: See It in Your Room', 'Check the sofa’s size with a ruler, then place it true to size on your floor.', 'Augmented reality', 'ar-product-viewer', 'ar', 'blue', 'more'],
	['3D Product Configurator for WordPress With 5 Colourways', 'Switch a sofa between five colourways with no page reloads, all from one 3.1 MB file.', 'Variants & textures', '3d-product-configurator', 'configurator', 'red', 'variants'],
	['Play Animated 3D Models With Clickable Pins', 'Watch a bee animate, switch its animations from a dropdown, or click a pin to play one.', 'Variants & textures', 'animated-3d-models-wordpress', 'animated', 'red', 'variants'],
	['Change 3D Model Colours Without Re-exporting the File', 'Give one model three different colours from inside WordPress, with no Blender needed.', 'Variants & textures', 'change-3d-model-colours', 'colours', 'red', 'variants'],
	['3D Model Gallery for WordPress: Many Models, One Viewer', 'Browse a lamp, a chair and a sofa in one viewer using thumbnails or arrows.', 'Galleries', '3d-model-gallery', 'gallery', 'violet', 'more'],
	['Fast-Loading 3D Models on Mobile With a Poster Image', 'Phones get a light 322 KB poster image instead of a 9.6 MB 3D model.', 'Performance & mobile', '3d-models-on-mobile', 'mobile', 'green', 'performance'],
	['Show Real-World 3D Model Dimensions in WordPress', 'See width, height and depth measured live, and how to fix a file made off-scale.', 'Performance & mobile', '3d-model-dimensions', 'dimensions', 'green', 'performance'],
	['A WordPress STL Viewer for CAD and 3D Printing Files', 'Show STL, STEP, OBJ and FBX files for free, with no conversion, in the Advanced viewer.', 'Advanced viewer', 'wordpress-stl-viewer', 'stl', 'orange', 'more'],
	['Build a Full-Width 3D Hero Section for WordPress', 'Fill the top of a page at 70% of the screen height, or sit at 380px beside text.', 'Styling & embedding', '3d-hero-section', 'hero', 'blue', 'more'],
	['Environment & Skybox Images for 3D Models in WordPress', 'Light a model with an HDR photo, then show it as the background. Both settings are in the free plugin.', 'Lighting', '3d-model-environment-skybox', 'skybox', 'orange', 'lighting'],
].map(([title, desc, tag, path, image, tone, group]) => ({ title, desc, tag, url: demoUrl(path), image, tone, group, pro: !FREE_DEMOS.includes(image) }));

const helpSpan = (count, columns) => columns - (count % columns);

/** The real modal iframes the live demo; the artifact host can't, so it shows the card art and a link out. */
function DemoModal({ demos, index, setIndex }) {
	const demo = demos[index];
	const panel = useRef(null);
	const closeRef = useRef(null);
	useModalFocus(panel, () => setIndex(null), closeRef);
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === 'ArrowRight') setIndex(Math.min(index + 1, demos.length - 1));
			if (e.key === 'ArrowLeft') setIndex(Math.max(index - 1, 0));
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [index, demos.length]);
	if (!demo) return null;
	return html`<div class="bp3d-app bp3d-dash-modal" role="dialog" aria-modal="true" aria-labelledby="bp3d-dash-modal-title">
		<div class="bp3d-dash-modal__backdrop" onClick=${() => setIndex(null)}></div>
		<div class="bp3d-dash-modal__panel" ref=${panel}>
			<header class="bp3d-dash-modal__head">
				<div class="bp3d-dash-modal__title">
					<h2 id="bp3d-dash-modal-title" class="bp3d-dash-title">${demo.title}</h2>
					<span class="bp3d-dash-text">${index + 1} of ${demos.length}</span>
				</div>
				<div class="bp3d-dash-modal__actions">
					<a href=${demo.url} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--ghost">Open in new tab <${DIcon} name="ExternalLink" size=${14} weight=${1.75} /></a>
					<button ref=${closeRef} type="button" class="bp3d-dash-modal__close" onClick=${() => setIndex(null)} aria-label="Close demo"><${DIcon} name="X" size=${18} weight=${2} /></button>
				</div>
			</header>
			<div class="bp3d-dash-modal__stage ld-dash-preview">
				<img src=${img('demo-' + demo.image)} alt="" />
				<div class="ld-dash-preview__card">
					<p class="bp3d-dash-text">${demo.desc}</p>
					<a href=${demo.url} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--primary">Open live demo <${DIcon} name="ExternalLink" size=${14} weight=${1.75} /></a>
					<p class="ld-dash-preview__note">The live preview opens on 3d-viewer.bplugins.com.</p>
				</div>
				${index > 0 && html`<button type="button" class="bp3d-dash-modal__nav bp3d-dash-modal__nav--prev" onClick=${() => setIndex(index - 1)} aria-label="Previous demo"><${DIcon} name="ChevronRight" class="bp3d-dash-rtl-flip" size=${20} weight=${2} /></button>`}
				${index < demos.length - 1 && html`<button type="button" class="bp3d-dash-modal__nav bp3d-dash-modal__nav--next" onClick=${() => setIndex(index + 1)} aria-label="Next demo"><${DIcon} name="ChevronRight" class="bp3d-dash-rtl-flip" size=${20} weight=${2} /></button>`}
			</div>
		</div>
	</div>`;
}

function Demos({ pro }) {
	const [filter, setFilter] = useState('all');
	const [query, setQuery] = useState('');
	const [open, setOpen] = useState(null);
	const demos = useMemo(() => (pro ? DEMOS : DEMOS.map((d) => (d.image === 'stl' ? { ...d, tag: 'Formats' } : d))), [pro]);
	const shown = useMemo(() => {
		const q = query.trim().toLowerCase();
		return demos.filter((d) => (filter === 'all' || d.group === filter) && (!q || `${d.title} ${d.desc} ${d.tag}`.toLowerCase().includes(q)));
	}, [demos, filter, query]);
	const name = pro ? '3D Viewer Pro' : '3D Viewer';

	return html`<div class="bp3d-dash-wide">
		<section class="bp3d-dash-hero bp3d-dash-hero--wide">
			<div class="bp3d-dash-hero__copy">
				<${PlanTags} isPremium=${pro} />
				<div class="bp3d-dash-hero__lede">
					<h1>See the ${name} in action</h1>
					<div>
						<p class="bp3d-dash-text">Browse ready-made demos - click any card to open a live, interactive preview.</p>
						<div class="bp3d-dash-chips">
							<span class="bp3d-dash-chip"><${DIcon} name="Cuboid" size=${14} /> ${demos.length} Demo Examples</span>
							<span class="bp3d-dash-chip" style=${{ minWidth: 133.5 }}><${DIcon} name="Zap" size=${14} /> Fully Interactive</span>
							<span class="bp3d-dash-chip" style=${{ minWidth: 176.67 }}><${DIcon} name="CircleCheck" size=${14} /> Works with Any Theme</span>
						</div>
					</div>
				</div>
			</div>
			<${HeroArt} large blobs=${[{ left: 742, top: -198.6 }, { left: 923.04, top: -66.11 }]} model=${{ left: 806, top: 59.4 }} degree=${{ left: 992.44, top: 72.04 }}>
				<div class="bp3d-dash-thumbs"><span></span><span></span><span></span></div>
				<${ViewerControls} large style=${{ left: 984, top: 182 }} icons=${[{ size: 20.27, weight: 2 }, { size: 22.84, weight: 1.74 }, { size: 25.16, weight: 1.74 }]} />
			<//>
		</section>

		<div class="bp3d-dash-filters">
			<${SearchField} placeholder="Search demos..." label="Search demos" iconSize=${16} weight=${2} value=${query} onChange=${setQuery} />
			<div class="bp3d-dash-pills" role="group" aria-label="Filter demos">
				${FILTERS.filter((f) => pro || f.id !== 'more').map(
					(f) => html`<button key=${f.id} type="button" aria-pressed=${f.id === filter} class=${cx('bp3d-dash-pill', f.id === 'all' && 'bp3d-dash-pill--all', f.id === filter && 'bp3d-dash-pill--on')} style=${{ minWidth: f.w }} onClick=${() => setFilter(f.id)}>${f.label}</button>`
				)}
				${!pro &&
				html`<button type="button" aria-pressed=${filter === 'more'} class=${filter === 'more' ? 'bp3d-dash-pill bp3d-dash-pill--on' : 'bp3d-dash-pill'} style=${{ minWidth: 131 }} onClick=${() => setFilter(filter === 'more' ? 'all' : 'more')}>
					More Filters <${DIcon} name="ChevronDown" size=${12} weight=${2} />
				</button>`}
			</div>
		</div>

		<div class="bp3d-dash-demos">
			${shown.map((d, i) => {
				const [bg, color] = d.tone === 'blue' && !pro ? ['#ebf3ff', '#2f54eb'] : TONES[d.tone];
				return html`<article key=${d.url} class="bp3d-dash-demo">
					<div>
						<div class="bp3d-dash-demo__stage">
							<span class="bp3d-dash-demo__tag" style=${{ background: bg, color }}>${d.tag.toUpperCase()}</span>
							${d.pro && !pro && html`<span class="bp3d-dash-demo__pro">PRO</span>`}
							<img src=${img('demo-' + d.image)} alt="" loading="lazy" />
						</div>
						<div class="bp3d-dash-demo__copy">
							<h3 class="bp3d-dash-title">${d.title}</h3>
							<p class="bp3d-dash-text">${d.desc}</p>
						</div>
					</div>
					<footer class="bp3d-dash-demo__foot">
						<button type="button" class="bp3d-dash-demo__preview" onClick=${() => setOpen(i)}>Preview <${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${11.11} weight=${1.85} /></button>
						<a href=${d.url} ...${NEW_TAB} class="bp3d-dash-demo__go" aria-label=${`Open ${d.title} in a new tab`}><${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${11.11} weight=${1.85} /></a>
					</footer>
				</article>`;
			})}
			${!shown.length && html`<p class="bp3d-dash-text bp3d-dash-demos__empty">No demos match your search.</p>`}
			<aside class="bp3d-dash-help" style=${{ '--bp3d-help-span': helpSpan(shown.length, 5), '--bp3d-help-span-3': helpSpan(shown.length, 3) }}>
				<div class="bp3d-dash-help__main">
					<div class="bp3d-dash-help__intro">
						<span class="bp3d-dash-help__icon"><${DIcon} name="CircleHelp" size=${22.22} weight=${1.85} /></span>
						<div>
							<h3>Need Help?</h3>
							<p>Check our documentation or get support from our team.</p>
						</div>
					</div>
					<div class="bp3d-dash-help__actions">
						<a href=${PAGES.docs} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--primary">View Docs <${DIcon} name="ExternalLink" size=${12.96} weight=${1.85} /></a>
						<a href=${PAGES.support} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--ghost"><${DIcon} name="Mail" size=${12.96} weight=${1.85} /> Contact Support</a>
					</div>
				</div>
				<div class="bp3d-dash-help__art"><img src=${img('need-help')} alt="" /></div>
			</aside>
		</div>

		${open !== null && html`<${DemoModal} demos=${shown} index=${open} setIndex=${setOpen} />`}
	</div>`;
}

/* ---- Pricing.tsx / Compare.tsx, with the Freemius plans (product 8795) ---- */
const FEATURES = [
	['Gutenberg Block', 'Add the 3D viewer using Gutenberg block.'],
	['Supports Popular 3D Formats (GLB, GLTF, OBJ, STL, and more)', 'Works with all major 3D model formats.'],
	['Support for external model URLs', 'Load models from any external source.'],
	['Show 3D product on your WooCommerce product pages', 'Display 3D models on product pages.'],
	['Touch, Pan, Zoom & Rotate controls', 'Interactive 3D viewing controls.'],
	['Lazy Loading for Performance', 'Load models only when needed.'],
	['Add a poster image to show while the model is loading (Lite View)', 'Show a preview image before the 3D model loads.'],
	['Display a progress bar until the 3D file is fully loaded', 'Keep users informed during loading.'],
	['Display loading progress as a percentage', 'Show exact loading percentage.'],
	['Enable/Disable moving control', 'Turn on or off model movement.'],
	['Elementor Widget/Addons', 'Use with Elementor and more add-ons.'],
	['Show/Hide Fullscreen Button on the Viewer', 'Toggle fullscreen button visibility.'],
	['Preset to save your preferred viewer configurations', 'Save and reuse your settings.'],
	['Auto-Rotation to view in 360° without interaction', 'Enable automatic rotation.'],
	['Full viewer settings on Elementor widget/addons', 'Advanced viewer settings in Elementor.'],
	['Add multiple 3D models into a single viewer gallery', 'Create galleries with multiple models.'],
	['Add 3D models for each variant for the WooCommerce product', 'Show different models for each variant.'],
	['Adjust lighting, shadow intensity, and exposure', 'Control lighting and visual effects.'],
	['Enable or disable auto-rotate, and autoplay', 'More control over viewer behavior.'],
	['Set a custom camera angle for the perfect first impression', 'Create the best initial view for your audience.'],
	['Includes all the premium extensions', ''],
].map(([title, desc]) => ({ title, desc }));
const PLANS = [
	{ id: 14970, name: 'pro', title: 'Pro', blurb: 'Includes some awesome premium features.', features: FEATURES.slice(0, 20), pricing: [{ licenses: 1, monthly: 5.99, annual: 59.99, lifetime: 179.99 }, { licenses: 3, monthly: 10.99, annual: 107.99, lifetime: 329.99 }, { licenses: null, monthly: 39.99, annual: 383.99, lifetime: 699 }] },
	{ id: 52950, name: 'max', title: 'Max', blurb: 'Includes all the premium extensions.', features: FEATURES, pricing: [{ licenses: 1, monthly: 8.99, annual: 83.88, lifetime: 259.99 }, { licenses: 3, monthly: 15.99, annual: 155.88, lifetime: 469.99 }, { licenses: null, monthly: 60.99, annual: 587.88, lifetime: 1769.99 }] },
];
const FREE_FEATURES = 12;
const CYCLES = ['monthly', 'annual', 'lifetime'];
const cycleLabel = (c) => ({ monthly: 'Monthly', annual: 'Yearly', lifetime: 'Lifetime' })[c];
const perLabel = (c) => ({ monthly: '/ mo', annual: '/ yr', lifetime: 'one-time' })[c];
const money = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const annualSaving = (plan) => {
	const one = plan.pricing[0];
	return Math.round(((one.monthly * 12 - one.annual) / (one.monthly * 12)) * 100);
};
const sitesLabel = (l) => (!l ? 'Unlimited Sites' : l === 1 ? 'Single Site' : `${l} Sites`);

function BillingToggle({ value, onChange, save }) {
	return html`<div class="bp3d-dash-billing bp3d-dash-billing--3" role="radiogroup" aria-label="Billing period">
		${CYCLES.map(
			(o) => html`<button key=${o} type="button" role="radio" aria-checked=${o === value} class=${cx('bp3d-dash-billing__opt', 'bp3d-dash-billing__opt--' + (o === 'annual' ? 'yearly' : o), o === value && 'bp3d-dash-billing__opt--on')} onClick=${() => onChange(o)}>
				${cycleLabel(o)}${o === 'annual' && save > 0 && html`<span class="bp3d-dash-billing__save">Save ${save}%</span>`}
			</button>`
		)}
	</div>`;
}

function PlanCard({ plan, cycle }) {
	const [site, setSite] = useState(1);
	const price = plan.pricing.find((p) => p.licenses === site);
	const amount = price[cycle];
	const monthlyYear = price.monthly * 12;
	const perSite = site && site > 1 ? amount / site : 0;
	const note = { monthly: 'Billed monthly, cancel anytime.', annual: `Billed yearly • $${(amount / 12).toFixed(2)}/mo`, lifetime: 'One-time payment, pay once forever.' }[cycle];
	return html`<article class=${plan.name === 'max' ? 'bp3d-dash-plan bp3d-dash-plan--max' : 'bp3d-dash-plan'}>
		<header class="bp3d-dash-plan__head">
			${plan.name === 'pro' ? html`<span class="bp3d-dash-plan__flag"><${DIcon} name="Star" size=${11.1} /> Most Popular</span>` : html`<span class="bp3d-dash-plan__flag bp3d-dash-plan__flag--blank" aria-hidden="true"></span>`}
			<h2>${plan.title}</h2>
			<p class="bp3d-dash-text">${plan.blurb}</p>
		</header>
		<div class="bp3d-dash-sites" role="radiogroup" aria-label="Number of sites">
			${[1, 3, null].map((l) => html`<button key=${String(l)} type="button" role="radio" aria-checked=${l === site} class=${l === site ? 'bp3d-dash-sites__on' : undefined} onClick=${() => setSite(l)}>${sitesLabel(l)}</button>`)}
		</div>
		<div class="bp3d-dash-price">
			<div class="bp3d-dash-price__main">
				<span class="bp3d-dash-price__cur">$</span>
				<span class="bp3d-dash-price__amt">${money(amount)}</span>
				<span class="bp3d-dash-price__per">${perLabel(cycle)}</span>
			</div>
			${cycle === 'annual' &&
			monthlyYear > amount &&
			html`<div class="bp3d-dash-price__was">
				<s>$${monthlyYear.toFixed(2)}</s>
				<span>if paid monthly</span>
				<span class="bp3d-dash-price__save">Save $${Math.round(monthlyYear - amount)}</span>
			</div>`}
			<p class="bp3d-dash-text">${note}${perSite > 0 && ` • ≈ $${perSite.toFixed(2)} per site`}</p>
		</div>
		<div class="bp3d-dash-plan__rule" aria-hidden="true"></div>
		<ul class="bp3d-dash-plan__feats">
			${plan.features.map((f) => html`<li key=${f.title} class="bp3d-dash-text"><span class="bp3d-dash-tick"><${DIcon} name="Check" size=${9.25} weight=${1.85} /></span>${f.title}</li>`)}
		</ul>
		<a href=${LINKS.pricing} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-plan__buy">Buy Now <${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${12.95} weight=${1.85} /></a>
	</article>`;
}

function Faq() {
	const [open, setOpen] = useState(0);
	const faq = [
		['Can I upgrade my plan later?', 'Yes — you can upgrade any time from your account. We prorate the difference automatically.'],
		['What happens after my license expires?', 'The plugin keeps working forever. You only lose access to premium features, updates and premium support unless you renew.'],
		['Do you offer refunds?', 'Absolutely. Every plan is backed by a 14 days no-questions-asked money-back guarantee.'],
	];
	return html`<section class="bp3d-dash-faq">
		<header class="bp3d-dash-faq__head">
			<h2>Frequently asked questions</h2>
			<p class="bp3d-dash-text">Find quick answers to common questions about our pricing and plans.</p>
		</header>
		<div class="bp3d-dash-faq__list">
			${faq.map(
				([q, a], i) => html`<div key=${q} class="bp3d-dash-faq__item">
					<button type="button" class="bp3d-dash-faq__q" aria-expanded=${open === i} onClick=${() => setOpen(open === i ? -1 : i)}>
						<span class="bp3d-dash-title">${q}</span>
						<${DIcon} name=${open === i ? 'ChevronUp' : 'ChevronDown'} size=${16} weight=${2} />
					</button>
					${open === i && html`<p class="bp3d-dash-text">${a}</p>`}
				</div>`
			)}
		</div>
	</section>`;
}

function Pricing() {
	const [cycle, setCycle] = useState('annual');
	const assurances = [
		{ title: '14 days money back', sub: 'Risk-free purchase', icon: 'ShieldCheck' },
		{ title: 'Plugin updates', sub: 'On every plan', icon: 'RefreshCw', color: '#8b5cf6' },
		{ title: 'Priority support', sub: 'Get help when you need it', icon: 'Headset' },
		{ title: 'Secure checkout', sub: 'Powered by Freemius', icon: 'Lock' },
	];
	return html`
		<header class="bp3d-dash-intro">
			<span class="bp3d-dash-intro__badge">Pricing</span>
			<h1>Pick the plan that fits your project</h1>
			<p class="bp3d-dash-text">Unlock more features, get better control and take your 3D viewer experience to the next level. Choose a plan that works for you.</p>
			<${BillingToggle} value=${cycle} onChange=${setCycle} save=${annualSaving(PLANS[0])} />
		</header>
		<div class="bp3d-dash-plans">${PLANS.map((p) => html`<${PlanCard} key=${p.id} plan=${p} cycle=${cycle} />`)}</div>
		<div class="bp3d-dash-after">
			<div class="bp3d-dash-assure">
				${assurances.map(
					(a) => html`<div key=${a.title} class="bp3d-dash-assure__card">
						<span class="bp3d-dash-assure__icon" style=${a.color ? { color: a.color } : undefined}><${DIcon} name=${a.icon} size=${20.7} weight=${2.07} /></span>
						<div>
							<h3 class="bp3d-dash-title">${a.title}</h3>
							<p class="bp3d-dash-text">${a.sub}</p>
						</div>
					</div>`
				)}
			</div>
			<${Faq} />
		</div>
	`;
}

const Mark = ({ yes }) =>
	yes
		? html`<span class="bp3d-dash-yes" role="img" aria-label="Included"><${DIcon} name="Check" size=${9.88} weight=${2.47} /></span>`
		: html`<span class="bp3d-dash-no" role="img" aria-label="Not included"><${DIcon} name="X" size=${9.88} weight=${2.47} /></span>`;

function Compare() {
	const [cycle, setCycle] = useState('annual');
	const [query, setQuery] = useState('');
	const pro = PLANS[0];
	const rows = pro.features.map((f, i) => ({ ...f, free: i < FREE_FEATURES }));
	const q = query.trim().toLowerCase();
	const shown = q ? rows.filter((r) => `${r.title} ${r.desc}`.toLowerCase().includes(q)) : rows;
	const proOnly = rows.filter((r) => !r.free).length;
	const one = pro.pricing[0];
	const amount = one[cycle];
	const monthlyYear = one.monthly * 12;
	const save = annualSaving(pro);
	return html`
		<header class="bp3d-dash-intro bp3d-dash-intro--compare">
			<span class="bp3d-dash-intro__badge">Feature Comparison</span>
			<h1>Free vs Pro at a glance</h1>
			<p class="bp3d-dash-text">See exactly what unlocks when you upgrade. ${proOnly} features are exclusive to Pro.</p>
			<${BillingToggle} value=${cycle} onChange=${setCycle} save=${save} />
		</header>
		<div>
			<div class="bp3d-dash-tiers">
				<article class="bp3d-dash-tier">
					<div class="bp3d-dash-tier__top">
						<${Tag} class="bp3d-dash-tag--tight" bg="#e6fbf3" color="#047857">Free<//>
						<div>
							<h2>Free</h2>
							<p class="bp3d-dash-text">Essential features to get you started.</p>
						</div>
					</div>
					<div class="bp3d-dash-tier__price"><span class="bp3d-dash-tier__amt">$0</span><span class="bp3d-dash-text">/ forever</span></div>
					<div class="bp3d-dash-tier__note"><${DIcon} name="CircleCheck" size=${19.75} weight=${1.65} /><span class="bp3d-dash-text">Includes core 3D viewer mechanics</span></div>
					<div class="bp3d-dash-btn bp3d-dash-tier__cta"><${DIcon} name="Check" size=${13.17} weight=${2.47} /> You Already Have It</div>
				</article>
				<article class="bp3d-dash-tier bp3d-dash-tier--pro">
					<div class="bp3d-dash-tier__top">
						<${Tag} bg="rgba(255,255,255,.1)" color="#fff" class="bp3d-dash-tag--tight">Pro<//>
						<div>
							<h2>Pro</h2>
							<p class="bp3d-dash-tier__desc">Advanced features and priority support for professionals.</p>
						</div>
					</div>
					<div class="bp3d-dash-tier__price">
						<span class="bp3d-dash-tier__amt">$${money(amount)}</span>
						<span class="bp3d-dash-tier__per">${perLabel(cycle)}</span>
						${cycle === 'annual' && html`<s class="bp3d-dash-tier__per">$${monthlyYear.toFixed(2)}</s><span class="bp3d-dash-tier__save">Save ${save}%</span>`}
					</div>
					<div class="bp3d-dash-tier__note"><${DIcon} name="CircleCheck" size=${19.75} weight=${1.65} /><span class="bp3d-dash-text">Unlocks all Pro features instantly</span></div>
					<a href=${LINKS.pricing} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-tier__cta">Get Pro Now →</a>
				</article>
			</div>

			<section class="bp3d-dash-matrix">
				<div class="bp3d-dash-matrix__meta">
					<div>
						<div class="bp3d-dash-matrix__title">
							<span class="bp3d-dash-matrix__glyph"><${DIcon} name="List" size=${11.52} weight=${1.65} /></span>
							<h2>Feature Breakdown</h2>
						</div>
						<p class="bp3d-dash-text">Compare what's included in Free and Pro plans.</p>
					</div>
					<${SearchField} placeholder="Search features..." label="Search features" iconSize=${13.17} weight=${1.65} value=${query} onChange=${setQuery} />
				</div>
				<div class="bp3d-dash-table" role="table" aria-label="Free vs Pro features">
					<div class="bp3d-dash-table__row bp3d-dash-table__head" role="row">
						<span class="bp3d-dash-table__feat bp3d-dash-text" role="columnheader">FEATURE</span>
						<span class="bp3d-dash-table__col bp3d-dash-text" role="columnheader">FREE</span>
						<span class="bp3d-dash-table__pro bp3d-dash-text" role="columnheader">PRO</span>
					</div>
					${shown.map(
						(r) => html`<div key=${r.title} class="bp3d-dash-table__row" role="row">
							<div class="bp3d-dash-table__feat" role="cell">
								<div class="bp3d-dash-table__name">
									<span class="bp3d-dash-title">${r.title}</span>
									${!r.free && html`<${Tag} class="bp3d-dash-tag--tight" bg="#f3f6ff" color="#1b5cf0">Pro only<//>`}
								</div>
								${r.desc && html`<p class="bp3d-dash-text">${r.desc}</p>`}
							</div>
							<span class="bp3d-dash-table__col" role="cell"><${Mark} yes=${r.free} /></span>
							<span class="bp3d-dash-table__col" role="cell"><${Mark} yes /></span>
						</div>`
					)}
					${!shown.length && html`<div class="bp3d-dash-table__row" role="row"><span class="bp3d-dash-text" role="cell">No features match your search.</span></div>`}
				</div>
			</section>
		</div>
	`;
}

/* ---- OurPlugins.tsx, with bPlugins' WordPress.org listing ---- */
const ORG_PLUGINS = [
	['html5-video-player', 'HTML5 Video Player – embed fast, responsive videos with ease', '2.14.0', 92, 950060, 20000, 'Responsive HTML5 video player for WordPress. Embed MP4, WebM, OGG, YouTube & Vimeo with shortcodes or blocks – customizable, fast, SEO-friendly.'],
	['pdf-poster', "PDF Poster – Let visitors read PDF's without leaving the page", '2.6.1', 90, 793383, 20000, 'Embed PDF files in WordPress with a responsive PDF viewer, flipbook, shortcode and Gutenberg block, plus print, download and view analytics.'],
	['html5-audio-player', 'HTML5 Audio Player – The Ultimate No-Code Podcast, MP3 & Audio Player', '2.9.0', 92, 596146, 10000, "Maximize your WordPress site's potential with our versatile HTML5 Audio Player plugin. Seamlessly play .mp3, .wav, .ogg, and more audio files."],
	['advanced-post-block', 'Advanced Post Block – Display Your Posts Exactly How You Want', '2.5.1', 84, 626597, 10000, 'Advanced Post Block lets you add dynamic post grids, lists, sliders, and tickers. Filter content by category, tag, author, or custom post type.'],
	['advance-custom-html', 'Advance Custom HTML – Show Off Code Snippets with Live Preview', '2.1.1', 100, 181050, 10000, 'Display HTML, CSS, JavaScript, PHP & Python code snippets in WordPress with live preview, syntax highlighting and a copy button.'],
	['document-emberdder', 'Document Embedder – let visitors read files without downloading', '2.4.0', 98, 271410, 9000, 'Embed PDF, Word, Excel, PowerPoint and 16+ file types in WordPress with a responsive viewer, FlipBook mode, download button and document library.'],
	['b-carousel-block', 'Carousel Block – Showcase Images in Elegant Sliding Displays', '1.2.3', 100, 104007, 7000, 'Create responsive image and content carousels in Gutenberg. Captions, autoplay, effects, navigation – build elegant sliders with no code.'],
	['b-slider', 'bSlider – Build Sliders That Bring Your Content to Life', '2.2.2', 80, 252578, 6000, 'Responsive sliders from images, posts, WooCommerce, videos or blocks — or start from 50+ ready-made templates. Block editor & shortcode.'],
	['embed-lottie-player', 'Embed Lottie Player – bring your pages to life with animation', '1.3.0', 100, 95912, 4000, 'Embed Lottie animations (.json and .dotlottie) in WordPress with a Gutenberg block – autoplay, loop, controls, interactivity, and styling.'],
	['b-blocks', 'bBlocks – Essential Gutenberg Blocks & Patterns Collection', '2.1.10', 100, 51572, 700, 'bBlocks enhances the Gutenberg editor with over 80 custom blocks for layout, content, and design, turning it into a powerful WordPress page builder'],
].map(([slug, name, version, rating, downloaded, installs, desc]) => ({ slug, name, version, rating, downloaded, installs, desc }));

const displayName = (name) => name.split(/\s*[–\-—]\s*/)[0].trim();
const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k` : String(n));
// Demo installs live for the visit only; nothing is downloaded.
const pluginStatus = {};

function PluginCard({ plugin }) {
	const [status, setStatus] = useState(pluginStatus[plugin.slug] || 'notfound');
	const install = () => {
		setStatus('installing');
		setTimeout(() => {
			setStatus('success');
			setTimeout(() => {
				pluginStatus[plugin.slug] = 'activated';
				setStatus('activated');
			}, 1000);
		}, 1100);
	};
	const label = { activated: 'Activated', success: 'Activated', installing: 'Installing…', notfound: 'Install & Activate' }[status];
	const done = status === 'activated' || status === 'success';
	const busy = status === 'installing';
	const rating = plugin.rating / 20;
	return html`<article class="bp3d-dash-extcard">
		<div class="bp3d-dash-extcard__shot">
			<span class="bp3d-ext__glyph ld-dash-plugin-glyph" aria-hidden="true">${displayName(plugin.name).replace(/^b(?=[A-Z])/, '').charAt(0)}</span>
			${done && html`<${Tag} class="bp3d-dash-tag--active">Active<//>`}
		</div>
		<div class="bp3d-dash-extcard__body">
			<div class="bp3d-dash-extcard__head">
				<span class="bp3d-dash-extcard__icon"><${DIcon} name="Box" size=${20} weight=${1.75} /></span>
				<div>
					<h3 class="bp3d-dash-title">${displayName(plugin.name)}</h3>
					<div class="bp3d-dash-extcard__by">
						<span class="bp3d-dash-extcard__ver">v${plugin.version}</span>
						<span class="bp3d-dash-extcard__author" title=${`Rated ${rating.toFixed(1)} out of 5`}><${DIcon} name="Star" size=${12} weight=${1.75} /> ${rating.toFixed(1)} · ${compact(plugin.downloaded)} downloads</span>
					</div>
				</div>
			</div>
			<p class="bp3d-dash-text">${plugin.desc}</p>
			<div class="bp3d-dash-extcard__actions">
				<a href=${`https://wordpress.org/plugins/${plugin.slug}/`} ...${NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--ghost"><${DIcon} name="ExternalLink" size=${14} weight=${1.75} /> Learn More</a>
				<button type="button" class=${`bp3d-dash-btn bp3d-dash-btn--primary bp3d-dash-extcard__cta is-${status}`} disabled=${done || busy} onClick=${install}>
					${label} ${!done && !busy && html`<${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${14} weight=${1.75} />`}
				</button>
			</div>
		</div>
	</article>`;
}

/** The lamp + docs strip under a shelf (bp3d-dash-exthelp). */
export function ExtHelp({ title, text, cta, href, internal = false, icon = 'ExternalLink' }) {
	return html`<aside class="bp3d-dash-exthelp">
		<div class="bp3d-dash-exthelp__info">
			<span class="bp3d-dash-exthelp__lamp"><${DIcon} name="Lightbulb" size=${14.81} weight=${1.65} /></span>
			<div>
				<h3 class="bp3d-dash-title">${title}</h3>
				<p class="bp3d-dash-text">${text}</p>
			</div>
		</div>
		<a href=${href} ...${internal ? {} : NEW_TAB} class="bp3d-dash-btn bp3d-dash-btn--ghost"><span class="bp3d-dash-title">${cta}</span> <${DIcon} name=${icon} class=${icon === 'ArrowRight' ? 'bp3d-dash-rtl-flip' : undefined} size=${14} weight=${1.5} /></a>
	</aside>`;
}

/** Plugins / Extensions / License hero: eyebrow, lede, three chips and a two-stat card. */
export function ShelfHero({ variant, eyebrow, title, text, chips, stats, statClass }) {
	const icon = (name) => (name === 'Crown' ? html`<${Crown} weight=${2} />` : html`<${DIcon} name=${name} size=${20} weight=${2} />`);
	return html`<section class=${'bp3d-dash-hero bp3d-dash-hero--wide bp3d-dash-hero--' + variant}>
		<div class="bp3d-dash-hero__copy">
			<span class="bp3d-dash-hero__eyebrow bp3d-dash-title">${eyebrow}</span>
			<div class="bp3d-dash-hero__lede">
				<h1>${title}</h1>
				<div>
					<p class="bp3d-dash-text">${text}</p>
					<div class="bp3d-dash-chips">
						${chips.map(([name, label, w]) => html`<span key=${label} class="bp3d-dash-chip" style=${w ? { minWidth: w } : undefined}><${DIcon} name=${name} size=${14} /> ${label}</span>`)}
					</div>
				</div>
			</div>
		</div>
		<${HeroArt} large blobs=${[{ left: 477, top: -198.6 }, { left: 658.04, top: -66.11 }]} model=${{ left: 541, top: 59.4 }} degree=${{ left: 727.44, top: 72.04 }}>
			${stats &&
			html`<div class="bp3d-dash-stats">
				${stats.map(
					([name, value, label, on], i) => html`${i > 0 && html`<span class="bp3d-dash-stats__rule"></span>`}
						<div class="bp3d-dash-stat">
							<span class=${on ? 'bp3d-dash-stat__icon bp3d-dash-stat__icon--on' : 'bp3d-dash-stat__icon'}>${icon(name)}</span>
							<strong class=${statClass} title=${statClass ? String(value) : undefined}>${value}</strong>
							<span>${label}</span>
						</div>`
				)}
			</div>`}
		<//>
	</section>`;
}

export const FILTER_CHIPS = [
	{ id: 'all', label: 'All', width: 73 },
	{ id: 'active', label: 'Active', width: 90 },
	{ id: 'inactive', label: 'Inactive', width: 97 },
	{ id: 'available', label: 'Available', width: 104 },
];

export function CountChips({ value, counts, onChange, label }) {
	return html`<div class="bp3d-dash-shelf__chips" role="group" aria-label=${label}>
		${FILTER_CHIPS.map(
			(f) => html`<button key=${f.id} type="button" aria-pressed=${f.id === value} class=${f.id === value ? 'bp3d-dash-count bp3d-dash-count--on' : 'bp3d-dash-count'} style=${{ minWidth: f.width }} onClick=${() => onChange(f.id)}>
				${f.label} <span>${counts[f.id]}</span>
			</button>`
		)}
	</div>`;
}

function OurPlugins() {
	const [search, setSearch] = useState('');
	const [sort, setSort] = useState('popular');
	const [filter, setFilter] = useState('all');
	const [, force] = useState(0);
	useEffect(() => {
		const t = setInterval(() => force((n) => n + 1), 800);
		return () => clearInterval(t);
	}, []);
	const status = (p) => (pluginStatus[p.slug] ? 'activated' : 'notfound');
	const counts = { all: ORG_PLUGINS.length, active: ORG_PLUGINS.filter((p) => status(p) === 'activated').length, inactive: 0, available: ORG_PLUGINS.filter((p) => status(p) === 'notfound').length };
	const q = search.trim().toLowerCase();
	const by = { all: () => true, active: (s) => s === 'activated', inactive: (s) => s === 'installed', available: (s) => s === 'notfound' };
	const list = ORG_PLUGINS.filter((p) => by[filter](status(p)) && (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
	if (sort === 'popular') list.sort((a, b) => b.installs - a.installs);
	if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
	if (sort === 'name') list.sort((a, b) => displayName(a.name).localeCompare(displayName(b.name)));
	const sorts = [
		['popular', 'Popular', 'Puzzle'],
		['rating', 'Top Rated', 'Star'],
		['name', 'A–Z', 'Blocks'],
	];

	return html`
		<${ShelfHero}
			variant="plugins"
			eyebrow="Made by bPlugins"
			title="Discover more plugins from our team"
			text="Hand-crafted WordPress plugins built with the same care and quality. Install any of them with a single click."
			chips=${[['Cuboid', `${counts.all} Plugins`, 128], ['Zap', 'One-Click Install', 122.5], ['CircleCheck', 'Free on WordPress.org', 138.67]]}
			stats=${[['Box', counts.active + counts.inactive, 'Installed'], ['Power', counts.active, 'Active', true]]}
		/>
		<div class="bp3d-dash-ext bp3d-dash-ext--plugins">
			<div class="bp3d-dash-subnav">
				<div class="bp3d-dash-subnav__tabs" role="group" aria-label="Sort plugins">
					${sorts.map(
						([id, label, icon]) => html`<button key=${id} type="button" aria-pressed=${sort === id} class=${sort === id ? 'bp3d-dash-subnav__tab bp3d-dash-subnav__tab--on' : 'bp3d-dash-subnav__tab'} onClick=${() => setSort(id)}>
							<${DIcon} name=${icon} size=${13.17} /> ${label}
						</button>`
					)}
				</div>
				<${SearchField} placeholder="Search plugins..." label="Search plugins" iconSize=${13.17} weight=${1.65} value=${search} onChange=${setSearch} />
			</div>
			<section class="bp3d-dash-shelf">
				<${CountChips} value=${filter} counts=${counts} onChange=${setFilter} label="Filter plugins" />
				<div class="bp3d-dash-shelf__grid">
					${!list.length && html`<p class="bp3d-dash-text bp3d-dash-loading">No plugins match. Try a different keyword.</p>`}
					${list.map((p) => html`<${PluginCard} key=${p.slug} plugin=${p} />`)}
				</div>
			</section>
			<${ExtHelp} title="Looking for 3D Viewer extensions?" text=${html`Premium add-ons for 3D Viewer, each with its own license.${' '}<a href=${PAGES.docs} ...${NEW_TAB}>Read the documentation</a>`} cta="Open Extensions" href="#v3d.help.extensions" internal icon="ArrowRight" />
		</div>
	`;
}

/* ---- LegacyMaterials.tsx (Tools) ---- */
function Tools() {
	const [loading, setLoading] = useState(false);
	const [scannedAt, setScannedAt] = useState(() => new Date());
	const [progress, setProgress] = useState(0);
	const total = 6;
	const rescan = () => {
		setLoading(true);
		setProgress(0);
		let n = 0;
		const t = setInterval(() => {
			n += 1;
			setProgress(n);
			if (n >= total) {
				clearInterval(t);
				setTimeout(() => {
					setLoading(false);
					setScannedAt(new Date());
				}, 250);
			}
		}, 160);
	};
	return html`<div class="bp3dLegacyMaterials">
		<section class="lmHero bp3d-dash-hero bp3d-dash-hero--wide">
			<div class="bp3d-dash-hero__copy">
				<span class="bp3d-dash-hero__eyebrow bp3d-dash-title">Tools</span>
				<div class="bp3d-dash-hero__lede">
					<h2>Fix legacy materials</h2>
					<div>
						<p class="bp3d-dash-text">Models saved in the old Specular-Glossiness format (Paint 3D, 3D Builder, older Sketchfab downloads) show up white in the viewer. Convert them here. Your original files are never changed.</p>
						${loading
							? html`<div class="lmChips" aria-hidden="true">${[168, 120, 114].map((w) => html`<span key=${w} class="lmChip lmChip--skel" style=${{ width: w }}></span>`)}</div>`
							: html`<div class="lmChips">
									<span class="lmChip"><${DIcon} name="Cuboid" size=${14} />${total} 3D files checked</span>
									<span class="lmChip"><${DIcon} name="Zap" size=${14} />0 to convert</span>
									<span class="lmChip lmChip--ok"><${DIcon} name="CircleCheck" size=${14} />0 converted</span>
								</div>`}
					</div>
				</div>
			</div>
			<${HeroArt} large blobs=${[{ left: 742, top: -198.6 }, { left: 923.04, top: -66.11 }]} model=${{ left: 806, top: 59.4 }} degree=${{ left: 992.44, top: 72.04 }}>
				<${ViewerControls} large style=${{ left: 984, top: 182 }} icons=${[{ size: 20.27, weight: 2 }, { size: 22.84, weight: 1.74 }, { size: 25.16, weight: 1.74 }]} />
			<//>
		</section>

		<section class="lmCard">
			<header class="lmCard__head">
				<div class="lmCard__title">
					<h3>Legacy models in your Media Library</h3>
					${loading ? html`<span class="lmMeta lmMeta--skel" aria-hidden="true"></span>` : html`<span class="lmMeta">Last scanned ${scannedAt.toLocaleString()}</span>`}
				</div>
				<div class="lmCard__actions">
					<button class="lmBtn" disabled=${loading} onClick=${rescan}><${DIcon} name="RefreshCw" size=${16} weight=${1.75} />Rescan Media Library</button>
					<button class="lmBtn primary" disabled><${DIcon} name="Zap" size=${16} weight=${1.75} />Convert all</button>
				</div>
			</header>
			${loading
				? html`<div class="lmLoading" role="status">
						<div class="lmLoading__text">Scanning your Media Library… ${progress} of ${total}</div>
						<div class="lmProgress"><span style=${{ width: `${Math.round((progress / total) * 100)}%` }}></span></div>
						${[0, 1, 2].map((i) => html`<div class="lmSkel" key=${i} aria-hidden="true"><span class="lmSkel__icon"></span><span class="lmSkel__lines"><span></span><span></span></span><span class="lmSkel__btn"></span></div>`)}
					</div>`
				: html`<div class="lmEmpty">
						<span class="lmEmpty__icon"><${DIcon} name="CircleCheck" size=${22} weight=${1.75} /></span>
						<strong>No legacy Specular-Glossiness models found. Nothing to fix.</strong>
						<span>Every 3D file in your Media Library already uses the current material format.</span>
					</div>`}
		</section>

		<section class="lmInfo">
			<span class="lmInfo__icon"><${DIcon} name="Lightbulb" size=${18} weight=${1.75} /></span>
			<div>
				<h3>How it works</h3>
				<ol>
					<li>The scan finds models in your Media Library that use the legacy material format.</li>
					<li>Convert creates a copy next to each one, named …-metalrough.glb.</li>
					<li>Open the post or product and choose the converted file with the Model URL control.</li>
				</ol>
				<p class="lmNote">Conversion runs in your browser using glTF-Transform, the same library the official model-viewer editor uses. Specular-glossiness textures are re-encoded as PNG, so a converted copy is often larger than the original — if it exceeds this server’s upload limit the tool offers it as a download instead. Very rough surfaces may lose a little specular precision; everything else is preserved. Uploads use your normal Media Library permissions.</p>
			</div>
		</section>
	</div>`;
}

/* ---- Activation.tsx: a Pro licence, active ---- */
function Activation() {
	const [busy, setBusy] = useState('');
	const [notice, setNotice] = useState(null);
	const [confirming, setConfirming] = useState(false);
	const [changing, setChanging] = useState(false);
	const [key, setKey] = useState('');
	const [reloading, setReloading] = useState(false);
	const input = useRef(null);
	const expires = new Date(Date.UTC(2027, 9, 17)).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

	const refresh = () => {
		setBusy('refresh');
		setNotice(null);
		setTimeout(() => {
			setBusy('');
			setNotice({ kind: 'success', text: 'License status is up to date.' });
		}, 700);
	};
	const activate = () => {
		if (!key.trim()) return input.current?.focus();
		setBusy('activate');
		setNotice(null);
		setTimeout(() => {
			setBusy('');
			setNotice({ kind: 'error', text: 'That key could not be activated. Check it and try again.' });
			input.current?.focus();
		}, 800);
	};
	// Deactivating turns Pro off, as on a real site after the reload.
	const deactivate = () => {
		setBusy('deactivate');
		setNotice(null);
		setTimeout(() => {
			setBusy('');
			setConfirming(false);
			setReloading(true);
			setNotice({ kind: 'success', text: 'License deactivated on this site. Reloading to apply it…' });
			setTimeout(() => {
				setPlan('free');
				location.hash = 'v3d.help.welcome';
			}, 1200);
		}, 800);
	};

	return html`<div class="bp3d-act">
		<${ShelfHero}
			variant="license"
			eyebrow="License"
			title="Your license is active"
			text="Pro features and automatic updates for 3D Viewer Pro are switched on for this site."
			chips=${[['ShieldCheck', 'Security updates'], ['Rocket', 'New features'], ['Headset', 'Priority support']]}
			stats=${[['Power', 'Active', 'Status', true], ['Crown', 'Pro', 'Plan']]}
			statClass="bp3d-act__stat"
		/>
		<div class="bp3d-act__grid">
			<section class="bp3d-act__card">
				<header class="bp3d-act__head">
					<span class="bp3d-act__icon bp3d-act__icon--ok"><${DIcon} name="ShieldCheck" size=${20} weight=${1.75} /></span>
					<div>
						<h2 class="bp3d-dash-title">License key</h2>
						<p class="bp3d-act__sub">${changing ? 'Enter the new key. It replaces the current one on this site.' : 'One key per purchase. Find it in your purchase email or Freemius account.'}</p>
					</div>
					<span class="bp3d-act__pill bp3d-act__pill--ok">Active</span>
				</header>

				${notice &&
				html`<div class=${'bp3d-x-notice bp3d-x-notice--' + notice.kind} role=${notice.kind === 'error' ? 'alert' : 'status'}>
					<${DIcon} name=${notice.kind === 'success' ? 'CircleCheck' : 'CircleX'} size=${16} weight=${1.75} />
					<span>${notice.text}</span>
					${!reloading && html`<button type="button" class="bp3d-x-notice__close" aria-label="Dismiss" onClick=${() => setNotice(null)}><${DIcon} name="X" size=${14} weight=${2} /></button>`}
				</div>`}

				${changing &&
				html`<form class="bp3d-act__form" onSubmit=${(e) => { e.preventDefault(); activate(); }}>
					<label for="bp3d-license-key" class="bp3d-act__label">License key</label>
					<div class="bp3d-act__row">
						<div class="bp3d-x-field">
							<${DIcon} name="Lock" size=${16} weight=${1.75} />
							<input ref=${input} id="bp3d-license-key" type="text" autocomplete="off" spellcheck=${false} placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx" value=${key} readonly=${busy === 'activate'} onInput=${(e) => setKey(e.currentTarget.value)} />
						</div>
						<button type="submit" class="bp3d-x-btn bp3d-x-btn--primary bp3d-act__submit" disabled=${!key.trim() || Boolean(busy)}>
							${busy === 'activate' ? html`<span class="bp3d-x-spinner"></span> Activating…` : html`Replace key <${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${16} weight=${1.75} />`}
						</button>
					</div>
					<p class="bp3d-act__help">
						Lost your key? <a href="https://dashboard.freemius.com/license-recovery/8795/3d-viewer/" ...${NEW_TAB}>Recover it <${DIcon} name="ExternalLink" size=${12} weight=${1.75} /></a>
						${' · '}<button type="button" class="bp3d-act__link" onClick=${() => { setChanging(false); setKey(''); setNotice(null); }}>Keep the current key</button>
					</p>
				</form>`}

				${!changing &&
				html`<div class="bp3d-act__current">
					<div class="bp3d-act__key">
						<span class="bp3d-act__label">Key on this site</span>
						<code>sk_7Kd••••••••x3Q</code>
					</div>
					${confirming
						? html`<div class="bp3d-x-confirm" role="alertdialog" aria-labelledby="bp3d-act-confirm">
								<strong id="bp3d-act-confirm">Deactivate the license on this site?</strong>
								<p>Pro features and automatic updates stop here until you activate a key again. The license stays yours and frees one activation.</p>
								<div class="bp3d-x-confirm__actions">
									<button type="button" class="bp3d-x-btn bp3d-x-btn--sm" disabled=${busy === 'deactivate'} onClick=${() => setConfirming(false)}>Keep it active</button>
									<button type="button" class="bp3d-x-btn bp3d-x-btn--sm bp3d-x-btn--danger-solid" disabled=${busy === 'deactivate'} onClick=${deactivate}>${busy === 'deactivate' && html`<span class="bp3d-x-spinner"></span>`} Yes, deactivate</button>
								</div>
							</div>`
						: html`<div class="bp3d-act__actions">
								<button type="button" class="bp3d-x-btn bp3d-x-btn--sm" disabled=${Boolean(busy) || reloading} onClick=${refresh}>${busy === 'refresh' ? html`<span class="bp3d-x-spinner"></span>` : html`<${DIcon} name="RefreshCw" size=${14} weight=${1.75} />`} Refresh status</button>
								<button type="button" class="bp3d-x-btn bp3d-x-btn--sm" disabled=${Boolean(busy) || reloading} onClick=${() => { setChanging(true); setNotice(null); setTimeout(() => input.current?.focus(), 0); }}>Change key</button>
								<button type="button" class="bp3d-x-btn bp3d-x-btn--sm bp3d-x-btn--danger" disabled=${Boolean(busy) || reloading} onClick=${() => setConfirming(true)}>Deactivate</button>
							</div>`}
				</div>`}
			</section>

			<aside class="bp3d-act__card bp3d-act__details">
				<h2 class="bp3d-dash-title">License details</h2>
				<dl>
					<div><dt>Status</dt><dd><span class="bp3d-act__dot bp3d-act__dot--ok"></span>Active</dd></div>
					<div><dt>Plan</dt><dd>Pro</dd></div>
					<div><dt>Pro features</dt><dd>On</dd></div>
					<div><dt>Expires</dt><dd>${expires}</dd></div>
					<div><dt>Activations</dt><dd>1 of 1 site</dd></div>
					<div><dt>Account</dt><dd class="bp3d-act__email">demo@example.com</dd></div>
				</dl>
				<a class="bp3d-x-btn bp3d-x-btn--sm bp3d-act__account" href="#" onClick=${(e) => { e.preventDefault(); toast('The Freemius account page is not part of this demo.'); }}>Manage account <${DIcon} name="ArrowRight" class="bp3d-dash-rtl-flip" size=${14} weight=${1.75} /></a>
			</aside>
		</div>
		<${ExtHelp} title="Need help with your license?" text=${html`Read how activation works in the <a href=${PAGES.docs} ...${NEW_TAB}>documentation</a> or ask our support team.`} cta="Contact support" href=${PAGES.support} />
	</div>`;
}

const SCREENS = { welcome: Welcome, demos: Demos, tools: Tools, pricing: Pricing, 'feature-comparison': Compare, activation: Activation, 'our-plugins': OurPlugins, extensions: ExtensionsScreen };

export default function HelpDemos({ params = [] }) {
	const pro = useIsPro();
	const ids = tabIds(pro);
	const tab = ids.includes(params[0]) ? params[0] : 'welcome';
	const Screen = SCREENS[tab];
	// Like the real router's <Navigate to="/welcome" replace />: an unknown tab lands on Welcome, silently.
	useEffect(() => {
		if (params[0] && params[0] !== tab) {
			try {
				history.replaceState(null, '', '#v3d.help.welcome');
			} catch {
				// Sandboxed frame without history access: Welcome still renders.
			}
		}
	}, [params[0], tab]);
	return html`<${WpAdmin} current="v3d-help" title="Help & Demos">
		<${DashLayout} current=${tab}><${Screen} pro=${pro} /><//>
	<//>`;
}
