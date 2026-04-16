// Mode toggle (Simple / Technique)
(function() {
    const STORAGE_KEY = 'page-mode';
    const DEFAULT_MODE = 'simple'; // Mode simple par défaut
    
    // Initialiser le mode au chargement
    function initializeMode() {
        const stored = localStorage.getItem(STORAGE_KEY);
        const mode = stored || DEFAULT_MODE;
        applyMode(mode);
    }
    
    function applyMode(mode) {
        document.body.classList.remove('simple-mode', 'technical-mode');
        document.body.classList.add(mode + '-mode');
        localStorage.setItem(STORAGE_KEY, mode);
        updateToggleButtons(mode);
    }
    
    function updateToggleButtons(mode) {
        document.querySelectorAll('.mode-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
            btn.setAttribute('aria-pressed', btn.dataset.mode === mode);
        });
    }
    
    // Créer le toggle button
    function createModeToggleButtons() {
        // Pour les pages normales avec site-header
        const headers = document.querySelectorAll('.site-header');
        headers.forEach(header => {
            if (header.querySelector('.mode-toggle')) return;
            const nav = header.querySelector('.site-nav');
            if (!nav) return;
            
            const toggleContainer = document.createElement('div');
            toggleContainer.className = 'mode-toggles';
            toggleContainer.setAttribute('role', 'group');
            toggleContainer.setAttribute('aria-label', 'Sélecteur de mode de contenu');
            
            const simpleBtn = document.createElement('button');
            simpleBtn.className = 'mode-toggle';
            simpleBtn.dataset.mode = 'simple';
            simpleBtn.textContent = '👁️ Mode Simple';
            simpleBtn.setAttribute('aria-label', 'Mode simple - contenu grand public');
            simpleBtn.setAttribute('aria-pressed', 'true');
            
            const techBtn = document.createElement('button');
            techBtn.className = 'mode-toggle';
            techBtn.dataset.mode = 'technical';
            techBtn.textContent = '🔧 Mode Technique';
            techBtn.setAttribute('aria-label', 'Mode technique - contenu expert');
            techBtn.setAttribute('aria-pressed', 'false');
            
            simpleBtn.addEventListener('click', () => applyMode('simple'));
            techBtn.addEventListener('click', () => applyMode('technical'));
            
            toggleContainer.appendChild(simpleBtn);
            toggleContainer.appendChild(techBtn);
            nav.appendChild(toggleContainer);
        });
        
        // Pour index.html avec .mode-toggles-index
        const indexToggles = document.querySelector('.mode-toggles-index');
        if (indexToggles && !indexToggles.querySelector('.mode-toggle')) {
            const simpleBtn = document.createElement('button');
            simpleBtn.className = 'mode-toggle';
            simpleBtn.dataset.mode = 'simple';
            simpleBtn.textContent = '👁️ Simple';
            simpleBtn.setAttribute('aria-label', 'Mode simple');
            simpleBtn.setAttribute('aria-pressed', 'true');
            simpleBtn.style.cssText = 'background: #5eb3ff; color: #0f1621; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 0.5rem; font-weight: 600;';
            
            const techBtn = document.createElement('button');
            techBtn.className = 'mode-toggle';
            techBtn.dataset.mode = 'technical';
            techBtn.textContent = '🔧 Technique';
            techBtn.setAttribute('aria-label', 'Mode technique');
            techBtn.setAttribute('aria-pressed', 'false');
            techBtn.style.cssText = 'background: transparent; color: #5eb3ff; border: 1px solid #5eb3ff; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 0.5rem; font-weight: 600;';
            
            simpleBtn.addEventListener('click', () => {
                applyMode('simple');
                updateIndexToggleStyles(simpleBtn, techBtn);
            });
            techBtn.addEventListener('click', () => {
                applyMode('technical');
                updateIndexToggleStyles(simpleBtn, techBtn);
            });
            
            indexToggles.appendChild(simpleBtn);
            indexToggles.appendChild(techBtn);
        }
    }
    
    function updateIndexToggleStyles(simpleBtn, techBtn) {
        const mode = localStorage.getItem(STORAGE_KEY) || DEFAULT_MODE;
        if (mode === 'simple') {
            simpleBtn.style.background = '#5eb3ff';
            simpleBtn.style.color = '#0f1621';
            simpleBtn.style.border = 'none';
            techBtn.style.background = 'transparent';
            techBtn.style.color = '#5eb3ff';
            techBtn.style.border = '1px solid #5eb3ff';
        } else {
            simpleBtn.style.background = 'transparent';
            simpleBtn.style.color = '#5eb3ff';
            simpleBtn.style.border = '1px solid #5eb3ff';
            techBtn.style.background = '#5eb3ff';
            techBtn.style.color = '#0f1621';
            techBtn.style.border = 'none';
        }
    }
            
            const techBtn = document.createElement('button');
            techBtn.className = 'mode-toggle';
            techBtn.dataset.mode = 'technical';
            techBtn.textContent = '🔧 Mode Technique';
            techBtn.setAttribute('aria-label', 'Mode technique - contenu expert');
            techBtn.setAttribute('aria-pressed', 'false');
            
            simpleBtn.addEventListener('click', () => applyMode('simple'));
            techBtn.addEventListener('click', () => applyMode('technical'));
            
            toggleContainer.appendChild(simpleBtn);
            toggleContainer.appendChild(techBtn);
            nav.appendChild(toggleContainer);
        });
    }
    
    // Initialiser au chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createModeToggleButtons();
            initializeMode();
        });
    } else {
        createModeToggleButtons();
        initializeMode();
    }
})();

// Keyboard accessibility helpers
document.addEventListener('keydown', (e) => {
    // Fermer les modals au clic sur Échap
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"].is-open');
        modals.forEach(modal => {
            const closeBtn = modal.querySelector('[aria-label*="Fermer"]');
            if (closeBtn) closeBtn.click();
        });
    }
});
