import PropTypes from 'prop-types'

const DOMAIN_ICONS = {
  'Banking': '🏦', 'Finance': '💰', 'Healthcare': '🏥', 'E-commerce': '🛒',
  'Education': '🎓', 'Insurance': '🛡', 'Logistics': '📦', 'Real Estate': '🏠',
  'Social Media': '💬', 'Telecom': '📡', 'Travel': '✈️', 'Retail': '🛍',
}

const TYPE_COLORS = {
  'Functional':    '#6366f1',
  'Regression':    '#f59e0b',
  'Integration':   '#10b981',
  'Performance':   '#ef4444',
  'Security':      '#8b5cf6',
  'Exploratory':   '#3b82f6',
}

function formatDate(ts) {
  if (!ts) return 'N/A'
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProjectCard({ project, onClick, onDelete }) {
  const domainIcon = DOMAIN_ICONS[project.domain] || '📁'
  const typeColor  = TYPE_COLORS[project.testing_type] || '#64748b'

  return (
    <div className="proj-card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => e.key === 'Enter' && onClick()}
         style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column' }}
         onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
         onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
    >
      <div className="proj-card-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div className="proj-card-icon" style={{ fontSize: '24px' }}>{domainIcon}</div>
        <div className="proj-card-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.(project.id, e); }}
            style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}
            title="Delete project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
          {project.testing_type && (
            <span className="proj-card-badge" style={{ background: typeColor + '22', color: typeColor, border: '1px solid ' + typeColor + '44', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
              {project.testing_type}
            </span>
          )}
          {project.is_legacy && (
            <span className="proj-card-badge proj-card-badge--legacy" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Legacy</span>
          )}
        </div>
      </div>
      <h3 className="proj-card-name" style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '18px' }}>{project.name}</h3>
      {project.description && (
        <p className="proj-card-desc" style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</p>
      )}
      <div className="proj-card-footer" style={{ display: 'flex', gap: '12px', color: '#94a3b8', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: 'auto' }}>
        <span className="proj-card-domain">{project.domain || 'General'}</span>
        <span className="proj-card-date">{formatDate(project.created_at)}</span>
        {project.total_cases > 0 && (
          <span className="proj-card-cases">{project.total_cases} cases</span>
        )}
      </div>
    </div>
  )
}

ProjectCard.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    domain: PropTypes.string,
    testing_type: PropTypes.string,
    is_legacy: PropTypes.bool,
    created_at: PropTypes.number,
    total_cases: PropTypes.number,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
}
