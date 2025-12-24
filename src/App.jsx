import { useState, useEffect } from 'react'
import Wheel from './components/Wheel'
import confetti from 'canvas-confetti'
import './App.css'

function App() {
  const [mode, setMode] = useState('play') // 'play' or 'edit'
  const [title, setTitle] = useState('Ho ho ho 2025')
  const [values, setValues] = useState(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  const [availableValues, setAvailableValues] = useState([])
  const [showPopup, setShowPopup] = useState(false)
  const [selectedValue, setSelectedValue] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    const storedTitle = localStorage.getItem('wheelTitle')
    const storedValues = localStorage.getItem('wheelValues')
    const storedAvailable = localStorage.getItem('availableValues')

    if (storedTitle) setTitle(storedTitle)
    if (storedValues) {
      const parsed = JSON.parse(storedValues)
      setValues(parsed)
      setAvailableValues(storedAvailable ? JSON.parse(storedAvailable) : [...parsed])
    } else {
      setAvailableValues([...values])
    }
  }, [])

  const handleSpinStart = () => {
    // Optional: play sound or dim lights
  }

  const handleSpinEnd = (winnerIndex) => {
    // Get the actual value that was selected
    const selectedVal = availableValues[winnerIndex]
    
    // Show popup with the selected value
    setSelectedValue(selectedVal)
    setShowPopup(true)

    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6347', '#00BFFF', '#32CD32', '#FF69B4']
    })

    // Remove the value from available values after a short delay
    setTimeout(() => {
      const newAvailable = availableValues.filter((_, idx) => idx !== winnerIndex)
      setAvailableValues(newAvailable)
      localStorage.setItem('availableValues', JSON.stringify(newAvailable))
    }, 100)
  }

  const handleSaveEdit = () => {
    // Save to localStorage
    localStorage.setItem('wheelTitle', title)
    localStorage.setItem('wheelValues', JSON.stringify(values))
    localStorage.setItem('availableValues', JSON.stringify(values))
    
    // Reset available values to all values
    setAvailableValues([...values])
    
    // Switch to play mode
    setMode('play')
  }

  const handleValuesChange = (e) => {
    const text = e.target.value
    const lines = text.split('\n').filter(line => line.trim() !== '')
    setValues(lines)
  }

  const closePopup = () => {
    setShowPopup(false)
  }

  return (
    <div className="App">
      <div className="border-lights">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="light" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <div className="game-container">
        <button className="mode-toggle" onClick={() => setMode(mode === 'play' ? 'edit' : 'play')}>
          {mode === 'play' ? '✏️ Edit' : '▶️ Play'}
        </button>

        {mode === 'play' ? (
          <>
            <h1>{title}</h1>
            {availableValues.length > 0 ? (
              <div className="wheel-wrapper">
                <div className="pointer-arrow">▼</div>
                <Wheel
                  values={availableValues}
                  onSpinStart={handleSpinStart}
                  onSpinEnd={handleSpinEnd}
                />
              </div>
            ) : (
              <div className="no-values">
                <p>All values have been selected!</p>
                <button onClick={() => {
                  setAvailableValues([...values])
                  localStorage.setItem('availableValues', JSON.stringify(values))
                }}>
                  Reset Wheel
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="edit-mode">
            <h2>Edit Wheel</h2>
            <div className="edit-field">
              <label htmlFor="title-input">Title:</label>
              <input
                id="title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
              />
            </div>
            <div className="edit-field">
              <label htmlFor="values-input">Values (one per line):</label>
              <textarea
                id="values-input"
                value={values.join('\n')}
                onChange={handleValuesChange}
                placeholder="Enter values, one per line..."
                rows={10}
              />
            </div>
            <button className="save-button" onClick={handleSaveEdit}>
              Save & Play
            </button>
          </div>
        )}
      </div>

      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <h2>🎉 Selected!</h2>
            <p className="selected-value">{selectedValue}</p>
            <button onClick={closePopup}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
