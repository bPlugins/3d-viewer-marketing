import { useState, useEffect } from '../../js/core/ui.js';

// Dot-separated hash tokens (#admin.editor.1001): the artifact host forwards only plain #anchors.
export function parseHash(hash = location.hash) {
	const token = hash.replace(/^#/, '') || 'guide';
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
