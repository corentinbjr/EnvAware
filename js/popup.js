document.addEventListener('DOMContentLoaded', async () => {
    const { STORAGE_KEY, PRESETS_KEY, findMatchingConfig, showToast } = window.EnvAware;

    const els = {
        enableToggle:    document.getElementById('enableToggle'),
        watermarkText:   document.getElementById('watermarkText'),
        textColor:       document.getElementById('textColor'),
        colorValue:      document.getElementById('colorValue'),
        textSize:        document.getElementById('textSize'),
        textSizeValue:   document.getElementById('textSizeValue'),
        textSpacing:     document.getElementById('textSpacing'),
        textSpacingValue:document.getElementById('textSpacingValue'),
        textOpacity:     document.getElementById('textOpacity'),
        textOpacityValue:document.getElementById('textOpacityValue'),
        addTitlePrefix:  document.getElementById('addTitlePrefix'),
        toastContainer:  document.getElementById('toastContainer'),
        presetsGrid:     document.getElementById('presetsGrid'),
        presetForm:      document.getElementById('presetForm'),
        addPresetToggle: document.getElementById('addPresetToggle'),
        presetCancelBtn: document.getElementById('presetCancelBtn'),
        presetSaveBtn:   document.getElementById('presetSaveBtn'),
        newPresetName:   document.getElementById('newPresetName'),
        newPresetColor:  document.getElementById('newPresetColor')
    };

    const toast = (msg, type) => showToast(els.toastContainer, msg, type);

    const DEFAULT_PRESETS = [
        { name: 'LOCAL',   color: '#3b82f6', size: 26, spacing: 450, opacity: 0.3,  builtIn: true },
        { name: 'DEV',     color: '#22c55e', size: 26, spacing: 450, opacity: 0.3,  builtIn: true },
        { name: 'STAGING', color: '#f97316', size: 30, spacing: 350, opacity: 0.5,  builtIn: true },
        { name: 'PROD',    color: '#ef4444', size: 27, spacing: 260, opacity: 0.75, builtIn: true }
    ];

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) { toast('Cannot access tab URL', 'error'); return; }

    let origin;
    try { origin = new URL(tab.url).origin; }
    catch { toast('Invalid URL', 'error'); return; }

    let allConfigs = [];
    let currentConfigId = null;

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
        els.enableToggle.checked   = config.enabled;
        els.watermarkText.value    = config.text;
        els.addTitlePrefix.checked = config.addTitlePrefix || false;
        els.textColor.value        = config.color;
        els.colorValue.textContent = config.color;
        els.textSize.value         = config.size;
        els.textSizeValue.textContent   = `${config.size}px`;
        els.textSpacing.value      = config.spacing;
        els.textSpacingValue.textContent = config.spacing;
        els.textOpacity.value      = config.opacity;
        els.textOpacityValue.textContent = config.opacity;
    }

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

    async function ensureContentScript() {
        try {
            await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
        } catch {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['js/core.js', 'content.js']
            });
        }
    }

    function updatePreview() {
        chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_WATERMARK', settings: getSettingsFromUI() }).catch(() => {
            ensureContentScript();
        });
    }

    function loadConfig() {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            allConfigs = result[STORAGE_KEY] || [];
            const match = findMatchingConfig(allConfigs, origin);

            if (match) {
                currentConfigId = match.id;
                applyToUI(match);
                if (match.pattern !== origin) toast(`Matched pattern: ${match.pattern}`, 'info');
            } else {
                applyToUI({ enabled: false, text: 'LOCAL', color: '#ff0000', size: 26, spacing: 450, opacity: 0.3, addTitlePrefix: false });
            }
        });
    }

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

    async function loadPresets() {
        return new Promise(resolve => {
            chrome.storage.sync.get([PRESETS_KEY], (result) => {
                resolve([...DEFAULT_PRESETS, ...(result[PRESETS_KEY] || [])]);
            });
        });
    }

    async function saveCustomPresets(list) {
        return new Promise(resolve => {
            chrome.storage.sync.set({ [PRESETS_KEY]: list }, resolve);
        });
    }

    async function renderPresets() {
        const presets = await loadPresets();
        els.presetsGrid.innerHTML = '';

        presets.forEach((preset, index) => {
            const btn = document.createElement('button');
            btn.className = `preset-btn ${preset.builtIn ? '' : 'custom-preset'}`;
            btn.style.cssText = `background:${preset.color}; border-color:${preset.color}44;`;
            btn.innerHTML = preset.name;

            if (!preset.builtIn) {
                const del = document.createElement('span');
                del.className = 'preset-delete';
                del.textContent = '✕';
                del.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const all = await loadPresets();
                    const custom = all.filter(p => !p.builtIn);
                    custom.splice(index - DEFAULT_PRESETS.length, 1);
                    await saveCustomPresets(custom);
                    renderPresets();
                    toast('Preset removed');
                });
                btn.appendChild(del);
            }

            btn.addEventListener('click', () => {
                applyToUI({ enabled: true, text: preset.name, color: preset.color, size: preset.size, spacing: preset.spacing, opacity: preset.opacity, addTitlePrefix: false });
                els.enableToggle.checked = true;
                updatePreview();
                saveSettings();
                toast(`"${preset.name}" preset applied`);
            });

            els.presetsGrid.appendChild(btn);
        });
    }

    els.addPresetToggle.addEventListener('click', () => {
        els.presetForm.classList.toggle('open');
        if (els.presetForm.classList.contains('open')) {
            els.newPresetName.value = '';
            els.newPresetColor.value = '#8b5cf6';
            els.newPresetName.focus();
        }
    });

    els.presetCancelBtn.addEventListener('click', () => els.presetForm.classList.remove('open'));

    els.presetSaveBtn.addEventListener('click', async () => {
        const name = els.newPresetName.value.trim().toUpperCase();
        if (!name) { toast('Name is required', 'error'); return; }

        const allPresets = await loadPresets();
        if (allPresets.some(p => p.name === name)) { toast('Name already exists', 'error'); return; }

        const settings = getSettingsFromUI();
        const custom = allPresets.filter(p => !p.builtIn);
        custom.push({ name, color: els.newPresetColor.value, size: settings.size, spacing: settings.spacing, opacity: settings.opacity, builtIn: false });

        await saveCustomPresets(custom);
        els.presetForm.classList.remove('open');
        renderPresets();
        toast(`"${name}" preset created`);
    });

    document.getElementById('openOptions')?.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'options.html' });
    });

    loadConfig();
    renderPresets();
});
