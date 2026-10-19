import { useState, useEffect } from './ui.js';

// Routes are dot-separated hash tokens (#admin.editor.101) because the artifact
// host only forwards plain #anchors made of letters, digits and . _ ~ -.
let fallback = 'admin.models';
/** Route used for an empty hash (the live demo starts on the WP dashboard). */
export function setDefaultRoute(token) {
	fallback = token;
}

export function parseHash(hash = location.hash) {
	const token = hash.replace(/^#/, '') || fallback;
	const [area, screen = '', ...rest] = token.split('.');
	return { token, area, screen, params: rest };
}

export function go(token) {
	if (location.hash.slice(1) === token) return;
	location.hash = token;
	window.scrollTo(0, 0);
}

export function useRoute() {
	const [route, setRoute] = useState(parseHash());
	useEffect(() => {
		const on = () => setRoute(parseHash());
		window.addEventListener('hashchange', on);
		return () => window.removeEventListener('hashchange', on);
	}, []);
	return route;
}
