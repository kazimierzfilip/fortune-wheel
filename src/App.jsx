import { useState, useEffect } from 'react'
import Wheel from './components/Wheel'
import confetti from 'canvas-confetti'
import './App.css'

function App() {
  const [size, setSize] = useState(10)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sizeParam = params.get('size')
    if (sizeParam) {
      const parsed = parseInt(sizeParam, 10)
      if (!isNaN(parsed) && parsed > 0) {
        setSize(parsed)
      }
    }
  }, [])

  const handleSpinStart = () => {
    // Optional: play sound or dim lights
  }

  const handleSpinEnd = () => {
    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6347', '#00BFFF', '#32CD32', '#FF69B4']
    })
  }

  return (
    <div className="App">
      <div className="border-lights">
        {/* Lights will be generated via CSS/JS or just repeated elements */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="light" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>

      <div className="game-container">
        <h1>Ho ho ho 2025</h1>
        <div className="wheel-wrapper">
          <div className="pointer-arrow">▼</div>
          <Wheel
            segments={size}
            onSpinStart={handleSpinStart}
            onSpinEnd={handleSpinEnd}
          />
        </div>
      </div>
    </div>
  )
}

export default App
