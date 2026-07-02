import * as Blockly from "blockly/core";
import * as En from "blockly/msg/en";
import { createMiniSubApp } from "./app/createMiniSubApp.js";
import "./styles.css";

Blockly.setLocale(En);

createMiniSubApp(document.querySelector("#app"));
