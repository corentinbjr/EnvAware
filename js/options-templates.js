/**
 * EnvAware — Options page config item HTML builder.
 * Extracted from options.js for readability.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

(function (EnvAware) {

    const { isPatternConfig, escapeHtml } = EnvAware;

    /**
     * Builds the innerHTML for a config-item element (header + edit panel).
     *
     * @param {Object}   config   — the config object
     * @param {string}   uid      — unique DOM id prefix for this config
     * @param {Object[]} overlaps — array of overlapping configs
     * @returns {string} HTML string
     */
    EnvAware.buildConfigItemHtml = function (config, uid, overlaps) {
        const isPattern = isPatternConfig(config.pattern);

        const overlapHtml = overlaps.length > 0
            ? `<span class="overlap-badge" title="May overlap with: ${overlaps.map(o => escapeHtml(o.pattern)).join(', ')}">⚠️ ${overlaps.length} overlap${overlaps.length > 1 ? 's' : ''}</span>`
            : '';

        const typeTag = isPattern
            ? `<span class="tag tag-pattern">pattern</span>`
            : `<span class="tag tag-exact">exact</span>`;

        const presetTag = config.presetName
            ? `<span class="tag tag-preset">${escapeHtml(config.presetName)}</span>`
            : '';

        const exclusionTag = config.exclusions?.length > 0
            ? `<span class="tag tag-exclusion">${config.exclusions.length} excluded</span>`
            : '';

        return `
            <div class="config-item-header">
                <div class="config-info">
                    <h3>
                        <span class="pattern-text">${escapeHtml(config.pattern)}</span>
                        ${typeTag} ${presetTag} ${exclusionTag} ${overlapHtml}
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
            <div class="edit-panel" id="panel-${uid}" data-preset-name="${config.presetName ? escapeHtml(config.presetName) : ''}">
                <div class="edit-grid">
                    <div class="form-group full-width">
                        <label>URL Pattern</label>
                        <input type="text" class="edit-pattern" value="${escapeHtml(config.pattern)}">
                        <div class="pattern-help">Use <code>*</code> as wildcard. Exact URLs have higher priority.</div>
                    </div>
                    <div class="form-group full-width">
                        <label>Watermark Text</label>
                        <input type="text" class="edit-text" value="${escapeHtml(config.text)}">
                        <div class="edit-presets-container"></div>
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
                    <div class="form-group full-width">
                        <label>Excluded Patterns</label>
                        <div class="exclusion-list" data-uid="${uid}">${(config.exclusions || []).map(ex => `<span class="exclusion-chip">${escapeHtml(ex)}<span class="exclusion-chip-delete" data-exclusion="${escapeHtml(ex)}">✕</span></span>`).join('')}</div>
                        <div class="exclusion-add">
                            <input type="text" class="edit-exclusion-input" placeholder="e.g. *payment* or exact URL">
                            <button class="exclusion-add-btn" data-uid="${uid}" type="button">+ Add</button>
                        </div>
                    </div>
                </div>
                <div class="edit-actions">
                    <button class="btn-cancel" data-uid="${uid}">Cancel</button>
                    <button class="btn-save" data-id="${config.id}" data-uid="${uid}">Save</button>
                </div>
            </div>`;
    };

})(window.EnvAware);
