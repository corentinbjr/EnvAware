/**
 * EnvAware — Shared constants, storage helpers, and utility functions.
 * Used by popup, options, content script, and the preset-manager component.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

window.EnvAware = {

    /* -- Storage Keys ------------------------------ */

    STORAGE_KEY:  'wm_configs',
    PRESETS_KEY:  'wm_custom_presets',

    /* -- Default Values ---------------------------- */

    VISUAL_FIELDS: ['color', 'size', 'spacing', 'opacity'],

    DEFAULT_CONFIG: {
        enabled:        false,
        text:           'LOCAL',
        color:          '#ff0000',
        size:           26,
        spacing:        450,
        opacity:        0.3,
        addTitlePrefix: false
    },

    DEFAULT_PRESETS: [
        { name: 'LOCAL',   color: '#3b82f6', size: 26, spacing: 450, opacity: 0.3,  builtIn: true },
        { name: 'DEV',     color: '#22c55e', size: 26, spacing: 450, opacity: 0.3,  builtIn: true },
        { name: 'STAGING', color: '#f97316', size: 30, spacing: 350, opacity: 0.5,  builtIn: true },
        { name: 'PROD',    color: '#ef4444', size: 27, spacing: 260, opacity: 0.75, builtIn: true }
    ],

    /* -- Preset Storage ---------------------------- */

    /** Returns a promise resolving to built-in (with overrides merged) + custom presets combined. */
    loadPresets() {
        return new Promise(resolve => {
            chrome.storage.sync.get([EnvAware.PRESETS_KEY], result => {
                const custom = result[EnvAware.PRESETS_KEY] || [];
                const overrides = custom.filter(p => p.builtInOverride);
                const userPresets = custom.filter(p => !p.builtInOverride);

                const builtIn = EnvAware.DEFAULT_PRESETS.map(preset => {
                    const override = overrides.find(o => o.name === preset.name);
                    return override
                        ? { ...preset, ...override, builtIn: true }
                        : preset;
                });

                resolve([...builtIn, ...userPresets]);
            });
        });
    },

    /** Persists the custom-only preset list (no builtIn entries, but may include builtInOverride entries) to storage. */
    saveCustomPresets(list) {
        return new Promise(resolve => {
            chrome.storage.sync.set({ [EnvAware.PRESETS_KEY]: list }, resolve);
        });
    },

    /** Returns the original DEFAULT_PRESETS entry by name (for "Reset to Default"). */
    getDefaultBuiltInPreset(name) {
        return EnvAware.DEFAULT_PRESETS.find(p => p.name === name) || null;
    },

    /** Updates all configs with matching presetName to use newVisuals, saves to storage. */
    propagatePresetToConfigs(presetName, newVisuals) {
        return new Promise(resolve => {
            chrome.storage.sync.get([EnvAware.STORAGE_KEY], result => {
                const configs = result[EnvAware.STORAGE_KEY] || [];
                let changed = false;
                configs.forEach(c => {
                    if (c.presetName === presetName) {
                        EnvAware.VISUAL_FIELDS.forEach(f => { c[f] = newVisuals[f]; });
                        changed = true;
                    }
                });
                if (changed) {
                    chrome.storage.sync.set({ [EnvAware.STORAGE_KEY]: configs }, resolve);
                } else {
                    resolve();
                }
            });
        });
    },

    /** Clears presetName on all configs referencing the given preset (for delete cascade). */
    unlinkPresetFromConfigs(presetName) {
        return new Promise(resolve => {
            chrome.storage.sync.get([EnvAware.STORAGE_KEY], result => {
                const configs = result[EnvAware.STORAGE_KEY] || [];
                let changed = false;
                configs.forEach(c => {
                    if (c.presetName === presetName) {
                        c.presetName = null;
                        changed = true;
                    }
                });
                if (changed) {
                    chrome.storage.sync.set({ [EnvAware.STORAGE_KEY]: configs }, resolve);
                } else {
                    resolve();
                }
            });
        });
    },

    /* -- Pattern Matching -------------------------- */

    /** Converts a user-facing glob pattern (with `*` wildcards) to a RegExp. */
    globToRegex(pattern) {
        const escaped = pattern.replace(/([.+^${}()|[\]\\])/g, (m) => '\\' + m);
        return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$', 'i');
    },

    /** Returns a numeric specificity score for a pattern. Exact = Infinity. */
    getSpecificity(pattern) {
        const wildcardCount = (pattern.match(/\*/g) || []).length;
        if (wildcardCount === 0) return Infinity;
        return pattern.length - (wildcardCount * 50);
    },

    /** True when the pattern string contains at least one wildcard. */
    isPatternConfig(pattern) {
        return pattern.includes('*');
    },

    /**
     * Finds the best matching **enabled** config for a given origin.
     * Exact matches (specificity = ∞) always win over glob patterns.
     * Configs whose exclusions list matches the full URL are skipped.
     * @param {string} url — full page URL, used for exclusion matching
     */
    findMatchingConfig(configs, origin, url) {
        const matchUrl = url || origin;
        let bestMatch = null;
        let bestScore = -Infinity;

        configs.forEach(config => {
            if (!config.enabled) return;
            const regex = EnvAware.globToRegex(config.pattern);
            if (!regex.test(origin)) return;

            // Skip if full URL matches any exclusion pattern
            const excluded = (config.exclusions || []).some(ex =>
                EnvAware.globToRegex(ex).test(matchUrl)
            );
            if (excluded) return;

            const score = EnvAware.getSpecificity(config.pattern);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = config;
            }
        });

        return bestMatch;
    },

    /**
     * Returns { config, exclusionPattern } if the best-matching enabled config
     * for the origin is blocked by an exclusion. Returns null otherwise.
     * @param {string} url — full page URL, used for exclusion matching
     */
    findExcludedMatch(configs, origin, url) {
        const matchUrl = url || origin;
        let bestMatch = null;
        let bestScore = -Infinity;
        let matchedExclusion = null;

        configs.forEach(config => {
            if (!config.enabled) return;
            const regex = EnvAware.globToRegex(config.pattern);
            if (!regex.test(origin)) return;

            const score = EnvAware.getSpecificity(config.pattern);
            if (score > bestScore) {
                const ex = (config.exclusions || []).find(ex =>
                    EnvAware.globToRegex(ex).test(matchUrl)
                );
                if (ex) {
                    bestScore = score;
                    bestMatch = config;
                    matchedExclusion = ex;
                }
            }
        });

        return bestMatch ? { config: bestMatch, exclusionPattern: matchedExclusion } : null;
    },

    /* -- DOM Utilities ------------------------------ */

    /** Escapes a string for safe innerHTML usage. */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /** Renders a toast notification inside `container`. Auto-removes after 2.2 s. */
    showToast(container, message, type = 'success') {
        const icons = { success: '✓', error: '✕', info: 'i' };
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('removing');
            el.addEventListener('animationend', () => el.remove());
        }, 2200);
    }
};
