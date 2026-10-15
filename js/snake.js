const canvas = document.querySelector("#game-board");
const context = canvas.getContext("2d");
const scoreLabel = document.querySelector("#score");
const boardFrame = document.querySelector("#board-frame");
const help = document.querySelector("#game-help");
const gameOverMessage = document.querySelector("#game-over");
const errorMessage = document.querySelector("#error-message");

const START_GLITCH_MS = 15_000;

const CELL_SIZE = 20;
const CELLS_PER_SIDE = canvas.width / CELL_SIZE;
const STEP_MS = 125;
const GLITCH_VALUES = [undefined, NaN, null];
const GLITCH_EXCEPTIONS = [
    new TypeError("Cannot read properties of undefined"),
    new RangeError("Maximum call stack size exceeded"),
    new ReferenceError("state is not defined"),
    new SyntaxError("Unexpected token '<'")
];
const SOUND_EFFECTS = {
    turn: new Audio("./assets/audio/snake-turn.mp3"),
    eat: new Audio("./assets/audio/snake-eat.mp3"),
    crash: new Audio("./assets/audio/snake-crash.mp3")
};
SOUND_EFFECTS.turn.volume = 0.10;
SOUND_EFFECTS.eat.volume = 0.3;

let snake;
let direction;
let nextDirection;
let food;
let score;
let gameRunning;
let gameStartedAt;
let lastStepAt;
let glitchStarted = false;
let noiseAudio;
let lastNoiseFrameAt = 0;
let noiseCanvas;
let noiseContext;

const NOISE_PIXEL_SIZE = 18;
const NOISE_REFRESH_MS = 100;

function resetGame() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = direction;
    score = 0;
    scoreLabel.textContent = score;
    gameRunning = true;
    gameStartedAt = performance.now();
    lastStepAt = gameStartedAt;
    gameOverMessage.hidden = true;
    errorMessage.hidden = true;
    boardFrame.classList.remove("is-distorted");
    help.textContent = "방향키 또는 WASD로 이동 · 먹이를 먹고 오래 버티세요";
    placeFood();
    draw();
}

function placeFood() {
    do {
        food = {
            x: Math.floor(Math.random() * CELLS_PER_SIDE),
            y: Math.floor(Math.random() * CELLS_PER_SIDE)
        };
    } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
}

function draw() {
    context.fillStyle = "#101010";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 색을 더하지 않고도 칸을 구분할 수 있도록 희미한 격자를 그립니다.
    context.strokeStyle = "#1b1b1b";
    context.lineWidth = 1;
    for (let cell = 0; cell <= CELLS_PER_SIDE; cell += 1) {
        const position = cell * CELL_SIZE + 0.5;
        context.beginPath();
        context.moveTo(position, 0);
        context.lineTo(position, canvas.height);
        context.moveTo(0, position);
        context.lineTo(canvas.width, position);
        context.stroke();
    }

    context.fillStyle = "#aaa";
    context.fillRect(food.x * CELL_SIZE + 5, food.y * CELL_SIZE + 5, 10, 10);

    snake.forEach((segment, index) => {
        context.fillStyle = index === 0 ? "#fff" : "#c8c8c8";
        context.fillRect(
            segment.x * CELL_SIZE + 1,
            segment.y * CELL_SIZE + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
        );
    });
}

function endGame() {
    gameRunning = false;
    playSound("crash");
    gameOverMessage.hidden = false;
    help.textContent = "";
}

function step() {
    direction = nextDirection;
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    const hitsWall = head.x < 0 || head.y < 0 || head.x >= CELLS_PER_SIDE || head.y >= CELLS_PER_SIDE;
    const hitsSnake = snake.some((segment) => segment.x === head.x && segment.y === head.y);
    if (hitsWall || hitsSnake) {
        endGame();
        return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        scoreLabel.textContent = score;
        playSound("eat");
        placeFood();
    } else {
        snake.pop();
    }
    draw();
}

function startTimedError() {
    if (glitchStarted) return;
    glitchStarted = true;
    gameRunning = false;
    help.textContent = "";
    boardFrame.classList.add("is-distorted");

    window.setTimeout(() => {
        errorMessage.hidden = false;
    }, 3000);
}

function frame(now) {
    if (gameRunning && now - lastStepAt >= STEP_MS) {
        lastStepAt = now;
        step();
    }

    if (gameRunning && !glitchStarted && now - gameStartedAt >= START_GLITCH_MS) {
        startTimedError();
    }

    window.requestAnimationFrame(frame);
}

function setDirection(x, y) {
    if (!gameRunning) return;
    // 뱀이 즉시 자기 몸에 부딪히지 않도록 정반대 방향 입력은 무시합니다.
    if (x + direction.x === 0 && y + direction.y === 0) return;
    if (x === nextDirection.x && y === nextDirection.y) return;
    nextDirection = { x, y };
    playSound("turn");
}

function playSound(name) {
    const sound = SOUND_EFFECTS[name];
    sound.currentTime = 0;
    const playback = sound.play();
    if (playback) playback.catch(() => {});
}

function startWhiteNoise() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    noiseAudio = new AudioContextClass();
    const buffer = noiseAudio.createBuffer(1, noiseAudio.sampleRate * 2, noiseAudio.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
    }

    const source = noiseAudio.createBufferSource();
    const volume = noiseAudio.createGain();
    source.buffer = buffer;
    source.loop = true;
    volume.gain.value = 0.08;
    source.connect(volume);
    volume.connect(noiseAudio.destination);
    source.start();
}

function printGlitchToConsole() {
    if (Math.random() < 0.3) {
        const reportUrl = new URL("./report.html", window.location.href).href;
        
        console.error(
            `%cDOM이 오염되었습니다.\n이 오류에 대해 더 자세히 알아보기: ${reportUrl}`,
            "font-size: 18px; font-weight: bold; line-height: 1.6;"
        );
        return;
    }

    const values = Math.random() < 0.35 ? GLITCH_EXCEPTIONS : GLITCH_VALUES;
    const value = values[Math.floor(Math.random() * values.length)];
    console.error(value);
}

function resizeNoiseCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    noiseCanvas.width = Math.ceil(window.innerWidth * pixelRatio);
    noiseCanvas.height = Math.ceil(window.innerHeight * pixelRatio);
}

function paintRandomPixelNoise() {
    const pixelRatio = window.devicePixelRatio || 1;
    const pixelSize = NOISE_PIXEL_SIZE * pixelRatio;
    const columns = Math.ceil(noiseCanvas.width / pixelSize);
    const rows = Math.ceil(noiseCanvas.height / pixelSize);

    noiseContext.clearRect(0, 0, noiseCanvas.width, noiseCanvas.height);
    for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
            // 각 블록의 색을 따로 무작위로 골라 화면을 가로지르는 패턴을 만들지 않습니다.
            const hue = Math.floor(Math.random() * 360);
            const saturation = 65 + Math.floor(Math.random() * 36);
            const lightness = 28 + Math.floor(Math.random() * 43);
            noiseContext.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;
            noiseContext.fillRect(column * pixelSize, row * pixelSize, pixelSize, pixelSize);
        }
    }
}

function animatePixelNoise(now) {
    if (now - lastNoiseFrameAt >= NOISE_REFRESH_MS) {
        lastNoiseFrameAt = now;
        paintRandomPixelNoise();
    }
    window.requestAnimationFrame(animatePixelNoise);
}

function enterGlitchMode() {
    if (document.body.classList.contains("glitch-screen")) return;
    gameRunning = false;
    document.body.classList.add("glitch-screen");
    noiseCanvas = document.createElement("canvas");
    noiseCanvas.id = "glitch-noise";
    noiseCanvas.setAttribute("aria-hidden", "true");
    noiseContext = noiseCanvas.getContext("2d");
    document.body.append(noiseCanvas);
    resizeNoiseCanvas();
    paintRandomPixelNoise();
    window.addEventListener("resize", resizeNoiseCanvas);
    window.requestAnimationFrame(animatePixelNoise);
    startWhiteNoise();
    printGlitchToConsole();
    window.setInterval(printGlitchToConsole, 400);
    if (noiseAudio && noiseAudio.state === "suspended") noiseAudio.resume();
}

document.addEventListener("keydown", (event) => {
    const directions = {
        ArrowUp: [0, -1], KeyW: [0, -1],
        ArrowDown: [0, 1], KeyS: [0, 1],
        ArrowLeft: [-1, 0], KeyA: [-1, 0],
        ArrowRight: [1, 0], KeyD: [1, 0]
    };

    if (event.code === "F12") {
        // 브라우저 개발자 도구가 열리도록 F12의 기본 동작은 그대로 둡니다.
        enterGlitchMode();
        return;
    }

    if (event.code === "KeyR" && !gameRunning && !glitchStarted) {
        resetGame();
        return;
    }

    if (directions[event.code]) {
        event.preventDefault();
        setDirection(...directions[event.code]);
    }
});

resetGame();
window.requestAnimationFrame(frame);
