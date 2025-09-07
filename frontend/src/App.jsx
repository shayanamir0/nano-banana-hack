

import { useState, useRef, useCallback, useEffect } from 'react'
import { Tldraw, AssetRecordType } from 'tldraw'
import ModeSelector from './components/ModeSelector'
import 'tldraw/tldraw.css'


function App() {
  const [mode, setMode] = useState('website') // 'website' or 'logo'
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [isRefinementMode, setIsRefinementMode] = useState(false)
  const editorRef = useRef(null)

  // Logo mode inputs
  const [logoInputs, setLogoInputs] = useState({
    purpose: '', // what's the logo for
    font: '',
    colorScheme: '',
    additionalDetails: ''
  })

  // Website mode inputs
  const [websiteInputs, setWebsiteInputs] = useState({
    purpose: '', // what's it for
    colorScheme: '',
    backgroundType: '',
    cameraAngle: '' ,
    additionalDetails: ''
  })

  // Refinement input
  const [refinementInput, setRefinementInput] = useState('')

  // Reset refinement mode when switching modes
  useEffect(() => {
    setIsRefinementMode(false)
    setGeneratedImage(null)
    setStatusMessage('')
    setRefinementInput('')
  }, [mode])

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor
    
    // Register custom external content handler for base64 images
    editor.registerExternalContentHandler('url', (info) => {
      const { url, point } = info
      
      // Check if this is a base64 image data URL
      if (url && url.startsWith('data:image/')) {
        // Create asset and image shape for base64 data
        const assetId = AssetRecordType.createId()
        const imageWidth = 400
        const imageHeight = 300
        
        // Create the asset first
        editor.createAssets([
          {
            id: assetId,
            type: 'image',
            typeName: 'asset',
            props: {
              name: `generated-${mode}-${Date.now()}.png`,
              src: url, // Use the base64 data URL directly
              w: imageWidth,
              h: imageHeight,
              mimeType: 'image/png',
              isAnimated: false,
            },
            meta: {},
          },
        ])
        
        // Create the image shape at the drop point
        editor.createShape({
          type: 'image',
          x: point.x - imageWidth / 2,
          y: point.y - imageHeight / 2,
          props: {
            assetId,
            w: imageWidth,
            h: imageHeight,
          },
        })
        
        console.log('Successfully created image shape from base64 data')
        return // Prevent default handling
      }
    })
    
    console.log('Editor mounted with custom content handler')
  }, [mode])

  const buildPrompt = useCallback(() => {
    if (isRefinementMode) {
      return `Based on the previous generated design/image, refine it according to the
       new sketches and annotations drawn over it. Replace the markings, and edit with new elements as desired. 
       ${refinementInput ? `Desired edit: ${refinementInput}` : ''}
       Focus on the areas where changes are indicated.`
    }

    // Build detailed prompt based on mode and inputs
    if (mode === 'logo') {
      const { purpose, font, colorScheme, additionalDetails } = logoInputs
      
      let prompt = `Create a professional logo design. `
      
      if (purpose) {
        prompt += `This logo is for: ${purpose}. `
      }
      
      if (colorScheme) {
        prompt += `Use a ${colorScheme} color scheme. `
      }
      
      if (font) {
        prompt += `Typography style: ${font}. `
      }
      
      // Add quality and style modifiers based on the guide
      prompt += `Make it clean, scalable, and brand-ready. Use high-quality vector-style 
      design with precise lines and professional composition. `
      
      if (additionalDetails) {
        prompt += `Additional requirements: ${additionalDetails}. `
      }
      
      // Add technical specifications for better output
      prompt += `Ensure the logo has good contrast, and follows modern logo design principles.`
      
      return prompt
    } else {
      // Website mode
      const { purpose, colorScheme, backgroundType, cameraAngle, additionalDetails } = websiteInputs
      
      let prompt = `Create a high-quality and professional product photoshoot of the product in the image. `
      
      if (purpose) {
        prompt += `The product photo is for: ${purpose}. `
      }
      
      if (backgroundType) {
        prompt += `The Background and Setting should be: ${backgroundType}. `
      }
      
      if (colorScheme) {
        prompt += `Use a ${colorScheme} color scheme. `
      }
      
      if (cameraAngle) {
        prompt += `Camera Angle should be: ${cameraAngle}. `
      }
      
      // Add quality and technical specifications
      prompt += `It should be with proper lighting and composition,
      and modern design elements. Include realistic content placeholders and maintain 
      good visual hierarchy.`
      
      if (additionalDetails) {
        prompt += `Additional requirements: ${additionalDetails}. `
      }
      
      // // Add technical UI/UX best practices
      // prompt += `Ensure the design follows modern design principles,
      // and includes appropriate composition and lighting.`
      
      return prompt
    }
  }, [mode, logoInputs, websiteInputs, isRefinementMode, refinementInput])

  const handleGenerate = async () => {
    if (!editorRef.current) return
    
    setIsGenerating(true)
    
    try {
      const shapes = editorRef.current.getCurrentPageShapes()
      
      if (shapes.length === 0) {
        alert('Please draw something on the canvas first!')
        setIsGenerating(false)
        return
      }

      // setStatusMessage(`${isRefinementMode ? 'Refining' : 'Generating'} ${mode}...`)
      
      const result = await editorRef.current.toImage(shapes, {
        format: 'png',
        background: true,
        scale: 1
      })

      const base64 = await blobToBase64(result.blob)
      const promptText = buildPrompt()
      
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          mode: mode,
          customPrompt: promptText,
          isRefinement: isRefinementMode
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate design')
      }

      const backendResult = await response.json()
      
      if (backendResult.success) {
        setGeneratedImage(backendResult.imageBase64)
        // setStatusMessage('Design generated successfully!')
        setIsRefinementMode(true)
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        throw new Error(backendResult.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error generating design:', error)
      setStatusMessage(`Error: ${error.message}`)
      setTimeout(() => setStatusMessage(''), 5000)
    } finally {
      setIsGenerating(false)
    }
  }

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleDownload = () => {
    if (!generatedImage) {
      alert('No generated image to download!')
      return
    }

    try {
      const byteCharacters = atob(generatedImage)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/png' })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${mode}-design-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Error downloading image')
    }
  }

  const handleClear = () => {
    if (!editorRef.current) return
    const allShapeIds = [...editorRef.current.getCurrentPageShapeIds()]
    if (allShapeIds.length > 0) {
      editorRef.current.deleteShapes(allShapeIds)
    }
    setGeneratedImage(null)
    setStatusMessage('')
    setIsRefinementMode(false)
    setRefinementInput('')
    // Reset all inputs
    setLogoInputs({
      purpose: '',
      font: '',
      colorScheme: '',
      additionalDetails: ''
    })
    setWebsiteInputs({
      purpose: '',
      colorScheme: '',
      backgroundType: '',
      cameraAngle: '',
      additionalDetails: ''
    })
  }

  const handleDragStart = (e) => {
    if (!generatedImage) return
    
    const imageDataUrl = `data:image/png;base64,${generatedImage}`
    
    e.dataTransfer.setData('text/uri-list', imageDataUrl)
    e.dataTransfer.setData('text/plain', imageDataUrl)
    e.dataTransfer.setData('application/x-tldraw-image', imageDataUrl)
    e.dataTransfer.effectAllowed = 'copy'
    
    e.target.style.opacity = '0.7'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Blueprint.ai</h1>
        <p>Just draw a sketch, go stretch, and see your brand come to life!</p>
      </header>
      
      <main className="app-main">
        <div className="app-layout">
          <div className="sidebar">
            <ModeSelector mode={mode} setMode={setMode} />
            
            <div className="sidebar-content">
              {!isRefinementMode ? (
                // Initial Generation Inputs
                <div className="input-section">
                  {mode === 'logo' ? (
                    <>
                      <div className="input-group">
                        <label className="input-label">What's the logo for?</label>
                        <input
                          type="text"
                          placeholder="e.g., tech startup, coffee shop, consulting firm..."
                          value={logoInputs.purpose}
                          onChange={(e) => setLogoInputs(prev => ({ ...prev, purpose: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Font/Typography Style</label>
                        <input
                          type="text"
                          placeholder="e.g., modern sans-serif, elegant script, bold..."
                          value={logoInputs.font}
                          onChange={(e) => setLogoInputs(prev => ({ ...prev, font: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Color Scheme</label>
                        <input
                          type="text"
                          placeholder="e.g., blue and white, warm earth tones, monochrome..."
                          value={logoInputs.colorScheme}
                          onChange={(e) => setLogoInputs(prev => ({ ...prev, colorScheme: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Additional Details</label>
                        <textarea
                          placeholder="Any other specific requirements..."
                          value={logoInputs.additionalDetails}
                          onChange={(e) => setLogoInputs(prev => ({ ...prev, additionalDetails: e.target.value }))}
                          className="input-textarea"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="input-group">
                        <label className="input-label">What's the product photo for?</label>
                        <input
                          type="text"
                          placeholder="e.g., t-shirt for merch, coffee bag for store etc."
                          value={websiteInputs.purpose}
                          onChange={(e) => setWebsiteInputs(prev => ({ ...prev, purpose: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Color Scheme</label>
                        <input
                          type="text"
                          placeholder="e.g., blue and white, dark theme..."
                          value={websiteInputs.colorScheme}
                          onChange={(e) => setWebsiteInputs(prev => ({ ...prev, colorScheme: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Background/Setting</label>
                        <input
                          type="text"
                          placeholder="e.g., kitchen slab, modern, creative..."
                          value={websiteInputs.backgroundType}
                          onChange={(e) => setWebsiteInputs(prev => ({ ...prev, backgroundType: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Camera Angle</label>
                        <input
                          type="text"
                          placeholder="e.g., wide-angle, close-up shot, side view..."
                          value={websiteInputs.cameraAngle}
                          onChange={(e) => setWebsiteInputs(prev => ({ ...prev, cameraAngle: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Additional Details</label>
                        <textarea
                          placeholder="Any other specific requirements..."
                          value={websiteInputs.additionalDetails}
                          onChange={(e) => setWebsiteInputs(prev => ({ ...prev, additionalDetails: e.target.value }))}
                          className="input-textarea"
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // Refinement Mode Input
                <div className="input-section">
                  <div className="input-group">
                    <label className="input-label">Describe your desired edit</label>
                    <textarea
                      placeholder="Describe what you want to change, add, or improve..."
                      value={refinementInput}
                      onChange={(e) => setRefinementInput(e.target.value)}
                      className="input-textarea"
                      rows={4}
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="generate-btn"
              >
                {isGenerating ? 'Cooking...' : `Generate ${mode === 'website' ? 'Product Image' : 'Logo'}`}
              </button>

              {statusMessage && (
                <div className="status-message">
                  {statusMessage}
                </div>
              )}

              {isRefinementMode && (
                <div className="refinement-mode-indicator">
                  <span>Want to refine it ?</span>
                  <p>Drag the generated image to canvas, draw your changes, then generate again</p>
                </div>
              )}

              {generatedImage && (
                <div className="generated-image-section">
                  <h3>Generated {mode === 'website' ? 'Product Image' : 'Logo'}</h3>
                  <div className="image-container">
                    <img
                      src={`data:image/png;base64,${generatedImage}`}
                      alt={`Generated ${mode}`}
                      className="generated-image"
                      draggable="true"
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      title="Drag this image to the canvas to refine it"
                    />
                    <button 
                      onClick={handleDownload}
                      className="download-icon-btn"
                      title="Download Image"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7,10 12,15 17,10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={handleClear}
                className="clear-btn"
              >
                Clear Canvas
              </button>
            </div>
          </div>
          
          <div className="canvas-area">
            <Tldraw onMount={handleEditorMount} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App