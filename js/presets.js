/**
 * EnvAware — Preset Manager UI component.
 * Renders the "Quick Presets" bar with add/edit/delete/apply + the new-preset form.
 * Mounted independently in both the popup and options pages.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

(function (EnvAware) {

    /* -- HTML Template ----------------------------- */

    const PRESET_FORM_HTML = `
        <div class="presets-section">
            <div class="presets-header">
                <label>Quick Presets</label>
                <button class="add-preset-btn pm-add-btn" type="button">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add
                </button>
            </div>
            <div class="presets-grid pm-grid"></div>
            <div class="preset-form pm-form">
                <div class="preset-form-title pm-form-title">New Preset</div>
                <div class="preset-form-grid">
                    <div class="preset-form-field preset-form-field--name">
                        <label>Name</label>
                        <input type="text" class="pm-name" placeholder="e.g. QA">
                    </div>
                    <div class="preset-form-field preset-form-field--color">
                        <label>Color</label>
                        <input type="color" class="pm-color" value="#8b5cf6">
                    </div>
                    <div class="preset-form-field">
                        <label>Size <span class="pm-size-val preset-form-val">26px</span></label>
                        <input type="range" class="pm-size" min="12" max="100" value="26">
                    </div>
                    <div class="preset-form-field">
                        <label>Spacing <span class="pm-spacing-val preset-form-val">450</span></label>
                        <input type="range" class="pm-spacing" min="100" max="800" step="10" value="450">
                    </div>
                    <div class="preset-form-field preset-form-field--full">
                        <label>Opacity <span class="pm-opacity-val preset-form-val">0.3</span></label>
                        <input type="range" class="pm-opacity" min="0.05" max="1" step="0.05" value="0.3">
                    </div>
                </div>
                <div class="preset-preview pm-preview"></div>
                <div class="preset-form-actions">
                    <button class="preset-reset-btn pm-reset-btn" type="button" style="display:none;">Reset to Default</button>
                    <span style="flex:1"></span>
                    <button class="preset-cancel-btn pm-cancel-btn" type="button">Cancel</button>
                    <button class="preset-save-btn pm-save-btn" type="button">Save Preset</button>
                </div>
            </div>
        </div>`;

    /* -- Component ---------------------------------- */

    /**
     * Mounts the preset manager UI inside `container`.
     *
     * @param {HTMLElement} container  — target DOM element
     * @param {Object}      opts
     * @param {Function}    opts.onApply   — called with the preset object when clicked
     * @param {Function}    opts.toastFn   — called with (message, type) for feedback
     * @returns {{ refresh: Function, editPreset: Function }}
     */
    EnvAware.mountPresetManager = function (container, { onApply, toastFn } = {}) {
        const notify = (msg, type) => toastFn?.(msg, type);

        container.innerHTML = PRESET_FORM_HTML;

        /* -- Element refs ---------------------------- */

        const grid         = container.querySelector('.pm-grid');
        const form         = container.querySelector('.pm-form');
        const formTitle    = container.querySelector('.pm-form-title');
        const addBtn       = container.querySelector('.pm-add-btn');
        const nameInput    = container.querySelector('.pm-name');
        const colorInput   = container.querySelector('.pm-color');
        const sizeInput    = container.querySelector('.pm-size');
        const spacingInput = container.querySelector('.pm-spacing');
        const opacityInput = container.querySelector('.pm-opacity');
        const sizeVal      = container.querySelector('.pm-size-val');
        const spacingVal   = container.querySelector('.pm-spacing-val');
        const opacityVal   = container.querySelector('.pm-opacity-val');
        const preview      = container.querySelector('.pm-preview');
        const cancelBtn    = container.querySelector('.pm-cancel-btn');
        const saveBtn      = container.querySelector('.pm-save-btn');
        const resetBtn     = container.querySelector('.pm-reset-btn');

        /* -- Edit state -------------------------------- */

        let editingPreset = null; // null = add mode, object = edit mode

        /* -- Live preview strip ---------------------- */

        function updatePreviewStrip() {
            const name    = nameInput.value.trim().toUpperCase() || 'PRESET';
            const color   = colorInput.value;
            const size    = Math.max(8, Math.round(parseInt(sizeInput.value, 10) * 0.45));
            const opacity = parseFloat(opacityInput.value);

            preview.style.color   = color;
            preview.style.opacity = opacity;
            preview.style.setProperty('--pm-preview-size', size + 'px');
            preview.textContent = '';

            const count = Math.max(3, Math.ceil(320 / (name.length * size * 0.7)));
            for (let i = 0; i < count; i++) {
                const span = document.createElement('span');
                span.textContent = name;
                preview.appendChild(span);
            }
        }

        sizeInput.addEventListener('input', () => { sizeVal.textContent = sizeInput.value + 'px'; updatePreviewStrip(); });
        spacingInput.addEventListener('input', () => { spacingVal.textContent = spacingInput.value; updatePreviewStrip(); });
        opacityInput.addEventListener('input', () => { opacityVal.textContent = opacityInput.value; updatePreviewStrip(); });
        nameInput.addEventListener('input', updatePreviewStrip);
        colorInput.addEventListener('input', updatePreviewStrip);

        /* -- Open edit mode ---------------------------- */

        function openEditMode(preset) {
            editingPreset = preset;
            formTitle.textContent = 'Edit Preset';
            nameInput.value    = preset.name;
            nameInput.readOnly = true;
            nameInput.style.opacity = '0.6';
            colorInput.value   = preset.color;
            sizeInput.value    = preset.size;    sizeVal.textContent    = preset.size + 'px';
            spacingInput.value = preset.spacing; spacingVal.textContent = String(preset.spacing);
            opacityInput.value = preset.opacity; opacityVal.textContent = String(preset.opacity);
            saveBtn.textContent = 'Update Preset';

            // Show reset button only for built-in presets
            const defaultPreset = EnvAware.getDefaultBuiltInPreset(preset.name);
            resetBtn.style.display = defaultPreset ? '' : 'none';

            updatePreviewStrip();
            form.classList.add('open');
        }

        function resetFormToAddMode() {
            editingPreset = null;
            formTitle.textContent = 'New Preset';
            nameInput.readOnly = false;
            nameInput.style.opacity = '';
            saveBtn.textContent = 'Save Preset';
            resetBtn.style.display = 'none';
        }

        /* -- Grid rendering -------------------------- */

        function refresh() {
            return EnvAware.loadPresets().then(presets => {
                grid.innerHTML = '';
                presets.forEach((preset, index) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = `preset-btn${preset.builtIn ? '' : ' custom-preset'}`;
                    btn.style.cssText = `background:${preset.color}; border-color:${preset.color}44;`;
                    btn.textContent = preset.name;

                    // Edit icon (all presets)
                    const edit = document.createElement('span');
                    edit.className = 'preset-edit';
                    edit.innerHTML = '&#9998;';
                    edit.addEventListener('click', e => {
                        e.stopPropagation();
                        openEditMode(preset);
                    });
                    btn.appendChild(edit);

                    // Delete icon (custom presets only)
                    if (!preset.builtIn) {
                        const del = document.createElement('span');
                        del.className = 'preset-delete';
                        del.textContent = '\u2715';
                        del.addEventListener('click', async e => {
                            e.stopPropagation();
                            const all = await EnvAware.loadPresets();
                            const custom = all.filter(p => !p.builtIn);
                            const customIndex = custom.findIndex(p => p.name === preset.name);
                            if (customIndex !== -1) custom.splice(customIndex, 1);
                            await EnvAware.saveCustomPresets(custom);
                            await EnvAware.unlinkPresetFromConfigs(preset.name);
                            refresh();
                            notify('Preset removed');
                        });
                        btn.appendChild(del);
                    }

                    btn.addEventListener('click', () => onApply?.(preset));
                    grid.appendChild(btn);
                });
            });
        }

        /* -- Add / Cancel / Save --------------------- */

        addBtn.addEventListener('click', () => {
            if (form.classList.contains('open') && editingPreset === null) {
                form.classList.remove('open');
                return;
            }
            resetFormToAddMode();
            form.classList.add('open');
            nameInput.value    = '';
            colorInput.value   = '#8b5cf6';
            sizeInput.value    = 26;    sizeVal.textContent    = '26px';
            spacingInput.value = 450;   spacingVal.textContent = '450';
            opacityInput.value = 0.3;   opacityVal.textContent = '0.3';
            updatePreviewStrip();
            nameInput.focus();
        });

        cancelBtn.addEventListener('click', () => {
            form.classList.remove('open');
            resetFormToAddMode();
        });

        /* -- Reset to Default -------------------------- */

        resetBtn.addEventListener('click', async () => {
            if (!editingPreset) return;
            const defaultPreset = EnvAware.getDefaultBuiltInPreset(editingPreset.name);
            if (!defaultPreset) return;

            // Remove the builtInOverride entry from custom storage
            const all = await EnvAware.loadPresets();
            const custom = all.filter(p => !p.builtIn);
            const filtered = custom.filter(p => !(p.builtInOverride && p.name === editingPreset.name));
            await EnvAware.saveCustomPresets(filtered);

            // Propagate the original defaults to linked configs
            await EnvAware.propagatePresetToConfigs(editingPreset.name, defaultPreset);

            form.classList.remove('open');
            resetFormToAddMode();
            refresh();
            notify(`"${defaultPreset.name}" reset to default`);
        });

        /* -- Save handler ------------------------------ */

        saveBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim().toUpperCase();
            if (!name) { notify('Name is required', 'error'); return; }

            const newVisuals = {
                color:   colorInput.value,
                size:    parseInt(sizeInput.value, 10),
                spacing: parseInt(spacingInput.value, 10),
                opacity: parseFloat(opacityInput.value)
            };

            if (editingPreset) {
                /* -- Edit mode ---------------------------- */
                const all = await EnvAware.loadPresets();
                const rawCustom = (await new Promise(resolve => {
                    chrome.storage.sync.get([EnvAware.PRESETS_KEY], r => resolve(r[EnvAware.PRESETS_KEY] || []));
                }));

                if (editingPreset.builtIn) {
                    // Save as builtInOverride entry
                    const overrideIdx = rawCustom.findIndex(p => p.builtInOverride && p.name === editingPreset.name);
                    const overrideEntry = { name: editingPreset.name, builtInOverride: true, ...newVisuals };
                    if (overrideIdx !== -1) {
                        rawCustom[overrideIdx] = overrideEntry;
                    } else {
                        rawCustom.push(overrideEntry);
                    }
                } else {
                    // Update custom preset in place
                    const idx = rawCustom.findIndex(p => !p.builtInOverride && p.name === editingPreset.name);
                    if (idx !== -1) {
                        Object.assign(rawCustom[idx], newVisuals);
                    }
                }

                await EnvAware.saveCustomPresets(rawCustom);
                await EnvAware.propagatePresetToConfigs(editingPreset.name, newVisuals);

                form.classList.remove('open');
                resetFormToAddMode();
                refresh();
                notify(`"${name}" preset updated`);
            } else {
                /* -- Add mode ----------------------------- */
                const all = await EnvAware.loadPresets();
                if (all.some(p => p.name === name)) { notify('Name already exists', 'error'); return; }

                const rawCustom = (await new Promise(resolve => {
                    chrome.storage.sync.get([EnvAware.PRESETS_KEY], r => resolve(r[EnvAware.PRESETS_KEY] || []));
                }));

                rawCustom.push({
                    name,
                    ...newVisuals,
                    builtIn: false
                });

                await EnvAware.saveCustomPresets(rawCustom);
                form.classList.remove('open');
                refresh();
                notify(`"${name}" preset created`);
            }
        });

        /** Opens edit mode for a preset by name (used externally, e.g. from banner). */
        async function editPreset(name) {
            const presets = await EnvAware.loadPresets();
            const preset = presets.find(p => p.name === name);
            if (preset) {
                openEditMode(preset);
                form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        refresh();
        return { refresh, editPreset };
    };

})(window.EnvAware);
