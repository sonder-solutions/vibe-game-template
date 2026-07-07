import { EngineFactory } from '../src/core/engine/EngineFactory.js';
import { GameLoop } from '../src/core/engine/GameLoop.js';
import { ScoreDisplay } from '../src/ui/ScoreDisplay.js';
import { SubmitButton } from '../src/ui/SubmitButton.js';
import { ShareCard } from '../src/ui/ShareCard.js';
import { ScoreSubmission } from '../src/submission/ScoreSubmission.js';
import { FallbackEngine } from '../src/core/engine/FallbackEngine.js';
import { SpatialHashGrid } from '../src/core/engine/SpatialHashGrid.js';
import { Sprite } from '../src/core/engine/types.js';
import { InputManager } from '../src/modules/input/index.js';
import { CommunicationManager } from '../src/modules/security/CommunicationManager.js';
import { MobileProtection } from '../src/modules/mobile/MobileProtection.js';

// Register custom elements
customElements.define('score-display', ScoreDisplay);
customElements.define('submit-button', SubmitButton);
customElements.define('share-card', ShareCard);

let playerName = 'Player1';
let gameState: 'waiting' | 'playing' | 'ended' = 'waiting';
let timeLeft = 60;
let timerInterval: number | null = null;
let sessionUUID: string;

// Generate or retrieve session UUID
function getSessionUUID(): string {
  let uuid = localStorage.getItem('gameSessionUUID');
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem('gameSessionUUID', uuid);
  }
  return uuid;
}

sessionUUID = getSessionUUID();

// Show name modal on page load
const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
const nameModalStartBtn = document.getElementById('startGameBtn');

nameModalStartBtn?.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (name) {
    playerName = name;
  }
  nameModal?.classList.add('hidden');
  initializeGame();
});

// Allow pressing Enter to start
playerNameInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    nameModalStartBtn?.click();
  }
});

// Focus the input when modal appears
playerNameInput?.focus();

async function initializeGame() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

  // Create security service for dependency injection
  const security = new CommunicationManager();

  const engine = await EngineFactory.createEngine(
    canvas,
    { backgroundColor: { r: 0, g: 0, b: 0, a: 1 } }, // Black background for demo
    security
  );

  // Enable mobile protection
  const protection = new MobileProtection({
    target: canvas,
    preventPullToRefresh: true,
    preventDoubleTapZoom: true,
    preventPinchZoom: true,
    preventContextMenu: true
  });
  protection.enable();

  const gameLoop = new GameLoop();
  const spatialGrid = new SpatialHashGrid(50);

  const scoreDisplay = document.querySelector('score-display') as ScoreDisplay;
  const submitButton = document.querySelector('submit-button') as SubmitButton;
  const shareCard = document.querySelector('share-card') as ShareCard;

  // Add player sprite
  engine.addSprite({
    id: 'player',
    position: { x: 400, y: 300 },
    velocity: { x: 0, y: 0 },
    width: 32,
    height: 32,
    color: '#00ff00'
  });

  // Add obstacles/roadblocks
  const obstacles: Sprite[] = [
    {
      id: 'obstacle_0',
      position: { x: 150, y: 150 },
      velocity: { x: 0, y: 0 },
      width: 80,
      height: 20,
      color: '#888888'
    },
    {
      id: 'obstacle_1',
      position: { x: 500, y: 200 },
      velocity: { x: 0, y: 0 },
      width: 20,
      height: 100,
      color: '#888888'
    },
    {
      id: 'obstacle_2',
      position: { x: 300, y: 400 },
      velocity: { x: 0, y: 0 },
      width: 120,
      height: 20,
      color: '#888888'
    },
    {
      id: 'obstacle_3',
      position: { x: 600, y: 450 },
      velocity: { x: 0, y: 0 },
      width: 20,
      height: 80,
      color: '#888888'
    },
    {
      id: 'obstacle_4',
      position: { x: 200, y: 300 },
      velocity: { x: 0, y: 0 },
      width: 60,
      height: 60,
      color: '#888888'
    }
  ];

  for (const obstacle of obstacles) {
    engine.addSprite(obstacle);
    spatialGrid.add(obstacle);
  }

  // Collision detection helper
  function checkCollision(sprite1: any, sprite2: any): boolean {
    return (
      sprite1.position.x < sprite2.position.x + sprite2.width &&
      sprite1.position.x + sprite1.width > sprite2.position.x &&
      sprite1.position.y < sprite2.position.y + sprite2.height &&
      sprite1.position.y + sprite1.height > sprite2.position.y
    );
  }

  // Check if a position overlaps with any obstacle
  function overlapsWithObstacle(x: number, y: number, width: number, height: number): boolean {
    const testSprite = { position: { x, y }, width, height };
    return obstacles.some(obstacle => checkCollision(testSprite, obstacle));
  }

  // Find a valid spawn position that doesn't overlap with obstacles
  function findValidSpawnPosition(spriteWidth: number, spriteHeight: number): { x: number; y: number } {
    const maxAttempts = 100;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = Math.random() * (canvas.width - spriteWidth);
      const y = Math.random() * (canvas.height - spriteHeight);

      if (!overlapsWithObstacle(x, y, spriteWidth, spriteHeight)) {
        return { x, y };
      }
    }
    // Fallback to a default position if no valid position found
    return { x: canvas.width / 2, y: canvas.height / 2 };
  }

  // Add collectible targets
  const numTargets = 5;
  for (let i = 0; i < numTargets; i++) {
    const pos = findValidSpawnPosition(24, 24);
    const target = {
      id: `target_${i}`,
      position: pos,
      velocity: { x: 0, y: 0 },
      width: 24,
      height: 24,
      color: '#ff0000'
    };
    engine.addSprite(target);
    spatialGrid.add(target);
  }

  // Input handling
  const input = new InputManager();
  const playerSpeed = 200;

  // Score tracking
  let score = 0;

  // Timer display
  const timerDisplay = document.getElementById('timerDisplay');
  const startCountdownBtn = document.getElementById('startCountdownBtn');
  const endGameModal = document.getElementById('endGameModal');
  const finalScoreDisplay = document.getElementById('finalScore');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');
  const modalShareBtn = document.getElementById('modalShareBtn');

  // Start countdown button handler
  startCountdownBtn?.addEventListener('click', () => {
    if (gameState === 'waiting') {
      gameState = 'playing';
      startCountdownBtn.style.display = 'none';

      // Start countdown
      timerInterval = window.setInterval(() => {
        timeLeft--;
        if (timerDisplay) {
          timerDisplay.textContent = timeLeft.toString();
        }

        if (timeLeft <= 0) {
          // End game
          gameState = 'ended';
          if (timerInterval) {
            clearInterval(timerInterval);
          }

          // Show end game modal with final score
          if (endGameModal && finalScoreDisplay) {
            finalScoreDisplay.textContent = score.toString();
            endGameModal.classList.remove('hidden');
          }

          // Update share card with final score
          shareCard.setData({
            score: score,
            time: 60
          });
        }
      }, 1000);
    }
  });

  // Collision detection helper
  function checkCollision(sprite1: any, sprite2: any): boolean {
    return (
      sprite1.position.x < sprite2.position.x + sprite2.width &&
      sprite1.position.x + sprite1.width > sprite2.position.x &&
      sprite1.position.y < sprite2.position.y + sprite2.height &&
      sprite1.position.y + sprite1.height > sprite2.position.y
    );
  }

  // Respawn target at random position (avoiding obstacles)
  function respawnTarget(targetId: string) {
    const target = (engine as FallbackEngine).getSprite(targetId);
    if (target) {
      const pos = findValidSpawnPosition(target.width, target.height);
      target.position.x = pos.x;
      target.position.y = pos.y;
    }
  }

  // Handle submit button in modal
  let isSubmitting = false;
  modalSubmitBtn?.addEventListener('click', async () => {
    if (isSubmitting) return;

    isSubmitting = true;
    if (modalSubmitBtn) {
      modalSubmitBtn.textContent = 'Submitting...';
      modalSubmitBtn.style.opacity = '0.5';
      modalSubmitBtn.style.cursor = 'not-allowed';
    }

    console.log('Submit requested');

    const submission = new ScoreSubmission(security);
    await submission.initialize();

    const state = engine.getState();
    const issueBody = submission.formatForIssue({
      score: score,
      time: 60,
      name: playerName,
      uuid: sessionUUID
    });

    console.log('Submitting score:', { score: score, time: 60, uuid: sessionUUID });

    // Create GitHub issue directly via API
    const GITHUB_TOKEN = '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';
    const REPO_OWNER = 'sonder-solutions';
    const REPO_NAME = 'vibe-game-test';

    try {
      const response = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Score Submission: ${score} points`,
            body: issueBody,
          }),
        }
      );

      if (response.ok) {
        const issue = await response.json();
        console.log('Score submitted successfully!', issue);

        if (modalSubmitBtn) {
          modalSubmitBtn.textContent = 'Submitted';
          modalSubmitBtn.style.opacity = '0.5';
        }

        alert(`Score submitted! Issue #${issue.number} created.`);
      } else {
        const error = await response.text();
        console.error('Failed to submit score:', error);

        if (modalSubmitBtn) {
          modalSubmitBtn.textContent = 'Submit Score';
          modalSubmitBtn.style.opacity = '1';
          modalSubmitBtn.style.cursor = 'pointer';
          isSubmitting = false;
        }

        alert('Failed to submit score. Check console for details.');
      }
    } catch (error) {
      console.error('Error submitting score:', error);

      if (modalSubmitBtn) {
        modalSubmitBtn.textContent = 'Submit Score';
        modalSubmitBtn.style.opacity = '1';
        modalSubmitBtn.style.cursor = 'pointer';
        isSubmitting = false;
      }

      alert('Error submitting score.');
    }
  });

  // Configure share card with image generation
  shareCard.setConfig({
    title: 'My Awesome Game',
    fields: [
      { type: 'score', label: 'Score', show: true },
      { type: 'time', label: 'Time', show: true }
    ],
    shareText: 'I scored {score} points!',
    image: {
      width: 800,
      height: 600,
      background: {
        type: 'gradient',
        value: 'linear(135deg, #667eea, #764ba2)'
      },
      layout: {
        type: 'vertical',
        padding: 40,
        spacing: 20,
        sections: [
          { type: 'title' },
          { type: 'stat', field: 'score' },
          { type: 'stat', field: 'time' },
          { type: 'spacer' },
          { type: 'character', size: { width: 150, height: 150 } }
        ]
      },
      character: {
        renderType: 'sprite',
        sprite: {
          id: 'player',
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          width: 150,
          height: 150,
          color: '#00ff00'
        }
      }
    }
  });

  shareCard.setData({
    score: 100,
    time: 60
  });

  // Handle share button in modal
  modalShareBtn?.addEventListener('click', () => {
    shareCard.setData({
      score: score,
      time: 60
    });
    shareCard.share();
  });

  // Start game loop
  gameLoop.start(
    (deltaTime) => {
      // Update input state
      input.update();

      // Update player velocity based on input (only when playing)
      const player = (engine as FallbackEngine).getSprite('player');
      let oldX = 0;
      let oldY = 0;

      if (player) {
        oldX = player.position.x;
        oldY = player.position.y;

        // Only allow movement when game is playing
        if (gameState === 'playing') {
          // Get input magnitudes (0-1) from any input source
          const moveLeft = input.getMagnitude('left');
          const moveRight = input.getMagnitude('right');
          const moveUp = input.getMagnitude('up');
          const moveDown = input.getMagnitude('down');

          // Calculate velocity with magnitude (joystick-style movement)
          player.velocity.x = (moveRight - moveLeft) * playerSpeed;
          player.velocity.y = (moveDown - moveUp) * playerSpeed;
        } else {
          // Stop player movement when not playing
          player.velocity.x = 0;
          player.velocity.y = 0;
        }
      }

      // Update engine
      engine.update(deltaTime);

      // Check collisions with targets (only when playing)
      if (player && gameState === 'playing') {
        for (let i = 0; i < numTargets; i++) {
          const target = (engine as FallbackEngine).getSprite(`target_${i}`);
          if (target && checkCollision(player, target)) {
            score += 10;
            engine.setState({ score });
            scoreDisplay.setScore(score);
            respawnTarget(`target_${i}`);
          }
        }

        // Check collisions with obstacles - block movement
        for (const obstacle of obstacles) {
          if (checkCollision(player, obstacle)) {
            // Revert player position to before the collision
            player.position.x = oldX;
            player.position.y = oldY;
            break;
          }
        }
      }

      // Keep player in bounds
      if (player) {
        player.position.x = Math.max(0, Math.min(canvas.width - player.width, player.position.x));
        player.position.y = Math.max(0, Math.min(canvas.height - player.height, player.position.y));
      }
    },
    () => engine.render()
  );
}
