import { useState, useEffect } from 'react'

export function ImageThumbnail({ file }) {
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

export default function FilePreviewer({ file }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!file) return

    const type = file.name.split('.').pop().toLowerCase()

    if (['txt', 'md', 'json', 'csv'].includes(type)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setContent(e.target.result)
        setLoading(false)
      }
      reader.onerror = () => {
        setError('Failed to read file')
        setLoading(false)
      }
      reader.readAsText(file)
    } else if (type === 'pdf') {
      const url = URL.createObjectURL(file)
      setContent(url)
      setLoading(false)
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(type)) {
      const url = URL.createObjectURL(file)
      setContent(url)
      setLoading(false)
    } else if (['docx', 'doc'].includes(type)) {
      const formData = new FormData()
      formData.append('file', file)

      fetch('/api/preview', {
        method: 'POST',
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to extract text from Word document')
          return res.json()
        })
        .then((data) => {
          setContent(data.text)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    } else {
      setError('Unsupported file type for preview')
      setLoading(false)
    }
  }, [file])

  if (loading) return <div className="preview-loading">Reading document...</div>
  if (error) return <div className="preview-error">{error}</div>

  const type = file.name.split('.').pop().toLowerCase()

  if (['txt', 'md', 'json', 'csv', 'docx', 'doc'].includes(type)) {
    return <pre className="preview-text-content">{content}</pre>
  }

  if (type === 'pdf') {
    return (
      <iframe
        src={content}
        title="PDF Preview"
        width="100%"
        height="100%"
        style={{ border: 'none' }}
      />
    )
  }

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(type)) {
    return (
      <div className="preview-image-container">
        <img src={content} alt={file.name} className="preview-image-element" />
      </div>
    )
  }

  return null
}
