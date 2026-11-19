// Prints an OWNER_PASSWORD_HASH line for the admin sign-in at /login.
// Usage: npm run owner:hash-password
// Asks for the password twice without showing it, or reads it from piped
// stdin (first line). Only the hash line goes to stdout; prompts go to stderr.
import { hashOwnerPassword } from "../src/lib/owner-password.ts";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: npm run owner:hash-password",
      "",
      "Asks for the owner password (it isn't shown as you type) and prints",
      "OWNER_PASSWORD_HASH=... to put in the server's .env. The password itself",
      "is never stored. Piped input works too: the first line is the password.",
    ].join("\n"),
  );
  process.exit(0);
}

const MIN_LENGTH = 12;

// Reads one line from the terminal with echo off.
function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stderr.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stderr.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          process.stderr.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
        } else if (ch >= " ") {
          value += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function readPiped(): Promise<string> {
  let text = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) text += chunk;
  return text.split(/\r?\n/)[0];
}

let password: string;
if (process.stdin.isTTY) {
  password = await askHidden("Owner password: ");
  const again = await askHidden("Type it again: ");
  if (password !== again) {
    console.error("The two passwords don't match. Nothing was printed.");
    process.exit(1);
  }
} else {
  password = await readPiped();
}

if (password.length < MIN_LENGTH) {
  console.error(`Use at least ${MIN_LENGTH} characters. Nothing was printed.`);
  process.exit(1);
}

console.log(`OWNER_PASSWORD_HASH=${await hashOwnerPassword(password)}`);
