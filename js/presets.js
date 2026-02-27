/**
 * EnvAware — Preset Manager UI component.
 * Renders the "Quick Presets" bar with add/delete/apply + the new-preset form.
 * Mounted independently in both the popup and options pages.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

(function (EnvAware) {

    /* ── HTML Template ───────────────────────────── */

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
                <div class="preset-form-title">New Preset</div>
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
                    <button class="preset-cancel-btn pm-cancel-btn" type="button">Cancel</button>
                    <button class="preset-save-btn pm-save-btn" type="button">Save Preset</button>
                </div>
            </div>
        </div>`;

    /* ── Component ────────────────────────────────── */

    /**
     * Mounts the preset manager UI inside `container`.
     *
     * @param {HTMLElement} container  — target DOM element
     * @param {Object}      opts
     * @param {Function}    opts.onApply   — called with the preset object when clicked
     * @param {Function}    opts.toastFn   — called with (message, type) for feedback
     * @returns {{ refresh: Function }}
     */
    EnvAware.mountPresetManager = function (container, { onApply, toastFn } = {}) {
        const notify = (msg, type) => toastFn?.(msg, type);

        container.innerHTML = PRESET_FORM_HTML;

        /* ── Element refs ──────────────────────────── */

        const grid         = container.querySelector('.pm-grid');
        const form         = container.querySelector('.pm-form');
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

        /* ── Live preview strip ────────────────────── */

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

        /* ── Grid rendering ────────────────────────── */

        function refresh() {
            return EnvAware.loadPresets().then(presets => {
                grid.innerHTML = '';
                presets.forEach((preset, index) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = `preset-btn${preset.builtIn ? '' : ' custom-preset'}`;
                    btn.style.cssText = `background:${preset.color}; border-color:${preset.color}44;`;
                    btn.textContent = preset.name;

                    if (!preset.builtIn) {
                        const del = document.createElement('span');
                        del.className = 'preset-delete';
                        del.textContent = '✕';
                        del.addEventListener('click', async e => {
                            e.stopPropagation();
                            const all = await EnvAware.loadPresets();
                            const custom = all.filter(p => !p.builtIn);
                            custom.splice(index - EnvAware.DEFAULT_PRESETS.length, 1);
                            await EnvAware.saveCustomPresets(custom);
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

        /* ── Add / Cancel / Save ───────────────────── */

        addBtn.addEventListener('click', () => {
            form.classList.toggle('open');
            if (form.classList.contains('open')) {
                nameInput.value    = '';
                colorInput.value   = '#8b5cf6';
                sizeInput.value    = 26;    sizeVal.textContent    = '26px';
                spacingInput.value = 450;   spacingVal.textContent = '450';
                opacityInput.value = 0.3;   opacityVal.textContent = '0.3';
                updatePreviewStrip();
                nameInput.focus();
            }
        });

        cancelBtn.addEventListener('click', () => form.classList.remove('open'));

        saveBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim().toUpperCase();
            if (!name) { notify('Name is required', 'error'); return; }

            const all = await EnvAware.loadPresets();
            if (all.some(p => p.name === name)) { notify('Name already exists', 'error'); return; }

            const custom = all.filter(p => !p.builtIn);
            custom.push({
                name,
                color:   colorInput.value,
                size:    parseInt(sizeInput.value, 10),
                spacing: parseInt(spacingInput.value, 10),
                opacity: parseFloat(opacityInput.value),
                builtIn: false
            });

            await EnvAware.saveCustomPresets(custom);
            form.classList.remove('open');
            refresh();
            notify(`"${name}" preset created`);
        });

        refresh();
        return { refresh };
    };

})(window.EnvAware);
