import { MINI_SUB_COMMANDS, getBlockType } from "../commands.js";

export function createToolbox() {
  return {
    kind: "categoryToolbox",
    contents: [
      { /** Information about blocks */
        kind: "category",
        name: "MiniSub",
        colour: "#1e6f9f",
        contents: [
          { kind: "block", type: "minisub_move_forward" },
          { kind: "block", type: "minisub_move_backward" },

          { kind: "block", type: "minisub_depth_level" },
          
          { kind: "block", type: "minisub_turn_left" },
          { kind: "block", type: "minisub_turn_right" },

          { kind: "block", type: "minisub_stop" },

          ...MINI_SUB_COMMANDS
          .filter((command) => 
            command.id !== "move_forward" && 
            command.id !== "move_backward" &&
            command.id !== "set_depth" &&
            command.id !== "turn_left" &&
            command.id !== "turn_right" &&
            command.id !== "stop"
          )
          .map((command) => ({
            kind: "block",
            type: getBlockType(command.id)
          }))
        ]     
      }
    ]
  };
}
