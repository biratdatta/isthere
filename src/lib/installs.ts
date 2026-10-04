import type { McpEntry, PluginEntry, SkillEntry } from './apps';

/**
 * Per-agent install snippets. Syntax follows each tool's own docs
 * (Claude Code: code.claude.com/docs, Codex: developers.openai.com/codex, Cursor: cursor.com/docs).
 */
export interface InstallOption {
  id: string;
  agent: string;
  lang: 'shell' | 'json' | 'toml' | 'text';
  code: string;
  note?: string;
}

const serverName = (e: McpEntry) => e.slug;

export function mcpInstalls(e: McpEntry): InstallOption[] {
  const s = e.server;
  const name = serverName(e);
  if (s.transport === 'http') {
    return [
      {
        id: 'claude-code',
        agent: 'Claude Code',
        lang: 'shell',
        code: `claude mcp add --transport http ${name} ${s.url}`,
        note: s.auth === 'oauth' ? 'Then run /mcp inside Claude Code to sign in.' : undefined,
      },
      {
        id: 'codex',
        agent: 'Codex',
        lang: 'shell',
        code: `codex mcp add ${name} --url ${s.url}`,
        note: s.auth === 'oauth' ? `Then sign in with: codex mcp login ${name}` : undefined,
      },
      {
        id: 'cursor',
        agent: 'Cursor',
        lang: 'json',
        code: JSON.stringify({ mcpServers: { [name]: { url: s.url } } }, null, 2),
        note: 'Add to ~/.cursor/mcp.json (all projects) or .cursor/mcp.json (this project).',
      },
    ];
  }
  const env = s.env ?? [];
  const cmd = [s.command, ...(s.args ?? [])].join(' ');
  return [
    {
      id: 'claude-code',
      agent: 'Claude Code',
      lang: 'shell',
      code: `claude mcp add ${env.map((k) => `--env ${k}=YOUR_${k} `).join('')}--transport stdio ${name} -- ${cmd}`,
      note: e.server.repoUrl ? 'Clone and set up the server first (see its README), then run this from its folder.' : undefined,
    },
    {
      id: 'codex',
      agent: 'Codex',
      lang: 'shell',
      code: `codex mcp add ${name} ${env.map((k) => `--env ${k}=YOUR_${k} `).join('')}-- ${cmd}`,
    },
    {
      id: 'cursor',
      agent: 'Cursor',
      lang: 'json',
      code: JSON.stringify(
        {
          mcpServers: {
            [name]: {
              command: s.command,
              args: s.args ?? [],
              ...(env.length ? { env: Object.fromEntries(env.map((k) => [k, `\${env:${k}}`])) } : {}),
            },
          },
        },
        null,
        2
      ),
      note: 'Add to ~/.cursor/mcp.json or .cursor/mcp.json.',
    },
  ];
}

function heredoc(dir: string, md: string) {
  return `mkdir -p ${dir} && cat > ${dir}/SKILL.md <<'SKILL_EOF'\n${md.trimEnd()}\nSKILL_EOF`;
}

export function skillInstalls(e: SkillEntry): InstallOption[] {
  const s = e.skill;
  if (s.skillMd) {
    return [
      { id: 'claude-code', agent: 'Claude Code', lang: 'shell', code: heredoc(`~/.claude/skills/${s.name}`, s.skillMd), note: 'Personal skill. For one project, use .claude/skills/ instead.' },
      { id: 'codex', agent: 'Codex', lang: 'shell', code: heredoc(`~/.agents/skills/${s.name}`, s.skillMd), note: 'Codex reads user skills from ~/.agents/skills.' },
      { id: 'cursor', agent: 'Cursor', lang: 'shell', code: heredoc(`~/.cursor/skills/${s.name}`, s.skillMd), note: 'Cursor also picks up skills in ~/.claude/skills and ~/.agents/skills.' },
    ];
  }
  const repo = s.marketplace ?? 'anthropics/skills';
  const clone = (dest: string) =>
    `git clone --depth 1 https://github.com/${repo} /tmp/${repo.split('/')[1]} \\\n  && mkdir -p ${dest} \\\n  && cp -R /tmp/${repo.split('/')[1]}/skills/${s.name} ${dest}/`;
  const out: InstallOption[] = [];
  if (s.plugin) {
    out.push({
      id: 'claude-code',
      agent: 'Claude Code',
      lang: 'text',
      code: `/plugin marketplace add ${repo}\n/plugin install ${s.plugin}`,
      note: `Run inside Claude Code. This installs the "${s.plugin.split('@')[0]}" bundle, which includes ${s.name}.`,
    });
  } else {
    out.push({ id: 'claude-code', agent: 'Claude Code', lang: 'shell', code: clone('~/.claude/skills') });
  }
  out.push({ id: 'codex', agent: 'Codex', lang: 'shell', code: clone('~/.agents/skills'), note: 'Codex reads user skills from ~/.agents/skills.' });
  out.push({ id: 'cursor', agent: 'Cursor', lang: 'shell', code: clone('~/.cursor/skills'), note: 'Cursor also picks up skills in ~/.claude/skills and ~/.agents/skills.' });
  return out;
}

export function pluginInstalls(e: PluginEntry): InstallOption[] {
  const p = e.plugin;
  const official = p.marketplaceName === 'claude-plugins-official';
  return [
    {
      id: 'claude-code',
      agent: 'Claude Code',
      lang: 'text',
      code: official ? `/plugin install ${p.name}@${p.marketplaceName}` : `/plugin marketplace add ${p.marketplace}\n/plugin install ${p.name}@${p.marketplaceName}`,
      note: official
        ? 'The official marketplace is added automatically the first time you start Claude Code.'
        : 'Run inside Claude Code. Shell equivalent: claude plugin marketplace add … then claude plugin install …',
    },
  ];
}
