import React from 'react';

// Le tutoriel complet vit désormais dans guide.html (page à part).
// Ce fichier ne garde que la popup de confirmation à la première visite.
export function TutorialConfirm({ open, onYes, onNo }) {
  if (!open) return null;
  return (
    <div className="nox-modal-overlay nox-visible">
      <div className="nox-confirm-box nox-modal-anim">
        <p className="nox-confirm-text">C'est ta première visite sur le tableau de bord Better Youtube.<br />Tu veux voir le guide ?</p>
        <div className="nox-confirm-actions">
          <button className="nox-confirm-yes" onClick={onYes}>Oui, montre-moi</button>
          <button className="nox-confirm-no" onClick={onNo}>Non merci</button>
        </div>
      </div>
    </div>
  );
}
