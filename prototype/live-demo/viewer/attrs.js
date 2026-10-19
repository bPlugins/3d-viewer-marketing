// 3D Viewer block attributes: defaults copied from 3d-viewer-premium/src/blocks/3d-viewer/block.json
// (b3dviewer/modelviewer). A viewer post stores these, like the real block; Free and Pro share one shape.
const DEFAULTS = {
	"uniqueId": "uniqueId",
	"multiple": false,
	"model": {
		"skyboxImage": null,
		"environmentImage": null,
		"arEnabled": false,
		"arPlacement": "floor",
		"arMode": "quick-look",
		"arScale": "fixed"
	},
	"models": [
		{
			"modelUrl": "",
			"poster": "",
			"useDecoder": "none"
		}
	],
	"currentViewer": "modelViewer",
	"attributes": {
		"tonMapping": "neutral"
	},
	"O3DVSettings": {
		"isFullscreen": true,
		"isPagination": false,
		"isNavigation": false,
		"camera": null,
		"mouseControl": true,
		"showEdge": false,
		"edgeColor": "#000000",
		"edgeThreshold": 0,
		"zoom": true
	},
	"lazyLoad": "auto",
	"preload": "auto",
	"autoplay": true,
	"shadow": true,
	"rotate": false,
	"autoRotate": false,
	"zoom": true,
	"zoomInOutBtn": false,
	"isPagination": false,
	"isNavigation": true,
	"rotationPerSecond": 20,
	"rotateDelay": 2000,
	"mouseControl": true,
	"fullscreen": true,
	"cameraBtn": false,
	"downloadBtn": false,
	"resetViewBtn": false,
	"variant": false,
	"loadingPercentage": false,
	"progressBar": true,
	"rotateAlongX": "0",
	"rotateAlongY": 75,
	"exposure": 1,
	"environmentImage": "",
	"useEnvironmentAsSkybox": false,
	"zoomLevel": 1,
	"appliedTextures": {
		"modelUrl": null
	},
	"toneMapping": "neutral",
	"hotspots": [],
	"styles": {
		"width": {
			"desktop": "100%",
			"tablet": "100%",
			"mobile": "100%"
		},
		"height": {
			"desktop": "400px",
			"tablet": "300px",
			"mobile": "300px"
		},
		"bgColor": "transparent",
		"progressBarColor": "#666",
		"thumbSize": "90px"
	},
	"stylesheet": null,
	"additional": {
		"ID": "",
		"Class": "",
		"CSS": ""
	},
	"animation": false,
	"woo": false,
	"selectedAnimation": "",
	"hotspotStyle": "style-1",
	"placement": "block",
	"lockXAxisRotation": false,
	"lockYAxisRotation": false,
	"mobile": {
		"imageMode": "off",
		"tapLabel": "",
		"breakpoint": 768,
		"reduceMotion": false
	},
	"dimensions": {
		"mode": "off",
		"unit": "cm",
		"color": ""
	},
	"pins": {
		"size": 28,
		"color": "#15171a",
		"background": "#ffffff"
	},
	"controls": {
		"labels": "off",
		"text": {},
		"corner": {
			"zoom": "bottom-right",
			"fullscreen": "bottom-right",
			"camera": "bottom-left",
			"download": "bottom-left",
			"reset": "bottom-left",
			"dimensions": "bottom-left",
			"ar": "bottom-left"
		},
		"order": [
			"zoom",
			"fullscreen",
			"camera",
			"download",
			"reset",
			"dimensions",
			"ar"
		],
		"size": 35,
		"gap": 10,
		"offset": 10
	}
};

/** Fresh copy of the block defaults. */
export function blockDefaults() {
	return structuredClone(DEFAULTS);
}

/** Defaults with overrides deep-merged in (plain objects only; arrays replace). */
export function viewerAttrs(overrides = {}) {
	return merge(blockDefaults(), overrides);
}

function merge(base, over) {
	for (const [k, v] of Object.entries(over)) {
		base[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], v) : v;
	}
	return base;
}
