/**
 * EnvAware — Content script.
 * Injects and updates the watermark overlay on matching pages.
 * @see https://github.com/corentinbjr/EnvAware
 */
(function () {
    'use strict';

    const { STORAGE_KEY, findMatchingConfig } = window.EnvAware;
    const OVERLAY_ID = 'envaware-overlay-container';

    function getOrigin() {
        return window.location.origin;
    }

    /** Builds a repeating SVG watermark tile as a CSS `url(…)` value. */
    function createSVGBackground(text, color, size, spacing, opacity) {
        const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const center = spacing / 2;
        return 'url("data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(
            `<svg width="${spacing}" height="${spacing}" xmlns="http://www.w3.org/2000/svg">
                <style>.wm{fill:${color};font-size:${size}px;font-family:sans-serif;font-weight:bold;opacity:${opacity};pointer-events:none;user-select:none}</style>
                <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" transform="rotate(-45,${center},${center})" class="wm">${safeText}</text>
            </svg>`
        ))) + '")';
    }

    let lastPrefix = null;

    /** Creates or updates the full-screen watermark overlay. */
    function applyWatermark(settings) {
        let overlay = document.getElementById(OVERLAY_ID);
        const newPrefix = `[${settings.text || 'LOCAL'}] `;

        if (lastPrefix && document.title.startsWith(lastPrefix)) {
            document.title = document.title.substring(lastPrefix.length);
            lastPrefix = null;
        }

        if (!settings || !settings.enabled) {
            if (overlay) overlay.remove();
            if (document.title.startsWith(newPrefix)) {
                document.title = document.title.substring(newPrefix.length);
            }
            return;
        }

        if (settings.addTitlePrefix) {
            document.title = newPrefix + document.title;
            lastPrefix = newPrefix;
        }

        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = OVERLAY_ID;
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0',
                width: '100vw', height: '100vh',
                pointerEvents: 'none', zIndex: '9999999',
                backgroundRepeat: 'repeat'
            });
            document.body.appendChild(overlay);
        }

        overlay.style.backgroundImage = createSVGBackground(
            settings.text || 'LOCAL',
            settings.color || '#ff0000',
            settings.size || 26,
            settings.spacing || 450,
            settings.opacity !== undefined ? settings.opacity : 0.3
        );
    }

    /** Removes the overlay and cleans up any title prefix. */
    function removeWatermark() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) overlay.remove();
        if (lastPrefix && document.title.startsWith(lastPrefix)) {
            document.title = document.title.substring(lastPrefix.length);
            lastPrefix = null;
        }
    }

    /** Reads storage, finds best matching config, and applies or removes the watermark. */
    function loadAndApply() {
        const origin = getOrigin();
        const url = window.location.href;
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            const configs = result[STORAGE_KEY] || [];
            const match = findMatchingConfig(configs, origin, url);
            match ? applyWatermark(match) : removeWatermark();
        });
    }

    /* -- Bootstrap ---------------------------------- */

    loadAndApply();

    chrome.storage.onChanged.addListener((changes) => {
        if (changes[STORAGE_KEY]) loadAndApply();
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'UPDATE_WATERMARK') applyWatermark(request.settings);
    });
})();
