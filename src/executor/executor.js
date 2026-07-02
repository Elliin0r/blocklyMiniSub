import { sendMiniSubCommand } from "../api/miniSubClient.js";

const COMMAND_DURATIONS = {
  move_forward:  400,
  move_backward: 800,
  turn_left:     1200,
  turn_right:    1200,
  set_depth:     1500,
  light_on:      2000,
  light_off:     4000,
  stop:          4000,
};

const INTER_COMMAND_GAP = 1000; 

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// How it starts 
let currentState = {
    commandPlan: [],
    currentIndex: 0,
    status: "STOPPED",
    resolveMission: null
};

// Executes the commmand plan, deciedes what state teh game is in
export async function executeCommandPlan(commandPlan, callbacks, mode = "START") {
    if (mode === "START") {
        currentState.commandPlan = commandPlan;
        currentState.currentIndex = 0;
        currentState.status = "RUNNING";
    }
    else if (mode === "STEP") {
        if (currentState.status === "STOPPED") {
            currentState.commandPlan = commandPlan;
            currentState.currentIndex = 0;
        }
        currentState.status = "STEPPING";
    }
    else if (mode === "RESUME") {
        currentState.status = "RUNNING";
    }

    if (mode === "RESUME" || (mode === "STEP" && currentState.currentIndex > 0)) {
        runLoop(callbacks);
        return;
    }
    return new Promise((resolve) => {
        currentState.resolveMission = resolve;
        runLoop(callbacks);
    });
}

export function pauseExecution() {
    if (currentState.status === "RUNNING") {
        currentState.status = "PAUSED";
    }
}

export function stopExecution() {
    currentState.status = "STOPPED";
    currentState.currentIndex = 0;
    if (currentState.resolveMission) {
        currentState.resolveMission();
    }
}

// Function going through all blocks, reporst back to the interface 
async function runLoop(callbacks) {
    const { onCommandStart, onCommandSuccess, onCommandError, onMissionFinished } = callbacks;

    while (currentState.currentIndex < currentState.commandPlan.length) {
        if (currentState.status === "PAUSED" || currentState.status === "STOPPED") {
            if (currentState.resolveMission && currentState.status === "STOPPED") currentState.resolveMission();
            return;
        }
        const payload = currentState.commandPlan[currentState.currentIndex];

        if (onCommandStart) onCommandStart(payload, currentState.currentIndex);

        try {
            let result;
            if (callbacks && typeof callbacks.overrideExecute === "function") {
                result = await callbacks.overrideExecute(payload);
            } else {
                result = await sendMiniSubCommand(payload);
            }
            if (onCommandSuccess) onCommandSuccess(payload, result);
        } catch (error) {
            if (onCommandError) onCommandError(payload, error);
        }

        let duration;
        if (payload.durationSeconds !== undefined && payload.durationSeconds !== null) {
            duration = payload.durationSeconds * 1000;
        } else if (payload.turnDegrees !== undefined && payload.turnDegrees !== null) {
            const baseDuration = COMMAND_DURATIONS[payload.command] || 1200;
            duration = (baseDuration / 90) * payload.turnDegrees;
        } else {
            duration = COMMAND_DURATIONS[payload.command] || 1000;
        }
        await delay(duration + INTER_COMMAND_GAP);

        currentState.currentIndex++;

        if (currentState.status === "STEPPING") {
            currentState.status = "PAUSED";
            if (onMissionFinished) onMissionFinished(false);
            return;
        }
    }

    currentState.status = "STOPPED";
    currentState.currentIndex = 0;
    if (onMissionFinished) onMissionFinished(true);
    if (currentState.resolveMission) currentState.resolveMission();
}