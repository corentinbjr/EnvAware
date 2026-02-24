document.addEventListener('DOMContentLoaded', () => {
    const { STORAGE_KEY, isPatternConfig, globToRegex, escapeHtml, showToast } = window.EnvAware;

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

    /* ── Overlap Detection ──────────────────────── */

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

    /* ── Render Config List ─────────────────────── */

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
            const isPattern = isPatternConfig(config.pattern);

            const overlapHtml = overlaps.length > 0
                ? `<span class="overlap-badge" title="May overlap with: ${overlaps.map(o => escapeHtml(o.pattern)).join(', ')}">⚠️ ${overlaps.length} overlap${overlaps.length > 1 ? 's' : ''}</span>`
                : '';

            const typeTag = isPattern
                ? `<span class="tag tag-pattern">pattern</span>`
                : `<span class="tag tag-exact">exact</span>`;

            const div = document.createElement('div');
            div.className = 'config-item';
            div.style.animationDelay = `${index * 0.05}s`;
            div.innerHTML = `
                <div class="config-item-header">
                    <div class="config-info">
                        <h3>
                            <span class="pattern-text">${escapeHtml(config.pattern)}</span>
                            ${typeTag} ${overlapHtml}
                        </h3>
                        <p>
                            <span class="tag tag-text"><span class="color-dot" style="background:${config.color}"></span> ${escapeHtml(config.text)}</span>
                            <span class="tag tag-size">${config.size}px</span>
                            <span class="tag tag-opacity">α ${config.opacity}</span>
                        </p>
                    </div>
                    <div class="config-right">
                        <label class="switch" title="Toggle watermark">
                            <input type="checkbox" class="toggle-enabled" data-id="${config.id}" ${config.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <div class="config-actions">
                            ${!isPattern ? `<button class="visit-btn" data-pattern="${escapeHtml(config.pattern)}" title="Open in new tab">Visit</button>` : ''}
                            <button class="edit-btn" data-uid="${uid}">Edit</button>
                            <button class="delete-btn" data-id="${config.id}">Delete</button>
                        </div>
                    </div>
                </div>
                <div class="edit-panel" id="panel-${uid}">
                    <div class="edit-grid">
                        <div class="form-group full-width">
                            <label>URL Pattern</label>
                            <input type="text" class="edit-pattern" value="${escapeHtml(config.pattern)}">
                            <div class="pattern-help">Use <code>*</code> as wildcard. Exact URLs have higher priority.</div>
                        </div>
                        <div class="form-group full-width">
                            <label>Watermark Text</label>
                            <input type="text" class="edit-text" value="${escapeHtml(config.text)}">
                        </div>
                        <div class="form-group">
                            <label>Text Color</label>
                            <div class="color-input-wrapper">
                                <input type="color" class="edit-color" value="${config.color}">
                                <span class="value-display value-display--left">${config.color}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Size (px)</label>
                            <div class="slider-container">
                                <input type="range" class="edit-size" min="12" max="100" value="${config.size}">
                                <span class="value-display">${config.size}px</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Spacing</label>
                            <div class="slider-container">
                                <input type="range" class="edit-spacing" min="100" max="800" step="10" value="${config.spacing}">
                                <span class="value-display">${config.spacing}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Opacity</label>
                            <div class="slider-container">
                                <input type="range" class="edit-opacity" min="0.05" max="1" step="0.05" value="${config.opacity}">
                                <span class="value-display">${config.opacity}</span>
                            </div>
                        </div>
                        <div class="form-group">
                            <div class="switch-row">
                                <label>Add to Tab Title</label>
                                <label class="switch">
                                    <input type="checkbox" class="edit-title-prefix" ${config.addTitlePrefix ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="edit-actions">
                        <button class="btn-cancel" data-uid="${uid}">Cancel</button>
                        <button class="btn-save" data-id="${config.id}" data-uid="${uid}">Save</button>
                    </div>
                </div>`;
            configList.appendChild(div);
        });

        bindListEvents();
    }

    /* ── List Event Handlers ────────────────────── */

    function bindListEvents() {
        configList.querySelectorAll('.edit-panel input[type="color"]').forEach(el => {
            el.addEventListener('input', e => e.target.closest('.color-input-wrapper').querySelector('.value-display').textContent = e.target.value);
        });

        configList.querySelectorAll('.edit-panel input[type="range"]').forEach(el => {
            el.addEventListener('input', e => {
                const suffix = e.target.classList.contains('edit-size') ? 'px' : '';
                e.target.closest('.slider-container').querySelector('.value-display').textContent = e.target.value + suffix;
            });
        });

        configList.querySelectorAll('.toggle-enabled').forEach(el => {
            el.addEventListener('change', e => {
                const config = allConfigs.find(c => c.id === e.target.dataset.id);
                if (!config) return;
                config.enabled = e.target.checked;
                saveConfigs(() => toast(config.enabled ? 'Watermark enabled' : 'Watermark disabled'));
            });
        });

        configList.querySelectorAll('.edit-btn').forEach(el => {
            el.addEventListener('click', e => {
                const panel = document.getElementById(`panel-${e.target.dataset.uid}`);
                const isOpen = panel.classList.contains('open');
                configList.querySelectorAll('.edit-panel.open').forEach(p => p.classList.remove('open'));
                if (!isOpen) panel.classList.add('open');
            });
        });

        configList.querySelectorAll('.btn-cancel').forEach(el => {
            el.addEventListener('click', e => document.getElementById(`panel-${e.target.dataset.uid}`).classList.remove('open'));
        });

        configList.querySelectorAll('.btn-save').forEach(el => {
            el.addEventListener('click', e => {
                const panel = document.getElementById(`panel-${e.target.dataset.uid}`);
                const pattern = panel.querySelector('.edit-pattern').value.trim();
                if (!pattern) { toast('URL pattern is required', 'error'); return; }

                const config = allConfigs.find(c => c.id === e.target.dataset.id);
                if (!config) return;

                Object.assign(config, {
                    pattern,
                    text:           panel.querySelector('.edit-text').value || 'LOCAL',
                    color:          panel.querySelector('.edit-color').value,
                    size:           parseInt(panel.querySelector('.edit-size').value, 10),
                    spacing:        parseInt(panel.querySelector('.edit-spacing').value, 10),
                    opacity:        parseFloat(panel.querySelector('.edit-opacity').value),
                    addTitlePrefix: panel.querySelector('.edit-title-prefix').checked
                });

                saveConfigs(() => {
                    panel.classList.remove('open');
                    renderConfigs(searchInput.value);
                    toast('Configuration saved');
                });
            });
        });

        configList.querySelectorAll('.visit-btn').forEach(el => {
            el.addEventListener('click', e => {
                window.open(e.target.dataset.pattern, '_blank');
            });
        });

        configList.querySelectorAll('.delete-btn').forEach(el => {
            el.addEventListener('click', e => {
                if (!confirm('Delete this configuration?')) return;
                allConfigs = allConfigs.filter(c => c.id !== e.target.dataset.id);
                saveConfigs(() => { renderConfigs(searchInput.value); toast('Configuration deleted'); });
            });
        });
    }

    /* ── Create Panel ───────────────────────────── */

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

        fields.color.addEventListener('input',   () => fields.colorVal.textContent   = fields.color.value);
        fields.size.addEventListener('input',     () => fields.sizeVal.textContent    = fields.size.value + 'px');
        fields.spacing.addEventListener('input',  () => fields.spacingVal.textContent = fields.spacing.value);
        fields.opacity.addEventListener('input',  () => fields.opacityVal.textContent = fields.opacity.value);

        newConfigBtn.addEventListener('click', () => {
            createPanel.classList.toggle('open');
            if (createPanel.classList.contains('open')) {
                fields.pattern.value = '';
                fields.text.value = 'LOCAL';
                fields.color.value = '#ff0000'; fields.colorVal.textContent = '#ff0000';
                fields.size.value = 26;         fields.sizeVal.textContent = '26px';
                fields.spacing.value = 450;     fields.spacingVal.textContent = '450';
                fields.opacity.value = 0.3;     fields.opacityVal.textContent = '0.3';
                fields.titlePrefix.checked = false;
                fields.enabled.checked = true;
                fields.pattern.focus();
            }
        });

        document.getElementById('createCancelBtn').addEventListener('click', () => createPanel.classList.remove('open'));

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
                addTitlePrefix: fields.titlePrefix.checked
            });

            saveConfigs(() => {
                createPanel.classList.remove('open');
                renderConfigs(searchInput.value);
                toast('Configuration created');
            });
        });
    }

    /* ── Export / Import ─────────────────────────── */

    exportBtn.addEventListener('click', () => {
        if (allConfigs.length === 0) { toast('No configurations to export', 'info'); return; }
        const blob = new Blob([JSON.stringify(allConfigs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `envaware-configs-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Configurations exported');
    });

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const imported = JSON.parse(event.target.result);
                if (!Array.isArray(imported)) { toast('Invalid format', 'error'); return; }
                const valid = imported.filter(c => c.pattern && c.id);
                if (valid.length === 0) { toast('No valid configurations', 'error'); return; }

                valid.forEach(c => { if (!allConfigs.find(ex => ex.id === c.id)) allConfigs.push(c); });
                saveConfigs(() => { renderConfigs(searchInput.value); toast(`${valid.length} imported`); });
            } catch { toast('Invalid JSON file', 'error'); }
        };
        reader.readAsText(file);
        importFile.value = '';
    });

    /* ── Init ────────────────────────────────────── */

    searchInput.addEventListener('input', e => renderConfigs(e.target.value));
    setupCreatePanel();

    chrome.storage.sync.get([STORAGE_KEY], result => {
        allConfigs = result[STORAGE_KEY] || [];
        renderConfigs();
    });
});
