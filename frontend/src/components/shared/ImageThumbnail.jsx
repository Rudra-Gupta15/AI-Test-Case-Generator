import React from 'react';
export default function ImageThumbnail({ file }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!src) return <div className="image-thumbnail-placeholder" />

  return <img src={src} alt={file.name} className="image-thumbnail-src" />
}

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

