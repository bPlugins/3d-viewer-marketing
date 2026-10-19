// Port of src/shared/schema/defaultConfig.ts, materialKeys.ts and resolveEffectiveConfig.ts
// (PHP twin: includes/Domain/EffectiveConfig.php). Keep the inheritance rules identical.

/** Blank product default config. */
export const defaultConfig = () => ({
	schema_version: 1,
	meshes: {},
	materials: {},
	camera: null,
	environment: null,
	animations: null,
	hotspots: [],
	optimization: null,
});

/** Empty variation config (a diff with nothing overridden). */
export const emptyVariationConfig = () => ({ schema_version: 1 });

/** JS port of WordPress sanitize_key(): ASCII lowercase, strip outside [a-z0-9_-]. */
export function legacyMaterialKey(meshName) {
	return String(meshName)
		.replace(/[A-Z]/g, (c) => c.toLowerCase())
		.replace(/[^a-z0-9_\-]/g, '');
}

/** Legacy lowercased entry with the exact-name entry layered on top. */
export function getMaterialConfig(materials, meshName, meshNames = []) {
	if (!materials) return undefined;
	const exact = materials[meshName];
	const legacy = legacyMaterialKey(meshName);
	const old = legacy !== meshName && !meshNames.includes(legacy) ? materials[legacy] : undefined;
	if (!old) return exact;
	return { ...old, ...(exact ?? {}) };
}

/** Patch one mesh's material entry, folding a legacy key into the exact name. */
export function patchMaterialConfig(materials, meshName, patch, meshNames = []) {
	const next = { ...(materials ?? {}) };
	const legacy = legacyMaterialKey(meshName);
	next[meshName] = { ...(getMaterialConfig(materials, meshName, meshNames) ?? {}), ...patch };
	if (legacy !== meshName && legacy in next && !meshNames.includes(legacy)) delete next[legacy];
	return next;
}

/** {...base, ...override} for materials maps; an override also replaces its legacy/real alias. */
export function mergeMaterialLayers(base, override) {
	const out = { ...(base ?? {}) };
	for (const [key, cfg] of Object.entries(override ?? {})) {
		for (const baseKey of Object.keys(out)) {
			if (baseKey !== key && (legacyMaterialKey(key) === baseKey || legacyMaterialKey(baseKey) === key)) {
				delete out[baseKey];
			}
		}
		out[key] = cfg;
	}
	return out;
}

const mergeFields = (base, over) => {
	if (!over) return base;
	if (!base) return over;
	return { ...base, ...over };
};

/**
 * What a variation looks like: its overrides on the product default.
 * meshes/materials entry-level (own model → variation only); environment/optimization/ar
 * field-level; camera/animations/gallery_presets/hotspots/pricing/options whole value. null = inherit.
 */
export function resolveEffectiveConfig(base, variation, hasOwnModel) {
	if (!variation) return base;
	return {
		...base,
		meshes: hasOwnModel ? { ...(variation.meshes ?? {}) } : { ...(base.meshes ?? {}), ...(variation.meshes ?? {}) },
		materials: hasOwnModel ? { ...(variation.materials ?? {}) } : mergeMaterialLayers(base.materials, variation.materials),
		camera: variation.camera ?? base.camera,
		animations: variation.animations ?? base.animations,
		gallery_presets: variation.gallery_presets ?? base.gallery_presets,
		hotspots: variation.hotspots ?? base.hotspots,
		environment: mergeFields(base.environment, variation.environment),
		optimization: mergeFields(base.optimization, variation.optimization),
		ar: mergeFields(base.ar, variation.ar),
		// Planned (option-pricing / option-groups): whole value, like hotspots.
		pricing: variation.pricing ?? base.pricing,
		options: variation.options ?? base.options,
		// Planned (materials-variants): whole value; '' = the GLB's own materials.
		material_variant: variation.material_variant ?? base.material_variant,
		// Planned (decals): personalization areas, whole value.
		decals: variation.decals ?? base.decals,
	};
}

/**
 * Shopper choices are field-level patches on the resolved mesh/material entries
 * (EffectiveConfig::apply_shopper_choices).
 */
export function applyShopperChoices(config, choices) {
	if (!choices || (!choices.meshes && !choices.materials && typeof choices.material_variant !== 'string' && !choices.decals)) return config;
	const meshes = { ...(config.meshes || {}) };
	const materials = { ...(config.materials || {}) };
	for (const [name, opts] of Object.entries(choices.meshes || {})) {
		meshes[name] = { ...(meshes[name] || {}), ...(opts || {}) };
	}
	const meshNames = Object.keys(meshes);
	for (const [name, opts] of Object.entries(choices.materials || {})) {
		materials[name] = { ...(getMaterialConfig(materials, name, meshNames) || {}), ...(opts || {}) };
	}
	const out = { ...config, meshes, materials };
	if (typeof choices.material_variant === 'string') out.material_variant = choices.material_variant; // materials-variants group pick
	// decals: the customer's design baked into its area as `content` (the engine draws it).
	if (choices.decals && Array.isArray(config.decals)) out.decals = config.decals.map((a) => (a && choices.decals[a.id] ? { ...a, content: choices.decals[a.id] } : a));
	return out;
}
