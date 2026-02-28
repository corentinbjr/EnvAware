/**
 * EnvAware — Options page import/export logic.
 * Extracted from options.js for readability.
 * @see https://github.com/corentinbjr/EnvAware
 */
'use strict';

(function (EnvAware) {

    const { STORAGE_KEY, PRESETS_KEY, saveCustomPresets } = EnvAware;

    /**
     * Sets up export and import button handlers.
     *
     * @param {Object}   opts
     * @param {Function} opts.setAllConfigs — sets the allConfigs array
     * @param {Function} opts.saveConfigs   — persists allConfigs, accepts callback
     * @param {Function} opts.renderConfigs — re-renders the config list
     * @param {Function} opts.toast         — shows a toast notification
     * @param {HTMLElement} opts.exportBtn
     * @param {HTMLElement} opts.importBtn
     * @param {HTMLElement} opts.importFile
     * @param {HTMLElement} opts.searchInput
     */
    EnvAware.setupImportExport = function (opts) {
        const {
            setAllConfigs, saveConfigs, renderConfigs,
            toast, exportBtn, importBtn, importFile, searchInput
        } = opts;

        exportBtn.addEventListener('click', async () => {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get([STORAGE_KEY, PRESETS_KEY], resolve);
            });
            const freshConfigs = result[STORAGE_KEY] || [];
            const customPresets = result[PRESETS_KEY] || [];

            if (freshConfigs.length === 0) { toast('No configurations to export', 'info'); return; }

            const exportData = {
                version: 2,
                configs: freshConfigs,
                presets: customPresets
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `envaware-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast('Backup exported');
        });

        importBtn.addEventListener('click', () => importFile.click());

        importFile.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const parsed = JSON.parse(event.target.result);

                    let importedConfigs, importedPresets;
                    if (Array.isArray(parsed)) {
                        importedConfigs = parsed;
                        importedPresets = [];
                    } else if (parsed && typeof parsed === 'object') {
                        importedConfigs = parsed.configs || [];
                        importedPresets = parsed.presets || [];
                    } else {
                        toast('Invalid format', 'error');
                        return;
                    }

                    const freshResult = await new Promise(resolve => {
                        chrome.storage.sync.get([STORAGE_KEY], resolve);
                    });
                    const allConfigs = freshResult[STORAGE_KEY] || [];
                    setAllConfigs(allConfigs);

                    const validConfigs = importedConfigs.filter(c => c.pattern && c.id);
                    let configsAdded = 0;
                    validConfigs.forEach(c => {
                        if (!allConfigs.find(ex => ex.id === c.id)) {
                            allConfigs.push(c);
                            configsAdded++;
                        }
                    });

                    let presetsAdded = 0;
                    if (importedPresets.length > 0) {
                        const existingPresets = await new Promise(resolve => {
                            chrome.storage.sync.get([PRESETS_KEY], r => resolve(r[PRESETS_KEY] || []));
                        });

                        importedPresets.forEach(p => {
                            if (!existingPresets.find(ex => ex.name === p.name)) {
                                existingPresets.push(p);
                                presetsAdded++;
                            }
                        });

                        if (presetsAdded > 0) {
                            await saveCustomPresets(existingPresets);
                        }
                    }

                    saveConfigs(() => {
                        renderConfigs(searchInput.value);
                        const parts = [];
                        if (configsAdded > 0) parts.push(`${configsAdded} config${configsAdded !== 1 ? 's' : ''}`);
                        if (presetsAdded > 0) parts.push(`${presetsAdded} preset${presetsAdded !== 1 ? 's' : ''}`);
                        toast(parts.length > 0 ? `Imported ${parts.join(' + ')}` : 'No new items to import', parts.length > 0 ? 'success' : 'info');
                    });
                } catch { toast('Invalid JSON file', 'error'); }
            };
            reader.readAsText(file);
            importFile.value = '';
        });
    };

})(window.EnvAware);
