import { useRef, useCallback, useEffect } from 'react'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function TldrawCanvas({ onEditorMount }) {
  const editorRef = useRef(null)

  const onMount = useCallback((editor) => {
    editorRef.current = editor
    if (onEditorMount) {
      onEditorMount(editor)
    }
    console.log('TLDraw Editor mounted successfully')
  }, [onEditorMount])

  return <Tldraw onMount={onMount} />
}

export default TldrawCanvas