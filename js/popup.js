/**
 * EnvAware — Popup page controller.
 * Manages the per-site watermark settings shown in the browser action popup.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    const {
        STORAGE_KEY, DEFAULT_CONFIG,
        mountPresetManager, findMatchingConfig, isPatternConfig,
        escapeHtml, showToast
    } = window.EnvAware;

    /* ── Element refs ────────────────────────────── */

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
        overrideBanner:   document.getElementById('overrideBanner')
    };

    const toast = (msg, type) => showToast(els.toastContainer, msg, type);

    /* ── Current tab ─────────────────────────────── */

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) { toast('Cannot access tab URL', 'error'); return; }

    let origin;
    try { origin = new URL(tab.url).origin; }
    catch { toast('Invalid URL', 'error'); return; }

    /* ── State ────────────────────────────────────── */

    let allConfigs = [];
    let currentConfigId = null;

    /* ── UI ↔ Data ────────────────────────────────── */

    function getSettingsFromUI() {
        return {
            enabled:        els.enableToggle.checked,
            text:           els.watermarkText.value || 'LOCAL',
            color:          els.textColor.value,
            size:           parseInt(els.textSize.value, 10),
            spacing:        parseInt(els.textSpacing.value, 10),
            opacity:        parseFloat(els.textOpacity.value),
            addTitlePrefix: els.addTitlePrefix.checked
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

    /* ── Persistence ──────────────────────────────── */

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

    /* ── Content-script communication ─────────────── */

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

    /* ── Override Banner ──────────────────────────── */

    function showOverrideBanner(globConfig) {
        const safePattern = escapeHtml(globConfig.pattern);
        els.overrideBanner.innerHTML = `
            <div class="override-banner-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <div class="override-banner-body">
                <div class="override-banner-title">Using pattern <code>${safePattern}</code></div>
                <div class="override-banner-desc">Changes will affect all sites matching this pattern</div>
            </div>
            <button class="override-banner-btn" id="createOverrideBtn" type="button">Customize this site</button>`;
        els.overrideBanner.classList.add('visible');

        document.getElementById('createOverrideBtn').addEventListener('click', () => {
            const overrideConfig = {
                id:             Date.now().toString(),
                pattern:        origin,
                enabled:        globConfig.enabled,
                text:           globConfig.text,
                color:          globConfig.color,
                size:           globConfig.size,
                spacing:        globConfig.spacing,
                opacity:        globConfig.opacity,
                addTitlePrefix: globConfig.addTitlePrefix || false
            };
            allConfigs.push(overrideConfig);
            currentConfigId = overrideConfig.id;
            chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs }, () => {
                hideOverrideBanner();
                toast('Site override created — edits now apply to this site only');
            });
        });
    }

    function hideOverrideBanner() {
        els.overrideBanner.classList.remove('visible');
        els.overrideBanner.innerHTML = '';
    }

    /* ── Load Config ─────────────────────────────── */

    function loadConfig() {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            allConfigs = result[STORAGE_KEY] || [];
            const match = findMatchingConfig(allConfigs, origin);

            if (match) {
                currentConfigId = match.id;
                applyToUI(match);

                if (match.pattern !== origin && isPatternConfig(match.pattern)) {
                    showOverrideBanner(match);
                } else {
                    hideOverrideBanner();
                }
            } else {
                hideOverrideBanner();
                applyToUI(DEFAULT_CONFIG);
            }
        });
    }

    /* ── Input listeners ─────────────────────────── */

    const inputs = [els.enableToggle, els.watermarkText, els.textColor, els.textSize, els.textSpacing, els.textOpacity, els.addTitlePrefix];

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input === els.textColor)   els.colorValue.textContent      = input.value;
            if (input === els.textSize)    els.textSizeValue.textContent   = `${input.value}px`;
            if (input === els.textSpacing) els.textSpacingValue.textContent = input.value;
            if (input === els.textOpacity) els.textOpacityValue.textContent = input.value;
            updatePreview();
        });

        input.addEventListener('change', () => {
            saveSettings();
            updatePreview();
        });
    });

    /* ── Preset manager ──────────────────────────── */

    mountPresetManager(els.presetsContainer, {
        toastFn: toast,
        onApply(preset) {
            applyToUI({
                enabled:        true,
                text:           preset.name,
                color:          preset.color,
                size:           preset.size,
                spacing:        preset.spacing,
                opacity:        preset.opacity,
                addTitlePrefix: false
            });
            updatePreview();
            saveSettings();
            toast(`"${preset.name}" preset applied`);
        }
    });

    /* ── Footer link ─────────────────────────────── */

    document.getElementById('openOptions')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'options.html' });
    });

    /* ── Bootstrap ────────────────────────────────── */

    loadConfig();
});
