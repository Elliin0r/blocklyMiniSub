export const MINI_SUB_COMMANDS = [
  {
    id: "move_forward",
    label: "move forward",
    colour: "#4C97FF" 
  },
  {
    id: "move_backward",
    label: "move backward",
    colour: "#4C97FF"
  },
  {
    id: "turn_left",
    label: "turn left",
    colour: "#FFAB19" 
  },
  {
    id: "turn_right",
    label: "turn right",
    colour: "#FFAB19"
  },
  {
    id: "light_on",
    label: "light on",
    colour: "#2ECC71" 
  },
  {
    id: "light_off",
    label: "light off",
    colour: "#E67E22" 
  },
  {
    id: "stop",
    label: "stop",
    colour: "#E74C3C" 
  }
];
    
export const COMMAND_TYPE_PREFIX = "mini_sub_command_";

export function getBlockType(commandId) {
  return `${COMMAND_TYPE_PREFIX}${commandId}`;
}

export function getCommandByBlockType(blockType) {
  return MINI_SUB_COMMANDS.find((command) => getBlockType(command.id) === blockType);
}

export function createCommandPayload(commandId) {
  return {
    command: commandId
  };
}
