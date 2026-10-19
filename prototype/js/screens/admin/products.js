// WooCommerce → Products (All Products). The plugin adds nothing to this list (spec 02 §1).
// Also exports small WP helpers (Dashicon, dates, prices, flash notices) used by the
// product and order screens.
import { html, useState, useMemo, useEffect, cx, money } from '../../core/ui.js';
import { store, useStore, setIn } from '../../core/store.js';
import { go } from '../../core/router.js';
import { WpAdmin } from './chrome.js';
import { ProductImage } from '../../shared/product-image.js';

// WordPress core dashicons (wp-includes/fonts/dashicons.svg), 20×20.
const DI = {
	'cloud-upload': 'M14.8 9c.1-.3.2-.6.2-1 0-2.2-1.8-4-4-4-1.5 0-2.9.9-3.5 2.2-.3-.1-.7-.2-1-.2C5.1 6 4 7.1 4 8.5c0 .2 0 .4.1.5-1.8.3-3.1 1.7-3.1 3.5C1 14.4 2.6 16 4.5 16H8v-3H5l4.5-4.5L14 13h-3v3h3.5c1.9 0 3.5-1.6 3.5-3.5 0-1.8-1.4-3.3-3.2-3.5z',
	'media-document': 'M12 2l4 4v12H4V2h8zM5 3v1h6V3H5zm7 3h3l-3-3v3zM5 5v1h6V5H5zm10 3V7H5v1h10zM5 9v1h4V9H5zm10 3V9h-5v3h5zM5 11v1h4v-1H5zm10 3v-1H5v1h10zm-3 2v-1H5v1h7z',
	'format-image': 'M2.25 1h15.5c.69 0 1.25.56 1.25 1.25v15.5c0 .69-.56 1.25-1.25 1.25H2.25C1.56 19 1 18.44 1 17.75V2.25C1 1.56 1.56 1 2.25 1zM17 17V3H3v14h14zM10 6c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm3 5s0-6 3-6v10c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1V8c2 0 3 4 3 4s1-3 3-3 3 2 3 2z',
	'admin-appearance': 'M14.48 11.06L7.41 3.99l1.5-1.5c.5-.56 2.3-.47 3.51.32 1.21.8 1.43 1.28 2.91 2.1 1.18.64 2.45 1.26 4.45.85zm-.71.71L6.7 4.7 4.93 6.47c-.39.39-.39 1.02 0 1.41l1.06 1.06c.39.39.39 1.03 0 1.42-.6.6-1.43 1.11-2.21 1.69-.35.26-.7.53-1.01.84C1.43 14.23.4 16.08 1.4 17.07c.99 1 2.84-.03 4.18-1.36.31-.31.58-.66.85-1.02.57-.78 1.08-1.61 1.69-2.21.39-.39 1.02-.39 1.41 0l1.06 1.06c.39.39 1.02.39 1.41 0z',
	'admin-page': 'M6 15V2h10v13H6zm-1 1h8v2H3V5h2v11z',
	'info-outline': 'M9 15h2V9H9v6zm1-10c-.5 0-1 .5-1 1s.5 1 1 1 1-.5 1-1-.5-1-1-1zm0-4c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z',
	'admin-tools': 'M16.68 9.77c-1.34 1.34-3.3 1.67-4.95.99l-5.41 6.52c-.99.99-2.59.99-3.58 0s-.99-2.59 0-3.57l6.52-5.42c-.68-1.65-.35-3.61.99-4.95 1.28-1.28 3.12-1.62 4.72-1.06l-2.89 2.89 2.82 2.82 2.86-2.87c.53 1.58.18 3.39-1.08 4.65zM3.81 16.21c.4.39 1.04.39 1.43 0 .4-.4.4-1.04 0-1.43-.39-.4-1.03-.4-1.43 0-.39.39-.39 1.03 0 1.43z',
	'admin-generic': 'M18 12h-2.18c-.17.7-.44 1.35-.81 1.93l1.54 1.54-2.1 2.1-1.54-1.54c-.58.36-1.23.63-1.91.79V19H8v-2.18c-.68-.16-1.33-.43-1.91-.79l-1.54 1.54-2.12-2.12 1.54-1.54c-.36-.58-.63-1.23-.79-1.91H1V9.03h2.17c.16-.7.44-1.35.8-1.94L2.43 5.55l2.1-2.1 1.54 1.54c.58-.37 1.24-.64 1.93-.81V2h3v2.18c.68.16 1.33.43 1.91.79l1.54-1.54 2.12 2.12-1.54 1.54c.36.59.64 1.24.8 1.94H18V12zm-8.5 1.5c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z',
	clipboard: 'M11.9.39l1.4 1.4c1.61.19 3.5-.74 4.61.37s.18 3 .37 4.61l1.4 1.4c.39.39.39 1.02 0 1.41l-9.19 9.2c-.4.39-1.03.39-1.42 0L1.29 11c-.39-.39-.39-1.02 0-1.42l9.2-9.19c.39-.39 1.02-.39 1.41 0zm.58 2.25l-.58.58 4.95 4.95.58-.58c-.19-.6-.2-1.22-.15-1.82.02-.31.05-.62.09-.92.12-1 .18-1.63-.17-1.98s-.98-.29-1.98-.17c-.3.04-.61.07-.92.09-.6.05-1.22.04-1.82-.15zm4.02.93c.39.39.39 1.03 0 1.42s-1.03.39-1.42 0-.39-1.03 0-1.42 1.03-.39 1.42 0zm-6.72.36l-.71.7L15.44 11l.7-.71zM8.36 5.34l-.7.71 6.36 6.36.71-.7zM6.95 6.76l-.71.7 6.37 6.37.7-.71zM5.54 8.17l-.71.71 6.36 6.36.71-.71zM4.12 9.58l-.71.71 6.37 6.37.71-.71z',
	car: 'M16.1 9h-1.6c-.6-2.7-3.2-4.5-5.9-3.9C6.6 5.5 5 7 4.6 9h-.7c-1 0-1.9.9-1.9 1.9v1.3c0 .7.6 1.3 1.3 1.3h.3c0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4h3.2c0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4h.3c.7 0 1.3-.6 1.3-1.3V11c0-1.1-.9-2-1.9-2zM6.2 9c.5-1.9 2.5-2.9 4.3-2.4 1.1.3 2 1.2 2.4 2.4H6.2zM6 12c-.8 0-1.5.7-1.5 1.5S5.2 15 6 15s1.5-.7 1.5-1.5S6.8 12 6 12z',
	'admin-links': 'M17.74 2.76c1.68 1.69 1.68 4.41 0 6.1l-1.53 1.52c-1.12 1.12-2.7 1.47-4.14 1.09l2.62-2.61.76-.77.76-.76c.84-.84.84-2.2 0-3.04-.84-.85-2.2-.85-3.04 0l-.77.76-3.38 3.38c-.37-1.44-.02-3.02 1.1-4.14l1.52-1.53c1.69-1.68 4.42-1.68 6.1 0zM8.59 13.43l5.34-5.34c.42-.42.42-1.1 0-1.52-.44-.43-1.13-.39-1.53 0l-5.33 5.34c-.42.42-.42 1.1 0 1.52.44.43 1.13.39 1.52 0zm-.76 2.29l4.14-4.15c.38 1.44.03 3.02-1.09 4.14l-1.52 1.53c-1.69 1.68-4.41 1.68-6.1 0-1.68-1.68-1.68-4.42 0-6.1l1.53-1.52c1.12-1.12 2.7-1.47 4.14-1.1l-4.14 4.15c-.85.84-.85 2.2 0 3.05.84.84 2.2.84 3.04 0z',
	'editor-ul': 'M5.5 7C4.67 7 4 6.33 4 5.5 4 4.68 4.67 4 5.5 4 6.32 4 7 4.68 7 5.5 7 6.33 6.32 7 5.5 7zM8 5h9v1H8V5zm-2.5 7c-.83 0-1.5-.67-1.5-1.5C4 9.68 4.67 9 5.5 9c.82 0 1.5.68 1.5 1.5 0 .83-.68 1.5-1.5 1.5zM8 10h9v1H8v-1zm-2.5 7c-.83 0-1.5-.67-1.5-1.5 0-.82.67-1.5 1.5-1.5.82 0 1.5.68 1.5 1.5 0 .83-.68 1.5-1.5 1.5zM8 15h9v1H8v-1z',
	'editor-ol': 'M6 7V3h-.69L4.02 4.03l.4.51.46-.37c.06-.05.16-.14.3-.28l-.02.42V7H6zm2-2h9v1H8V5zm-1.23 6.95v-.7H5.05v-.04l.51-.48c.33-.31.57-.54.7-.71.14-.17.24-.33.3-.49.07-.16.1-.33.1-.51 0-.21-.05-.4-.16-.56-.1-.16-.25-.28-.44-.37s-.41-.14-.65-.14c-.19 0-.36.02-.51.06-.15.03-.29.09-.42.15-.12.07-.29.19-.48.35l.45.54c.16-.13.31-.23.45-.3.15-.07.3-.1.45-.1.14 0 .26.03.35.11s.13.2.13.36c0 .1-.02.2-.06.3s-.1.21-.19.33c-.09.11-.29.32-.58.62l-.99 1v.58h2.76zM8 10h9v1H8v-1zm-1.29 3.95c0-.3-.12-.54-.37-.71-.24-.17-.58-.26-1-.26-.52 0-.96.13-1.33.4l.4.6c.17-.11.32-.19.46-.23.14-.05.27-.07.41-.07.38 0 .58.15.58.46 0 .2-.07.35-.22.43s-.38.12-.7.12h-.31v.66h.31c.34 0 .59.04.75.12.15.08.23.22.23.41 0 .22-.07.37-.2.47-.14.1-.35.15-.63.15-.19 0-.38-.03-.57-.08s-.36-.12-.52-.2v.74c.34.15.74.22 1.18.22.53 0 .94-.11 1.22-.33.29-.22.43-.52.43-.92 0-.27-.09-.48-.26-.64s-.42-.26-.74-.3v-.02c.27-.06.49-.19.65-.37.15-.18.23-.39.23-.65zM8 15h9v1H8v-1z',
	'editor-bold': 'M6 4v13h4.54c1.37 0 2.46-.33 3.26-1 .8-.66 1.2-1.58 1.2-2.77 0-.84-.17-1.51-.51-2.01s-.9-.85-1.67-1.03v-.09c.57-.1 1.02-.4 1.36-.9s.51-1.13.51-1.91c0-1.14-.39-1.98-1.17-2.5C12.75 4.26 11.5 4 9.78 4H6zm2.57 5.15V6.26h1.36c.73 0 1.27.11 1.61.32.34.22.51.58.51 1.07 0 .54-.16.92-.47 1.15s-.82.35-1.51.35h-1.5zm0 2.19h1.6c1.44 0 2.16.53 2.16 1.61 0 .6-.17 1.05-.51 1.34s-.86.43-1.57.43H8.57v-3.38z',
	'editor-italic': 'M14.78 6h-2.13l-2.8 9h2.12l-.62 2H4.6l.62-2h2.14l2.8-9H8.03l.62-2h6.75z',
	'editor-quote': 'M9.49 13.22c0-.74-.2-1.38-.61-1.9-.62-.78-1.83-.88-2.53-.72-.29-1.65 1.11-3.75 2.92-4.65L7.88 4c-2.73 1.3-5.42 4.28-4.96 8.05C3.21 14.43 4.59 16 6.54 16c.85 0 1.56-.25 2.12-.75s.83-1.18.83-2.03zm8.05 0c0-.74-.2-1.38-.61-1.9-.63-.78-1.83-.88-2.53-.72-.29-1.65 1.11-3.75 2.92-4.65L15.93 4c-2.73 1.3-5.41 4.28-4.95 8.05.29 2.38 1.66 3.95 3.61 3.95.85 0 1.56-.25 2.12-.75s.83-1.18.83-2.03z',
	'editor-alignleft': 'M12 5V3H3v2h9zm5 4V7H3v2h14zm-5 4v-2H3v2h9zm5 4v-2H3v2h14z',
	'editor-aligncenter': 'M14 5V3H6v2h8zm3 4V7H3v2h14zm-3 4v-2H6v2h8zm3 4v-2H3v2h14z',
	'editor-alignright': 'M17 5V3H8v2h9zm0 4V7H3v2h14zm0 4v-2H8v2h9zm0 4v-2H3v2h14z',
	'admin-media': 'M13 11V4c0-.55-.45-1-1-1h-1.67L9 1H5L3.67 3H2c-.55 0-1 .45-1 1v7c0 .55.45 1 1 1h10c.55 0 1-.45 1-1zM7 4.5c1.38 0 2.5 1.12 2.5 2.5S8.38 9.5 7 9.5 4.5 8.38 4.5 7 5.62 4.5 7 4.5zM14 6h5v10.5c0 1.38-1.12 2.5-2.5 2.5S14 17.88 14 16.5s1.12-2.5 2.5-2.5c.17 0 .34.02.5.05V9h-3V6zm-4 8.05V13h2v3.5c0 1.38-1.12 2.5-2.5 2.5S7 17.88 7 16.5 8.12 14 9.5 14c.17 0 .34.02.5.05z',
	screenoptions: 'M9 9V3H3v6h6zm8 0V3h-6v6h6zm-8 8v-6H3v6h6zm8 0v-6h-6v6h6z',
	'post-status': 'M14 6c0 1.86-1.28 3.41-3 3.86V16c0 1-2 2-2 2V9.86c-1.72-.45-3-2-3-3.86 0-2.21 1.79-4 4-4s4 1.79 4 4zM8 5c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1-1 .45-1 1z',
	visibility: 'M18.3 9.5C15 4.9 8.5 3.8 3.9 7.2c-1.2.9-2.2 2.1-3 3.4.2.4.5.8.8 1.2 3.3 4.6 9.6 5.6 14.2 2.4.9-.7 1.7-1.4 2.4-2.4.3-.4.5-.8.8-1.2-.3-.4-.5-.8-.8-1.1zm-8.2-2.3c.5-.5 1.3-.5 1.8 0s.5 1.3 0 1.8-1.3.5-1.8 0-.5-1.3 0-1.8zm-.1 7.7c-3.1 0-6-1.6-7.7-4.2C3.5 9 5.1 7.8 7 7.2c-.7.8-1 1.7-1 2.7 0 2.2 1.7 4.1 4 4.1 2.2 0 4.1-1.7 4.1-4v-.1c0-1-.4-2-1.1-2.7 1.9.6 3.5 1.8 4.7 3.5-1.7 2.6-4.6 4.2-7.7 4.2z',
	'calendar-alt': 'M15 4h3v15H2V4h3V3c0-.41.15-.76.44-1.06.29-.29.65-.44 1.06-.44s.77.15 1.06.44c.29.3.44.65.44 1.06v1h4V3c0-.41.15-.76.44-1.06.29-.29.65-.44 1.06-.44s.77.15 1.06.44c.29.3.44.65.44 1.06v1zM6 3v2.5c0 .14.05.26.15.36.09.09.21.14.35.14s.26-.05.35-.14c.1-.1.15-.22.15-.36V3c0-.14-.05-.26-.15-.35-.09-.1-.21-.15-.35-.15s-.26.05-.35.15c-.1.09-.15.21-.15.35zm7 0v2.5c0 .14.05.26.14.36.1.09.22.14.36.14s.26-.05.36-.14c.09-.1.14-.22.14-.36V3c0-.14-.05-.26-.14-.35-.1-.1-.22-.15-.36-.15s-.26.05-.36.15c-.09.09-.14.21-.14.35zm4 15V8H3v10h14zM7 9v2H5V9h2zm2 0h2v2H9V9zm4 2V9h2v2h-2zm-6 1v2H5v-2h2zm2 0h2v2H9v-2zm4 2v-2h2v2h-2zm-6 1v2H5v-2h2zm4 2H9v-2h2v2zm4 0h-2v-2h2v2z',
	edit: 'M13.89 3.39l2.71 2.72c.46.46.42 1.24.03 1.64l-8.01 8.02-5.56 1.16 1.16-5.58s7.6-7.63 7.99-8.03c.39-.39 1.22-.39 1.68.07zm-2.73 2.79l-5.59 5.61 1.11 1.11 5.54-5.65zm-2.97 8.23l5.58-5.6-1.07-1.08-5.59 5.6z',
	dismiss: 'M10 2c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8 3.58-8 8-8zm5 11l-3-3 3-3-2-2-3 3-3-3-2 2 3 3-3 3 2 2 3-3 3 3z',
	'arrow-down': 'M15 8l-4.03 6L7 8h8z',
	'arrow-up': 'M11 7l-4 6h8',
	'arrow-down-alt2': 'M5 6l5 5 5-5 2 1-7 7-7-7z',
	'arrow-up-alt2': 'M15 14l-5-5-5 5-2-1 7-7 7 7z',
	yes: 'M14.83 4.89l1.34.94-5.81 8.38H9.02L5.78 9.67l1.34-1.25 2.57 2.4z',
	trash: 'M12 4h3c.6 0 1 .4 1 1v1H3V5c0-.6.5-1 1-1h3c.2-1.1 1.3-2 2.5-2s2.3.9 2.5 2zM8 4h3c-.2-.6-.9-1-1.5-1S8.2 3.4 8 4zM4 7h11l-.9 10.1c0 .5-.5.9-1 .9H5.9c-.5 0-.9-.4-1-.9L4 7z',
	search: 'M12.14 4.18c1.87 1.87 2.11 4.75.72 6.89.12.1.22.21.36.31.2.16.47.36.81.59.34.24.56.39.66.47.42.31.73.57.94.78.32.32.6.65.84 1 .25.35.44.69.59 1.04.14.35.21.68.18 1-.02.32-.14.59-.36.81s-.49.34-.81.36c-.31.02-.65-.04-.99-.19-.35-.14-.7-.34-1.04-.59-.35-.24-.68-.52-1-.84-.21-.21-.47-.52-.77-.93-.1-.13-.25-.35-.47-.66-.22-.32-.4-.57-.56-.78-.16-.2-.29-.35-.44-.5-2.07 1.09-4.69.76-6.44-.98-2.14-2.15-2.14-5.64 0-7.78 2.15-2.15 5.63-2.15 7.78 0zm-1.41 6.36c1.36-1.37 1.36-3.58 0-4.95-1.37-1.37-3.59-1.37-4.95 0-1.37 1.37-1.37 3.58 0 4.95 1.36 1.37 3.58 1.37 4.95 0z',
	'no-alt': 'M14.95 6.46L11.41 10l3.54 3.54-1.41 1.41L10 11.42l-3.53 3.53-1.42-1.42L8.58 10 5.05 6.47l1.42-1.42L10 8.58l3.54-3.53z',
	businessman: 'M17 16.9v-2.5c0-.7-.1-1.4-.5-2.1-.4-.7-.9-1.3-1.6-1.7-.7-.5-2.2-.6-2.9-.6l-1.6 1.7.6 1.3v3l-1 1.1L9 16v-3l.7-1.3L8 10c-.8 0-2.3.1-3 .6-.7.4-1.1 1-1.5 1.7S3 13.6 3 14.4v2.5S5.6 18 10 18s7-1.1 7-1.1zM10 2.1c-1.9 0-3 1.8-2.7 3.8.3 2 1.3 3.4 2.7 3.4s2.4-1.4 2.7-3.4c.3-2.1-.8-3.8-2.7-3.8z',
	'money-alt': 'M10.6 9c-.4-.1-.8-.3-1.1-.6-.3-.1-.4-.4-.4-.6 0-.2.1-.5.3-.6.3-.2.6-.4.9-.3.6 0 1.1.3 1.4.7l.9-1.2c-.3-.3-.6-.5-.9-.7-.3-.2-.7-.3-1.1-.3V4H9.4v1.4c-.5.1-1 .4-1.4.8-.4.5-.7 1.1-.6 1.7 0 .6.2 1.2.6 1.6.5.5 1.2.8 1.8 1.1.3.1.7.3 1 .5.2.2.3.5.3.8 0 .3-.1.6-.3.9-.3.3-.7.4-1 .4-.4 0-.9-.1-1.2-.4-.3-.2-.6-.5-.8-.8l-1 1.1c.3.4.6.7 1 1 .5.3 1.1.6 1.7.6V16h1.1v-1.5c.6-.1 1.1-.4 1.5-.8.5-.5.8-1.3.8-2 0-.6-.2-1.3-.7-1.7-.5-.5-1-.8-1.6-1zM10 2c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14.9c-3.8 0-6.9-3.1-6.9-6.9S6.2 3.1 10 3.1s6.9 3.1 6.9 6.9-3.1 6.9-6.9 6.9z',
	cart: 'M6 13h9c.55 0 1 .45 1 1s-.45 1-1 1H5c-.55 0-1-.45-1-1V4H2c-.55 0-1-.45-1-1s.45-1 1-1h3c.55 0 1 .45 1 1v2h13l-4 7H6v1zm-.5 3c.83 0 1.5.67 1.5 1.5S6.33 19 5.5 19 4 18.33 4 17.5 4.67 16 5.5 16zm9 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z',
	products: 'M17 8h1v11H2V8h1V6c0-2.76 2.24-5 5-5 .71 0 1.39.15 2 .42.61-.27 1.29-.42 2-.42 2.76 0 5 2.24 5 5v2zM5 6v2h2V6c0-1.13.39-2.16 1.02-3H8C6.35 3 5 4.35 5 6zm10 2V6c0-1.65-1.35-3-3-3h-.02c.63.84 1.02 1.87 1.02 3v2h2zm-5-4.22C9.39 4.33 9 5.12 9 6v2h2V6c0-.88-.39-1.67-1-2.22z',
	location: 'M10 2C6.69 2 4 4.69 4 8c0 2.02 1.17 3.71 2.53 4.89.43.37 1.18.96 1.85 1.83.74.97 1.41 2.01 1.62 2.71.21-.7.88-1.74 1.62-2.71.67-.87 1.42-1.46 1.85-1.83C14.83 11.71 16 10.02 16 8c0-3.31-2.69-6-6-6zm0 2.56c1.9 0 3.44 1.54 3.44 3.44S11.9 11.44 10 11.44 6.56 9.9 6.56 8 8.1 4.56 10 4.56z',
	'star-filled': 'M10 1l3 6 6 .75-4.12 4.62L16 19l-6-3-6 3 1.13-6.63L1 7.75 7 7z',
	'star-empty': 'M10 1L7 7l-6 .75 4.13 4.62L4 19l6-3 6 3-1.12-6.63L19 7.75 13 7zm0 2.24l2.34 4.69 4.65.58-3.18 3.56.87 5.15L10 14.88l-4.68 2.34.87-5.15-3.18-3.56 4.65-.58z',
	'email-alt': 'M19 14.5v-9c0-.83-.67-1.5-1.5-1.5H3.49c-.83 0-1.5.67-1.5 1.5v9c0 .83.67 1.5 1.5 1.5H17.5c.83 0 1.5-.67 1.5-1.5zm-1.31-9.11c.33.33.15.67-.03.84L13.6 9.95l3.9 4.06c.12.14.2.36.06.51-.13.16-.43.15-.56.05l-4.37-3.73-2.14 1.95-2.13-1.95-4.37 3.73c-.13.1-.43.11-.56-.05-.14-.15-.06-.37.06-.51l3.9-4.06-4.06-3.72c-.18-.17-.36-.51-.03-.84s.67-.17.95.07l6.24 5.04 6.25-5.04c.28-.24.62-.4.95-.07z',
	phone: 'M12.06 6l-.21-.2c-.52-.54-.43-.79.08-1.3l2.72-2.75c.81-.82.96-1.21 1.73-.48l.21.2zm.53.45l4.4-4.4c.7.94 2.34 3.47 1.53 5.34-.73 1.67-1.09 1.75-2 3-1.85 2.11-4.18 4.37-6 6.07-1.26.91-1.31 1.33-3 2-1.8.71-4.4-.89-5.38-1.56l4.4-4.4 1.18 1.62c.34.46 1.2-.06 1.8-.66 1.04-1.05 3.18-3.18 4-4.07.59-.59 1.12-1.45.66-1.8zM1.57 16.5l-.21-.21c-.68-.74-.29-.9.52-1.7l2.74-2.72c.51-.49.75-.6 1.27-.11l.2.21z',
};

/** <Dashicon name="cloud-upload" /> — renders as span.dashicons.dashicons-<name> with an inline SVG. */
export function Dashicon({ name, class: cls, style, title }) {
	return html`<span class=${cx('dashicons', 'dashicons-' + name, 'wc3d-di', cls)} style=${style} aria-hidden=${title ? undefined : 'true'} title=${title}>
		<svg viewBox="0 0 20 20" fill="currentColor" focusable="false"><path d=${DI[name] || ''} /></svg>
	</span>`;
}

// ── Dates ('YYYY-MM-DD HH:mm' in the store) ────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_ABBR = MONTHS.map((m) => m.slice(0, 3));

export function parseDate(s) {
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(s || ''));
	if (!m) return null;
	return { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0) };
}
const pad = (n) => String(n).padStart(2, '0');
const time12 = (h, mi) => `${((h + 11) % 12) + 1}:${pad(mi)} ${h < 12 ? 'am' : 'pm'}`;

/** '2026/09/02 at 10:12 am' (list table date column). */
export function listDate(s) {
	const t = parseDate(s);
	return t ? `${t.y}/${pad(t.mo)}/${pad(t.d)} at ${time12(t.h, t.mi)}` : '';
}
/** 'Sep 2, 2026' */
export function shortDate(s) {
	const t = parseDate(s);
	return t ? `${MONTH_ABBR[t.mo - 1]} ${t.d}, ${t.y}` : '';
}
/** 'September 29, 2026 at 6:22 pm' */
export function longDate(s) {
	const t = parseDate(s);
	return t ? `${MONTHS[t.mo - 1]} ${t.d}, ${t.y} at ${time12(t.h, t.mi)}` : '';
}
/** 'Sep 2, 2026 at 10:12' (Publish box). */
export function publishDate(s) {
	const t = parseDate(s);
	return t ? `${MONTH_ABBR[t.mo - 1]} ${t.d}, ${t.y} at ${pad(t.h)}:${pad(t.mi)}` : '';
}
/** Current local time as 'YYYY-MM-DD HH:mm'. */
export function nowStr() {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Flash notices (survive one navigation, like WP's ?message=1) ───────────
let flashQueue = [];
export function flash(notice) {
	flashQueue.push(notice);
}
export function useFlash() {
	const [list] = useState(() => {
		const q = flashQueue;
		flashQueue = [];
		return q;
	});
	return list;
}

/** WP notice with the dismiss button; body is html. */
export function WpNotice({ type = 'success', children, id }) {
	const [gone, setGone] = useState(false);
	if (gone) return null;
	return html`<div id=${id} class=${cx('notice', 'notice-' + type, type === 'success' && 'updated', 'is-dismissible')}>
		<p>${children}</p>
		<button type="button" class="notice-dismiss" onClick=${() => setGone(true)}><span class="screen-reader-text">Dismiss this notice.</span></button>
	</div>`;
}

// ── Product helpers ───────────────────────────────────────────────────────
export const STOCK_LABELS = { instock: 'In stock', outofstock: 'Out of stock', onbackorder: 'On backorder' };
export const stockOf = (p) => p?.wc?.stockStatus || 'instock';
export const TYPE_LABELS = { simple: 'Simple product', grouped: 'Grouped product', external: 'External/Affiliate product', variable: 'Variable product' };

export function priceText(state, p) {
	if (p.type === 'variable') {
		const prices = (p.variations || []).map((v) => state.variations?.[v]?.price).filter((n) => n != null);
		if (prices.length) {
			const lo = Math.min(...prices);
			const hi = Math.max(...prices);
			return lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`;
		}
	}
	const sale = p.wc?.salePrice;
	if (sale !== undefined && sale !== '' && Number(sale) < Number(p.price)) return html`<del>${money(p.price)}</del> <ins>${money(sale)}</ins>`;
	return p.price === '' || p.price == null ? '–' : money(p.price);
}

export function categoriesOf(p) {
	return String(p?.category || '')
		.split(',')
		.map((c) => c.trim())
		.filter(Boolean);
}

export function allCategories(state) {
	const set = new Set(['Uncategorized']);
	Object.values(state.products || {}).forEach((p) => categoriesOf(p).forEach((c) => set.add(c)));
	(state.productCategories || []).forEach((c) => set.add(c));
	return [...set].sort((a, b) => a.localeCompare(b));
}

const STATUS_LABEL = { publish: 'Published', draft: 'Draft', pending: 'Pending', private: 'Private', trash: 'Trash' };

// ── Quick Edit row ────────────────────────────────────────────────────────
function QuickEdit({ product, colspan, onDone }) {
	const state = useStore();
	const [d, setD] = useState(() => ({
		name: product.name,
		slug: product.slug,
		sku: product.sku || '',
		price: product.price ?? '',
		status: product.status,
		stockStatus: stockOf(product),
		cats: categoriesOf(product),
	}));
	const set = (k) => (e) => setD({ ...d, [k]: e.currentTarget.value });
	const cats = allCategories(state);
	const save = () => {
		store.patch(['products', product.id], (p) => ({
			...p,
			name: d.name.trim() || p.name,
			slug: d.slug.trim() || p.slug,
			sku: d.sku,
			price: p.type === 'variable' ? p.price : d.price === '' ? '' : Number(d.price),
			status: d.status,
			category: d.cats.join(', '),
			wc: { ...(p.wc || {}), stockStatus: d.stockStatus },
			dateModified: nowStr(),
		}));
		onDone();
	};
	return html`<tr class="inline-edit-row quick-edit-row inline-editor">
		<td colspan=${colspan} class="colspanchange">
			<div class="inline-edit-wrapper" role="region" aria-labelledby="quick-edit-legend">
				<fieldset class="inline-edit-col-left">
					<legend class="inline-edit-legend" id="quick-edit-legend">Quick Edit</legend>
					<div class="inline-edit-col">
						<label><span class="title">Title</span><span class="input-text-wrap"><input type="text" class="ptitle" value=${d.name} onInput=${set('name')} /></span></label>
						<label><span class="title">Slug</span><span class="input-text-wrap"><input type="text" value=${d.slug} onInput=${set('slug')} /></span></label>
						<span class="title inline-edit-categories-label">Product categories</span>
						<ul class="cat-checklist product_cat-checklist">
							${cats.map(
								(c) => html`<li key=${c}><label class="selectit"><input type="checkbox" checked=${d.cats.includes(c)} onChange=${(e) => setD({ ...d, cats: e.currentTarget.checked ? [...d.cats, c] : d.cats.filter((x) => x !== c) })} /> ${c}</label></li>`
							)}
						</ul>
					</div>
				</fieldset>
				<fieldset class="inline-edit-col-right">
					<div class="inline-edit-col">
						<h4>Product data</h4>
						<label><span class="title">SKU</span><span class="input-text-wrap"><input type="text" value=${d.sku} onInput=${set('sku')} /></span></label>
						${product.type !== 'variable' &&
						html`<label><span class="title">Price</span><span class="input-text-wrap"><input type="text" placeholder="Regular price" value=${d.price} onInput=${set('price')} /></span></label>`}
						<label><span class="title">In stock?</span><span class="input-text-wrap"><select value=${d.stockStatus} onChange=${set('stockStatus')}>
							${Object.entries(STOCK_LABELS).map(([v, l]) => html`<option value=${v}>${l}</option>`)}
						</select></span></label>
						<label><span class="title">Status</span><span class="input-text-wrap"><select value=${d.status} onChange=${set('status')}>
							<option value="publish">Published</option>
							<option value="private">Private</option>
							<option value="pending">Pending Review</option>
							<option value="draft">Draft</option>
						</select></span></label>
					</div>
				</fieldset>
				<div class="submit inline-edit-save">
					<button type="button" class="button button-primary save" onClick=${save}>Update</button>
					<button type="button" class="button cancel" onClick=${onDone}>Cancel</button>
				</div>
			</div>
		</td>
	</tr>`;
}

const COLS = [
	['thumb', html`<span class="wc-image tips" title="Image"><${Dashicon} name="format-image" /><span class="screen-reader-text">Image</span></span>`, 'Image'],
	['name', 'Name'],
	['sku', 'SKU'],
	['is_in_stock', 'Stock'],
	['price', 'Price'],
	['product_cat', 'Categories'],
	['product_tag', 'Tags'],
	['featured', html`<span class="wc-featured parent-tips" title="Featured"><${Dashicon} name="star-filled" /><span class="screen-reader-text">Featured</span></span>`],
	['date', 'Date'],
];

export default function ProductsList() {
	const state = useStore();
	const flashed = useFlash();
	const [view, setView] = useState('all');
	const [q, setQ] = useState('');
	const [query, setQuery] = useState('');
	const [filters, setFilters] = useState({ cat: '', type: '', stock: '' });
	const [draftFilters, setDraftFilters] = useState(filters);
	const [checked, setChecked] = useState([]);
	const [bulk, setBulk] = useState('-1');
	const [editing, setEditing] = useState(0);
	const [expanded, setExpanded] = useState({});
	const [notice, setNotice] = useState(null);

	const all = Object.values(state.products || {}).sort((a, b) => String(b.dateCreated).localeCompare(String(a.dateCreated)));
	const counts = { all: 0, publish: 0, draft: 0, pending: 0, private: 0, trash: 0 };
	all.forEach((p) => {
		counts[p.status] = (counts[p.status] || 0) + 1;
		if (p.status !== 'trash') counts.all++;
	});
	const rows = all.filter((p) => {
		if (view === 'all' ? p.status === 'trash' : p.status !== view) return false;
		if (query) {
			const hay = `${p.name} ${p.description} ${p.short} ${p.sku}`.toLowerCase();
			if (!hay.includes(query.toLowerCase())) return false;
		}
		if (filters.cat && !categoriesOf(p).includes(filters.cat)) return false;
		if (filters.type && p.type !== filters.type) return false;
		if (filters.stock && stockOf(p) !== filters.stock) return false;
		return true;
	});
	const cats = allCategories(state);

	const trash = (ids) => {
		store.set((s) => ids.reduce((acc, id) => setIn(acc, ['products', id, 'status'], 'trash'), s));
		setChecked([]);
		setNotice({ kind: 'trash', ids, prev: Object.fromEntries(ids.map((id) => [id, state.products[id].status])) });
	};
	const restore = (ids, prev = {}) => {
		store.set((s) => ids.reduce((acc, id) => setIn(acc, ['products', id, 'status'], prev[id] || 'draft'), s));
		setChecked([]);
		setNotice({ kind: 'restore', ids });
	};
	const applyBulk = () => {
		if (!checked.length) return;
		if (bulk === 'trash') trash(checked);
		if (bulk === 'untrash') restore(checked);
	};
	const viewLink = (key, label) =>
		counts[key] || key === 'all'
			? html`<li class=${key}><a href="#admin.products" class=${cx(view === key && 'current')} aria-current=${view === key ? 'page' : undefined} onClick=${(e) => (e.preventDefault(), setView(key), setChecked([]))}>${label} <span class="count">(${counts[key] || 0})</span></a></li>`
			: null;
	const views = [viewLink('all', 'All'), viewLink('publish', 'Published'), viewLink('draft', 'Drafts'), viewLink('pending', 'Pending'), viewLink('private', 'Private'), viewLink('trash', 'Trash')].filter(Boolean);
	const allChecked = rows.length > 0 && rows.every((r) => checked.includes(r.id));

	const head = (where) => html`<tr>
		<td id=${where === 'head' ? 'cb' : undefined} class="manage-column column-cb check-column">
			<input type="checkbox" aria-label="Select All" checked=${allChecked} onChange=${(e) => setChecked(e.currentTarget.checked ? rows.map((r) => r.id) : [])} />
		</td>
		${COLS.map(([key, label]) => html`<th key=${key} scope="col" class=${cx('manage-column', 'column-' + key, key === 'name' && 'column-primary')}>${label}</th>`)}
	</tr>`;

	return html`<${WpAdmin} current="all-products" title="Products">
		<div class="wrap wc3d-wc-screen">
			<h1 class="wp-heading-inline">Products</h1>
			<a href="#admin.product.new" class="page-title-action">Add New Product</a>
			<hr class="wp-header-end" />
			${flashed.map((n, i) => html`<${WpNotice} key=${'f' + i} type=${n.type || 'success'}>${n.body}<//>`)}
			${notice?.kind === 'trash' &&
			html`<div class="updated notice notice-success is-dismissible">
				<p>${notice.ids.length === 1 ? '1 product moved to the Trash.' : `${notice.ids.length} products moved to the Trash.`} <a href="#admin.products" onClick=${(e) => (e.preventDefault(), restore(notice.ids, notice.prev))}>Undo</a></p>
				<button type="button" class="notice-dismiss" onClick=${() => setNotice(null)}><span class="screen-reader-text">Dismiss this notice.</span></button>
			</div>`}
			${notice?.kind === 'restore' &&
			html`<${WpNotice} key=${'r' + notice.ids.join()}>${notice.ids.length === 1 ? '1 product restored from the Trash.' : `${notice.ids.length} products restored from the Trash.`}<//>`}

			<ul class="subsubsub">
				${views.map((v, i) => html`${v}${i < views.length - 1 ? html`<span class="sep"> |</span> ` : ''}`)}
			</ul>

			<form onSubmit=${(e) => (e.preventDefault(), setQuery(q.trim()))}>
				<p class="search-box">
					<label class="screen-reader-text" for="post-search-input">Search products:</label>
					<input type="search" id="post-search-input" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} />
					<input type="submit" id="search-submit" class="button" value="Search products" />
				</p>

				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<label for="bulk-action-selector-top" class="screen-reader-text">Select bulk action</label>
						<select id="bulk-action-selector-top" value=${bulk} onChange=${(e) => setBulk(e.currentTarget.value)}>
							<option value="-1">Bulk actions</option>
							${view === 'trash' ? html`<option value="untrash">Restore</option>` : html`<option value="trash">Move to Trash</option>`}
						</select>
						<input type="button" class="button action" value="Apply" onClick=${applyBulk} />
					</div>
					<div class="alignleft actions">
						<select aria-label="Filter by category" value=${draftFilters.cat} onChange=${(e) => setDraftFilters({ ...draftFilters, cat: e.currentTarget.value })}>
							<option value="">Select a category</option>
							${cats.map((c) => html`<option value=${c}>${c}</option>`)}
						</select>
						<select aria-label="Filter by product type" value=${draftFilters.type} onChange=${(e) => setDraftFilters({ ...draftFilters, type: e.currentTarget.value })}>
							<option value="">Filter by product type</option>
							${Object.entries(TYPE_LABELS).map(([v, l]) => html`<option value=${v}>${l}</option>`)}
						</select>
						<select aria-label="Filter by stock status" value=${draftFilters.stock} onChange=${(e) => setDraftFilters({ ...draftFilters, stock: e.currentTarget.value })}>
							<option value="">Filter by stock status</option>
							${Object.entries(STOCK_LABELS).map(([v, l]) => html`<option value=${v}>${l}</option>`)}
						</select>
						<input type="button" class="button" value="Filter" onClick=${() => setFilters(draftFilters)} />
					</div>
					<div class="tablenav-pages one-page"><span class="displaying-num">${rows.length} ${rows.length === 1 ? 'item' : 'items'}</span></div>
					<br class="clear" />
				</div>

				<h2 class="screen-reader-text">Products list</h2>
				<table class="wp-list-table widefat fixed striped table-view-list posts wc3d-wc-products">
					<thead>${head('head')}</thead>
					<tbody id="the-list">
						${!rows.length &&
						html`<tr class="no-items"><td class="colspanchange" colspan=${COLS.length + 1}>${view === 'trash' ? 'No products found in Trash.' : 'No products found.'}</td></tr>`}
						${rows.map((p) =>
							editing === p.id
								? html`<${QuickEdit} key=${'qe' + p.id} product=${p} colspan=${COLS.length + 1} onDone=${() => setEditing(0)} />`
								: html`<tr key=${p.id} id=${'post-' + p.id} class=${cx('iedit', 'type-product', 'status-' + p.status, expanded[p.id] && 'is-expanded')}>
										<th scope="row" class="check-column">
											<input type="checkbox" aria-label=${'Select ' + p.name} checked=${checked.includes(p.id)} onChange=${(e) => setChecked(e.currentTarget.checked ? [...checked, p.id] : checked.filter((x) => x !== p.id))} />
										</th>
										<td class="thumb column-thumb" data-colname="Image">
											<a href=${'#admin.product.' + p.id}><${ProductImage} product=${p} size=${40} alt="" /></a>
										</td>
										<td class="name column-name has-row-actions column-primary" data-colname="Name">
											<strong>
												${p.status === 'trash'
													? html`<span class="row-title">${p.name}</span>`
													: html`<a class="row-title" href=${'#admin.product.' + p.id}>${p.name}</a>`}
												${p.status !== 'publish' && p.status !== 'trash' && html`<span class="post-state"> — ${STATUS_LABEL[p.status] || p.status}</span>`}
											</strong>
											<div class="row-actions">
												<span class="id">ID: ${p.id} | </span>
												${p.status === 'trash'
													? html`<span class="untrash"><a href="#admin.products" onClick=${(e) => (e.preventDefault(), restore([p.id]))}>Restore</a></span>`
													: html`<span class="edit"><a href=${'#admin.product.' + p.id} aria-label=${`Edit “${p.name}”`}>Edit</a> | </span>
															<span class="inline hide-if-no-js"><button type="button" class="button-link editinline" aria-label=${`Quick edit “${p.name}” inline`} onClick=${() => setEditing(p.id)}>Quick Edit</button> | </span>
															<span class="trash"><a href="#admin.products" class="submitdelete" aria-label=${`Move “${p.name}” to the Trash`} onClick=${(e) => (e.preventDefault(), trash([p.id]))}>Trash</a> | </span>
															<span class="view"><a href=${'#store.product.' + p.slug} rel="bookmark">${p.status === 'publish' ? 'View' : 'Preview'}</a></span>`}
											</div>
											<button type="button" class="toggle-row" onClick=${() => setExpanded({ ...expanded, [p.id]: !expanded[p.id] })}><span class="screen-reader-text">Show more details</span></button>
										</td>
										<td class="sku column-sku" data-colname="SKU">${p.sku ? p.sku : html`<span class="na">–</span>`}</td>
										<td class="is_in_stock column-is_in_stock" data-colname="Stock"><mark class=${stockOf(p)}>${STOCK_LABELS[stockOf(p)]}</mark></td>
										<td class="price column-price" data-colname="Price"><span class="price">${priceText(state, p)}</span></td>
										<td class="product_cat column-product_cat" data-colname="Categories">
											${categoriesOf(p).length
												? categoriesOf(p).map((c, i) => html`${i ? ', ' : ''}<a href="#admin.products" onClick=${(e) => (e.preventDefault(), setFilters({ ...filters, cat: c }), setDraftFilters({ ...draftFilters, cat: c }))}>${c}</a>`)
												: html`<span class="na">–</span>`}
										</td>
										<td class="product_tag column-product_tag" data-colname="Tags">
											${p.wc?.tags?.length ? p.wc.tags.map((t, i) => html`${i ? ', ' : ''}<a href="#admin.products" onClick=${(e) => e.preventDefault()}>${t}</a>`) : html`<span class="na">–</span>`}
										</td>
										<td class="featured column-featured" data-colname="Featured">
											<a href="#admin.products" aria-label="Toggle featured" onClick=${(e) => (e.preventDefault(), store.patch(['products', p.id, 'wc', 'featured'], !p.wc?.featured))}>
												<span class=${cx('wc-featured', !p.wc?.featured && 'not-featured', 'tips')}><${Dashicon} name=${p.wc?.featured ? 'star-filled' : 'star-empty'} /><span class="screen-reader-text">${p.wc?.featured ? 'Yes' : 'No'}</span></span>
											</a>
										</td>
										<td class="date column-date" data-colname="Date">
											${p.status === 'publish' ? 'Published' : 'Last Modified'}<br />${listDate(p.status === 'publish' ? p.dateCreated : p.dateModified)}
										</td>
									</tr>`
						)}
					</tbody>
					<tfoot>${head('foot')}</tfoot>
				</table>
				<div class="tablenav bottom">
					<div class="tablenav-pages one-page"><span class="displaying-num">${rows.length} ${rows.length === 1 ? 'item' : 'items'}</span></div>
					<br class="clear" />
				</div>
			</form>
		</div>
	<//>`;
}
