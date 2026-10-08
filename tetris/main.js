;(function () {
  const T = window.Tetris
  const boardCanvas = document.getElementById('board')
  const nextCanvas = document.getElementById('next')
  const overlay = document.getElementById('overlay')
  const overlayTitle = document.getElementById('overlay-title')
  const overlayText = document.getElementById('overlay-text')
  const overlayScore = document.getElementById('overlay-score')
  const actionBtn = document.getElementById('action-btn')
  const flash = document.getElementById('flash')
  const scoreEl = document.getElementById('score')
  const highEl = document.getElementById('high')
  const linesEl = document.getElementById('lines')
  const levelEl = document.getElementById('level')

  const CELL = 30
  const PREVIEW = 28
  const DAS_DELAY = 160
  const ARR = 40
  const SOFT_MS = 50

  const boardCtx = fitCanvas(boardCanvas, T.COLS * CELL, T.ROWS * CELL)
  const nextCtx = fitCanvas(nextCanvas, 4 * PREVIEW, 4 * PREVIEW)

  const store = T.createScoreStore(window.localStorage)
  const game = T.createGame()
  let highScore = store.read()
  let gravMs = 0
  let dasMs = 0
  let arrMs = 0
  let softMs = 0
  let holdX = 0
  let holdDown = false
  let seenLines = 0
  let seenLevel = 1
  let flashTimer = 0
  const held = { left: false, right: false }

  function fitCanvas(canvas, cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(canvas.width / cssW, 0, 0, canvas.height / cssH, 0, 0)
    return ctx
  }

  function releaseHolds() {
    held.left = false
    held.right = false
    holdDown = false
    holdX = 0
    dasMs = 0
    arrMs = 0
    softMs = 0
  }

  function showFlash(text) {
    flash.hidden = false
    flash.textContent = text
    window.clearTimeout(flashTimer)
    flashTimer = window.setTimeout(() => {
      flash.hidden = true
    }, 700)
  }

  function noteProgress(state) {
    if (state.lines > seenLines) {
      const count = state.lines - seenLines
      const labels = { 1: '单消', 2: '双消', 3: '三消', 4: '俄罗斯方块！' }
      const name = labels[count] || '消除 ' + count + ' 行'
      if (state.level > seenLevel) showFlash(name + ' · 等级 ' + state.level)
      else showFlash(name)
    } else if (state.level > seenLevel && seenLevel > 0) {
      showFlash('等级 ' + state.level)
    }
    seenLines = state.lines
    seenLevel = state.level
  }

  function noteScore(score) {
    if (score > highScore) highScore = store.commit(score)
  }

  function paintCell(ctx, x, y, size, color, ghost) {
    const px = x * size + 1
    const py = y * size + 1
    const extent = size - 2
    ctx.beginPath()
    const radius = 4
    ctx.moveTo(px + radius, py)
    ctx.arcTo(px + extent, py, px + extent, py + extent, radius)
    ctx.arcTo(px + extent, py + extent, px, py + extent, radius)
    ctx.arcTo(px, py + extent, px, py, radius)
    ctx.arcTo(px, py, px + extent, py, radius)
    ctx.closePath()
    if (ghost) {
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1
      return
    }
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(px + 3, py + 3, extent - 6, 3)
  }

  function render(state) {
    boardCtx.clearRect(0, 0, T.COLS * CELL, T.ROWS * CELL)
    boardCtx.fillStyle = '#090b10'
    boardCtx.fillRect(0, 0, T.COLS * CELL, T.ROWS * CELL)
    boardCtx.strokeStyle = 'rgba(255,255,255,0.05)'
    boardCtx.lineWidth = 1
    for (let x = 1; x < T.COLS; x += 1) {
      boardCtx.beginPath()
      boardCtx.moveTo(x * CELL + 0.5, 0)
      boardCtx.lineTo(x * CELL + 0.5, T.ROWS * CELL)
      boardCtx.stroke()
    }
    for (let y = 1; y < T.ROWS; y += 1) {
      boardCtx.beginPath()
      boardCtx.moveTo(0, y * CELL + 0.5)
      boardCtx.lineTo(T.COLS * CELL, y * CELL + 0.5)
      boardCtx.stroke()
    }

    for (let y = 0; y < T.ROWS; y += 1) {
      for (let x = 0; x < T.COLS; x += 1) {
        const type = state.board[y][x]
        if (type) paintCell(boardCtx, x, y, CELL, T.COLORS[type] || '#888', false)
      }
    }

    const occupied = new Set(state.cells.map((cell) => cell.x + ',' + cell.y))
    for (const cell of state.ghostCells) {
      if (cell.y < 0 || occupied.has(cell.x + ',' + cell.y)) continue
      paintCell(boardCtx, cell.x, cell.y, CELL, T.COLORS[state.piece.type], true)
    }
    if (state.piece) {
      for (const cell of state.cells) {
        if (cell.y < 0 || cell.x < 0 || cell.x >= T.COLS) continue
        paintCell(boardCtx, cell.x, cell.y, CELL, T.COLORS[state.piece.type], false)
      }
    }

    nextCtx.clearRect(0, 0, 4 * PREVIEW, 4 * PREVIEW)
    nextCtx.fillStyle = '#090b10'
    nextCtx.fillRect(0, 0, 4 * PREVIEW, 4 * PREVIEW)
    if (state.next) {
      for (const cell of T.previewCells(state.next)) {
        paintCell(nextCtx, cell.x, cell.y, PREVIEW, T.COLORS[state.next], false)
      }
    }
  }

  function syncOverlay(state) {
    if (state.status === 'playing') {
      overlay.hidden = true
      return
    }
    overlay.hidden = false
    overlayScore.hidden = true
    if (state.status === 'ready') {
      overlayTitle.textContent = '准备开始'
      overlayText.textContent = '按任意键或点击按钮开始'
      actionBtn.textContent = '开始游戏'
      return
    }
    if (state.status === 'paused') {
      overlayTitle.textContent = '已暂停'
      overlayText.textContent = '按 P 或按钮继续'
      actionBtn.textContent = '继续游戏'
      return
    }
    overlayTitle.textContent = '游戏结束'
    overlayText.textContent = '按 Enter 或按钮再来一局'
    overlayScore.hidden = false
    overlayScore.textContent = '本局 ' + state.score + ' · 最高 ' + highScore
    actionBtn.textContent = '再来一局'
  }

  function sync() {
    const state = game.getState()
    noteScore(state.score)
    noteProgress(state)
    scoreEl.textContent = String(state.score)
    highEl.textContent = String(highScore)
    linesEl.textContent = String(state.lines)
    levelEl.textContent = String(state.level)
    syncOverlay(state)
    render(state)
  }

  function begin() {
    if (game.getState().status !== 'ready') return
    gravMs = 0
    releaseHolds()
    seenLines = 0
    seenLevel = 1
    game.start()
    actionBtn.blur()
    sync()
  }

  function resumeOrRestart() {
    const status = game.getState().status
    if (status === 'ready') begin()
    else if (status === 'paused') {
      game.togglePause()
      gravMs = 0
      sync()
    } else if (status === 'over') {
      gravMs = 0
      releaseHolds()
      seenLines = 0
      seenLevel = 1
      game.restart()
      actionBtn.blur()
      sync()
    }
  }

  function setHorizontal(direction, down) {
    if (direction < 0) held.left = down
    else held.right = down
    if (game.getState().status !== 'playing') {
      if (!held.left && !held.right) holdX = 0
      return
    }
    if (down) {
      holdX = direction
      dasMs = 0
      arrMs = 0
      game.move(direction)
      sync()
      return
    }
    if (held.left) holdX = -1
    else if (held.right) holdX = 1
    else {
      holdX = 0
      dasMs = 0
      arrMs = 0
    }
  }

  function onKeyDown(event) {
    const key = event.key
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ']
    if (arrows.includes(key)) event.preventDefault()
    if (event.repeat) return

    const status = game.getState().status
    if (status === 'ready') {
      begin()
      return
    }
    if (status === 'over') {
      if (key === 'Enter' || key === ' ') resumeOrRestart()
      return
    }
    if (key === 'p' || key === 'P') {
      game.togglePause()
      gravMs = 0
      sync()
      return
    }
    if (key === 'Enter' && status === 'paused') {
      resumeOrRestart()
      return
    }
    if (game.getState().status !== 'playing') return

    if (key === 'ArrowLeft') setHorizontal(-1, true)
    else if (key === 'ArrowRight') setHorizontal(1, true)
    else if (key === 'ArrowUp') {
      game.rotate(1)
      sync()
    } else if (key === 'ArrowDown') {
      holdDown = true
      softMs = 0
      game.softDrop()
      sync()
    } else if (key === ' ') {
      game.hardDrop()
      sync()
    }
  }

  function onKeyUp(event) {
    if (event.key === 'ArrowLeft') setHorizontal(-1, false)
    else if (event.key === 'ArrowRight') setHorizontal(1, false)
    else if (event.key === 'ArrowDown') {
      holdDown = false
      softMs = 0
    }
  }

  function pressAction(act, down) {
    const status = game.getState().status
    if (status === 'ready' && down) {
      begin()
      if (act === 'pause') return
    }
    if (game.getState().status === 'over') return
    if (act === 'pause') {
      if (down) {
        const now = game.getState().status
        if (now === 'playing' || now === 'paused') {
          game.togglePause()
          gravMs = 0
          sync()
        }
      }
      return
    }
    if (game.getState().status !== 'playing') {
      if (!down && act === 'left') setHorizontal(-1, false)
      if (!down && act === 'right') setHorizontal(1, false)
      if (!down && act === 'soft') holdDown = false
      return
    }
    if (act === 'left') setHorizontal(-1, down)
    else if (act === 'right') setHorizontal(1, down)
    else if (act === 'soft') {
      holdDown = down
      if (down) {
        softMs = 0
        game.softDrop()
        sync()
      }
    } else if (down && act === 'rotate') {
      game.rotate(1)
      sync()
    } else if (down && act === 'hard') {
      game.hardDrop()
      sync()
    }
  }

  actionBtn.addEventListener('click', () => {
    resumeOrRestart()
  })

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', () => {
    releaseHolds()
  })

  for (const button of document.querySelectorAll('.touch button')) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      button.setPointerCapture(event.pointerId)
      pressAction(button.dataset.act, true)
    })
    const release = () => pressAction(button.dataset.act, false)
    button.addEventListener('pointerup', release)
    button.addEventListener('pointercancel', release)
  }

  let last = 0
  function frame(now) {
    const dt = Math.min(last ? now - last : 0, 250)
    last = now
    const state = game.getState()
    if (state.status === 'playing') {
      if (holdX !== 0) {
        dasMs += dt
        if (dasMs >= DAS_DELAY) {
          arrMs += dt
          while (arrMs >= ARR) {
            arrMs -= ARR
            game.move(holdX)
          }
        }
      }
      if (holdDown) {
        softMs += dt
        while (softMs >= SOFT_MS) {
          softMs -= SOFT_MS
          game.softDrop()
        }
      }
      gravMs += dt
      const interval = T.dropInterval(state.level)
      while (gravMs >= interval) {
        gravMs -= interval
        game.gravity()
      }
    }
    sync()
    window.requestAnimationFrame(frame)
  }

  highEl.textContent = String(highScore)
  sync()
  window.requestAnimationFrame(frame)
})()
