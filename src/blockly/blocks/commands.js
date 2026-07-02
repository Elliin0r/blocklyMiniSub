import * as Blockly from "blockly/core";
import { MINI_SUB_COMMANDS, createCommandPayload, getBlockType } from "../commands.js";

export function registerMiniSubCommandBlocks() {
  const defineBlocksWithJsonArray =
  Blockly.common?.defineBlocksWithJsonArray ?? Blockly.defineBlocksWithJsonArray;

  const blocks = [
    {
      type: "minisub_move_forward",
      message0: "move forward for %1 seconds at %2 %% power",
      args0: [
        {
          type: "field_number",
          name: "DURATION",
          value: 1, // Standard value 
          min: 0.1,
          max: 20
        }, 
        {
          type: "field_number",
          name: "motor_power_pct",
          value: 100, 
          min: 0,
          max: 100
        }
      ],
      colour: "#4C97FF",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Move the minisub forward for a specific number of seconds",
      helpUrl:""
    },
    {
      type: "minisub_move_backward",
      message0: "move backward for %1 seconds at %2 %% power",
      args0: [
        {
          type: "field_number",
          name: "DURATION",
          value: 1,
          min: 0.1,
          max: 20
        },
        {
          type: "field_number",
          name: "motor_power_pct",
          value: 100, 
          min: 0,
          max: 100
        }
      ],
      colour: "#4C97FF",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Move the minisub backward for a specific nuber of seconds",
      helpUrl: ""
    },
    
    {
      type: "minisub_depth_level",
      message0: "set depth level to %1 (0-100)",
      args0: [
        {
          type: "field_number",
          name: "BALLAST",
          value: 50,
          min: 0,
          max: 100
        }
      ],
      colour: "#50D6C8",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Set the submarine's target depth level (0 = surface, 100 = bottom)",
      helpUrl: ""
    },

    {
      type: "minisub_turn_left",
      message0: "turn left at %1 degrees for %2 seconds",
      args0: [
        {
          type: "field_number",
          name: "DEGREES",
          value: 45,
          min: 1,
          max: 90
        },
        {
          type: "field_number",
          name: "duration_seconds",
          value: 1,
          min: 0.1,
          max: 15
        }
      ],
      colour: "#E4D00A",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn left a specific number of degrees",
      helpUrl: ""
    },
    {
      type: "minisub_turn_right",
      message0: "turn right at %1 degrees for %2 seconds",
      args0: [
        {
          type: "field_number",
          name: "DEGREES",
          value: 45,
          min: 1,
          max: 90
        },
        {
          type: "field_number",
          name: "duration_seconds",
          value: 1,
          min: 0.1,
          max: 15
        }
      ],
      colour: "#E4D00A",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Turn right a specific number of degrees",
      helpUrl: ""
    },
    {
      type: "minisub_stop",
      message0: "stop",
      colour: "#E74C3C",
      previousStatement: null,
      nextStatement: null,
      tooltip: "Make the minisub stop immediately", 
      helpUrl: ""
    },

    ...MINI_SUB_COMMANDS
    .filter((command) => 
      command.id !== "move_forward" && 
      command.id !== "move_backward" &&
      command.id !== "turn_left" && 
      command.id !== "turn_right" &&
      command.id !== "set_depth" &&
      command.id !== "stop" 
    )
    .filter((command) => !Blockly.Blocks[getBlockType(command.id)]) 
    .map((command) => ({ //For the other blocks 
      type: getBlockType(command.id),
      message0: command.label,
      colour: command.colour,
      previousStatement: null,
      nextStatement: null,
      tooltip: `Send ${command.id} to the MiniSub`,
      helpUrl: ""
    }))
  ];
  defineBlocksWithJsonArray(blocks);
}

// Translates the blocks to their action 
export function getPayloadForBlock(block) {
  console.log("BLOCK FIELDS:", block.getVars ? block.getVars() : block.inputList.flatMap(i => i.fieldRow).map(f => f.name));
  let payload;

  if (block.type === "minisub_move_forward") {
    payload = { command: "move_forward" };
  } 
  else if (block.type === "minisub_move_backward") {
    payload = { command: "move_backward" };
  } 
  else if (block.type === "minisub_depth_level") {
    payload = {
      command: "set_depth",
      ballast_level: Number(block.getFieldValue("BALLAST"))
    };
  }
  else if (block.type === "minisub_turn_left") {
    payload = { command: "turn_left" };
  }
  else if (block.type === "minisub_turn_right") {
    payload = { command: "turn_right" };
  }
  else if (block.type === "minisub_light_on") {
    payload = { command : "light_on" }
  }
  else if (block.type === "minisub_light_off") {
    payload = { command : "light_off" }
  } 
  else if (block.type === "minisub_stop") {
    payload = { 
      command: "stop",
      duration_seconds: 2 
    };
  }
  else {
    const command = MINI_SUB_COMMANDS.find((item) => getBlockType(item.id) === block.type);
    if (!command) {
      throw new Error(`Unsupported MiniSub block: ${block.type}`);
    }
    payload = { ...createCommandPayload(command.id) };
  }

  if (block.type !== "minisub_stop") {
    const durationField = block.getFieldValue("DURATION");
    const turnDurationField = block.getFieldValue("duration_seconds");

    if (durationField !== null && durationField !== undefined) {
      payload.duration_seconds = Number(durationField);
    } else if (turnDurationField !== null && turnDurationField !== undefined) {
      payload.duration_seconds = Number(turnDurationField);
    }
  }

  const degreesField = block.getFieldValue("DEGREES");
  if (degreesField !== null && degreesField !== undefined) {
    payload.angle_deg = Number(degreesField);
  }

  const powerField = block.getFieldValue("motor_power_pct");
  if (powerField !== null && powerField !== undefined) {
    payload.motor_power_pct = Number(powerField);
  }

  return payload;
}

// Function for making the "Command plan" in chronical order, what actions will happen 
export function generateCommandPlan(workspace) {
  const commandPlan = [];
  const topBlocks = workspace.getTopBlocks(true);
  
  if (topBlocks.length === 0) return commandPlan;
  
  let currentBlock = topBlocks[0];
  
  while (currentBlock) {
    try {
      const payload = getPayloadForBlock(currentBlock);
      commandPlan.push({
        ...payload,
        blockId: currentBlock.id
      });
    } catch (error) {
      console.warn(error.message);
    }
    currentBlock = currentBlock.getNextBlock();
  }
  
  return commandPlan;
}