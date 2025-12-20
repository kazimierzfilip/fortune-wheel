import { useRef, useEffect, useState } from 'react'

export default function Wheel({ segments, unavailableSegments = [], onSpinStart, onSpinEnd }) {
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
        label: i + 1,
        unavailable: unavailableSegments.includes(i)
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

                    // Cleanup rotation to normalized range
                    setRotation(prev => prev % 360)

                    // We need to re-calculate winner here to be sure, or just rely on the effect
                    // The effect below calculates winner when stops.
                    // We pass the winner index to onSpinEnd

                    // Wait a tick for the effect to calculate winner? 
                    // Or calculating it here directly is safer to pass to callback.
                    // Let's calculate it here.
                    let currentRot = (rotation + state.velocity) % 360 // Use latest
                    let angle = (270 - currentRot) % 360
                    if (angle < 0) angle += 360
                    const segmentAngle = 360 / segments
                    const winningIndex = Math.floor(angle / segmentAngle)

                    if (onSpinEnd) onSpinEnd(winningIndex)
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
    }, [isSpinning, onSpinEnd, rotation, segments]) // rotation added dependency might cause re-renders of effect but animate loop handles it

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

            // --- PREDICTION LOGIC ---
            // Calculate where it would land naturally
            // Total Delta Angle = v / (1 - friction) - v (geometric series sum of v*f^n)
            // Actually sum is v + v*f + v*f^2 ... = v / (1 - f)
            const friction = physics.current.friction
            const predictedDelta = physics.current.velocity / (1 - friction)
            const predictedFinalRotation = rotation + predictedDelta

            // Normalize to find angle
            let angle = (270 - predictedFinalRotation) % 360
            while (angle < 0) angle += 360

            const segmentAngle = 360 / segments
            const winningIndex = Math.floor(angle / segmentAngle)

            // Check if unavailable
            if (unavailableSegments.includes(winningIndex)) {
                // Find nearest available segment
                // We prefer adding execution logic here to adjust velocity
                let attempts = 0
                let bestIndex = -1
                let minDist = 1000

                for (let i = 0; i < segments; i++) {
                    if (!unavailableSegments.includes(i)) {
                        // Calc distance from predicted winning angle to this segment's center
                        // Segment center angle
                        const centerAngle = (i * segmentAngle) + (segmentAngle / 2)

                        // Distance in circle
                        let dist = Math.abs(angle - centerAngle)
                        if (dist > 180) dist = 360 - dist

                        if (dist < minDist) {
                            minDist = dist
                            bestIndex = i
                        }
                    }
                }

                if (bestIndex !== -1) {
                    // Calculate required delta to land on bestIndex center
                    // We need (270 - (Rot + Delta)) % 360 = CenterAngle
                    // 270 - Rot - Delta = CenterAngle + 360k
                    // Delta = 270 - Rot - CenterAngle

                    const targetCenterAngle = (bestIndex * segmentAngle) + (segmentAngle / 2)
                    // We want to arrive roughly at this angle.
                    // The current relation is angle = (270 - fw_rot) % 360
                    // So fw_rot needs to be such that its maps to targetCenterAngle.
                    // fw_rot = 270 - targetCenterAngle

                    // We already have current rotation 'rotation'.
                    // We need a total delta.
                    // But we want to maintain direction of spin.
                    // If velocity is positive (clockwise), we want positive delta.

                    let targetFinalRot = 270 - targetCenterAngle

                    // Create a large enough version of targetFinalRot that is close to predictedFinalRotation?
                    // targetFinalRot += 360 * k.

                    // predictedFinalRotation is, say, 5000 degrees.
                    // We want nearest k such that targetFinalRot + k*360 is close to 5000?

                    // But wait, we can just nudge the velocity a bit.
                    // Or we can solve exactly.

                    // Approximate way:
                    // Calculate shift needed.
                    // If current lands on Used, shift by +/- segmentAngle until Safe?
                    // But that might look jerky if we change velocity too much.

                    // Let's stick to solving for v.
                    // predictedDelta = v / (1-f).
                    // We want newDelta such that angle lands on targetCenterAngle.

                    // Current predicted angle is 'angle'.
                    // We want 'targetCenterAngle'.
                    // Difference 'diff' = targetCenterAngle - angle.

                    // Since angle = 270 - Rot, decreasing rotation increases angle.
                    // So if we want angle to increase by diff, we need rotation to decrease by diff.
                    // So Delta needs to decrease by diff.

                    // wait, diff is in degrees [0-360].
                    // Let's handle wrapping.

                    let diff = targetCenterAngle - angle
                    // Normalize diff to [-180, 180] for shortest path correction
                    if (diff > 180) diff -= 360
                    if (diff < -180) diff += 360

                    // We need angle to change by 'diff'.
                    // angle = 270 - (StartRot + Delta)
                    // NewAngle = 270 - (StartRot + NewDelta)
                    // NewAngle - Angle = -(NewDelta - Delta)
                    // diff = -(NewDelta - Delta) = Delta - NewDelta
                    // NewDelta = Delta - diff.

                    const newDelta = predictedDelta - diff

                    // NewVelocity = NewDelta * (1 - f)
                    physics.current.velocity = newDelta * (1 - friction)

                    // Sanity check: if velocity flipped direction, that's bad if user spun hard.
                    // But since we likely only nudge by < 360, and total spin is usually > 1000, it should be fine.
                }
            }

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

    // Calculate winner when stopped logic moved to animate loop mostly,
    // but the effect helps update the visual winner state for the boing effect
    useEffect(() => {
        if (!isSpinning && physics.current.velocity === 0 && rotation !== 0) {
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
                    const isWinner = winner === i

                    return (
                        <g key={i} style={{
                            transformOrigin: '50px 50px',
                            transform: isWinner ? 'scale(1.15)' : 'scale(1)',
                            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // BOING effect
                            zIndex: isWinner ? 10 : 1,
                            filter: seg.unavailable ? 'grayscale(100%) opacity(0.5)' : 'none'
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
                                    transform: `rotate(${midAngle + 90}deg)`,
                                    textDecoration: seg.unavailable ? 'line-through' : 'none'
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
