/**
 * EnvAware — Options page controller.
 * Manages the full configuration list, create/edit/delete panels, and import/export.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const {
        STORAGE_KEY, DEFAULT_CONFIG,
        isPatternConfig, globToRegex, escapeHtml,
        showToast, mountPresetManager, buildConfigItemHtml, setupImportExport
    } = window.EnvAware;

    /* -- Element refs ------------------------------ */

    const configList   = document.getElementById('configs');
    const emptyState   = document.getElementById('emptyState');
    const searchInput  = document.getElementById('searchInput');
    const exportBtn    = document.getElementById('exportBtn');
    const importBtn    = document.getElementById('importBtn');
    const importFile   = document.getElementById('importFile');
    const toastEl      = document.getElementById('toastContainer');
    const configCount  = document.getElementById('configCount');
    const newConfigBtn = document.getElementById('newConfigBtn');
    const createPanel  = document.getElementById('createPanel');

    let allConfigs = [];

    const toast = (msg, type) => showToast(toastEl, msg, type);

    function saveConfigs(callback) {
        chrome.storage.sync.set({ [STORAGE_KEY]: allConfigs }, callback);
    }

    /* -- Overlap Detection ------------------------- */

    function findOverlaps(config) {
        const overlaps = [];

        allConfigs.forEach(other => {
            if (other.id === config.id) return;

            const aIsPattern = isPatternConfig(config.pattern);
            const bIsPattern = isPatternConfig(other.pattern);

            if (!aIsPattern && !bIsPattern) {
                if (config.pattern.toLowerCase() === other.pattern.toLowerCase()) overlaps.push(other);
            } else if (!aIsPattern && bIsPattern) {
                if (globToRegex(other.pattern).test(config.pattern)) overlaps.push(other);
            } else if (aIsPattern && !bIsPattern) {
                if (globToRegex(config.pattern).test(other.pattern)) overlaps.push(other);
            } else {
                const a = config.pattern.replace(/\*/g, '').toLowerCase();
                const b = other.pattern.replace(/\*/g, '').toLowerCase();
                if (a.includes(b) || b.includes(a)) overlaps.push(other);
            }
        });

        return overlaps;
    }

    /* -- Render Config List ------------------------- */

    function renderConfigs(filterText = '') {
        configList.innerHTML = '';

        const filtered = allConfigs.filter(c => {
            const q = filterText.toLowerCase();
            return c.pattern.toLowerCase().includes(q) || c.text.toLowerCase().includes(q);
        });

        if (allConfigs.length === 0) {
            emptyState.querySelector('.empty-state-text').textContent = 'No configurations saved yet';
            emptyState.querySelector('.empty-state-sub').textContent = 'Create a new configuration or visit any website to get started';
            emptyState.style.display = 'block';
            configCount.textContent = '';
            return;
        }

        if (filtered.length === 0) {
            emptyState.querySelector('.empty-state-text').textContent = 'No matches found';
            emptyState.querySelector('.empty-state-sub').textContent = 'Try a different search term';
            emptyState.style.display = 'block';
            configCount.textContent = `${allConfigs.length} total`;
            return;
        }

        emptyState.style.display = 'none';
        configCount.textContent = filtered.length === allConfigs.length
            ? `${allConfigs.length} configuration${allConfigs.length !== 1 ? 's' : ''}`
            : `${filtered.length} of ${allConfigs.length}`;

        filtered.forEach((config, index) => {
            const uid = 'cfg_' + config.id;
            const overlaps = findOverlaps(config);

            const div = document.createElement('div');
            div.className = 'config-item';
            div.style.animationDelay = `${index * 0.05}s`;
            div.innerHTML = buildConfigItemHtml(config, uid, overlaps);
            configList.appendChild(div);
        });

        mountPresetsInEditPanels();
    }

    /* -- Mount presets inside each edit panel ------- */

    function mountPresetsInEditPanels() {
        configList.querySelectorAll('.edit-presets-container').forEach(container => {
            const panel = container.closest('.edit-panel');
            mountPresetManager(container, {
                toastFn: toast,
                onApply(preset) {
                    panel.dataset.presetName = preset.name;
                    panel.querySelector('.edit-text').value = preset.name;
                    const colorInput = panel.querySelector('.edit-color');
                    colorInput.value = preset.color;
                    colorInput.closest('.color-input-wrapper').querySelector('.value-display').textContent = preset.color;
                    const sizeInput = panel.querySelector('.edit-size');
                    sizeInput.value = preset.size;
                    sizeInput.closest('.slider-container').querySelector('.value-display').textContent = preset.size + 'px';
                    const spacingInput = panel.querySelector('.edit-spacing');
                    spacingInput.value = preset.spacing;
                    spacingInput.closest('.slider-container').querySelector('.value-display').textContent = preset.spacing;
                    const opacityInput = panel.querySelector('.edit-opacity');
                    opacityInput.value = preset.opacity;
                    opacityInput.closest('.slider-container').querySelector('.value-display').textContent = preset.opacity;
                }
            });
        });
    }

    /* -- Delegated Event Handlers ------------------- */

    configList.addEventListener('change', e => {
        const target = e.target;

        if (target.matches('.toggle-enabled')) {
            const config = allConfigs.find(c => c.id === target.dataset.id);
            if (!config) return;
            config.enabled = target.checked;
            saveConfigs(() => toast(config.enabled ? 'Watermark enabled' : 'Watermark disabled'));
        }
    });

    configList.addEventListener('input', e => {
        const target = e.target;

        if (target.matches('.edit-color')) {
            target.closest('.color-input-wrapper').querySelector('.value-display').textContent = target.value;
        }

        if (target.matches('input[type="range"]')) {
            const suffix = target.classList.contains('edit-size') ? 'px' : '';
            target.closest('.slider-container').querySelector('.value-display').textContent = target.value + suffix;
        }

        // Detach from preset on manual visual field change
        if (target.matches('.edit-color, .edit-size, .edit-spacing, .edit-opacity')) {
            const panel = target.closest('.edit-panel');
            if (panel && panel.dataset.presetName) {
                panel.dataset.presetName = '';
                toast('Detached from preset', 'info');
            }
        }
    });

    configList.addEventListener('click', e => {
        const target = e.target;

        /* -- Edit button ----------------------------- */
        if (target.matches('.edit-btn')) {
            const panel = document.getElementById(`panel-${target.dataset.uid}`);
            const isOpen = panel.classList.contains('open');
            configList.querySelectorAll('.edit-panel.open').forEach(p => p.classList.remove('open'));
            if (!isOpen) panel.classList.add('open');
            return;
        }

        /* -- Cancel button --------------------------- */
        if (target.matches('.btn-cancel')) {
            document.getElementById(`panel-${target.dataset.uid}`).classList.remove('open');
            return;
        }

        /* -- Save button ----------------------------- */
        if (target.matches('.btn-save')) {
            const panel = document.getElementById(`panel-${target.dataset.uid}`);
            const pattern = panel.querySelector('.edit-pattern').value.trim();
            if (!pattern) { toast('URL pattern is required', 'error'); return; }

            const config = allConfigs.find(c => c.id === target.dataset.id);
            if (!config) return;

            const exclusions = Array.from(panel.querySelectorAll('.exclusion-chip')).map(chip => {
                const del = chip.querySelector('.exclusion-chip-delete');
                return del ? del.dataset.exclusion : chip.textContent.replace('✕', '').trim();
            }).filter(Boolean);

            Object.assign(config, {
                pattern,
                text:           panel.querySelector('.edit-text').value || 'LOCAL',
                color:          panel.querySelector('.edit-color').value,
                size:           parseInt(panel.querySelector('.edit-size').value, 10),
                spacing:        parseInt(panel.querySelector('.edit-spacing').value, 10),
                opacity:        parseFloat(panel.querySelector('.edit-opacity').value),
                addTitlePrefix: panel.querySelector('.edit-title-prefix').checked,
                presetName:     panel.dataset.presetName || null,
                exclusions
            });

            saveConfigs(() => {
                panel.classList.remove('open');
                renderConfigs(searchInput.value);
                toast('Configuration saved');
            });
            return;
        }

        /* -- Visit button ---------------------------- */
        if (target.matches('.visit-btn')) {
            window.open(target.dataset.pattern, '_blank');
            return;
        }

        /* -- Delete button --------------------------- */
        if (target.matches('.delete-btn')) {
            if (!confirm('Delete this configuration?')) return;
            allConfigs = allConfigs.filter(c => c.id !== target.dataset.id);
            saveConfigs(() => { renderConfigs(searchInput.value); toast('Configuration deleted'); });
            return;
        }

        /* -- Exclusion chip delete ------------------- */
        if (target.matches('.exclusion-chip-delete')) {
            const chip = target.closest('.exclusion-chip');
            const list = target.closest('.exclusion-list');
            if (chip && list) {
                chip.remove();
            }
            return;
        }

        /* -- Exclusion add button -------------------- */
        if (target.matches('.exclusion-add-btn')) {
            const addRow = target.closest('.exclusion-add');
            const input = addRow.querySelector('.edit-exclusion-input');
            const value = input.value.trim();
            if (!value) return;
            const list = addRow.previousElementSibling;
            const chip = document.createElement('span');
            chip.className = 'exclusion-chip';
            chip.innerHTML = `${escapeHtml(value)}<span class="exclusion-chip-delete" data-exclusion="${escapeHtml(value)}">✕</span>`;
            list.appendChild(chip);
            input.value = '';
            return;
        }
    });

    /* -- Create Panel ------------------------------ */

    let createLinkedPreset = null;
    let createExclusions = [];

    function renderCreateExclusions() {
        const list = document.getElementById('createExclusionList');
        list.innerHTML = createExclusions.map(ex =>
            `<span class="exclusion-chip">${escapeHtml(ex)}<span class="exclusion-chip-delete" data-exclusion="${escapeHtml(ex)}">✕</span></span>`
        ).join('');
    }

    function setupCreatePanel() {
        const fields = {
            pattern:    document.getElementById('createPattern'),
            text:       document.getElementById('createText'),
            color:      document.getElementById('createColor'),
            colorVal:   document.getElementById('createColorValue'),
            size:       document.getElementById('createSize'),
            sizeVal:    document.getElementById('createSizeValue'),
            spacing:    document.getElementById('createSpacing'),
            spacingVal: document.getElementById('createSpacingValue'),
            opacity:    document.getElementById('createOpacity'),
            opacityVal: document.getElementById('createOpacityValue'),
            titlePrefix:document.getElementById('createTitlePrefix'),
            enabled:    document.getElementById('createEnabled')
        };

        // Detach from preset on manual visual change in create panel
        const createVisualInputs = [fields.color, fields.size, fields.spacing, fields.opacity];
        createVisualInputs.forEach(input => {
            input.addEventListener('input', () => {
                if (createLinkedPreset) {
                    createLinkedPreset = null;
                    toast('Detached from preset', 'info');
                }
            });
        });

        fields.color.addEventListener('input',   () => fields.colorVal.textContent   = fields.color.value);
        fields.size.addEventListener('input',     () => fields.sizeVal.textContent    = fields.size.value + 'px');
        fields.spacing.addEventListener('input',  () => fields.spacingVal.textContent = fields.spacing.value);
        fields.opacity.addEventListener('input',  () => fields.opacityVal.textContent = fields.opacity.value);

        newConfigBtn.addEventListener('click', () => {
            createPanel.classList.toggle('open');
            if (createPanel.classList.contains('open')) {
                createLinkedPreset = null;
                createExclusions = [];
                renderCreateExclusions();
                fields.pattern.value = '';
                fields.text.value = DEFAULT_CONFIG.text;
                fields.color.value = DEFAULT_CONFIG.color;    fields.colorVal.textContent = DEFAULT_CONFIG.color;
                fields.size.value = DEFAULT_CONFIG.size;       fields.sizeVal.textContent = DEFAULT_CONFIG.size + 'px';
                fields.spacing.value = DEFAULT_CONFIG.spacing; fields.spacingVal.textContent = String(DEFAULT_CONFIG.spacing);
                fields.opacity.value = DEFAULT_CONFIG.opacity; fields.opacityVal.textContent = String(DEFAULT_CONFIG.opacity);
                fields.titlePrefix.checked = DEFAULT_CONFIG.addTitlePrefix;
                fields.enabled.checked = true;
                fields.pattern.focus();
            }
        });

        document.getElementById('createExclusionAddBtn').addEventListener('click', () => {
            const input = document.getElementById('createExclusionInput');
            const value = input.value.trim();
            if (!value) return;
            if (!createExclusions.includes(value)) {
                createExclusions.push(value);
                renderCreateExclusions();
            }
            input.value = '';
        });

        document.getElementById('createExclusionList').addEventListener('click', e => {
            if (e.target.matches('.exclusion-chip-delete')) {
                const ex = e.target.dataset.exclusion;
                createExclusions = createExclusions.filter(v => v !== ex);
                renderCreateExclusions();
            }
        });

        mountPresetManager(document.getElementById('createPresetsContainer'), {
            toastFn: toast,
            onApply(preset) {
                createLinkedPreset = preset.name;
                fields.text.value = preset.name;
                fields.color.value = preset.color; fields.colorVal.textContent = preset.color;
                fields.size.value = preset.size;   fields.sizeVal.textContent = preset.size + 'px';
                fields.spacing.value = preset.spacing; fields.spacingVal.textContent = preset.spacing;
                fields.opacity.value = preset.opacity; fields.opacityVal.textContent = preset.opacity;
            }
        });

        document.getElementById('createCancelBtn').addEventListener('click', () => {
            createPanel.classList.remove('open');
            createLinkedPreset = null;
        });

        document.getElementById('createSaveBtn').addEventListener('click', () => {
            const pattern = fields.pattern.value.trim();
            if (!pattern) { toast('URL pattern is required', 'error'); return; }
            if (allConfigs.some(c => c.pattern.toLowerCase() === pattern.toLowerCase())) {
                toast('Pattern already exists', 'error');
                return;
            }

            allConfigs.push({
                id:             Date.now().toString(),
                pattern,
                enabled:        fields.enabled.checked,
                text:           fields.text.value || 'LOCAL',
                color:          fields.color.value,
                size:           parseInt(fields.size.value, 10),
                spacing:        parseInt(fields.spacing.value, 10),
                opacity:        parseFloat(fields.opacity.value),
                addTitlePrefix: fields.titlePrefix.checked,
                presetName:     createLinkedPreset,
                exclusions:     createExclusions.length > 0 ? [...createExclusions] : []
            });

            saveConfigs(() => {
                createPanel.classList.remove('open');
                createLinkedPreset = null;
                renderConfigs(searchInput.value);
                toast('Configuration created');
            });
        });
    }

    /* -- Import/Export ------------------------------ */

    setupImportExport({
        setAllConfigs: (configs) => { allConfigs = configs; },
        saveConfigs,
        renderConfigs,
        toast,
        exportBtn,
        importBtn,
        importFile,
        searchInput
    });

    /* -- Init --------------------------------------- */

    searchInput.addEventListener('input', e => renderConfigs(e.target.value));
    setupCreatePanel();

    chrome.storage.sync.get([STORAGE_KEY], result => {
        allConfigs = result[STORAGE_KEY] || [];
        renderConfigs();
    });

    // Keep in sync with changes made from the popup (e.g. exclusions)
    chrome.storage.onChanged.addListener((changes) => {
        if (!changes[STORAGE_KEY]) return;
        // Don't re-render if an edit panel is open (would lose user's work)
        if (configList.querySelector('.edit-panel.open')) return;
        allConfigs = changes[STORAGE_KEY].newValue || [];
        renderConfigs(searchInput.value);
    });
});
