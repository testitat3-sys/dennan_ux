import './MilestoneBadges.css';

const BadgeIcons = {
  start: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M12 3l1.5 4.5H18L14.5 10l1.5 4.5-4-3-4 3 1.5-4.5L6 7.5h4.5L12 3z" stroke="var(--color-brand-accent)" fill="color-mix(in srgb, var(--color-brand-accent), transparent 80%)" />
      <circle cx="19" cy="5" r="1.5" fill="var(--color-brand-primary)" stroke="none" />
      <circle cx="5" cy="18" r="2" fill="var(--color-brand-secondary)" stroke="none" />
      <path d="M19 15l1 2-1 2-2-1-2 1 1-2-1-2 2 1 2-1z" fill="var(--color-brand-primary-light)" stroke="none" />
    </svg>
  ),
  trim2: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M12 20v-8m0 0a4 4 0 014-4h2m-6 4a4 4 0 00-4-4H8" stroke="var(--color-support-green)" />
      <path d="M12 12c0-3.333 2-5 4-5s4 1.667 4 5-2 5-4 5-4-1.667-4-5z" fill="color-mix(in srgb, var(--color-support-green), transparent 85%)" stroke="var(--color-support-green)" />
      <circle cx="12" cy="12" r="1" fill="var(--color-brand-accent)" stroke="none" />
    </svg>
  ),
  trim3: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M12 20c0-4.418-3.582-8-8-8 4.418 0 8-3.582 8-8 0 4.418 3.582 8 8 8-4.418 0-8 3.582-8 8z" fill="color-mix(in srgb, var(--color-brand-primary), transparent 90%)" stroke="var(--color-brand-primary)" />
      <path d="M12 4v16M4 12h16" stroke="var(--color-brand-secondary)" opacity="0.3" />
      <path d="M7 7l10 10M17 7L7 17" stroke="var(--color-support-green)" strokeWidth="1" />
    </svg>
  ),
  due: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M12 16c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" stroke="var(--color-brand-primary)" />
      <path d="M9 7c0 .552.448 1 1 1s1-.448 1-1-.448-1-1-1-1 .448-1 1zm5 0c0 .552.448 1 1 1s1-.448 1-1-.448-1-1-1-1 .448-1 1z" fill="var(--color-brand-primary)" stroke="none" />
      <path d="M12 12c1.105 0 2-.895 2-2H10c0 1.105.895 2 2 2z" fill="var(--color-brand-primary-light)" stroke="none" />
      <path d="M12 16v5m-4-2.5h8" stroke="var(--color-brand-secondary)" />
    </svg>
  ),
  birth: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M9 20h6a2 2 0 002-2V8a2 2 0 00-2-2h-1V4a2 2 0 00-2-2h-2a2 2 0 00-2 2v2H8a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="var(--color-support-blue)" fill="color-mix(in srgb, var(--color-support-blue), transparent 90%)" />
      <path d="M10 10h4m-4 4h4" stroke="var(--color-brand-primary)" opacity="0.5" />
      <path d="M12 6V2" stroke="var(--color-support-blue)" />
    </svg>
  ),
  '6m': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M4 10c0 4.418 3.582 8 8 8s8-3.582 8-8H4z" stroke="var(--color-brand-accent)" fill="color-mix(in srgb, var(--color-brand-accent), transparent 85%)" />
      <path d="M12 18v3m-4 0h8" stroke="var(--color-brand-secondary)" />
      <path d="M15 4l-2 6h4l-2-6z" stroke="var(--color-brand-primary)" fill="var(--color-brand-primary)" />
    </svg>
  ),
  '1y': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="var(--color-brand-primary)" fill="color-mix(in srgb, var(--color-brand-primary), transparent 90%)" />
      <path d="M12 10V6" stroke="var(--color-brand-accent)" strokeWidth="2" />
      <path d="M12 4c.5 1 1.5 1 1.5 2s-1 1-1.5 2-1.5-1-1.5-2 1-1 1.5-2z" fill="var(--color-brand-accent)" stroke="none" />
      <path d="M7 14h10" stroke="var(--color-brand-secondary)" opacity="0.4" />
    </svg>
  ),
  '2y': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="badge-svg">
      <path d="M4 16c0-2 2-4 5-4h6c3 0 5 2 5 4v2H4v-2z" stroke="var(--color-brand-secondary)" fill="color-mix(in srgb, var(--color-brand-secondary), transparent 90%)" />
      <circle cx="9" cy="18" r="1.5" fill="var(--color-brand-primary)" stroke="none" />
      <circle cx="15" cy="18" r="1.5" fill="var(--color-brand-primary)" stroke="none" />
      <path d="M16 8l-2 4h4l-2-4z" stroke="var(--color-brand-accent)" fill="var(--color-brand-accent)" />
    </svg>
  )
};

const MilestoneBadges = ({ user, stageInfo }) => {
  const allBadges = stageInfo.type === 'expecting' 
    ? [
        { id: 'start', label: 'Journey Started', icon: BadgeIcons.start, unlocked: true },
        { id: 'trim2', label: '2nd Trimester', icon: BadgeIcons.trim2, unlocked: stageInfo.week >= 12 },
        { id: 'trim3', label: '3rd Trimester', icon: BadgeIcons.trim3, unlocked: stageInfo.week >= 27 },
        { id: 'due', label: 'Due Date Reached', icon: BadgeIcons.due, unlocked: stageInfo.week >= 40 }
      ]
    : [
        { id: 'birth', label: 'Newborn', icon: BadgeIcons.birth, unlocked: true },
        { id: '6m', label: '6 Months', icon: BadgeIcons['6m'], unlocked: stageInfo.months >= 6 },
        { id: '1y', label: 'First Birthday', icon: BadgeIcons['1y'], unlocked: stageInfo.months >= 12 },
        { id: '2y', label: 'Toddler', icon: BadgeIcons['2y'], unlocked: stageInfo.months >= 24 }
      ];

  return (
    <div className="milestone-badges">
      <h3 className="milestone-badges__title">Your Achievements</h3>
      <div className="milestone-badges__grid">
        {allBadges.map(badge => (
          <div 
            key={badge.id} 
            className={`milestone-badge ${badge.unlocked ? 'is-unlocked' : 'is-locked'}`}
            title={badge.unlocked ? `Unlocked: ${badge.label}` : `Locked: ${badge.label}`}
          >
            <div className="milestone-badge__icon">
              {typeof badge.icon === 'function' ? badge.icon() : badge.icon}
            </div>
            <span className="milestone-badge__label">{badge.label}</span>
            {badge.unlocked && badge.id !== 'start' && badge.id !== 'birth' && (
              <div className="milestone-badge__promo">Claim 10% OFF</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MilestoneBadges;
