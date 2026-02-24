window.EnvAware = {
    STORAGE_KEY: 'wm_configs',
    PRESETS_KEY: 'wm_custom_presets',

    globToRegex(pattern) {
        const escaped = pattern.replace(/([.+^${}()|[\]\\])/g, (m) => '\\' + m);
        return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$', 'i');
    },

    getSpecificity(pattern) {
        const wildcardCount = (pattern.match(/\*/g) || []).length;
        if (wildcardCount === 0) return Infinity;
        return pattern.length - (wildcardCount * 50);
    },

    isPatternConfig(pattern) {
        return pattern.includes('*');
    },

    findMatchingConfig(configs, origin) {
        let bestMatch = null;
        let bestScore = -Infinity;

        configs.forEach(config => {
            if (!config.enabled) return;
            const regex = EnvAware.globToRegex(config.pattern);
            if (regex.test(origin)) {
                const score = EnvAware.getSpecificity(config.pattern);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = config;
                }
            }
        });

        return bestMatch;
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    showToast(container, message, type = 'success') {
        const icons = { success: '✓', error: '✕', info: 'i' };
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('removing');
            el.addEventListener('animationend', () => el.remove());
        }, 2200);
    }
};
