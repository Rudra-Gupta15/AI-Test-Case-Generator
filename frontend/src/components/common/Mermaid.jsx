import { useState, useRef, useEffect } from 'react'
import mermaid from 'mermaid'

// Initialize Mermaid outside the component with a premium monochrome style
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#f4f4f5',
    primaryTextColor: '#111113',
    lineColor: '#a1a1aa',
    secondaryColor: '#ffffff',
    tertiaryColor: '#ffffff',
    nodeBorder: '#e4e4e7',
    mainBkg: '#f4f4f5',
  },
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    padding: 12
  }
})

let uniqueIdCounter = 0;

export default function Mermaid({ chart }) {
  const containerRef = useRef(null)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!chart) return

    const renderChart = async () => {
      try {
        setError(null)
        const id = `mermaid-${++uniqueIdCounter}`
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        setSvg(renderedSvg)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError(err)
      }
    }

    renderChart()
  }, [chart])

  useEffect(() => {
    if (svg && containerRef.current) {
      const svgEl = containerRef.current.querySelector('svg')
      if (svgEl) {
        const viewBox = svgEl.getAttribute('viewBox')
        if (viewBox) {
          const parts = viewBox.split(' ')
          if (parts.length === 4) {
            const width = parseFloat(parts[2])
            // Set the SVG width to its native viewBox width to prevent shrinking
            svgEl.style.width = `${width}px`
            svgEl.style.maxWidth = 'none'
            svgEl.style.height = 'auto'
          }
        }
      }
    }
  }, [svg])

  if (error) {
    return <pre style={{ fontSize: '12px', color: '#ef4444' }}>Error rendering flow diagram</pre>
  }

  return (
    <div
      className="mermaid-chart-container"
      dangerouslySetInnerHTML={{ __html: svg }}
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}
    />
  )
}
