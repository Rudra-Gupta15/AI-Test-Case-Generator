import React, { useState, useEffect, useRef } from 'react';
export default function TreeFolder({ section, testCases, selectedView, onSelect }) {
  const [isOpen, setIsOpen] = useState(true)

  const isSelected = selectedView?.type === 'section' && selectedView?.id === section

  return (
    <div className="tree-folder">
      <div 
        className={`tree-folder-header ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          setIsOpen(!isOpen)
          onSelect('section', section)
        }} 
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span 
          className="tree-icon" 
          style={{ 
            transform: isOpen ? 'rotate(90deg)' : 'none', 
            transition: 'transform 0.1s ease-out',
            display: 'inline-block',
            fontSize: '9px',
            marginRight: '2px',
            color: '#71717a'
          }}
        >
          ▶
        </span>
        <span className="tree-icon">📁</span>
        <span className="tree-label" title={section}>{section}</span>
      </div>
      {isOpen && (
        <div className="tree-folder-children">
          {testCases.map((tc) => {
            const isFileSelected = selectedView?.type === 'case' && selectedView?.id === tc.id
            return (
              <div 
                key={tc.id} 
                className={`tree-file ${isFileSelected ? 'selected' : ''}`} 
                title={tc.scenario}
                onClick={() => onSelect('case', tc.id)}
              >
                <span className="tree-icon" style={{ marginLeft: '4px' }}>📄</span>
                <span className="tree-label">{tc.scenario}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// LegacyWorkspaceView — the original App content, preserved for old projects.
// Accessible at /project/:id/legacy
// ─────────────────────────────────────────────────────────────────────────────
import { useNavigate } from 'react-router-dom'

