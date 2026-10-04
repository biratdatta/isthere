export interface Agent {
  id: string;
  name: string;
  hint: string;
  prefix: string;
}

export const AGENTS: Agent[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    hint: 'mkdir app && cd app && claude, then paste.',
    prefix: `# Running in Claude Code
You are in an empty directory. Start in plan mode: propose the file tree and the build steps, then implement them.
Install dependencies, run the dev server and the tests, and fix every error before you stop.
Write a short README with run instructions and make a git commit when it works.

---

`,
  },
  {
    id: 'codex',
    name: 'Codex',
    hint: 'Run codex in an empty repo (or start a Codex cloud task), then paste.',
    prefix: `# Running in OpenAI Codex
Work autonomously in this empty repository. Do not stop to ask for confirmation between steps.
First write AGENTS.md describing how to install, run and test the project, then build it.
Keep iterating until install, build and tests pass, and report the exact commands you ran.

---

`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    hint: 'Open an empty folder in Cursor, switch the chat to Agent mode, then paste.',
    prefix: `# Running in Cursor (Agent mode)
Create the project in the current workspace root. Use the terminal to install dependencies and start the dev server.
After each edit, read the linter and type errors and fix them before moving on. Keep files small and focused.
Finish by listing the commands to run the project.

---

`,
  },
];
