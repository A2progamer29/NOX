import React, { useState } from 'react';

export default function BugReport() {
  const [title, setTitle] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    const body = `Titre du bug: ${title}\n\nÉtapes pour reproduire:\n${steps}\n\nCe qui était attendu:\n${expected}`;
    const mailto = `mailto:?subject=${encodeURIComponent('[Better Youtube] Bug: ' + title)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <div className="nox-page-wrap">
      <header className="nox-page-header">
        <div className="nox-brand">
          <button
            className="nox-brand-name nox-brand-name-btn"
            onClick={() => { try { window.location.href = chrome.runtime.getURL('stats.html'); } catch (e) {} }}
            title="Retour au tableau de bord"
          >
            Better Youtube
          </button>
        </div>
        <div className="nox-brand-tag">Signaler un bug</div>
      </header>

      <main className="nox-main">
        <section className="nox-panel nox-panel-anim">
          <h2>Décris le problème</h2>
          <p className="nox-panel-sub">Plus c'est précis, plus vite ça peut être corrigé</p>

          {sent ? (
            <p className="nox-panel-sub nox-empty">
              Ton client mail devrait s'être ouvert <strong className="nox-highlight">(merci !)</strong>
            </p>
          ) : (
            <form className="nox-bug-form" onSubmit={submit}>
              <label className="nox-bug-label">
                Titre du bug
                <input className="nox-bug-input" value={title} onChange={e => setTitle(e.target.value)} required />
              </label>
              <label className="nox-bug-label">
                Étapes pour reproduire
                <textarea className="nox-bug-textarea" value={steps} onChange={e => setSteps(e.target.value)} rows={4} required />
              </label>
              <label className="nox-bug-label">
                Ce qui était attendu
                <textarea className="nox-bug-textarea" value={expected} onChange={e => setExpected(e.target.value)} rows={3} />
              </label>
              <button className="nox-reset-btn" type="submit">Envoyer</button>
            </form>
          )}
        </section>
      </main>

      <footer className="nox-footer">
        <div className="nox-footer-text">Better Youtube — Algorithme YouTube transparent, exécuté localement.</div>
      </footer>
    </div>
  );
}
