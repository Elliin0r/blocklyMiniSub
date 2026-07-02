export function initSubmarineSimulator(canvas) {
  let activeBlockPayload = null;

  const ctx = canvas.getContext("2d");

  let commandQueue = [];

  //Start positions
  const VISIBLE_GRID_COLUMNS = 20;
  const skyHeight = 60; 
  const bottomHeight = 35; 

  let subX = 40;
  let subY = 220; 
  let targetX = 40;
  let targetY = 220;
  let speedX = 2;
  let isLightOn = false;

  let cameraX = 0;
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  let goalY = 150;

  // Empty without chosen mission
  let obstacles = [];
  let things = [];
  let buoy = [];
  let plants = [];
  let goalX = 2200;

  // Calls the obstacles 
  function loadMission(missionData) {
    obstacles = JSON.parse(JSON.stringify(missionData.obstacles || []));
    things = JSON.parse(JSON.stringify(missionData.things || []));
    buoy = JSON.parse(JSON.stringify(missionData.buoy || []));
    plants = JSON.parse(JSON.stringify(missionData.plants || []));
    goalX = missionData.goalX || 2200;
    
    resetSimulator(); 
  }
  
  //Starting state
  let gameState = "STOPPED"; 
  let onStopCallback = null;
  let onUIUpdateCallback = null;

function drawSimulator() {
    const viewWidth = canvas.width;
    const viewHeight = canvas.height;

    const currentGridSize = viewWidth / VISIBLE_GRID_COLUMNS;
    const scale = currentGridSize / 40;

    const simMinY = skyHeight;
    const simMaxY = viewHeight - bottomHeight - 22; 
    const groundY = viewHeight - bottomHeight;
    const seaHeight = groundY - simMinY;

    obstacles.forEach(obs => {
      obs.y = simMinY + (seaHeight * obs.depthPct) - ((obs.h * scale) / 2);
      
      if (obs.y < simMinY) obs.y = simMinY;
      if (obs.y + (obs.h * scale) > groundY) obs.y = groundY - (obs.h * scale);
    });

    things.forEach(thing => {
      thing.y = skyHeight; 
    });

    ctx.clearRect(0, 0, viewWidth, viewHeight);
    
    // Sky and Ocean
    ctx.fillStyle = "#e0f2fe"; 
    ctx.fillRect(0, 0, viewWidth, skyHeight);
    ctx.fillStyle = "#0284c7"; 
    ctx.fillRect(0, skyHeight, viewWidth, viewHeight - skyHeight);

    // Update the camera position
    if (gameState === "PLAYING" && (subX * scale) > (300 * scale)) {
      cameraX = (subX * scale) - (300 * scale);
    }
    const maxCameraX = 4500 * scale; 
    cameraX = Math.max(0, Math.min(maxCameraX, cameraX));

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Sand
    const totalLevelWidth = 6000 * scale;
    ctx.fillStyle = "#C2B280"; 
    ctx.fillRect(0, groundY, 20000, bottomHeight);

    // Grid lines 
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < totalLevelWidth; x += currentGridSize) {
      ctx.beginPath(); 
      ctx.moveTo(x, 0); 
      ctx.lineTo(x, viewHeight); 
      ctx.stroke();
    }
    for (let y = 0; y < viewHeight; y += currentGridSize) {
      ctx.beginPath(); 
      ctx.moveTo(0, y); 
      ctx.lineTo(20000, y); 
      ctx.stroke();
    }

    // Obstacles & Sharks
    obstacles.forEach(obs => {
      const obsX = obs.x * scale;
      const obsY = obs.y; 
      const obsW = obs.w * scale;
      const obsH = obs.h * scale;

      if (obs.type === "shark") {
        // Shark
        ctx.fillStyle = "#64748b"; 
        ctx.beginPath();
        ctx.ellipse(obsX + obsW/2, obsY + obsH/2, obsW/2, obsH/3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(obsX, obsY + obsH/2);ctx.lineTo(obsX - (15 * scale), obsY + obsH/2 - (15 * scale));ctx.lineTo(obsX - (15 * scale), obsY + obsH/2 + (15 * scale));
        ctx.closePath();ctx.fill();
        ctx.beginPath();
        ctx.moveTo(obsX + obsW * 0.4, obsY + obsH * 0.2);ctx.lineTo(obsX + obsW * 0.3, obsY - (12 * scale)); 
        ctx.closePath();ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();ctx.arc(obsX + obsW * 0.85, obsY + obsH * 0.4, 2 * scale, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Normal obstacle
        ctx.fillStyle = "#475569"; 
        ctx.fillRect(obsX, obsY, obsW, obsH);
      }
    });

    // Rope from buoys 
    things.forEach(obs => {
      ctx.fillStyle = "#D4D0CD"; 
      ctx.fillRect(obs.x * scale, obs.y, obs.w * scale, obs.h * scale);
    });

    // Orange buoys 
    buoy.forEach(obs => {
      ctx.fillStyle = "#F07C26"; 
      ctx.beginPath();
      const buoyY = skyHeight - (obs.h * scale);
      ctx.moveTo((obs.x + obs.w / 2) * scale, buoyY); 
      ctx.lineTo((obs.x + obs.w) * scale, buoyY + (obs.h * scale)); 
      ctx.lineTo(obs.x * scale, buoyY + (obs.h * scale));
      ctx.closePath();
      ctx.fill();
    });

    // Plants look 
    plants.forEach(plant => {
      ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 4 * scale; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      
      let currentY = groundY; 
      const startX = plant.x * scale;
      const scaledWidth = plant.w * scale;
      const scaledHeight = plant.h * scale;
      
      ctx.moveTo(startX + scaledWidth / 2, currentY);
      
      const segments = 4; 
      const segmentHeight = scaledHeight / segments; 
      const swing = 4 * scale;                      
      
      for (let i = 1; i <= segments; i++) {
        currentY -= segmentHeight;
        let direction = (i % 2 === 0) ? 1 : -1;
        let nextX = (startX + scaledWidth / 2) + (swing * direction);
        if (i === segments) nextX = startX + scaledWidth / 2;
        ctx.lineTo(nextX, currentY);
      }
      ctx.stroke();
    });

    // Start flag
    const flX = 70; 
    const startFlagBottomY = groundY;
    const startFlagTopY = skyHeight + (seaHeight * 0.35); 
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 3 * scale; ctx.beginPath();
    ctx.moveTo((flX + 15) * scale, startFlagBottomY); ctx.lineTo((flX + 15) * scale, startFlagTopY); ctx.stroke();
    ctx.fillStyle = "#22c55e"; ctx.beginPath();
    ctx.moveTo((flX + 15) * scale, startFlagTopY); ctx.lineTo((flX - 5) * scale, startFlagTopY + (8 * scale)); ctx.lineTo((flX + 15) * scale, startFlagTopY + (16 * scale)); 
    ctx.closePath();ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; ctx.font = `bold ${12 * scale}px sans-serif`;
    ctx.fillText("Start", (flX - 2) * scale, startFlagTopY - (8 * scale));

    // Goal flag
    goalY = viewHeight / 2;
    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3 * scale; ctx.beginPath();
    ctx.moveTo((goalX + 15) * scale, goalY + (20 * scale)); ctx.lineTo((goalX + 15) * scale, goalY - (10 * scale)); ctx.stroke();
    ctx.fillStyle = "#ef4444"; ctx.beginPath();
    ctx.moveTo((goalX + 15) * scale, goalY - (10 * scale)); ctx.lineTo((goalX - 2) * scale, goalY - (2 * scale)); ctx.lineTo((goalX + 15) * scale, goalY + (6 * scale)); ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.font = `bold ${11 * scale}px sans-serif`;
    ctx.fillText("Goal", (goalX + 2) * scale, goalY - (15 * scale));

    // Submarine lights
    if (isLightOn) {
      const noseX = (subX + 30) * scale;
      const noseY = subY + (10 * scale);
      ctx.save();
      const beamLength = 220 * scale;
      const gradient = ctx.createLinearGradient(noseX, noseY, noseX + beamLength, noseY);
      gradient.addColorStop(0, "rgba(254, 240, 138, 0.45)"); gradient.addColorStop(1, "rgba(254, 240, 138, 0.0)"); ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(noseX, noseY); ctx.lineTo(noseX + beamLength, noseY - (45 * scale)); ctx.lineTo(noseX + beamLength, noseY + (45 * scale)); 
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    // Submarine 
    ctx.fillStyle = "#fbbf24"; 
    ctx.fillRect(subX * scale, subY, 30 * scale, 20 * scale); 
    ctx.fillRect((subX + 18) * scale, subY - 6 * scale, 6 * scale, 6 * scale);

    ctx.restore();

    // Movement with queue
    if (gameState === "PLAYING") {
      const distanceX = Math.abs(targetX - subX);
      const distanceY = Math.abs(targetY - subY);
      
      const isStill = distanceX < 2 && distanceY < 2;

      let currentSpeed = isStill ? 0 : ((typeof speedX === 'number' && speedX > 0) ? speedX : 2);

      if (isStill && commandQueue.length > 0) {
        const nextCmd = commandQueue.shift(); 

        if (typeof onUIUpdateCallback === 'function') {
          onUIUpdateCallback(nextCmd.type); 
        }
        
        if (nextCmd.type === "FORWARD") {
          targetX = subX + nextCmd.dist;
          speedX = nextCmd.speed;
        } else if (nextCmd.type === "BACKWARD") {
          targetX = subX - nextCmd.dist;
          speedX = nextCmd.speed;
        } else if (nextCmd.type === "DEPTH") {
          targetY = nextCmd.targetY;
        } else if (nextCmd.type == "LIGHT_ON") {
          isLightOn = true;
        } else if (nextCmd.type == "LIGHT_OFF") {
          isLightOn = false;
        } else if (nextCmd.type === "minisub_stop" || nextCmd.type === "STOP") {
          targetX = subX;
          targetY = subY;
        }
      }

      if (subY < targetY) {
        subY += 2; if (subY > targetY) subY = targetY;
      } else if (subY > targetY) {
        subY -= 2; if (subY < targetY) subY = targetY;
      }

      if (Math.abs(targetX - subX) > currentSpeed) {
        subX += targetX > subX ? currentSpeed : -currentSpeed;
      } else {
        subX = targetX;
      }

      if (subY < simMinY) subY = simMinY;
      if (subY > simMaxY) { subY = simMaxY; targetY = simMaxY; }
    }

    // Crash control
    let hitObstacle = false;
    if (gameState === "PLAYING" && subX > 45) {
      
      const subLeft = subX * scale;
      const subRight = (subX + 30) * scale;
      const subTop = subY; 
      const subBottom = subY + (20 * scale);

      [...obstacles, ...things].forEach(obs => {
        const scaledObsX = obs.x * scale;
        const scaledObsW = obs.w * scale;
        const scaledObsH = obs.h * scale;
        const scaledObsY = obs.y; 

        if (
          subLeft < scaledObsX + scaledObsW && 
          subRight > scaledObsX && 
          subTop < scaledObsY + scaledObsH && 
          subBottom > scaledObsY
        ) {
          hitObstacle = true;
        }
      });
      
      // Plant crash
      plants.forEach(plant => {
        const scaledPlantX = plant.x * scale;
        const scaledPlantW = plant.w * scale;
        const scaledPlantH = plant.h * scale;
        const plantY = groundY - scaledPlantH;

        if (
          subLeft < scaledPlantX + scaledPlantW && 
          subRight > scaledPlantX && 
          subBottom > plantY &&
          subTop < groundY 
        ) {
          hitObstacle = true;
        }
      });
    }

    // Ballast Display
    let currentBallastPct = Math.round(((subY - simMinY) / (simMaxY - simMinY)) * 100);
    currentBallastPct = Math.max(0, Math.min(100, currentBallastPct));

    ctx.fillStyle = "rgba(15, 23, 42, 0.6)"; ctx.fillRect(10, skyHeight + 10, 160, 35);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px sans-serif";
    ctx.fillText(`BALLAST LEVEL: ${currentBallastPct}%`, 20, skyHeight + 32);

    // Game Over Panel
    if (hitObstacle || gameState === "GAMEOVER") {
      gameState = "GAMEOVER";
      if (onStopCallback) onStopCallback();

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)"; ctx.fillRect(viewWidth / 2 - 140, viewHeight / 2 - 50, 280, 90);
      ctx.fillStyle = "#ef4444"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Game over!", viewWidth / 2, viewHeight / 2 - 10);
      ctx.fillStyle = "#ffffff"; ctx.font = "14px sans-serif";
      ctx.fillText("Click on screen to restart", viewWidth / 2, viewHeight / 2 + 20);
      ctx.textAlign = "left";
    }

    // Mission success Panel
    if ((gameState === "PLAYING" && Math.abs(subX - goalX) < 15 && Math.abs(subY - goalY) < 25) || gameState === "SUCCESS") {
      gameState = "SUCCESS";
      if (onStopCallback) onStopCallback();
      
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; ctx.fillRect(viewWidth / 2 - 140, viewHeight / 2 - 50, 280, 90);
      ctx.fillStyle = "#4ade80"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Mission success!", viewWidth / 2, viewHeight / 2 - 10);
      ctx.fillStyle = "#ffffff"; ctx.font = "14px sans-serif";
      ctx.fillText("Click on screen to restart", viewWidth / 2, viewHeight / 2 + 20);
      ctx.textAlign = "left";
    }
  } 

  function resize() {
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    const currentHeight = canvas.height || 400;
    
    targetY = skyHeight + (currentHeight - skyHeight - bottomHeight) / 2; 
    subY = targetY; 
  }

  // Scroll with mouse
  canvas.addEventListener("mousedown", (e) => {
    if (gameState !== "PLAYING") {
      isDragging = true;
      startX = e.pageX - canvas.offsetLeft;
      scrollLeft = cameraX;
      canvas.style.cursor = "grabbing";
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - canvas.offsetLeft;
    const walk = (x - startX) * 1.5;
    cameraX = scrollLeft - walk;
  });

  const stopDragging = (e) => {
    if (isDragging) {
      isDragging = false;
      canvas.style.cursor = "default";
      
      const x = e.pageX - canvas.offsetLeft;
      if (Math.abs(x - (startX + canvas.offsetLeft)) < 5) {
        if (gameState === "GAMEOVER" || gameState === "SUCCESS") {
          resetSimulator();
        }
      }
    }
  };

  canvas.addEventListener("mouseup", stopDragging);
  canvas.addEventListener("mouseleave", stopDragging);

  function resetSimulator() {
    activeBlockPayload = null;
    const currentHeight = canvas.height || 400;
    commandQueue = [];

    targetX = 40; 
    targetY = skyHeight + (currentHeight - skyHeight - bottomHeight) / 2; 
    subX = 40; 
    subY = targetY; 
    speedX = 2;
    isLightOn = false;

    cameraX = 0;
    gameState = "STOPPED"; 
    if (onStopCallback) onStopCallback();
    if (onUIUpdateCallback) onUIUpdateCallback("");

  }

  function simulationLoop() {
    drawSimulator();
    requestAnimationFrame(simulationLoop);
  }

  simulationLoop();

  function setActiveBlockPayload(payload) {
    activeBlockPayload = payload;
  }

  return {
    reset: resetSimulator, 
    setActiveBlockPayload, 
    resize,
    loadMission,
    startMission: () => { gameState = "PLAYING"; }, 
    setGameState: (state) => { gameState = state; },
    getGameState: () => gameState,
    
    getSubX: () => subX,
    getSubY: () => subY,
    getTargetX: () => targetX,
    getTargetY: () => targetY,
    
    registerOnStop: (cb) => { onStopCallback = cb; },
    registerOnUIUpdate: (cb) => { onUIUpdateCallback = cb; },
    moveForward: (dist, speed) => { 
      gameState = "PLAYING"; 
      commandQueue.push({ type: "FORWARD", dist, speed }); 
    },
    moveBackward: (dist, speed) => { 
      gameState = "PLAYING"; 
      commandQueue.push({ type: "BACKWARD", dist, speed }); 
    },
    setDepth: (pct) => { 
      gameState = "PLAYING"; 
      const simMinY = skyHeight; 
      const simMaxY = canvas.height - bottomHeight - 22; 
      const calculatedTargetY = simMinY + (simMaxY - simMinY) * pct; 
      commandQueue.push({ type: "DEPTH", targetY: calculatedTargetY }); 
    },
    turnLightOn: () => {
      gameState = "PLAYING";
      commandQueue.push({ type: "LIGHT_ON"});
    },
    turnLightOff: () => {
      gameState = "PLAYING";
      commandQueue.push({ type: "LIGHT_OFF"});
    },
    stop: () => {
      gameState = "PLAYING";
      commandQueue.push({ type: "STOP" }); 
    }
  };
}