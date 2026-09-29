import { browser } from "./lib/browser.js";
import { createController } from "./lib/controller.js";

// All the logic lives in lib/controller.js so it can be tested under Node.
createController({ browser }).register();
