import { useState, useEffect } from 'react'

export default function TreeFolder({ 
  section, 
  testCases, 
  selectedView, 
  onSelect, 
  onRenameSection, 
  onRenameTestCase,
  isTreeEditMode
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [editName, setEditName] = useState(section)
  const [isChecked, setIsChecked] = useState(false)
  
  if (!isTreeEditMode && editName !== section) {
     setEditName(section)
  }

  useEffect(() => {
    if (!isTreeEditMode) {
      setIsChecked(false)
    }
  }, [isTreeEditMode])

  const isSelected = selectedView?.type === 'section' && selectedView?.id === section

  const handleSave = () => {
    if (editName.trim() && editName !== section) {
      onRenameSection?.(section, editName.trim())
    }
  }

  return (
    <div className="tree-folder">
      <div 
        className={`tree-folder-header ${isSelected ? 'selected' : ''}`}
        onClick={(e) => {
          if (!isTreeEditMode) {
            setIsOpen(!isOpen)
            onSelect('section', section)
          }
        }} 
        style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '4px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
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
          <span className="tree-icon" style={{ marginLeft: '2px', marginRight: '4px' }}>📁</span>
          {isTreeEditMode && (
            <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={(e) => {
                e.stopPropagation();
                setIsChecked(e.target.checked);
              }}
              style={{ marginRight: '8px' }}
            />
          )}
          {isTreeEditMode && isChecked ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation()
                  handleSave()
                }
              }}
              autoFocus
              style={{ flex: 1, background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '13px', outline: 'none', minWidth: 0 }}
            />
          ) : (
            <span className="tree-label" title={section} style={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>{section}</span>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="tree-folder-children">
          {testCases.map((tc) => (
            <TreeFile 
              key={tc.id} 
              tc={tc} 
              selectedView={selectedView} 
              onSelect={onSelect} 
              onRenameTestCase={onRenameTestCase}
              isTreeEditMode={isTreeEditMode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeFile({ 
  tc, 
  selectedView, 
  onSelect, 
  onRenameTestCase,
  isTreeEditMode
}) {
  const [editName, setEditName] = useState(tc.scenario)
  const [isChecked, setIsChecked] = useState(false)
  const isFileSelected = selectedView?.type === 'case' && selectedView?.id === tc.id
  
  if (!isTreeEditMode && editName !== tc.scenario) {
     setEditName(tc.scenario)
  }

  useEffect(() => {
    if (!isTreeEditMode) {
      setIsChecked(false)
    }
  }, [isTreeEditMode])

  const handleSave = () => {
    if (editName.trim() && editName !== tc.scenario) {
      onRenameTestCase?.(tc.id, editName.trim())
    }
  }

  return (
    <div 
      className={`tree-file ${isFileSelected ? 'selected' : ''}`} 
      onClick={(e) => {
        if (!isTreeEditMode) {
          onSelect('case', tc.id)
        }
      }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '4px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <span className="tree-icon" style={{ marginLeft: '4px', marginRight: '4px' }}>📄</span>
        {isTreeEditMode && (
          <input 
            type="checkbox" 
            checked={isChecked} 
            onChange={(e) => {
              e.stopPropagation();
              setIsChecked(e.target.checked);
            }}
            style={{ marginRight: '8px' }}
          />
        )}
        {isTreeEditMode && isChecked ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                handleSave()
              }
            }}
            autoFocus
            style={{ flex: 1, background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '4px', color: 'white', padding: '2px 6px', fontSize: '13px', outline: 'none', minWidth: 0 }}
          />
        ) : (
          <span className="tree-label" title={tc.scenario} style={{ flex: 1, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tc.scenario}</span>
        )}
      </div>
    </div>
  )
}
