import { useEffect, useRef } from 'react';

// Pop-up de confirmation reutilisable (inscription, suppression...).
// Deux boutons : le premier confirme, le second annule. Echap = annuler aussi.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Discard',
  onConfirm,
  onCancel,
  busy = false,
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus(); // le bouton "annuler" est le choix par defaut : plus sur
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        {message && <p>{message}</p>}
        <div className="dialog-actions">
          <button type="button" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
          <button type="button" className="btn-outline" onClick={onCancel} ref={cancelRef} disabled={busy}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
