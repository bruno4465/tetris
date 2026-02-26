/**
 * Tetris Fusion - Core Engine
 * 
 * Logic based on matrix manipulation for rotations and collisions.
 * Uses requestAnimationFrame for smooth 60fps rendering.
 */

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

context.scale(20, 20);
nextContext.scale(20, 20);

// Game State
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    level: 1,
    lines: 0,
    next: null,
};

const arena = createMatrix(12, 20);

// Colors for pieces with neon feel
const colors = [
    null,
    '#00f2ff', // I - Cyan
    '#ff00ff', // T - Magenta
    '#ff9900', // L - Orange
    '#0066ff', // J - Blue
    '#ffff00', // O - Yellow
    '#33ff00', // S - Green
    '#ff0000', // Z - Red
];

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'I') {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'O') {
        return [
            [5, 5],
            [5, 5],
        ];
    } else if (type === 'Z') {
        return [
            [8, 8, 0],
            [0, 8, 8],
            [0, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 7, 7],
            [7, 7, 0],
            [0, 0, 0],
        ];
    } else if (type === 'T') {
        return [
            [0, 2, 0],
            [2, 2, 2],
            [0, 0, 0],
        ];
    }
}

function draw() {
    // Canvas background
    context.fillStyle = '#050510';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
}

function drawNext() {
    nextContext.fillStyle = '#050510';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Center the next piece in its small canvas
    drawMatrix(player.next, { x: 1, y: 1 }, nextContext);
}

function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Outer glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = colors[value];

                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                // Inner block detail
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        player.lines += 1;
        rowCount *= 2;

        // Level up every 10 lines
        if (player.lines % 10 === 0) {
            player.level++;
            dropInterval = Math.max(100, 1000 - (player.level - 1) * 100);
        }
    }
    updateScore();
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (player.next === null) {
        player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
        player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    } else {
        player.matrix = player.next;
        player.next = createPiece(pieces[pieces.length * Math.random() | 0]);
    }

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
        (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        saveHighScore();
        player.score = 0;
        player.level = 1;
        player.lines = 0;
        dropInterval = 1000;
        showOverlay('GAME OVER');
        isPaused = true;
    }
    drawNext();
}

function updateScore() {
    document.getElementById('score').innerText = player.score.toString().padStart(6, '0');
    document.getElementById('level').innerText = player.level;
    document.getElementById('lines').innerText = player.lines;
}

function saveHighScore() {
    const currentHigh = localStorage.getItem('tetrisHighScore') || 0;
    if (player.score > currentHigh) {
        localStorage.setItem('tetrisHighScore', player.score);
    }
    updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
    const high = localStorage.getItem('tetrisHighScore') || 0;
    document.getElementById('high-score').innerText = high.toString().padStart(6, '0');
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = true;

function update(time = 0) {
    if (isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

// UI & Controls
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const overlayText = document.getElementById('overlay-text');

function showOverlay(text) {
    overlayText.innerText = text;
    startBtn.innerText = text === 'GAME OVER' ? 'RECOMEÇAR' : 'RETOMAR';
    overlay.classList.remove('hidden');
}

function hideOverlay() {
    overlay.classList.add('hidden');
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        showOverlay('PAUSADO');
    } else {
        hideOverlay();
        lastTime = performance.now();
        update();
    }
}

// Initial Call
updateHighScoreDisplay();
playerReset();
updateScore();
draw();
showOverlay('TETRIS FUSION');
startBtn.innerText = 'COMEÇAR';

// Event Listeners
startBtn.addEventListener('click', () => {
    isPaused = false;
    hideOverlay();
    lastTime = performance.now();
    update();
});

document.addEventListener('keydown', event => {
    if (isPaused && event.keyCode !== 80) return;

    if (event.keyCode === 37) { // Left
        playerMove(-1);
    } else if (event.keyCode === 39) { // Right
        playerMove(1);
    } else if (event.keyCode === 40) { // Down
        playerDrop();
    } else if (event.keyCode === 81) { // Q (Rotate Left)
        playerRotate(-1);
    } else if (event.keyCode === 87 || event.keyCode === 38) { // W or Up (Rotate Right)
        playerRotate(1);
    } else if (event.keyCode === 32) { // Space (Hard drop)
        while (!collide(arena, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    } else if (event.keyCode === 80) { // P (Pause)
        togglePause();
    }
});

// Mobile Controls
document.getElementById('btn-left').addEventListener('click', () => playerMove(-1));
document.getElementById('btn-right').addEventListener('click', () => playerMove(1));
document.getElementById('btn-up').addEventListener('click', () => playerRotate(1));
document.getElementById('btn-down').addEventListener('click', () => playerDrop());
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-drop').addEventListener('click', () => {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
});
