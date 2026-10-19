// Every inline SVG the plugin ships, path data verbatim from src/admin/editor/icons.tsx,
// src/frontend/components/icons.tsx and includes/Admin/SettingsPage.php.
import { html, useRef } from '../core/ui.js';

// ── Editor set (src/admin/editor/icons.tsx): [inner markup, defaults] ──
export const EDITOR_ICONS = {
	'chevron-down': ['<path d="M19 9l-7 7-7-7"/>', { strokeWidth: 2.5 }],
	expand: ['<polyline points="6 9 12 15 18 9"/>', { strokeWidth: 2.5 }],
	'chevron-right': ['<polyline points="9 18 15 12 9 6"/>'],
	close: ['<path d="M6 18L18 6M6 6l12 12"/>'],
	plus: ['<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'],
	undo: ['<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>', { strokeWidth: 2.5 }],
	redo: ['<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>', { strokeWidth: 2.5 }],
	reset: ['<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', { strokeWidth: 2.5 }],
	edit: ['<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'],
	trash: [
		'<path d="m14.74 9-.346 9m-4.788 0L9 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/>',
		{ strokeWidth: 2.5 },
	],
	'trash-2': [
		'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
		{ strokeWidth: 2.5 },
	],
	'arrow-up-tray': ['<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>', { strokeWidth: 2.5 }],
	'arrow-down-tray': ['<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>'],
	upload: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>'],
	'cloud-upload': ['<path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>', { strokeWidth: 1.5 }],
	'arrows-right-left': ['<path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>'],
	search: ['<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'],
	eye: ['<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'],
	'eye-preview': [
		'<path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><circle cx="12" cy="12" r="3"/>',
		{ strokeWidth: 2.5 },
	],
	camera: ['<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'],
	'camera-snap': [
		'<path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"/><path d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"/>',
		{ strokeWidth: 2.5 },
	],
	cursor: ['<path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>'],
	cube: [
		'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
	],
	'mesh-node': ['<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>'],
	folder: ['<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'],
	palette: [
		'<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M7.5 10.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/><path d="M11.5 7.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/><path d="M16.5 9.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/><path d="M6 14c0-2 2-3 4-3 2.5 0 4.5 1.5 4.5 4 0 2.5-2 4.5-4.5 4.5-2.5 0-4-1.5-4-3.5z"/>',
	],
	lighting: [
		'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
	],
	'light-bulb': [
		'<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>',
	],
	play: ['<polygon points="5 3 19 12 5 21 5 3"/>'],
	'map-pin': ['<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'],
	layers: ['<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', { strokeWidth: 2.5 }],
	cpu: [
		'<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/>',
	],
	bolt: ['<path d="M13 10V3L4 14h7v7l9-11h-7z"/>'],
	gear: [
		'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.16.66.42.88.74L21 11a2 2 0 1 1 0 4l-.09 0a1.65 1.65 0 0 0-1.51 1z"/>',
	],
	sparkles: ['<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.64 5.64l2.83 2.83M15.53 15.53l2.83 2.83M5.64 18.36l2.83-2.83M15.53 8.47l2.83-2.83"/>', { strokeWidth: 2.2 }],
	'link-off': [
		'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="2" y1="2" x2="22" y2="22"/>',
		{ strokeWidth: 1.6 },
	],
	toggle: ['<rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="8" cy="12" r="2.5" fill="currentColor"/>', { strokeWidth: 2.5 }],
	'palette-bubble': [
		'<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.03345 19.176 5.0979 19.4294 5.02102 19.6644C4.81534 20.2928 4.54228 20.9856 4.22557 21.6444C4.09452 21.917 4.26906 22.2335 4.56942 22.1834C6.18301 21.9137 7.74737 21.3651 8.97898 20.6111"/><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="11.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="16.5" cy="9.5" r="1.2" fill="currentColor"/>',
		{ strokeWidth: 2.5 },
	],
	brush: [
		'<g transform="rotate(45 12 12)"><rect x="9.5" y="1.5" width="5" height="11" rx="2.5"/><path d="M12 14.5c-1.8 0-3.2 1.4-3.2 3.2 0 1.8 3.2 4.8 3.2 4.8s3.2-3 3.2-4.8c0-1.8-1.4-3.2-3.2-3.2Z"/></g>',
		{ fill: 'currentColor', stroke: 'none' },
	],
	warning: [
		'<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
		{ strokeWidth: 2.5 },
	],
	'check-circle': ['<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>', { strokeWidth: 2.5 }],
	sun: [
		'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
		{ size: 12 },
	],
	moon: ['<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', { size: 12 }],
	info: ['<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'],
	tag: [
		'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
	],
	// Planned (option-groups): lucide swatch-book.
	'swatch-book': [
		'<path d="M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z"/><path d="M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7"/><path d="M7 17h.01"/><path d="m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8"/>',
	],
	'arrow-left': ['<path d="m12 19-7-7 7-7M19 12H5"/>'],
	save: [
		'<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/>',
	],
};
// The gear path above must stay byte-identical to the source; fix the one typo-prone segment.
EDITOR_ICONS.gear[0] = EDITOR_ICONS.gear[0].replace('2.83-2.83', '2.83-2.83');

// ── Storefront set (src/frontend/components/icons.tsx). Overlay wrapper: 14px, stroke 2.5, display:block. ──
const OVERLAY = { size: 14, strokeWidth: 2.5, style: 'display:block', decorative: false };
export const STOREFRONT_ICONS = {
	reset: ['<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>', { size: 12, strokeWidth: 2.5, style: 'display:block' }],
	'zoom-in': ['<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>', OVERLAY],
	'zoom-out': ['<line x1="5" y1="12" x2="19" y2="12"></line>', OVERLAY],
	'reset-view': ['<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline>', OVERLAY],
	pause: ['<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>', { ...OVERLAY, fill: 'currentColor', strokeWidth: 2 }],
	play: ['<polygon points="5 3 19 12 5 21 5 3"></polygon>', { ...OVERLAY, fill: 'currentColor', strokeWidth: 2, style: 'display:block;margin-left:2px' }],
	download: ['<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/>', OVERLAY],
	ar: ['<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>', OVERLAY],
	palette: [
		'<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.03345 19.176 5.0979 19.4294 5.02102 19.6644C4.81534 20.2928 4.54228 20.9856 4.22557 21.6444C4.09452 21.917 4.26906 22.2335 4.56942 22.1834C6.18301 21.9137 7.74737 21.3651 8.97898 20.6111C9.20626 20.472 9.4897 20.4856 9.70425 20.6385C10.4228 20.875 11.1965 21 12 22Z"/><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/><circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"/>',
		OVERLAY,
	],
	fullscreen: ['<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>', OVERLAY],
	// Planned (undo-redo-drawer): the editor's undo/redo paths at storefront size.
	undo: ['<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>', { size: 14, strokeWidth: 2.5, style: 'display:block' }],
	redo: ['<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>', { size: 14, strokeWidth: 2.5, style: 'display:block' }],
};

// ── PHP screen set (SettingsPage::icon(), Lucide-style; default 18px, stroke 2). ──
export const PHP_ICONS = {
	monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
	panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
	'panel-close': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M16 15l-3-3 3-3"/>',
	'panel-open': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M14 9l3 3-3 3"/>',
	sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
	code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
	database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
	layout: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
	tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
	eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
	layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
	droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
	image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
	zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
	palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
	zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>',
	reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
	rotate: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
	download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
	images: '<path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/>',
	hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
	info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
	trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>',
	save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"/>',
	copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	puzzle: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
	upload: '<path d="M12 13v8M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="m8 17 4-4 4 4"/>',
	box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
	search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
	pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
	settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
};

const YOUTUBE_BODY =
	'<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/>';

/** Every name <Icon> accepts: editor names bare, storefront as `sf-*`, PHP set as `php-*`, plus `logo` and `youtube`. */
export const ICON_NAMES = [
	...Object.keys(EDITOR_ICONS),
	...Object.keys(STOREFRONT_ICONS).map((k) => 'sf-' + k),
	...Object.keys(PHP_ICONS).map((k) => 'php-' + k),
	'logo',
	'youtube',
];

function lookup(name) {
	if (name === 'logo' || name === 'youtube') return null;
	if (name.startsWith('sf-')) return STOREFRONT_ICONS[name.slice(3)];
	if (name.startsWith('php-')) return [PHP_ICONS[name.slice(4)] || PHP_ICONS.info, { size: 18 }];
	return EDITOR_ICONS[name];
}

/**
 * <Icon name="camera" size=${16} /> — one SVG from any of the plugin's icon sets.
 * `class`/`className` (Tailwind w-* h-* override the size attributes), `strokeWidth`, `fill`, `stroke`, `title`, `style`.
 */
export function Icon({ name, size, class: cls, className, strokeWidth, fill, stroke, title, style, ...rest }) {
	if (name === 'logo') return html`<${BrandLogo} size=${size} class=${cls || className} />`;
	if (name === 'youtube') return html`<${YouTubeIcon} size=${size} class=${cls || className} />`;
	const entry = lookup(name);
	if (!entry) {
		console.warn(`[icons] unknown icon "${name}"`);
		return null;
	}
	const [body, d = {}] = entry;
	const px = size ?? d.size ?? 16;
	const decorative = !title;
	return html`<svg
		width=${px}
		height=${px}
		viewBox="0 0 24 24"
		fill=${fill ?? d.fill ?? 'none'}
		stroke=${stroke ?? d.stroke ?? 'currentColor'}
		stroke-width=${strokeWidth ?? d.strokeWidth ?? 2}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden=${decorative && d.decorative !== false ? 'true' : undefined}
		role=${title ? 'img' : undefined}
		aria-label=${title || undefined}
		focusable="false"
		class=${cls || className || undefined}
		style=${style ?? d.style}
		dangerouslySetInnerHTML=${{ __html: (title ? `<title>${escapeText(title)}</title>` : '') + body }}
		...${rest}
	/>`;
}

function escapeText(s) {
	return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

/** PHP-screen icon: <PhpIcon name="box" size=${15} /> (unknown names fall back to `info`, like SettingsPage::icon()). */
export const PhpIcon = ({ name, ...p }) => html`<${Icon} name=${'php-' + name} ...${p} />`;
/** Storefront overlay icon: <StoreIcon name="zoom-in" />. */
export const StoreIcon = ({ name, ...p }) => html`<${Icon} name=${'sf-' + name} ...${p} />`;

let logoSeq = 0;
/** Brand logo (cyan→navy gradient square with a white isometric cube). Unique gradient id per instance. */
export function BrandLogo({ size = 28, class: cls, className }) {
	const ref = useRef(null);
	if (!ref.current) ref.current = `wc3d-logo-g-${++logoSeq}`;
	const id = ref.current;
	return html`<svg
		class=${cls || className || undefined}
		width=${size}
		height=${size}
		viewBox="0 0 28 28"
		aria-hidden="true"
		focusable="false"
		dangerouslySetInnerHTML=${{
			__html: `<defs><linearGradient id="${id}" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop stop-color="#00ADEE"/><stop offset="1" stop-color="#262261"/></linearGradient></defs><rect width="28" height="28" rx="8" fill="url(#${id})"/><g fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M14 6.5 20.5 10.25v7.5L14 21.5l-6.5-3.75v-7.5z"/><path d="M7.5 10.25 14 14l6.5-3.75M14 14v7.5"/></g>`,
		}}
	/>`;
}

/** "Watch Video Guide" YouTube mark, 20×20. */
export function YouTubeIcon({ size = 20, class: cls, className }) {
	return html`<svg
		class=${cls || className || undefined}
		width=${size}
		height=${size}
		viewBox="0 0 24 24"
		fill="none"
		focusable="false"
		aria-hidden="true"
		dangerouslySetInnerHTML=${{ __html: YOUTUBE_BODY }}
	/>`;
}

// ── Position-card previews (SettingsPage::position_cards()), 120×80. ──
const PREVIEW_FRAME = '<rect width="118" height="78" x="1" y="1" rx="8" fill="#fff" stroke="#e5e7eb" stroke-width="1.5"/>';
const PREVIEW_TEXT =
	'<rect x="65" y="15" width="45" height="8" rx="2" fill="#9ca3af"/>' +
	'<rect x="65" y="29" width="35" height="5" rx="1.5" fill="#e5e7eb"/>' +
	'<rect x="65" y="38" width="25" height="5" rx="1.5" fill="#e5e7eb"/>';
export const POSITION_SHAPES = {
	none: '<rect x="10" y="10" width="45" height="45" rx="4" fill="#e5e7eb"/>',
	replace_image:
		'<rect x="10" y="10" width="45" height="45" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.5"/>' +
		'<path d="M32.5 24.5L25 28.5L17.5 24.5L25 20.5L32.5 24.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
		'<path d="M17.5 24.5V32.5L25 36.5V28.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
		'<path d="M32.5 24.5V32.5L25 36.5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
	gallery_first:
		'<rect x="10" y="10" width="45" height="35" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.5"/>' +
		'<rect x="10" y="50" width="12" height="10" rx="2" fill="currentColor" fill-opacity="0.3"/>' +
		'<rect x="26" y="50" width="12" height="10" rx="2" fill="#e5e7eb"/>' +
		'<rect x="42" y="50" width="12" height="10" rx="2" fill="#e5e7eb"/>' +
		'<path d="M32.5 22L27.5 24.7L22.5 22L27.5 19.3L32.5 22Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
		'<path d="M22.5 22V27.5L27.5 30.2V24.7" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
		'<path d="M32.5 22V27.5L27.5 30.2" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
	modal:
		'<rect x="10" y="10" width="45" height="45" rx="4" fill="#e5e7eb"/>' +
		'<rect x="15" y="43" width="35" height="9" rx="4.5" fill="currentColor"/>' +
		'<circle cx="21" cy="47.5" r="2" fill="#fff"/>' +
		'<rect x="26" y="46" width="18" height="3" rx="1" fill="#fff"/>',
	product_tab:
		'<rect x="10" y="10" width="45" height="30" rx="4" fill="#e5e7eb"/>' +
		'<rect x="10" y="45" width="45" height="1" fill="#e5e7eb"/>' +
		'<rect x="28" y="44" width="16" height="2" fill="currentColor"/>' +
		'<rect x="10" y="47" width="14" height="4" rx="1" fill="#e5e7eb"/>' +
		'<rect x="28" y="47" width="16" height="4" rx="1" fill="currentColor" fill-opacity="0.5"/>',
};

/** Card copy (label, description), same keys and order as Options::get_positions(). */
export const POSITION_CARDS = [
	['none', 'None (Shortcode)', 'Manual inline integrations.'],
	['replace_image', 'Replace Featured', 'Replace default featured image.'],
	['gallery_first', 'First In Gallery', 'Show 3D as first gallery item.'],
	['modal', 'Popup Button', 'Float button on product image.'],
	['product_tab', 'Dedicated Tab', 'Custom tab alongside default tabs.'],
].map(([value, label, desc]) => ({ value, label, desc }));

/** <PositionPreview position="modal" /> — the 120×80 layout preview; accents use currentColor. */
export function PositionPreview({ position, class: cls }) {
	const shape = POSITION_SHAPES[position];
	if (!shape) return null;
	return html`<svg
		class=${cls || undefined}
		viewBox="0 0 120 80"
		fill="none"
		aria-hidden="true"
		focusable="false"
		dangerouslySetInnerHTML=${{ __html: PREVIEW_FRAME + shape + PREVIEW_TEXT }}
	/>`;
}

// Named exports mirroring src/admin/editor/icons.tsx, for straight ports of TSX.
const mk = (name) => (p) => html`<${Icon} name=${name} ...${p} />`;
export const ChevronDownIcon = mk('chevron-down');
export const ExpandIcon = mk('expand');
export const ChevronRightIcon = mk('chevron-right');
export const CloseIcon = mk('close');
export const PlusIcon = mk('plus');
export const UndoIcon = mk('undo');
export const RedoIcon = mk('redo');
export const ResetIcon = mk('reset');
export const EditIcon = mk('edit');
export const TrashIcon = mk('trash');
export const Trash2Icon = mk('trash-2');
export const ArrowUpTrayIcon = mk('arrow-up-tray');
export const ArrowDownTrayIcon = mk('arrow-down-tray');
export const UploadIcon = mk('upload');
export const CloudUploadIcon = mk('cloud-upload');
export const ArrowsRightLeftIcon = mk('arrows-right-left');
export const SearchIcon = mk('search');
export const EyeIcon = mk('eye');
export const EyePreviewIcon = mk('eye-preview');
export const CameraIcon = mk('camera');
export const CameraSnapIcon = mk('camera-snap');
export const CursorIcon = mk('cursor');
export const CubeIcon = mk('cube');
export const MeshNodeIcon = mk('mesh-node');
export const FolderIcon = mk('folder');
export const PaletteIcon = mk('palette');
export const LightingIcon = mk('lighting');
export const LightBulbIcon = mk('light-bulb');
export const PlayIcon = mk('play');
export const MapPinIcon = mk('map-pin');
export const LayersIcon = mk('layers');
export const CpuIcon = mk('cpu');
export const BoltIcon = mk('bolt');
export const GearIcon = mk('gear');
export const SparklesIcon = mk('sparkles');
export const LinkOffIcon = mk('link-off');
export const ToggleIcon = mk('toggle');
export const PaletteBubbleIcon = mk('palette-bubble');
export const BrushIcon = mk('brush');
export const WarningIcon = mk('warning');
export const CheckCircleIcon = mk('check-circle');
export const SunIcon = mk('sun');
export const MoonIcon = mk('moon');
export const InfoIcon = mk('info');
export const ArrowLeftIcon = mk('arrow-left');
export const SaveIcon = mk('save');
export const TagIcon = mk('tag');
