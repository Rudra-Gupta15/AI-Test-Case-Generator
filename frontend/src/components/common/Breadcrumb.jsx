import PropTypes from 'prop-types'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="breadcrumb">
      {items.map((item, i) => (
        <span key={item.id || i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {item.onClick ? (
            <button className="breadcrumb-link" onClick={item.onClick}>
              {item.name}
            </button>
          ) : (
            <span className="breadcrumb-current">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

Breadcrumb.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string.isRequired,
      onClick: PropTypes.func,
    })
  ),
}
