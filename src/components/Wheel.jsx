import { useRef, useEffect, useState } from 'react'

export default function Wheel({ segments, onSpinStart, onSpinEnd }) {
    const canvasRef = useRef(null)
    const [rotation, setRotation] = useState(0)
    const [isSpinning, setIsSpinning] = useState(false)
    const [winner, setWinner] = useState(null)

    // Physics state (refs to avoid re-renders during animation loop)
    const physics = useRef({
        velocity: 0,
        friction: 0.985,
        lastFrameTime: 0,
        isDragging: false,
        lastTouchY: 0,
        lastTouchTime: 0
    })

    // Generate segment colors
    const segmentData = Array.from({ length: segments }).map((_, i) => ({
        color: `hsl(${(i * 360) / segments}, 70%, 50%)`,
        label: i + 1
    }))

    useEffect(() => {
        let animationFrameId

        const animate = (time) => {
            const state = physics.current

            if (!state.isDragging && state.velocity !== 0) {
                // Apply friction
                state.velocity *= state.friction

                // Apply rotation
                setRotation(prev => {
                    const next = prev + state.velocity
                    return next % 360
                }) // Keep it bounded just for sanity, though CSS rotate handles large numbers

                // Stop condition
                if (Math.abs(state.velocity) < 0.1) {
                    state.velocity = 0
                    setIsSpinning(false)
                    if (onSpinEnd) onSpinEnd()
                }
            }

            if (state.velocity !== 0 || state.isDragging) {
                animationFrameId = requestAnimationFrame(animate)
            } else {
                // Loop stopped
            }
        }

        if (isSpinning) {
            animationFrameId = requestAnimationFrame(animate)
        }

        return () => cancelAnimationFrame(animationFrameId)
    }, [isSpinning, onSpinEnd])

    const handleTouchStart = (e) => {
        if (isSpinning && physics.current.velocity > 1) return // Already spinning fast

        physics.current.isDragging = true
        physics.current.lastTouchY = e.touches[0].clientY
        physics.current.lastTouchTime = Date.now()
        physics.current.velocity = 0
    }

    const handleTouchMove = (e) => {
        if (!physics.current.isDragging) return
        const touchY = e.touches[0].clientY
        const deltaY = touchY - physics.current.lastTouchY
        const now = Date.now()

        // Simple mapping: dragging down -> positive rotation (clockwise)
        // dragging up -> negative rotation (counter-clockwise)
        // We update the rotation instantly for direct manipulation feel
        const rotateDelta = deltaY * 0.5
        setRotation(prev => prev + rotateDelta)

        // Calculate instantaneous velocity for release
        const timeDelta = now - physics.current.lastTouchTime
        if (timeDelta > 0) {
            physics.current.velocity = rotateDelta // Simplified, could divide by time
        }

        physics.current.lastTouchY = touchY
        physics.current.lastTouchTime = now
    }

    const handleTouchEnd = () => {
        if (!physics.current.isDragging) return
        physics.current.isDragging = false

        // Cap velocity
        const maxVelocity = 50
        const minVelocity = 2 // Minimum to trigger a "spin"

        if (Math.abs(physics.current.velocity) > minVelocity) {
            if (physics.current.velocity > maxVelocity) physics.current.velocity = maxVelocity
            if (physics.current.velocity < -maxVelocity) physics.current.velocity = -maxVelocity

            setIsSpinning(true)
            if (onSpinStart) onSpinStart()
        }
    }

    // Mouse support for desktop testing
    const handleMouseDown = (e) => {
        handleTouchStart({ touches: [{ clientY: e.clientY }] })
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }
    const handleMouseMove = (e) => {
        handleTouchMove({ touches: [{ clientY: e.clientY }] })
    }
    const handleMouseUp = () => {
        handleTouchEnd()
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
    }

    // Calculate winner when stopped
    useEffect(() => {
        if (!isSpinning && physics.current.velocity === 0 && rotation !== 0) {
            // Pointer is at Top (270 degrees standard SVG 0 at 3 o'clock)
            // Wheel is rotated by `rotation` degrees
            // We need to find which segment is at 270 relative to the rotated coordinate system
            // Segment Start in World Space = (StartAngle + Rotation) % 360
            // We want StartAngle + Rotation <= 270 <= EndAngle + Rotation
            // Easier: Transform Pointer to Wheel Space
            // PointerWheelAngle = (270 - Rotation) % 360
            // Normalize to [0, 360)

            let angle = (270 - rotation) % 360
            if (angle < 0) angle += 360

            const segmentAngle = 360 / segments
            const winningIndex = Math.floor(angle / segmentAngle)
            setWinner(winningIndex)
        } else {
            if (winner !== null) setWinner(null)
        }
    }, [isSpinning, rotation, segments, winner])



    // SVG Calculation
    const radius = 50
    const center = 50

    return (
        <div
            className="wheel-container"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            style={{ touchAction: 'none' }}
        >
            <svg viewBox="0 0 100 100" style={{ transform: `rotate(${rotation}deg)` }}>
                {segmentData.map((seg, i) => {
                    const angle = 360 / segments
                    const startAngle = i * angle
                    const endAngle = (i + 1) * angle

                    // Segment Path
                    const x1 = center + radius * Math.cos(Math.PI * startAngle / 180)
                    const y1 = center + radius * Math.sin(Math.PI * startAngle / 180)
                    const x2 = center + radius * Math.cos(Math.PI * endAngle / 180)
                    const y2 = center + radius * Math.sin(Math.PI * endAngle / 180)

                    const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`

                    // Text Position (Midpoint radius + 0.6)
                    const midAngle = startAngle + angle / 2
                    const textRadius = radius * 0.55
                    const tx = center + textRadius * Math.cos(Math.PI * midAngle / 180)
                    const ty = center + textRadius * Math.sin(Math.PI * midAngle / 180)

                    // Dynamic transform for the winner
                    // Since individual segments are in a group, we can scale from center
                    const isWinner = winner === i

                    return (
                        <g key={i} style={{
                            transformOrigin: '50px 50px',
                            transform: isWinner ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // BOING effect
                            zIndex: isWinner ? 10 : 1 // SVG doesn't strictly support z-index this way but we rely on scale
                        }}>
                            <path
                                d={d}
                                fill={seg.color}
                                stroke="#fff"
                                strokeWidth="0.5"
                            />
                            <text
                                x={tx}
                                y={ty}
                                fill="#fff"
                                fontSize="8"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{
                                    transformBox: 'fill-box',
                                    transformOrigin: 'center',
                                    transform: `rotate(${midAngle + 90}deg)`, // Rotate text to face center or be readable
                                }}
                            >
                                {seg.label}
                            </text>
                        </g>
                    )
                })}
                {/* Center cap - put at end to be on top */}
                <circle cx="50" cy="50" r="5" fill="#333" stroke="#ffd700" strokeWidth="2" />
            </svg>
        </div>
    )
}
