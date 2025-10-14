import Game from "./game.js";

const elements = {
  canvas: document.getElementById("gameCanvas"),
  overlay: document.getElementById("overlay"),
  overlayText: document.getElementById("overlay-text"),
  stats: document.getElementById("stats"),
  inventory: document.getElementById("inventory"),
  log: document.getElementById("log"),
  controls: document.getElementById("controls"),
  highscore: document.getElementById("highscore"),
};

const game = new Game(elements);

game.init();

// Expose for console debugging if desired
window.game = game;
