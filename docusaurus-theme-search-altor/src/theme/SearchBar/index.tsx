import React, { useState, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { AltorSearchConfig } from '../../options';
import SearchModal from './SearchModal';
import styles from './styles.module.css';

export default function SearchBar(): React.ReactElement {
  const { siteConfig } = useDocusaurusContext();
  const config = (siteConfig.themeConfig as Record<string, unknown>).altorSearch as AltorSearchConfig | undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [shortcutModifier, setShortcutModifier] = useState('Ctrl');

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
      setShortcutModifier('⌘');
      return;
    }

    setShortcutModifier('Ctrl');
  }, []);

  useEffect(() => {
    if (!config?.keyboardShortcut) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);

  return (
    <>
      <button
        className={styles.searchButton}
        onClick={() => setIsOpen(true)}
        aria-label="Open search"
        aria-haspopup="dialog"
      >
        <div className={styles.searchButtonIcon}>
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <span>{config?.placeholder || 'Search'}</span>
        </div>
        {config?.keyboardShortcut !== false && (
          <div className={styles.searchKbd}>
            <span>{shortcutModifier}</span>
            <span>K</span>
          </div>
        )}
      </button>

      {isOpen && <SearchModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
