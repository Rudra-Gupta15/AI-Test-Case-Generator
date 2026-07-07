import PropTypes from 'prop-types'
import './ProjectCard.css'

const DOMAIN_ICONS = {
  'Banking': '🏦', 'Finance': '💰', 'Healthcare': '🏥', 'E-commerce': '🛒',
  'Education': '🎓', 'Insurance': '🛡', 'Logistics': '📦', 'Real Estate': '🏠',
  'Social Media': '💬', 'Telecom': '📡', 'Travel': '✈️', 'Retail': '🛍',
}

const TYPE_COLORS = {
  'Functional': '#6366f1',
  'Regression': '#f59e0b',
  'Integration': '#10b981',
  'Performance': '#ef4444',
  'Security': '#8b5cf6',
  'Exploratory': '#3b82f6',
}

function formatDate(ts) {
  if (!ts) return 'N/A'
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProjectCard({ project, onClick, onDelete, onHistoryClick, isSelected }) {
  const domainIcon = DOMAIN_ICONS[project.domain] || '📁'
  const typeColor = TYPE_COLORS[project.testing_type] || '#64748b'

  return (
    <div className={`proj-card ${isSelected ? 'selected' : ''}`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="proj-card-tab"></div>
      <div className="proj-card-top">
        <div className="proj-card-icon">
          {domainIcon}
        </div>
        <div className="proj-card-actions">
          <button
            className="proj-delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete?.(project.id, e); }}
            title="Delete project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
          <button
            className="proj-menu-btn"
            onClick={(e) => { e.stopPropagation(); }}
            title="Options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>
          {project.is_legacy && (
            <span className="proj-card-badge proj-card-badge--legacy" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>Legacy</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: project.description ? '12px' : '0' }}>
        <h3 className="proj-card-title" style={{ margin: 0 }}>{project.name}</h3>
        {project.description && (
          <div title={project.description} style={{ color: '#94a3b8', cursor: 'help', display: 'flex', alignItems: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 16v-4"></path>
              <path d="M12 8h.01"></path>
            </svg>
          </div>
        )}
      </div>
      <div className="proj-card-footer">
        <div className="proj-card-tags">
          {project.testing_type && (
            <span style={{ background: typeColor + '15', color: typeColor, border: '1px solid ' + typeColor + '25', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '500' }}>
              {project.testing_type}
            </span>
          )}
          <span>{project.domain || 'General'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '12px' }}>
          <span>|</span>
          <span className="proj-card-date">{formatDate(project.created_at)}</span>
        </div>
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
  isSelected: PropTypes.bool,
}
