/**
 * Chinese dictionary for the chat-first shell. Keys are the English source
 * strings used in components. Product name and protocol phrases (typed
 * confirmations like "EXECUTE WORKSPACE COMMAND") stay English by design.
 */
export const zhDictionary: Record<string, string> = {
  // Sidebar
  Conversation: "对话",
  "＋ New conversation": "＋ 新建对话",
  "Current conversation": "当前对话",
  Workspace: "工作区",
  "Quick tools": "快捷工具",
  "Open permission settings": "打开权限设置",
  "Open settings": "打开设置",
  "⚙ Settings": "⚙ 设置",
  Projects: "项目",
  "＋ New project": "＋ 新建项目",
  "Standalone conversations": "独立对话",
  Back: "返回",
  "Read a file from the workspace": "读取工作区文件",
  "Convert a captured web table to CSV": "把抓取的网页表格转换为 CSV",
  "Run a command through the broker": "通过命令代理执行命令",
  "Run a fixed verification template": "运行固定验证模板",
  "Read summary git state": "读取 Git 摘要状态",
  "Expand sidebar": "展开侧栏",
  "Collapse sidebar": "收起侧栏",
  "Insert into composer": "插入到输入框",

  // Chat view — empty state & composer
  "Ask me anything, or run a quick tool. Current tier: ":
    "可以直接提问，也可以运行快捷工具。当前权限梯次：",
  Send: "发送",
  "Message composer": "消息输入框",
  "Message, or /read · /convert · /broker · /verify · /git …":
    "输入消息，或使用 /read · /convert · /broker · /verify · /git …",
  "Set a workspace root first (sidebar or Settings → General), then run that tool again.":
    "请先设置工作区根目录（侧栏或 设置 → 通用），然后再运行该工具。",
  "I don't recognize that command. ": "无法识别这个命令。",
  "Quick tools: /read <path> · /convert <file.csv> · /broker <command> · /verify [typecheck|lint|test|app:typecheck|cargo] · /git [status|diff|log|branch]":
    "快捷工具：/read <路径> · /convert <文件名.csv> · /broker <命令> · /verify [typecheck|lint|test|app:typecheck|cargo] · /git [status|diff|log|branch]",
  "Paste the sanitized BrowserDomPayload JSON from the browser extension, then run the conversion.":
    "粘贴浏览器扩展生成的脱敏 BrowserDomPayload JSON，然后运行转换。",
  "BrowserDomPayload JSON": "BrowserDomPayload JSON（扩展导出的表格数据）",
  "Run conversion": "运行转换",

  // Chat tool states
  "needs input": "需要输入",
  "approval required": "需要审批",
  "running…": "运行中…",
  done: "完成",
  error: "错误",
  "Running through the fixed Tauri lane…": "正在通过固定 Tauri 通道运行…",
  "Web table → CSV": "网页表格 → CSV",
  "DeepSeek chat": "DeepSeek 对话",

  // Approval card
  "Type the phrase to approve": "输入批准短语",
  "Session lease": "会话租约",
  "No active full-access lease in this workspace — issue one in Settings → Permissions & Safety first.":
    "当前工作区没有可用的 full-access 租约——请先在 设置 → 权限与安全 中颁发一个。",
  "Approve & run": "批准并运行",
  Cancel: "取消",
  "Cancelled — nothing was executed.": "已取消——没有执行任何操作。",
  "Declined — the assistant was informed.": "已拒绝——已告知助手。",

  // Chat view — tool flows
  "This read is gated: the file is sensitive, or the current tier requires approval for reads.":
    "该读取受到管控：文件属于敏感文件，或当前梯次要求读取需审批。",
  "Broker execution requires your typed approval.":
    "broker 执行需要你的输入短语审批。",
  Classifier: "分类器",
  "The assistant wants to run ": "助手希望运行 ",
  "Tool call is no longer pending.": "该工具调用已不再待处理。",
  "CSV draft written.": "CSV 草稿已写入。",
  "Blocked.": "已被阻止。",

  // Settings — group nav
  General: "通用",
  "Permissions & Safety": "权限与安全",
  "Command Execution": "命令执行",
  "Model & Proposals": "模型与提案",
  "Capabilities & MCP": "能力与 MCP",
  Desktop: "桌面",
  "Memory & Knowledge": "记忆与知识",
  "Data & Storage": "数据与存储",

  // Settings — General
  "Workspace root": "工作区根目录",
  "Settings resolve per workspace; the app-level file is shared across workspaces.":
    "设置按工作区解析；应用级配置文件在所有工作区间共享。",
  Theme: "主题",
  "Light (default)": "浅色（默认）",
  "Paper & frosted glass. Dark theme is reserved for a later round.":
    "纸质纹理与磨砂玻璃。暗色主题留待后续版本。",
  "Settings file": "设置文件",
  "Project settings (default)": "项目设置（默认）",
  "App settings (shared)": "应用设置（共享）",
  "Mode confirmation": "模式确认短语",
  "Required phrase for the current mode": "当前模式所需的短语",
  "Full access mode needs no confirmation.": "full access 模式无需确认。",
  "Switching to full access mode needs no confirmation.":
    "切换到完全访问模式无需确认。",
  "Save settings": "保存设置",
  "Settings defaulted (no saved settings file found).":
    "已使用默认设置（未找到已保存的设置文件）。",
  "Settings loaded from project settings.": "已从项目设置加载。",
  "Settings loaded from app settings.": "已从应用设置加载。",
  "Settings load failed: ": "设置加载失败：",
  "Settings saved to project settings.": "已保存到项目设置。",
  "Settings saved to app settings.": "已保存到应用设置。",
  "Settings save failed: ": "设置保存失败：",
  "Settings not saved: workspace root is empty.":
    "设置未保存：工作区根目录为空。",
  Language: "界面语言",
  "Chinese (default)": "中文（默认）",

  // Settings — Permissions & Safety
  "Permission mode": "权限模式",
  "Requires approval": "需要授权",
  "yolo (coming soon)": "yolo（后续版本）",
  "Full access": "完全控制",
  "File reads are available to the assistant in every mode; approvals gate everything else.":
    "读取文件在任何模式下都赋予助手；其他操作按审批管控。",
  "Leases are only issuable in full_access mode.":
    "只有完全访问模式可以颁发租约。",
  "Switch to full access mode to issue a lease.":
    "切换到完全访问模式后才能颁发租约。",
  "Read-only preview": "只读预览",
  "Approval mode": "审批模式",
  "Autonomous safe mode": "自治安全模式",
  "Advanced workspace mode": "高级工作区模式",
  "Full access mode": "完全访问模式",
  "Break-glass mode": "破窗模式",
  "Save mode": "保存模式",
  "Session leases": "会话租约",
  "Broker full_access execution requires a stored, active full-access lease. Leases are time-limited and workspace-scoped.":
    "broker 的 full_access 执行需要一个已存储且处于有效期的 full-access 租约。租约限时且按工作区隔离。",
  "Lease confirmation": "租约确认短语",
  "Issue 30-minute lease": "颁发 30 分钟租约",
  Refresh: "刷新",
  "Switch to advanced_workspace or full_access mode to issue a lease.":
    "切换到高级工作区模式或完全访问模式后才能颁发租约。",
  "Leases are only issuable in advanced_workspace or full_access modes.":
    "只有高级工作区模式或完全访问模式可以颁发租约。",
  "Lease issued: ": "租约已颁发：",
  "Lease issue failed: ": "租约颁发失败：",
  "Lease revoked: ": "租约已撤销：",
  "Lease revoke failed: ": "租约撤销失败：",
  "Lease list failed: ": "租约列表加载失败：",
  "No leases stored for this workspace.": "当前工作区没有已存储的租约。",
  Lease: "租约",
  Mode: "模式",
  Status: "状态",
  Revoke: "撤销",
  active: "有效",
  expired: "已过期",
  revoked: "已撤销",

  // Settings — Command Execution
  "Command broker": "命令代理",
  Command: "命令",
  Shell: "Shell（命令行）",
  "Working directory": "工作目录",
  "Session lease id (required for full_access)":
    "会话租约 id（full_access 必填）",
  "lease-… (see Permissions & Safety)": "lease-…（见 权限与安全）",
  "Approval confirmation": "审批确认短语",
  Execute: "执行",
  "Read workspace file": "读取工作区文件",
  "Relative path": "相对路径",
  "Approval confirmation (for gated reads)": "审批确认短语（用于受控读取）",
  Read: "读取",
  "Shell verification lane": "Shell 验证通道",
  "Git read lane": "Git 只读通道",
  Run: "运行",

  // Settings — Model & Proposals
  "DeepSeek live proposals": "DeepSeek 实时提案",
  "Live DeepSeek patch proposal generation is available through the fixed lane with its own session receipt and typed confirmation (CALL DEEPSEEK FOR PROPOSAL). The API key is only read from the DeepSeek API key environment variable, never stored.":
    "DeepSeek 实时补丁提案通过固定通道提供，需要独立的会话回执与确认短语（CALL DEEPSEEK FOR PROPOSAL）。API key 仅从 DeepSeek API key 环境变量读取，绝不存储。",
  "The conversation-integrated proposal flow arrives with the chat tools in P2/P3. Nothing is called live without your explicit opt-in.":
    "与对话集成的提案流程将在后续版本中提供。未经你明确授权，不会发起任何真实调用。",

  // Settings — Capabilities & MCP
  "MCP read-only discovery": "MCP 只读发现",
  "Discovery runs against the injected test transport in this build; no real MCP server is contacted. Tool calls stay behind their own approval receipt and arrive with the conversation tools.":
    "当前版本的发现功能使用注入的测试传输层，不会连接真实的 MCP 服务器。工具调用需要独立的审批回执，将随对话工具提供。",
  "Discovery confirmation": "发现确认短语",
  "Discover metadata": "发现元数据",
  "Select a workspace first.": "请先选择工作区。",

  // Settings — Desktop
  "unsupported platform": "平台不支持",
  "Desktop observation and actions are honest stubs in this build: window metadata is unavailable and desktop actions report unsupported_platform. This is a deliberate fail-closed placeholder, not an error.":
    "当前版本的桌面观察与桌面动作是如实占位：窗口元数据不可用，桌面动作返回 unsupported_platform。这是有意的安全关闭占位，不是错误。",
  "Desktop observation": "桌面观察",
  "Probe observation metadata": "探测观察元数据",

  // Settings — Memory & Knowledge
  "Project knowledge": "项目知识",

  // Settings — Data & Storage
  "Transcript store": "转录存储",
  "Select transcript": "选择转录",
  "Select transcript…": "选择转录…",
  Preview: "预览",
  "Export summary": "导出摘要",
  "Delete confirmation": "删除确认短语",
  "Delete transcript": "删除转录",
  "Transcript deleted.": "转录已删除。",
  "No transcript records yet.": "暂无转录记录。",
  "List failed: ": "列表加载失败：",
  "Preview failed: ": "预览失败：",
  "Export failed: ": "导出失败：",
  "Delete failed: ": "删除失败：",
  "Event log replay": "事件日志回放",
  "Load events": "加载事件"
};
