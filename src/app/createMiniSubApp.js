import * as Blockly from "blockly/core";
import { createCommandRequest, sendMiniSubCommand } from "../api/miniSubClient.js";
import { registerMiniSubCommandBlocks, getPayloadForBlock } from "../blockly/blocks/commands.js";
import { getCommandByBlockType } from "../blockly/commands.js";
import { createToolbox } from "../blockly/toolbox/index.js";
import { createTraceStore } from "../executor/traceStore.js";
import { renderTracePanel } from "./renderTrace.js";

import { executeCommandPlan, pauseExecution, stopExecution } from "../executor/executor.js"; 
import { generateCommandPlan } from "../blockly/blocks/commands.js";
import { initSubmarineSimulator } from "../simulator/submarineSimulator.js";
import { MISSIONS } from "../simulator/missionsData.js"; 

import htmlTemplate from "./miniSubTemplate.html?raw";

export function createMiniSubApp(root) {
  
  root.innerHTML = htmlTemplate;
    
  registerMiniSubCommandBlocks(); 

  // Elements from screen
  const blocklyHost = root.querySelector("#blocklyWorkspace"); 
  const traceEntries = root.querySelector("#traceEntries");

  const startButton = root.querySelector("#startButton"); 
  const pauseButton = root.querySelector("#pauseButton");
  const stepButton = root.querySelector("#stepButton");
  const stopButton = root.querySelector("#stopButton");
  const openSimButton = root.querySelector("#openSimButton");

  const runSelectedButton = root.querySelector("#runSelectedButton");
  const clearTraceButton = root.querySelector("#clearTraceButton");
  const clearWorkspaceButton = root.querySelector("#clearWorkspaceButton");
  const saveWorkspaceButton = root.querySelector("#saveWorkspaceButton");
  const loadWorkspaceButton = root.querySelector("#loadWorkspaceButton");
  const saveMissionButton = root.querySelector("#saveMissionButton"); 
  const loadMissionButton = root.querySelector("#loadMissionButton");
  const selectionLabel = root.querySelector("#selectionLabel");

  const launchMissionButton = root.querySelector("#launchMissionButton");
  const missionControlModal = root.querySelector("#missionControlModal");
  const exitMissionButton = root.querySelector("#exitMissionButton");
  const modalCanvasContainer = root.querySelector("#modalCanvasContainer");
  const originalCanvasContainer = root.querySelector(".simulator-panel"); 

  // Button inside simulation
  const modalStartButton = root.querySelector("#modalStartButton");
  const modalPauseButton = root.querySelector("#modalPauseButton");
  const modalStepButton = root.querySelector("#modalStepButton");
  const modalStopButton = root.querySelector("#modalStopButton");
  
  const canvas = root.querySelector("#simulatorCanvas");
  const traceStore = createTraceStore((entries) => renderTracePanel(traceEntries, entries));
  
  // Starting conditions
  let selectedBlockId = null;
  let isExecuting = false;
  let executionState = "STOPPED";

  const GRID_SIZE = 40; 
  let executionTarget = "SIMULATOR"; 

  const simulator = initSubmarineSimulator(canvas);

  simulator.registerOnStop(() => {
    executionState = "STOPPED";
    isExecuting = false;
    stopExecution();
  });

  simulator.registerOnUIUpdate((activeCommand) => { 
    updateRunningBlockLabel(activeCommand); 
  });

  const targetToggle = root.querySelector("#execTargetToggle");
  if (targetToggle) {
    targetToggle.addEventListener("change", (e) => {
      executionTarget = e.target.checked ? "SUBMARINE" : "SIMULATOR";
      console.log("Changed to:", executionTarget);
    });
  }

  renderTracePanel(traceEntries, traceStore.getEntries());

  // How workspace looks and works
  const workspace = Blockly.inject(blocklyHost, {
    toolbox: createToolbox(),
    renderer: "zelos",
    trashcan: true,
    zoom: { 
      controls: true, 
      wheel: true, 
      startScale: 1.2, 
      maxScale: 3.0, 
      minScale: 0.4, 
      scaleSpeed: 1.2 
    },
    move: { scrollbars: true, drag: true, wheel: true }
  });

  try {
    const savedState = localStorage.getItem("minisub_blocks");
    if (savedState) {
      Blockly.serialization.workspaces.load(JSON.parse(savedState), workspace);
    }
  } catch (error) {
    console.error("Not able to load saved block", error);
  }

  workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.SELECTED) {
      selectedBlockId = event.newElementId;
    }
    updateSelectionState();
  });

  blocklyHost.addEventListener("dblclick", () => {
    executeSelectedBlock();
  });

  // Reports executions and fails
  function getExecutorCallbacks() {
    const callbacks = {
      onCommandStart: async (payload, index) => {
        console.log("Blockly sent this command:", payload.command, payload);

        if (executionTarget === "SIMULATOR") {
          simulator.setActiveBlockPayload(payload);
        }

        if (executionTarget === "SIMULATOR") {
          const seconds = payload.duration_seconds ?? payload.durationSeconds ?? payload.DURATION ?? 1;
          const powerPct = Math.abs(payload.motor_power_pct || 100);
          const moveDistance = seconds * GRID_SIZE;
          
          const maxSpeed = 5; 
          const calculatedSpeed = maxSpeed * (powerPct / 100) || 2;

          if (payload.command === "move_forward" || payload.command === "minisub_move_forward") {
            simulator.moveForward(moveDistance, calculatedSpeed);
          } else if (payload.command === "move_backward" || payload.command === "minisub_move_backward") {
            simulator.moveBackward(moveDistance, calculatedSpeed);
          } else if (payload.command === "set_depth" || payload.command === "minisub_depth_level") {
            const ballast = typeof payload.ballast_level === 'number' ? payload.ballast_level : 0;
            const pct = ballast / 100;
            simulator.setDepth(pct);
          } else if (payload.command === "light_on" || payload.command === "minisub_light_on") {
            if (simulator.turnLightOn) simulator.turnLightOn();
          } else if (payload.command === "light_off" || payload.command === "minisub_light_off") {
            if (simulator.turnLightOff) simulator.turnLightOff();
          } else if (payload.command === "stop" || payload.command === "minisub_stop") {
            if (simulator.setGameState) simulator.setGameState("PLAYING");
            simulator.stop ? simulator.stop() : simulator.moveForward(0, 0); 
            const duration = payload.duration_seconds || 2;
            await new Promise((resolve) => setTimeout(resolve, duration * 1000));
          }

          // Make the next block wait
          await new Promise((resolve) => {
            const checkArrival = setInterval(() => {
              const state = simulator.getGameState();
              
              const currentX = typeof simulator.getSubX === 'function' ? simulator.getSubX() : 40;
              const targetX = typeof simulator.getTargetX === 'function' ? simulator.getTargetX() : 40;
              const currentY = typeof simulator.getSubY === 'function' ? simulator.getSubY() : 40;
              const targetY = typeof simulator.getTargetY === 'function' ? simulator.getTargetY() : 40;

              if (state === "GAMEOVER" || state === "STOPPED") {
                clearInterval(checkArrival);
                resolve(); 
                return;
              }

              if (state === "SUCCESS") {
                clearInterval(checkArrival);
                resolve();
                return;
              }

              const distanceX = Math.abs(currentX - targetX);
              const distanceY = Math.abs(currentY - targetY);

              if (distanceX < 0.5 && distanceY < 0.5) {
                clearInterval(checkArrival);
                resolve(); 
              }
            }, 50); 
          });
        }
      },
      onCommandSuccess: (payload, result) => {
        traceStore.add({ command: payload.command, generatedJson: payload, request: result.request, response: result.response });
      },
      onCommandError: (payload, error) => {
        const request = createCommandRequest(payload);
        traceStore.add({
          command: payload.command,
          generatedJson: payload,
          request,
          error: { name: error?.name ?? "Error", message: error?.message ?? String(error) }
        });
      },
      onMissionFinished: (isFullyCompleted) => { 
        if (executionTarget === "SIMULATor") {
          simulator.setActiveBlockPayload(null);
        }

        if (isFullyCompleted) {
          executionState = "STOPPED";
          isExecuting = false;
          updateSelectionState();
        } else {
          executionState = "PAUSED";
          updateSelectionState();
        }
      }
    };
    if (executionTarget === "SIMULATOR") {
      callbacks.overrideExecute = async (payload) => {
        return {
          request: { url: "local://simulator", body: JSON.stringify(payload) },
          response: { status: "OK", message: "Simulated success" }
        };
      };
    }
    return callbacks;
  }

  // Simuation and workspace buttons
  startButton.addEventListener("click", async () => {
    if (isExecuting && executionState === "RUNNING") return;

    const commandPlan = generateCommandPlan(workspace);
    if (commandPlan.length === 0) {
      alert("No blocks connected");
      return;
    }

    simulator.reset();
    simulator.startMission(); 

    isExecuting = true;
    executionState = "RUNNING";
    updateSelectionState();

    await executeCommandPlan(commandPlan, getExecutorCallbacks(), "START"); 

    isExecuting = false;
    updateSelectionState();
  });

  pauseButton.addEventListener("click", async () => {
    if (executionState === "RUNNING") {
      executionState = "PAUSED";
      updateSelectionState();
      pauseExecution();
    } else if (executionState === "PAUSED") {
      executionState = "RUNNING";
      updateSelectionState();
      await executeCommandPlan(null, getExecutorCallbacks(), "RESUME");
    }
  });

  stepButton.addEventListener("click", async () => {
    const commandPlan = generateCommandPlan(workspace);
    if (commandPlan.length === 0) {
      alert("No blocks connected");
      return;
    }
    isExecuting = true;
    executionState = "RUNNING";
    updateSelectionState();
    await executeCommandPlan(commandPlan, getExecutorCallbacks(), "STEP");
  });

  stopButton.addEventListener("click", async () => {
    executionState = "STOPPED";
    isExecuting = false;
    
    simulator.reset(); 

    updateSelectionState();
    stopExecution();
  });

  canvas.addEventListener("click", () => {
    if (simulator.getGameState() === "GAMEOVER" || simulator.getGameState() === "SUCCESS") {
      executionState = "STOPPED";
      isExecuting = false;
      stopExecution();
      simulator.reset();
    }
  });

launchMissionButton.addEventListener("click", () => {
    startButton.click();
  });

  // Open sim window
    openSimButton.addEventListener("click", () => {
    missionControlModal.style.display = "flex";
    modalCanvasContainer.appendChild(canvas);
    
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.width = modalCanvasContainer.clientWidth;
    canvas.height = modalCanvasContainer.clientHeight;

    setTimeout(() => {
      if (simulator.resize) simulator.resize();
    }, 100);

    Blockly.svgResize(workspace);
  });

  exitMissionButton.addEventListener("click", () => {
    missionControlModal.style.display = "none";
    
    originalCanvasContainer.appendChild(canvas);

    setTimeout(() => {
      if (simulator.resize) simulator.resize();
    }, 40);
    
    executionState = "STOPPED";
    isExecuting = false;
    simulator.reset();
    updateSelectionState();
  });

  modalStartButton.addEventListener("click", () => startButton.click());
  modalPauseButton.addEventListener("click", () => pauseButton.click());
  modalStepButton.addEventListener("click", () => stepButton.click());
  modalStopButton.addEventListener("click", () => stopButton.click());

  saveWorkspaceButton.addEventListener("click", () => {
    if (workspace.getAllBlocks(false).length === 0) {
      alert("Cannot save empty board");
      return;
    }
    const state = Blockly.serialization.workspaces.save(workspace);
    localStorage.setItem("minisub_blocks", JSON.stringify(state));
    alert("Your blocks have been saved");
  });

  loadWorkspaceButton.addEventListener("click", () => {
    const savedState = localStorage.getItem("minisub_blocks");
    if (!savedState) {
      alert("No blocks to load");
      return;
    }
    if (confirm("Do you want to replace board with saved board?")) {
      workspace.clear();
      Blockly.serialization.workspaces.load(JSON.parse(savedState), workspace);
    }
  });

  clearTraceButton.addEventListener("click", () => {
    traceStore.clear();
  });

  saveMissionButton.addEventListener("click", () => { 
    if (workspace.getAllBlocks(false).length === 0) {
      alert("Cannot save empty mission");
      return;
    }
    let missionName = prompt("Enter a name for your mission", "my-minisub-mission");
    if (missionName == null) return;
    if (missionName === "") missionName = "untitled-mission";

    const state = Blockly.serialization.workspaces.save(workspace);
    const fileContent = JSON.stringify(state, null, 2);
    const blob = new Blob([fileContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${missionName.toLowerCase().replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  loadMissionButton.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const state = JSON.parse(e.target.result);
          if (confirm("Do you want to import saved mission")) {
            workspace.clear();
            Blockly.serialization.workspaces.load(state, workspace);
          }
        } catch (error) {
          alert("Could not load mission");
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  });
 
  clearWorkspaceButton.addEventListener("click", () => {
    if (confirm("Do you want to delete all blocks?")) workspace.clear();
  });

  window.addEventListener("resize", () => {
    Blockly.svgResize(workspace);

    if (simulator.resize) simulator.resize();
  });

  updateSelectionState();

  setTimeout(() => {
    Blockly.svgResize(workspace);
  }, 50);

  // Choose mission
  const missionSelect = root.querySelector("#missionSelect") || document.querySelector("#missionSelect");
  if (missionSelect) {
    missionSelect.addEventListener("change", (e) => {
      const selectedId = e.target.value; 
      const missionData = MISSIONS[selectedId]; 

      if (missionData) {
        simulator.loadMission(missionData); 
      } else {
        console.error("Could not find mission with ID:", selectedId);
      }
    });
  }

  // What state the game is in
  function updateSelectionState() {
    const block = getSelectedCommandBlock();
    runSelectedButton.disabled = !block || isExecuting || executionState !== "STOPPED";

    if (executionState === "RUNNING") {
      startButton.disabled = true;
      pauseButton.disabled = false;
      pauseButton.textContent = "Pause";
      stepButton.disabled = true;
      stopButton.disabled = false;
    } else if (executionState === "PAUSED") {
      startButton.disabled = true;
      pauseButton.disabled = false;
      pauseButton.textContent = "Resume";
      stepButton.disabled = false;
      stopButton.disabled = false;
    } else {
      startButton.disabled = isExecuting;
      pauseButton.disabled = true;
      pauseButton.textContent = "Pause";
      stepButton.disabled = isExecuting;
      stopButton.disabled = true;
    }

    if (modalStartButton) {
      modalStartButton.disabled = startButton.disabled;
      modalPauseButton.disabled = pauseButton.disabled;
      modalPauseButton.textContent = pauseButton.textContent;
      modalStepButton.disabled = stepButton.disabled;
      modalStopButton.disabled = stopButton.disabled;
    }
  }

  function updateRunningBlockLabel(blockName) {
    const smallLabel = root.querySelector("#selectionLabel") || document.querySelector("#selectionLabel");
    const bigLabel = root.querySelector("#modalSelectionLabel") || document.querySelector("#modalSelectionLabel");
    
    const textToShow = blockName ? blockName.toUpperCase().replace("MINISUB_", "") : "No block running";
    
    if (smallLabel) smallLabel.textContent = textToShow;
    if (bigLabel) bigLabel.textContent = textToShow;
  }

  function getSelectedCommandBlock() {
    const selected = Blockly.getSelected?.();
    const isValidBlock = (type) => {
      return getCommandByBlockType(type) || 
             type === "minisub_move_forward" || 
             type === "minisub_move_backward" ||
             type === "minisub_turn_left" ||
             type === "minisub_turn_right" ||
             type === "minisub_depth_level" ||
             type === "minisub_stop";
    };
    if (selected?.workspace === workspace && isValidBlock(selected.type)) {
      return selected;
    }
    const block = selectedBlockId ? workspace.getBlockById(selectedBlockId) : null;
    return block && isValidBlock(block.type) ? block : null;
  }

  // Locate and execute a block
  async function executeSelectedBlock() {
    const block = getSelectedCommandBlock();
    if (!block || isExecuting) return;

    const payload = getPayloadForBlock(block);
    
    const simulatorContainer = root.querySelector("#simulatorContainer") || root.querySelector(".simulator-container");
    const isSimulatorMode = simulatorContainer ? (simulatorContainer.style.display !== "none") : true;

    console.log("Valt block typ:", block.type, "Är simulator:", isSimulatorMode, "Payload:", payload);

    if (isSimulatorMode && typeof simulator !== "undefined") {
      isExecuting = true;
      updateSelectionState();
      
      try {
        if (simulator.getGameState?.() !== "PLAYING") {
          simulator.startMission?.();
        }

        if (block.type === "minisub_move_forward" || payload?.command === "move_forward") {
          const seconds = payload?.duration_seconds || Number(block.getFieldValue("DURATION")) || 1;
          const dist = seconds * GRID_SIZE; 
          
          const power = payload?.motor_power_pct || Number(block.getFieldValue("motor_power_pct")) || 100;
          const speed = Math.max(1, (power / 100) * 4);

          console.log(`Simulator SINGELBLOCK: Framåt i ${seconds}s (${dist}px)`);
          simulator.moveForward(dist, speed);
        } 
        
        else if (block.type === "minisub_move_backward" || payload?.command === "move_backward") {
          const seconds = payload?.duration_seconds || Number(block.getFieldValue("DURATION")) || 1;
          const dist = seconds * GRID_SIZE;
          
          const power = payload?.motor_power_pct || Number(block.getFieldValue("motor_power_pct")) || 100;
          const speed = Math.max(1, (power / 100) * 4);

          console.log(`Simulator SINGELBLOCK: Bakåt i ${seconds}s (${dist}px)`);
          simulator.moveBackward(dist, speed);
        } 
        
        else if (block.type === "minisub_depth_level" || payload?.command === "set_depth") {
          const ballast = payload?.ballast_level !== undefined ? payload.ballast_level : Number(block.getFieldValue("BALLAST")) || 50;
          const pct = ballast / 100;

          console.log(`Simulator SINGELBLOCK: Ändrar djup till ${ballast}%`);
          simulator.setDepth(pct);
        }

        else if (block.type === "minisub_light_on" || payload?.command === "light_on") {
          if (simulator.turnLightOn) simulator.turnLightOn();
        }
        else if (block.type === "minisub_light_off" || payload?.command === "light_off") {
          if (simulator.turnLightOff) simulator.turnLightOff();
        }

      } catch (error) {
        console.error("Simulator singel-block fel:", error);
      } finally { 
        isExecuting = false;
        updateSelectionState();
      }
      
    } else {
      const request = createCommandRequest(payload);
      isExecuting = true;
      updateSelectionState();

      try {
        const result = await sendMiniSubCommand(payload);
        traceStore.add({ command: payload.command, generatedJson: payload, request: result.request, response: result.response });
      } catch (error) {
        traceStore.add({ command: payload.command, generatedJson: payload, request, error: serializeError(error) });
      } finally { 
        isExecuting = false;
        updateSelectionState();
      }
    }
  }
  
  runSelectedButton.onclick = executeSelectedBlock;
}

function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    message: error?.message ?? String(error)
  };
}