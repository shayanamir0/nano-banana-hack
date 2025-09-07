
// import { useRef, useState, useCallback, useEffect } from 'react'
// import { Tldraw } from 'tldraw'
// import 'tldraw/tldraw.css'

// function SketchCanvas({ mode, isGenerating, setIsGenerating }) {
//   const [generatedImage, setGeneratedImage] = useState(null)
//   const [customPrompt, setCustomPrompt] = useState('')
//   const [statusMessage, setStatusMessage] = useState('')
//   const [isRefinementMode, setIsRefinementMode] = useState(false)
//   const [currentGeneratedAssetId, setCurrentGeneratedAssetId] = useState(null)
//   const editorRef = useRef(null)

//   const handleGenerate = useCallback(async () => {
//     if (!editorRef.current) return
    
//     setIsGenerating(true)
    
//     try {
//       // Get all shapes on the current page
//       const shapes = editorRef.current.getCurrentPageShapes()
      
//       if (shapes.length === 0) {
//         alert('Please draw something on the canvas first!')
//         setIsGenerating(false)
//         return
//       }

//       setStatusMessage(`${isRefinementMode ? 'Refining' : 'Generating'} ${mode}...`)
      
//       // Export canvas using the correct toImage API
//       const result = await editorRef.current.toImage(shapes, {
//         format: 'png',
//         background: true,
//         scale: 1
//       })

//       // Convert blob to base64
//       const base64 = await blobToBase64(result.blob)
      
//       // Prepare prompt for refinement vs initial generation
//       let promptText = customPrompt
//       if (isRefinementMode) {
//         promptText = `Based on the previous generated design, please refine it according to the new 
//         sketches and annotations drawn over it. ${customPrompt ? `Additional instructions: ${customPrompt}` : ''}`
//       }
      
//       // Send to backend
//       const response = await fetch('http://localhost:3001/api/generate', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           image: base64,
//           mode: mode,
//           customPrompt: promptText,
//           isRefinement: isRefinementMode
//         }),
//       })

//       if (!response.ok) {
//         throw new Error('Failed to generate design')
//       }

//       const backendResult = await response.json()
      
//       if (backendResult.success) {
//         setGeneratedImage(backendResult.imageBase64)
//         setStatusMessage('Design generated successfully!')
//         setIsRefinementMode(true)
        
//         // Clear status message after 3 seconds
//         setTimeout(() => setStatusMessage(''), 3000)
//       } else {
//         throw new Error(backendResult.error || 'Unknown error')
//       }
//     } catch (error) {
//       console.error('Error generating design:', error)
//       setStatusMessage(`Error: ${error.message}`)
//       setTimeout(() => setStatusMessage(''), 5000)
//     } finally {
//       setIsGenerating(false)
//     }
//   }, [mode, customPrompt, isRefinementMode])

//   const blobToBase64 = (blob) => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader()
//       reader.onload = () => {
//         const base64 = reader.result.split(',')[1]
//         resolve(base64)
//       }
//       reader.onerror = reject
//       reader.readAsDataURL(blob)
//     })
//   }

//   const handleDownload = useCallback(() => {
//     if (!generatedImage) {
//       alert('No generated image to download!')
//       return
//     }

//     try {
//       const byteCharacters = atob(generatedImage)
//       const byteNumbers = new Array(byteCharacters.length)
//       for (let i = 0; i < byteCharacters.length; i++) {
//         byteNumbers[i] = byteCharacters.charCodeAt(i)
//       }
//       const byteArray = new Uint8Array(byteNumbers)
//       const blob = new Blob([byteArray], { type: 'image/png' })
      
//       const url = URL.createObjectURL(blob)
//       const a = document.createElement('a')
//       a.href = url
//       a.download = `${mode}-design-${Date.now()}.png`
//       document.body.appendChild(a)
//       a.click()
//       document.body.removeChild(a)
//       URL.revokeObjectURL(url)
//     } catch (error) {
//       console.error('Error downloading image:', error)
//       alert('Error downloading image')
//     }
//   }, [mode, generatedImage])

//   const handleClear = useCallback(() => {
//     if (!editorRef.current) return
//     const allShapeIds = [...editorRef.current.getCurrentPageShapeIds()]
//     if (allShapeIds.length > 0) {
//       editorRef.current.deleteShapes(allShapeIds)
//     }
//     setGeneratedImage(null)
//     setStatusMessage('')
//     setIsRefinementMode(false)
//     setCurrentGeneratedAssetId(null)
//     setCustomPrompt('')
//   }, [])

//   const handleDragStart = useCallback((e) => {
//     if (!generatedImage) return
    
//     // Set the image data for drag and drop
//     const imageDataUrl = `data:image/png;base64,${generatedImage}`
//     e.dataTransfer.setData('text/uri-list', imageDataUrl)
//     e.dataTransfer.setData('text/plain', imageDataUrl)
//     e.dataTransfer.effectAllowed = 'copy'
//   }, [generatedImage])

//   const onMount = useCallback((editor) => {
//     editorRef.current = editor
//     console.log('Editor mounted successfully')
//   }, [])

//   // Mount TLDraw in the canvas area
//   useEffect(() => {
//     const container = document.getElementById('tldraw-container')
//     if (container && !container.hasChildNodes()) {
//       // This will be handled by the parent component
//     }
//   }, [])

//   return (
//     <>
//       {/* Sidebar Controls */}
//       <div className="sidebar-content">
//         <div className="prompt-section">
//           <label className="prompt-label">
//             {isRefinementMode 
//               ? `Describe changes for your ${mode}:`
//               : `Describe your ${mode === 'website' ? 'website UI' : 'logo'} idea:`
//             }
//           </label>
//           <textarea
//             placeholder={
//               isRefinementMode 
//                 ? `Describe what you want to change or refine...`
//                 : `e.g., modern landing page with blue theme, contact form, hero section...`
//             }
//             value={customPrompt}
//             onChange={(e) => setCustomPrompt(e.target.value)}
//             className="custom-prompt"
//             rows={4}
//           />
//         </div>

//         <button 
//           onClick={handleGenerate} 
//           disabled={isGenerating}
//           className="generate-btn"
//         >
//           {isGenerating ? 'Generating...' : `Generate ${mode === 'website' ? 'Product Image' : 'Logo'}`}
//         </button>

//         {statusMessage && (
//           <div className="status-message">
//             {statusMessage}
//           </div>
//         )}

//         {isRefinementMode && (
//           <div className="refinement-mode-indicator">
//             <span>Refinement Mode Active</span>
//             <p>Drag the generated image to canvas, draw your changes, then generate again</p>
//           </div>
//         )}

//         {/* Generated Image Display */}
//         {generatedImage && (
//           <div className="generated-image-section">
//             <h3>Generated {mode === 'website' ? 'Product Image' : 'Logo'}</h3>
//             <div className="image-container">
//               <img
//                 src={`data:image/png;base64,${generatedImage}`}
//                 alt={`Generated ${mode}`}
//                 className="generated-image"
//                 draggable="true"
//                 onDragStart={handleDragStart}
//                 title="Drag this image to the canvas to refine it"
//               />
//               <button 
//                 onClick={handleDownload}
//                 className="download-icon-btn"
//                 title="Download Image"
//               >
//                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
//                   <polyline points="7,10 12,15 17,10"/>
//                   <line x1="12" y1="15" x2="12" y2="3"/>
//                 </svg>
//               </button>
//             </div>
//           </div>
//         )}

//         <button 
//           onClick={handleClear}
//           className="clear-btn"
//         >
//           Clear Canvas
//         </button>
//       </div>

//       {/* TLDraw Canvas */}
//       <TldrawCanvas onMount={onMount} />
//     </>
//   )
// }

// // Separate component for TLDraw to mount in the right area
// function TldrawCanvas({ onMount }) {
//   useEffect(() => {
//     const container = document.getElementById('tldraw-container')
//     if (container && !container.querySelector('.tldraw-editor')) {
//       // Mount TLDraw
//       const mountTldraw = () => {
//         const root = document.createElement('div')
//         root.style.width = '100%'
//         root.style.height = '100%'
//         container.appendChild(root)
        
//         // This is a simplified approach - in a real implementation,
//         // you'd want to use React portals or a more sophisticated mounting strategy
//       }
//       mountTldraw()
//     }
//   }, [])

//   return (
//     <div style={{ display: 'none' }}>
//       <Tldraw onMount={onMount} />
//     </div>
//   )
// }

// export default SketchCanvas