import { spawn } from "node:child_process";

const commands = [
  ["pnpm", ["verify:ci"]],
  ["pnpm", ["app:preflight"]],
  ["pnpm", ["app:smoke"]],
  ["pnpm", ["app:manual-smoke:check"]],
  ["pnpm", ["--filter", "@deepseek-workbench/browser-extension", "build"]],
  ["pnpm", ["eval:web-table-to-csv"]],
  ["pnpm", ["run", "web-table-to-csv", "--", "--help"]]
];

for (const [command, args] of commands) {
  await run(command, args);
}

console.log("Release smoke");
console.log("status: PASS");

function run(command, args) {
  const executable = process.platform === "win32" ? "cmd.exe" : command;
  const executableArgs =
    process.platform === "win32" ? ["/c", `${command}.cmd`, ...args] : args;

  console.log(`$ ${[command, ...args].join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(executable, executableArgs, {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with ${code}`));
    });
  });
}
