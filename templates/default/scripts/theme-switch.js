// Theme switcher with WCAG compliance
class ThemeSwitcher {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'auto';
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.init();
    }

    init() {
        // Create and append the theme switch button
        const switchContainer = document.createElement('div');
        switchContainer.className = 'theme-switch-wrapper';
        switchContainer.setAttribute('role', 'group');
        switchContainer.setAttribute('aria-label', 'Theme switcher');

        const button = document.createElement('button');
        button.className = 'theme-switch';
        button.setAttribute('aria-label', 'Switch theme');
        button.setAttribute('aria-pressed', this.theme !== 'auto');
        
        // Current theme icon and label
        const icon = document.createElement('span');
        icon.className = 'theme-icon';
        icon.setAttribute('aria-hidden', 'true');
        
        const label = document.createElement('span');
        label.className = 'theme-label';
        label.setAttribute('aria-hidden', 'true');

        button.appendChild(icon);
        button.appendChild(label);
        switchContainer.appendChild(button);

        // Add keyboard support
        button.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Add click handler
        button.addEventListener('click', () => this.toggleTheme());

        // Add system theme change handler
        this.mediaQuery.addEventListener('change', (e) => {
            if (this.theme === 'auto') {
                this.updateTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Insert after header
        const header = document.querySelector('header');
        header.parentNode.insertBefore(switchContainer, header.nextSibling);

        // Initial theme setup
        this.updateTheme();
    }

    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.theme);
        this.theme = themes[(currentIndex + 1) % themes.length];
        localStorage.setItem('theme', this.theme);
        this.updateTheme();

        // Announce theme change to screen readers
        this.announceThemeChange();
    }

    updateTheme() {
        const button = document.querySelector('.theme-switch');
        const icon = button.querySelector('.theme-icon');
        const label = button.querySelector('.theme-label');
        
        // Determine effective theme
        let effectiveTheme = this.theme;
        if (this.theme === 'auto') {
            effectiveTheme = this.mediaQuery.matches ? 'dark' : 'light';
        }

        // Update document theme
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Update button state
        button.setAttribute('aria-pressed', this.theme !== 'auto');
        
        // Update icon and label
        const themeInfo = {
            auto: { icon: '🌗', label: 'Auto' },
            light: { icon: '☀️', label: 'Light' },
            dark: { icon: '🌙', label: 'Dark' }
        };
        
        icon.textContent = themeInfo[this.theme].icon;
        label.textContent = themeInfo[this.theme].label;

        // Force a repaint to ensure styles are updated
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger reflow
        document.body.style.display = '';
    }

    announceThemeChange() {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        
        let themeDescription = this.theme;
        if (this.theme === 'auto') {
            themeDescription = `automatic (currently ${this.mediaQuery.matches ? 'dark' : 'light'})`;
        }
        
        announcement.textContent = `Theme changed to ${themeDescription}`;
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Initialize theme switcher when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ThemeSwitcher();
});
