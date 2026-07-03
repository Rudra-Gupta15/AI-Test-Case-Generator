/**
 * Breadcrumb — renders Project > Module > Feature chain
 * Props:
 *   items: Array<{ id, name, onClick? }>
 */
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
