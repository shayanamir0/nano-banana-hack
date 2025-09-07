function ModeSelector({ mode, setMode }) {
    return (
      <div className="mode-selector">
        <label htmlFor="mode-select">Design Mode:</label>
        <select 
          id="mode-select"
          value={mode} 
          onChange={(e) => setMode(e.target.value)}
          className="mode-dropdown"
        >
          <option value="website">Product</option>
          <option value="logo">Logo</option>
        </select>
      </div>
    )
  }
  
  export default ModeSelector