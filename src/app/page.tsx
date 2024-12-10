'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import { useSpring, useSprings, animated } from '@react-spring/web'
import BigNumber from 'bignumber.js'

const height = 500 // 游戏高度
const groundLevel = 480 // 地面高度
const gravity = 0.5 // 重力大小
const map = new Map()

export default function Home() {
  const [blocks, setBlocks] = useState<any[]>([])
  const [player, setPlayer] = useState({ x: 200, y: groundLevel, velocityY: 0, lives: 3, score: 0 })
  const [gameOver, setGameOver] = useState(false)
  const [mapIndex, setMapIndex] = useState(0)
  const animationFrameId = useRef(0) // 用于保存动画帧的ID

  const provider = new ethers.WebSocketProvider(`wss://mainnet.infura.io/ws/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`)

  // 动画：玩家位置
  const playerSpringX = useSpring({
    x: player.x,
    config: { mass: 1, tension: 300, friction: 20 }
  })

  const playerSpringY = useSpring({
    y: player.y,
    config: { mass: 1, tension: 300, friction: 20 }
  })

  useEffect(() => {
    provider.on('pending', async txHash => {
      map.set(txHash, false)
    })

    return () => {
      provider.removeAllListeners()
    }
  }, [])

  useEffect(() => {
    const intervalID = window.setInterval(async () => {
      const maps = Object.keys(map)
      const id = maps[mapIndex]
      const tx = await provider.getTransaction(id)

      if (tx) {
        map.set(id, true)
        setMapIndex(index => index + 1)
        const size = Math.min(50, new BigNumber(tx.gasLimit.toString()).div(10000).toNumber()) // Size based on gasLimit
        const speed = Math.min(5, new BigNumber(tx.value.toString(16)).div(1e18).toNumber()) // Speed based on value
        const color = tx.to ? '#ff6666' : '#66ff66' // Color based on type
        const newBlock = {
          id,
          x: Math.random() * 400,
          y: 0,
          size,
          speed: speed || 1,
          color
        }
        setBlocks(prev => [...prev, newBlock])
      }
    }, 300)
    return window.clearInterval(intervalID)
  }, [])

  // 使用 useSprings 处理方块动画
  const [springs, api] = useSprings(blocks.length, index => ({
    from: { y: 0 },
    to: { y: height },
    config: { mass: 1, tension: blocks[index]?.speed * 50 || 300, friction: 20 },
    onRest: () => {
      if (blocks[index]?.y >= height) {
        setBlocks(prev => prev.filter((_, i) => i !== index))
      }
    }
  }))

  // 每当方块列表更新时，刷新动画
  useEffect(() => {
    api.start(index => ({
      from: { y: blocks[index]?.y || 0 },
      to: { y: height }
    }))
  }, [blocks, api])

  // 游戏循环：处理玩家的垂直运动
  useEffect(() => {
    const gameLoop = () => {
      setPlayer(prev => {
        let newY = prev.y + prev.velocityY
        let newVelocityY = prev.velocityY + gravity

        // 检测是否落到地面
        if (newY >= groundLevel) {
          newY = groundLevel // 停在地面
          newVelocityY = 0 // 停止垂直运动
        }

        return { ...prev, y: newY, velocityY: newVelocityY }
      })

      if (!gameOver) {
        // 在下一帧继续执行
        animationFrameId.current = requestAnimationFrame(gameLoop)
      }
    }

    // 启动游戏循环
    animationFrameId.current = requestAnimationFrame(gameLoop)

    return () => cancelAnimationFrame(animationFrameId.current)
  }, [gameOver])

  // 处理玩家移动和重力
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return
      setPlayer(prev => {
        let newX = prev.x
        let newY = prev.y
        if (e.key === 'ArrowLeft') newX -= 20
        if (e.key === 'ArrowRight') newX += 20
        if (e.key === ' ') newY -= 50 // Jump
        return { ...prev, x: Math.max(0, Math.min(380, newX)), y: Math.max(0, newY) }
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameOver])

  // 更新游戏状态
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameOver) return

      // 检查碰撞
      setBlocks(prevBlocks => {
        const collisions = prevBlocks.filter(
          block => block.x < player.x + 20 && block.x + block.size > player.x && block.y < player.y + 20 && block.y + block.size > player.y
        )

        if (collisions.length > 0) {
          setPlayer(prev => ({ ...prev, lives: prev.lives - 1 }))
        }

        return prevBlocks
      })

      // 更新分数
      setPlayer(prev => ({ ...prev, score: prev.score + 1 }))

      // 检查游戏结束条件
      if (player.lives <= 0) {
        setGameOver(true)
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [player, gravity, gameOver])

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: 400,
          height,
          border: '1px solid black',
          backgroundColor: '#fafafa',
          overflow: 'hidden'
        }}
      >
        {/* 玩家 */}
        <animated.div
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            backgroundColor: '#333',
            borderRadius: '50%',
            left: playerSpringX.x.to(x => `${x}px`),
            top: `${player.y}px` // 玩家y轴直接使用状态
          }}
        />

        {/* 方块 */}
        {springs.map((spring, index) => (
          <animated.div
            key={blocks[index]?.id}
            style={{
              position: 'absolute',
              width: blocks[index]?.size || 20,
              height: blocks[index]?.size || 20,
              backgroundColor: blocks[index]?.color || '#ccc',
              left: blocks[index]?.x || 0,
              transform: spring.y.to(y => `translateY(${y}px)`)
            }}
          />
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Score: {player.score}</h3>
        <h3>Lives: {player.lives}</h3>
      </div>
      {gameOver && <h2>Game Over! Your score: {player.score}</h2>}
    </div>
  )
}
