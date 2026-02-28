/**
 * EnvAware — Popup page controller.
 * Manages the per-site watermark settings shown in the browser action popup.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    const {
        STORAGE_KEY, DEFAULT_CONFIG, VISUAL_FIELDS,
        mountPresetManager, findMatchingConfig, findExcludedMatch, isPatternConfig,
        escapeHtml, showToast
    } = window.EnvAware;

    /* -- Element refs ------------------------------ */

    const els = {
        enableToggle:     document.getElementById('enableToggle'),
        watermarkText:    document.getElementById('watermarkText'),
        textColor:        document.getElementById('textColor'),
        colorValue:       document.getElementById('colorValue'),
        textSize:         document.getElementById('textSize'),
        textSizeValue:    document.getElementById('textSizeValue'),
        textSpacing:      document.getElementById('textSpacing'),
        textSpacingValue: document.getElementById('textSpacingValue'),
        textOpacity:      document.getElementById('textOpacity'),
        textOpacityValue: document.getElementById('textOpacityValue'),
        addTitlePrefix:   document.getElementById('addTitlePrefix'),
        toastContainer:   document.getElementById('toastContainer'),
        presetsContainer: document.getElementById('presetsContainer'),
        overrideBanner:   document.getElementById('overrideBanner'),
        presetBanner:     document.getElementById('presetBanner'),
        exclusionBanner:  document.getElementById('exclusionBanner')
    };

    const toast = (msg, type) => showToast(els.toastContainer, msg, type);

    /* -- Current tab ------------------------------- */

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) { toast('Cannot access tab URL', 'error'); return; }

    let origin;
    try { origin = new URL(tab.url).origin; }
    catch { toast('Invalid URL', 'error'); return; }

    /* -- State -------------------------------------- */

    let allConfigs = [];
    let currentConfigId = null;
    let linkedPresetName = null;
    let detachCollapseTimeout = null;
    let detachCleanupTimeout = null;

    /* -- Visual input elements (for detach detection) */

    const visualInputs = [els.textColor, els.textSize, els.textSpacing, els.textOpacity];

    /* -- UI ↔ Data ---------------------------------- */

    function getSettingsFromUI() {
        return {
            enabled:        els.enableToggle.checked,
            text:           els.watermarkText.value || 'LOCAL',
            color:          els.textColor.value,
            size:           parseInt(els.textSize.value, 10),
            spacing:        parseInt(els.textSpacing.value, 10),
            opacity:        parseFloat(els.textOpacity.value),
            addTitlePrefix: els.addTitlePrefix.checked,
            presetName:     linkedPresetName
        };
    }

    function applyToUI(config) {
        els.enableToggle.checked         = config.enabled;
        els.watermarkText.value          = config.text;
        els.addTitlePrefix.checked       = config.addTitlePrefix || false;
        els.textColor.value              = config.color;
        els.colorValue.textContent       = config.color;
        els.textSize.value               = config.size;
        els.textSizeValue.textContent    = `${config.size}px`;
        els.textSpacing.value            = config.spacing;
        els.textSpacingValue.textContent = config.spacing;
        els.textOpacity.value            = config.opacity;
        els.textOpacityValue.textContent = config.opacity;
    }

    /* -- Preset Banner ----------------------------- */

    function cancelPendingDetachAnimation() {
        if (detachCollapseTimeout) { clearTimeout(detachCollapseTimeout); detachCollapseTimeout = null; }
        if (detachCleanupTimeout) { clearTimeout(detachCleanupTimeout); detachCleanupTimeout = null; }
    }

    function showPresetBanner(presetName) {
        cancelPendingDetachAnimation();
        const safeName = escapeHtml(presetName);
        els.presetBanner.classList.remove('detaching');
        els.presetBanner.innerHTML = `
            <div class="preset-banner-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
            </div>
            <div class="preset-banner-body">
                <div class="preset-banner-title">Using preset <code>${safeName}</code></div>
                <div class="preset-banner-desc">Changes to visual settings will create site-specific settings</div>
            </div>
            <button class="preset-banner-action" id="editPresetBtn" type="button">Edit preset</button>`;
        els.presetBanner.classList.add('visible');

        document.getElementById('editPresetBtn').addEventListener('click', () => {
            presetMgr.editPreset(presetName);
        });
    }

    /**
     * Smoothly transitions the preset banner from "linked" to "detached",
     * then collapses it after a delay. No layout shift while user is dragging.
     */
    function transitionToDetached(oldPresetName) {
        cancelPendingDetachAnimation();
        const safeName = escapeHtml(oldPresetName);

        // Update content in-place (no layout shift)
        const icon = els.presetBanner.querySelector('.preset-banner-icon');
        if (icon) {
            icon.style.background = 'rgba(34, 197, 94, 0.12)';
            icon.style.color = '#22c55e';
            icon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 7h3a5 5 0 0 1 0 10h-3m-6 0H6a5 5 0 0 1 0-10h3"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>`;
        }
        const title = els.presetBanner.querySelector('.preset-banner-title');
        if (title) title.innerHTML = `Detached from <code>${safeName}</code>`;
        const desc = els.presetBanner.querySelector('.preset-banner-desc');
        if (desc) desc.textContent = 'Editing this site only';
        const actionBtn = els.presetBanner.querySelector('.preset-banner-action');
        if (actionBtn) actionBtn.remove();

        els.presetBanner.classList.add('detaching');

        // After 2.5s (user has finished dragging), smoothly collapse
        detachCollapseTimeout = setTimeout(() => {
            els.presetBanner.classList.remove('visible');
            // After collapse animation finishes, clean up innerHTML
            detachCleanupTimeout = setTimeout(() => {
                els.presetBanner.classList.remove('detaching');
                els.presetBanner.innerHTML = '';
            }, 450);
        }, 2500);
    }

    function hidePresetBanner() {
        cancelPendingDetachAnimation();
        els.presetBanner.classList.remove('visible', 'detaching');
        setTimeout(() => { els.presetBanner.innerHTML = ''; }, 450);
    }

    /* -- Persistence -------------------------------- */

    function saveSettings() {
        const settings = getSettingsFromUI();

        if (currentConfigId) {
            const idx = allConfigs.findIndex(c => c.id === currentConfigId);
            if (idx !== -1) allConfigs[idx] = { ...allConfigs[idx], ...settings };
        } else {
            const newConfig = { id: Date.now().toString(), pattern: origin, ...settings };
            allConfigs.push(newConfig);
            currentConfigId = newConfig.id;
        }

        chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs }, () => toast('Settings saved'));
    }

    /* -- Content-script communication --------------- */

    async function ensureContentScript() {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
        } catch {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['js/core.js', 'js/content.js']
            });
        }
    }

    function updatePreview() {
        chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_WATERMARK', settings: getSettingsFromUI() }).catch(() => {
            ensureContentScript();
        });
    }

    /* -- Override Banner ---------------------------- */

    function showOverrideBanner(globConfig) {
        const tpl = document.getElementById('overrideBannerTpl');
        const frag = tpl.content.cloneNode(true);
        frag.querySelector('[data-slot="pattern"]').textContent = globConfig.pattern;
        els.overrideBanner.innerHTML = '';
        els.overrideBanner.appendChild(frag);
        els.overrideBanner.classList.add('visible');

        els.overrideBanner.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'customize') {
                createSiteOverride(globConfig);
                if (linkedPresetName) showPresetBanner(linkedPresetName);
                toast('Site override created — edits now apply to this site only');
            } else if (action === 'exclude-site') {
                addExclusion(globConfig, false);
            } else if (action === 'exclude-url') {
                addExclusion(globConfig, true);
            }
        });
    }

    function hideOverrideBanner() {
        els.overrideBanner.classList.remove('visible');
        setTimeout(() => { els.overrideBanner.innerHTML = ''; }, 400);
    }

    /* -- Exclusion Banner -------------------------- */

    function showExclusionBanner(config, exclusionPattern) {
        const tpl = document.getElementById('exclusionBannerTpl');
        const frag = tpl.content.cloneNode(true);
        frag.querySelector('[data-slot="pattern"]').textContent = config.pattern;
        els.exclusionBanner.innerHTML = '';
        els.exclusionBanner.appendChild(frag);
        els.exclusionBanner.classList.add('visible');

        els.exclusionBanner.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="remove-exclusion"]')) {
                removeExclusion(config, exclusionPattern);
            }
        });
    }

    function hideExclusionBanner() {
        els.exclusionBanner.classList.remove('visible');
        setTimeout(() => { els.exclusionBanner.innerHTML = ''; }, 400);
    }

    /**
     * Adds an exclusion to a pattern config.
     * @param {boolean} exactUrl — true = exclude this exact URL, false = exclude entire site (origin)
     */
    function addExclusion(globConfig, exactUrl) {
        const config = allConfigs.find(c => c.id === globConfig.id);
        if (!config) return;
        if (!config.exclusions) config.exclusions = [];
        const exclusionPattern = exactUrl ? tab.url : origin + '*';
        if (!config.exclusions.includes(exclusionPattern)) {
            config.exclusions.push(exclusionPattern);
        }
        const label = exactUrl ? 'URL excluded from pattern' : 'Site excluded from pattern';
        chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs }, () => {
            currentConfigId = null;
            linkedPresetName = null;
            hideOverrideBanner();
            hidePresetBanner();
            applyToUI(DEFAULT_CONFIG);
            showExclusionBanner(config, exclusionPattern);
            updatePreview();
            toast(label);
        });
    }

    function removeExclusion(config, exclusionPattern) {
        const cfg = allConfigs.find(c => c.id === config.id);
        if (!cfg || !cfg.exclusions) return;
        cfg.exclusions = cfg.exclusions.filter(ex => ex !== exclusionPattern);
        chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs }, () => {
            hideExclusionBanner();
            loadConfig();
            updatePreview();
            toast('Exclusion removed');
        });
    }

    /* -- Site Override Creation --------------------- */

    /**
     * Creates a site-specific config (exact match for current origin)
     * from the current pattern config. Used both by the "Customize this site"
     * button and by auto-detach on visual change.
     */
    function createSiteOverride(sourceConfig) {
        const overrideConfig = {
            id:             Date.now().toString(),
            pattern:        origin,
            enabled:        sourceConfig.enabled,
            text:           sourceConfig.text,
            color:          sourceConfig.color,
            size:           sourceConfig.size,
            spacing:        sourceConfig.spacing,
            opacity:        sourceConfig.opacity,
            addTitlePrefix: sourceConfig.addTitlePrefix || false,
            presetName:     sourceConfig.presetName || null
        };
        allConfigs.push(overrideConfig);
        currentConfigId = overrideConfig.id;
        linkedPresetName = overrideConfig.presetName;
        chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs });
        hideOverrideBanner();
    }

    /* -- Detach Logic ------------------------------ */

    /**
     * Handles detaching from a preset when user manually changes a visual field.
     * If currently on a pattern config, creates a site-specific override first.
     */
    function detachFromPreset() {
        const oldPresetName = linkedPresetName;
        linkedPresetName = null;

        // If on a pattern config, auto-create a site override so changes
        // only affect this site, not all sites matching the pattern
        if (currentConfigId) {
            const currentConfig = allConfigs.find(c => c.id === currentConfigId);
            if (currentConfig && isPatternConfig(currentConfig.pattern)) {
                // Read current UI values into the override (not the stored pattern values)
                const uiSettings = getSettingsFromUI();
                const overrideConfig = {
                    id:             Date.now().toString(),
                    pattern:        origin,
                    ...uiSettings,
                    presetName:     null
                };
                allConfigs.push(overrideConfig);
                currentConfigId = overrideConfig.id;
                chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs });
                hideOverrideBanner();
            }
        }

        // Smooth banner transition (no layout shift)
        transitionToDetached(oldPresetName);
    }

    /* -- Load Config ------------------------------- */

    function loadConfig() {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            allConfigs = result[STORAGE_KEY] || [];
            const fullUrl = tab.url;
            const match = findMatchingConfig(allConfigs, origin, fullUrl);

            if (match) {
                currentConfigId = match.id;
                linkedPresetName = match.presetName || null;
                applyToUI(match);
                hideExclusionBanner();

                if (match.pattern !== origin && isPatternConfig(match.pattern)) {
                    showOverrideBanner(match);
                } else {
                    hideOverrideBanner();
                }

                if (linkedPresetName) {
                    showPresetBanner(linkedPresetName);
                } else {
                    hidePresetBanner();
                }
            } else {
                currentConfigId = null;
                linkedPresetName = null;
                hideOverrideBanner();
                hidePresetBanner();

                // Check if this site is excluded from a pattern
                const excluded = findExcludedMatch(allConfigs, origin, fullUrl);
                if (excluded) {
                    showExclusionBanner(excluded.config, excluded.exclusionPattern);
                } else {
                    hideExclusionBanner();
                }

                applyToUI(DEFAULT_CONFIG);
            }
        });
    }

    /* -- Input listeners --------------------------- */

    const inputs = [els.enableToggle, els.watermarkText, els.textColor, els.textSize, els.textSpacing, els.textOpacity, els.addTitlePrefix];

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input === els.textColor)   els.colorValue.textContent      = input.value;
            if (input === els.textSize)    els.textSizeValue.textContent   = `${input.value}px`;
            if (input === els.textSpacing) els.textSpacingValue.textContent = input.value;
            if (input === els.textOpacity) els.textOpacityValue.textContent = input.value;

            // Detach from preset on manual visual change
            if (linkedPresetName && visualInputs.includes(input)) {
                detachFromPreset();
            }

            updatePreview();
        });

        input.addEventListener('change', () => {
            saveSettings();
            updatePreview();
        });
    });

    /* -- Preset manager ---------------------------- */

    const presetMgr = mountPresetManager(els.presetsContainer, {
        toastFn: toast,
        onApply(preset) {
            // If on a pattern config without site override, create one first
            if (currentConfigId) {
                const currentConfig = allConfigs.find(c => c.id === currentConfigId);
                if (currentConfig && isPatternConfig(currentConfig.pattern)) {
                    createSiteOverride(currentConfig);
                }
            }

            linkedPresetName = preset.name;
            applyToUI({
                enabled:        true,
                text:           preset.name,
                color:          preset.color,
                size:           preset.size,
                spacing:        preset.spacing,
                opacity:        preset.opacity,
                addTitlePrefix: false
            });
            showPresetBanner(preset.name);
            updatePreview();
            saveSettings();
            toast(`"${preset.name}" preset applied`);
        }
    });

    /* -- Footer link ------------------------------- */

    document.getElementById('openOptions')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'options.html' });
    });

    /* -- Bootstrap ---------------------------------- */

    loadConfig();
});
