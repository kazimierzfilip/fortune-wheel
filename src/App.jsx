import { useState, useEffect } from 'react'
import Wheel from './components/Wheel'
import confetti from 'canvas-confetti'
import './App.css'

function App() {
  const [size, setSize] = useState(10)
  const [unavailableSegments, setUnavailableSegments] = useState([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sizeParam = params.get('size')
    const resetParam = params.get('reset')

    if (resetParam === 'true') {
      localStorage.removeItem('unavailableSegments')
      setUnavailableSegments([])
    } else {
      const stored = localStorage.getItem('unavailableSegments')
      if (stored) {
        setUnavailableSegments(JSON.parse(stored))
      }
    }

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

  const handleSpinEnd = (winnerIndex) => {
    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6347', '#00BFFF', '#32CD32', '#FF69B4']
    })

    // Mark segment as unavailable
    if (winnerIndex !== null && winnerIndex !== undefined) {
      const newUnavailable = [...unavailableSegments, winnerIndex]
      setUnavailableSegments(newUnavailable)
      localStorage.setItem('unavailableSegments', JSON.stringify(newUnavailable))
    }
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
            unavailableSegments={unavailableSegments}
            onSpinStart={handleSpinStart}
            onSpinEnd={handleSpinEnd}
          />
        </div>
      </div>
    </div>
  )
}

export default App
