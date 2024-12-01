import { app, BrowserWindow, Menu } from "electron";
import path from "path";
import { log } from "./renderer/services/logging";
import { setupChatHandler } from "./main/chat";
import db, { ensureTable } from "./main/db";
import { initAttachmentStorage } from "./main/storage";
import { setupConversationsHandlers } from "./main/conversations";
import { setupSearchHandlers } from "./main/search";
import { setupModelsHandlers } from "./main/models";
import { setupSettingsHandlers } from "./main/settings";

app.name = "Delta";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const registerIpcHandlers = () => {
  setupSettingsHandlers();
  setupChatHandler();
  setupConversationsHandlers();
  setupModelsHandlers();
  setupSearchHandlers();
};

const initLocalStorage = async () => {
  await initAttachmentStorage();
  ensureTable();
};

registerIpcHandlers();
initLocalStorage();

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Log your config path.
  log("APP_PATH", app.getPath("userData"));
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
