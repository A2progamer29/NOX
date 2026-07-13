import React, { useEffect, useState } from 'react';

export const THEMES = [
  { id: 'obscur', name: 'Obscur', desc: 'Noir et rose — par défaut', className: '' },
  { id: 'abysse', name: 'Abysse', desc: 'Bleu nocturne', className: 'nox-theme-abysse' },
  { id: 'aube', name: 'Aube', desc: 'Clair', className: 'nox-theme-aube' },
  { id: 'ambre', name: 'Ambre', desc: 'Orangé', className: 'nox-theme-ambre' },
  { id: 'emeraude', name: 'Émeraude', desc: 'Vert', className: 'nox-theme-emeraude' },
  { id: 'violette', name: 'Violette', desc: 'Violet', className: 'nox-theme-violette' },
  { id: 'cyan', name: 'Cyan', desc: 'Turquoise', className: 'nox-theme-cyan' },
  { id: 'or', name: 'Or', desc: 'Doré', className: 'nox-theme-or' },
];

export const BUTTON_SIZES = [
  { id: 'small', name: 'Petit', w: 96, h: 56 },
  { id: 'medium', name: 'Moyen', w: 140, h: 78 },
  { id: 'large', name: 'Grand', w: 184, h: 102 },
];

const DEFAULT_WEIGHTS = {
  channelAffinity: 0.40,
  titleAffinity: 0.30,
  freshness: 0.12,
  popularity: 0.06,
  clickbaitPenalty: 0.12,
};

const WEIGHT_FIELDS = [
  { id: 'channelAffinity', label: 'Affinité de chaîne' },
  { id: 'titleAffinity', label: 'Mots-clés du titre' },
  { id: 'freshness', label: 'Fraîcheur' },
  { id: 'popularity', label: 'Popularité' },
  { id: 'clickbaitPenalty', label: 'Pénalité anti-clickbait' },
];

const DEFAULT_SHORTCUTS = {
  toggleNox: 'Alt+N',
  openDashboard: 'Alt+D',
  nextProposed: 'Alt+ArrowRight',
  toggleButton: 'Alt+B',
};

const SHORTCUT_ACTIONS = [
  { id: 'toggleNox', label: 'Basculer Better Youtube ON / OFF' },
  { id: 'openDashboard', label: 'Ouvrir le tableau de bord' },
  { id: 'nextProposed', label: 'Aller à la prochaine vidéo proposée' },
  { id: 'toggleButton', label: 'Afficher / cacher le bouton flottant' },
];

function comboFromEvent(e) {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;
  const parts = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Meta');
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

function Switch({ checked, onChange }) {
  return (
    <button
      className={'nox-switch' + (checked ? ' nox-switch-on' : '')}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="nox-switch-knob" />
    </button>
  );
}

function WeightsSection({ weights, onSetWeights }) {
  const current = { ...DEFAULT_WEIGHTS, ...(weights || {}) };

  function updateField(id, pct) {
    onSetWeights({ ...current, [id]: pct / 100 });
  }

  return (
    <section className="nox-panel nox-panel-anim" style={{ animationDelay: '190ms' }}>
      <h2>Poids de l'algorithme</h2>
      <p className="nox-panel-sub">Règle l'importance de chaque critère dans le classement</p>
      <div className="nox-weights-list">
        {WEIGHT_FIELDS.map(f => {
          const pct = Math.round((current[f.id] ?? 0) * 100);
          return (
            <div className="nox-weight-row" key={f.id}>
              <div className="nox-weight-row-header">
                <span className="nox-insight-label">{f.label}</span>
                <span className="nox-weight-value">{pct}%</span>
              </div>
              <input
                type="range"
                className="nox-position-slider"
                min={0}
                max={100}
                value={pct}
                onChange={e => updateField(f.id, Number(e.target.value))}
              />
            </div>
          );
        })}
      </div>
      <button className="nox-reset-btn nox-weights-reset" onClick={() => onSetWeights(DEFAULT_WEIGHTS)}>
        Réinitialiser les poids par défaut
      </button>
    </section>
  );
}

function BlacklistSection({ blacklist, onSetBlacklist }) {
  const [channelInput, setChannelInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const channels = blacklist?.channels || [];
  const keywords = blacklist?.keywords || [];

  function addChannel() {
    const v = channelInput.trim();
    if (!v || channels.includes(v)) return;
    onSetBlacklist({ channels: [...channels, v], keywords });
    setChannelInput('');
  }

  function addKeyword() {
    const v = keywordInput.trim();
    if (!v || keywords.includes(v)) return;
    onSetBlacklist({ channels, keywords: [...keywords, v] });
    setKeywordInput('');
  }

  function removeChannel(c) {
    onSetBlacklist({ channels: channels.filter(x => x !== c), keywords });
  }

  function removeKeyword(k) {
    onSetBlacklist({ channels, keywords: keywords.filter(x => x !== k) });
  }

  return (
    <section className="nox-panel nox-panel-anim" style={{ animationDelay: '220ms' }}>
      <h2>Liste noire</h2>
      <p className="nox-panel-sub">Chaînes ou mots-clés jamais proposés par l'algorithme</p>

      <div className="nox-blacklist-block">
        <span className="nox-insight-label">Chaînes</span>
        <div className="nox-blacklist-input-row">
          <input
            className="nox-bug-input"
            placeholder="Nom exact de la chaîne"
            value={channelInput}
            onChange={e => setChannelInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addChannel(); }}
          />
          <button className="nox-reset-btn nox-blacklist-add" onClick={addChannel}>Ajouter</button>
        </div>
        <div className="nox-blacklist-tags">
          {channels.length === 0 ? (
            <span className="nox-panel-sub nox-empty" style={{ margin: 0 }}>Aucune chaîne bloquée</span>
          ) : (
            channels.map(c => (
              <span className="nox-blacklist-tag" key={c}>
                {c}
                <button onClick={() => removeChannel(c)} title="Retirer">✕</button>
              </span>
            ))
          )}
        </div>
      </div>

      <div className="nox-blacklist-block">
        <span className="nox-insight-label">Mots-clés du titre</span>
        <div className="nox-blacklist-input-row">
          <input
            className="nox-bug-input"
            placeholder="Ex : clickbait, prank..."
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addKeyword(); }}
          />
          <button className="nox-reset-btn nox-blacklist-add" onClick={addKeyword}>Ajouter</button>
        </div>
        <div className="nox-blacklist-tags">
          {keywords.length === 0 ? (
            <span className="nox-panel-sub nox-empty" style={{ margin: 0 }}>Aucun mot-clé bloqué</span>
          ) : (
            keywords.map(k => (
              <span className="nox-blacklist-tag" key={k}>
                {k}
                <button onClick={() => removeKeyword(k)} title="Retirer">✕</button>
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ShortcutsSection({ shortcuts, onSetShortcuts }) {
  const [recording, setRecording] = useState(null);
  const current = { ...DEFAULT_SHORTCUTS, ...(shortcuts || {}) };

  useEffect(() => {
    if (!recording) return;

    function onKeyDown(e) {
      e.preventDefault();
      if (e.key === 'Escape') {
        setRecording(null);
        return;
      }
      const combo = comboFromEvent(e);
      if (!combo) return;
      onSetShortcuts({ ...current, [recording]: combo });
      setRecording(null);
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  return (
    <section className="nox-panel nox-panel-anim" style={{ animationDelay: '250ms' }}>
      <h2>Raccourcis clavier (sur YouTube)</h2>
      <p className="nox-panel-sub">Clique "Modifier" puis appuie sur une combinaison — Échap pour annuler</p>
      <div className="nox-shortcuts-list">
        {SHORTCUT_ACTIONS.map(a => (
          <div className="nox-insight-row nox-shortcut-row" key={a.id}>
            <span className="nox-insight-label">{a.label}</span>
            <div className="nox-shortcut-controls">
              <kbd className="nox-shortcut-kbd">
                {recording === a.id ? 'Appuie sur une touche…' : current[a.id]}
              </kbd>
              <button
                className="nox-reset-btn nox-shortcut-edit"
                onClick={() => setRecording(recording === a.id ? null : a.id)}
              >
                {recording === a.id ? 'Annuler' : 'Modifier'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="nox-reset-btn nox-weights-reset" onClick={() => onSetShortcuts(DEFAULT_SHORTCUTS)}>
        Réinitialiser les raccourcis par défaut
      </button>
    </section>
  );
}

function AccountSection({ accountName, accountNameManual, onSetAccountName, onResetAccountName }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(accountName || '');

  function startEditing() {
    setDraft(accountName || '');
    setEditing(true);
  }

  function save() {
    const v = draft.trim();
    if (v) onSetAccountName(v);
    setEditing(false);
  }

  return (
    <section className="nox-panel nox-panel-anim">
      <h2>Compte</h2>
      <p className="nox-panel-sub">
        {accountNameManual ? 'Choisi manuellement' : 'Détecté automatiquement sur YouTube'}
      </p>

      {editing ? (
        <div className="nox-blacklist-input-row">
          <input
            className="nox-bug-input"
            placeholder="Ton nom"
            value={draft}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button className="nox-reset-btn nox-blacklist-add" onClick={save}>Enregistrer</button>
        </div>
      ) : (
        <>
          <p className="nox-panel-sub nox-empty">
            {accountName
              ? <>Connecté en tant que <strong className="nox-highlight">({accountName})</strong></>
              : <>Compte non détecté <strong className="nox-highlight">(ouvre un onglet YouTube, ça se remplit automatiquement)</strong></>}
          </p>
          <div className="nox-blacklist-input-row" style={{ justifyContent: 'center', marginTop: 14 }}>
            <button className="nox-reset-btn nox-blacklist-add" onClick={startEditing}>Choisir mon nom</button>
            {accountNameManual && (
              <button className="nox-reset-btn nox-blacklist-add" onClick={onResetAccountName}>
                Revenir à la détection automatique
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function SettingsPage({
  settings, accountName, accountNameManual, theme, buttonSize, buttonOffsetX, blacklist, shortcuts,
  onSetDefaultEnabled, onSetTheme, onSetButtonSize, onSetButtonOffsetX,
  onSetWeights, onSetBlacklist, onSetShortcuts, onExportData,
  onSetAccountName, onResetAccountName,
}) {
  const activeSize = BUTTON_SIZES.find(s => s.id === buttonSize) || BUTTON_SIZES[1];
  const offsetX = buttonOffsetX ?? 100;

  return (
    <>
      <AccountSection
        accountName={accountName}
        accountNameManual={accountNameManual}
        onSetAccountName={onSetAccountName}
        onResetAccountName={onResetAccountName}
      />

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '60ms' }}>
        <h2>État par défaut</h2>
        <p className="nox-panel-sub">Ce que le bouton ON/OFF affiche au lancement de YouTube</p>
        <div className="nox-insight-row">
          <span className="nox-insight-label">Activer Better Youtube par défaut</span>
          <Switch checked={!!settings?.enabled} onChange={onSetDefaultEnabled} />
        </div>
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '100ms' }}>
        <h2>Taille du bouton sur YouTube</h2>
        <p className="nox-panel-sub">Aperçu en direct</p>
        <div className="nox-size-options">
          {BUTTON_SIZES.map(s => (
            <button
              key={s.id}
              className={'nox-size-option' + (buttonSize === s.id ? ' nox-size-option-active' : '')}
              onClick={() => onSetButtonSize(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="nox-size-preview-wrap">
          <div
            className="nox-size-preview-btn"
            style={{ width: activeSize.w, height: activeSize.h }}
          >
            <span className="nox-size-preview-title">NOX</span>
            <span className="nox-size-preview-state">ON</span>
          </div>
        </div>
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '130ms' }}>
        <h2>Position du bouton sur YouTube</h2>
        <p className="nox-panel-sub">Fais glisser pour choisir où il apparaît horizontalement</p>

        <div className="nox-position-track">
          <div
            className="nox-position-puck"
            style={{
              left: offsetX + '%',
              width: activeSize.w,
              height: activeSize.h,
              transform: `translate(-${offsetX}%, -50%)`,
            }}
          >
            <span className="nox-position-puck-title">NOX</span>
            <span className="nox-position-puck-state">ON</span>
          </div>
        </div>

        <input
          type="range"
          className="nox-position-slider"
          min={0}
          max={100}
          value={offsetX}
          onChange={e => onSetButtonOffsetX(Number(e.target.value))}
        />
      </section>

      <section className="nox-panel nox-panel-anim" style={{ animationDelay: '160ms' }}>
        <h2>Thème</h2>
        <p className="nox-panel-sub">Change l'apparence du dashboard, du bouton et du popup</p>
        <div className="nox-theme-grid">
          {THEMES.map(t => (
            <button
              key={t.id}
              className={'nox-theme-card' + (theme === t.id ? ' nox-theme-card-active' : '')}
              onClick={() => onSetTheme(t.id)}
            >
              <span className={'nox-theme-swatch ' + t.className} />
              <span className="nox-theme-name">{t.name}</span>
              <span className="nox-theme-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <WeightsSection weights={settings?.weights} onSetWeights={onSetWeights} />

      <BlacklistSection blacklist={blacklist} onSetBlacklist={onSetBlacklist} />

      <ShortcutsSection shortcuts={shortcuts} onSetShortcuts={onSetShortcuts} />

      <section className="nox-panel nox-panel-anim nox-panel-centered" style={{ animationDelay: '280ms' }}>
        <h2>Données</h2>
        <p className="nox-panel-sub">Exporte tout ton historique et tes réglages dans un fichier JSON</p>
        <button className="nox-reset-btn" onClick={onExportData}>Exporter mes données (JSON)</button>
      </section>
    </>
  );
}
