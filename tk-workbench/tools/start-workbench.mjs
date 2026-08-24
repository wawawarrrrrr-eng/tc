import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const children = [
  spawn(process.execPath, ["tools/video-analysis-bridge.mjs"], { stdio: "inherit", windowsHide: true }),
  spawn(npmCommand, ["run", "dev"], { stdio: "inherit", windowsHide: true }),
];

function stop() {
  for (const child of children) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", (code) => {
  if (code && code !== 0) process.exitCode = code;
});
