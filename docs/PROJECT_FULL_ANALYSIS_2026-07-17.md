我先快速看一下项目顶层结构，再决定如何深入分析。

三个分析代理已完成对全仓库的深入扫描（纯只读，未删改任何文件）。以下是综合报告。

---

# DeepSeek Workbench 项目全面分析报告

## 一、这个项目是干什么的

**一句话定位**：这是一个**非官方的、本地优先（local-first）的 DeepSeek 桌面智能体工作台**（GitHub: `Mubai0628/DG`，Apache-2.0），核心理念是"可审计、用户批准后才执行"——所有动作都产生摘要事件、可回放、默认脱敏。

**技术形态**：pnpm 11 + TypeScript 6 单仓 monorepo，1425 个被跟踪文件，四个包：

| 包                   | 规模                  | 职责                                                                             |
| -------------------- | --------------------- | -------------------------------------------------------------------------------- |
| `runtime/`           | 570 文件 / ~14.2 万行 | 核心 TS 库：会话引擎、DeepSeek 客户端、工具代理、事件存储/回放、补丁/权限/转录等 |
| `app/`               | 128 文件 / ~6.3 万行  | Tauri 2 + React 19 桌面壳；Rust 侧 `commands.rs` 高达 14,879 行                  |
| `browser-extension/` | 13 文件               | Chromium MV3 扩展，抓取当前标签页可见表格                                        |
| `conformance/`       | 10 文件               | DeepSeek API 一致性测试（dry + 三重开关的 live）                                 |

**端到端主流程（v0.1 垂直切片，至今仍是骨架）**：浏览器扩展抓取可见表格 → 生成脱敏的 `BrowserDomPayload` → 本地 CLI/桌面端校验 → `fs.write_draft` 工具代理写入 `workspace/drafts/*.csv` → JSONL 事件日志 → 确定性回放摘要。

**当前所处阶段**：README 显示当前 RC 线是 **v0.35（原始转录/输出持久化）**，下一阶段 v0.36 是"任意 shell 命令代理（command broker）"。**工作区里有未提交的 command-broker 代码**（planner、执行命令、回放视图、事件模块），对照 P1N 路线图已完成 9 项任务中的 7 项，正处于提交前状态。

**一个关键架构特征**：TS 侧绝大多数产物是"计划、提案、回执、预览、摘要事件"；几乎所有真实副作用（文件写入、Git、shell、MCP 调用、DeepSeek 真实 HTTP 请求）都收在 Rust 层的固定 Tauri 命令后面。这是一种刻意的安全设计。

## 二、开发需求分析（距 v1 还差什么）

项目自己的文档把 v1 定位为"候选打磨线"而非功能完备的 1.0，`known-limitations` 文档把大量缺失能力（桌面自动化、可变 MCP、自主循环、云同步等）定义为"有意排除"。但代码层面观察到以下真实差距：

**功能性缺口**

1. **没有真正的聊天循环**。`ConversationEngine`、消息装配器、推理内容存储都已实现且有测试，但没接到任何用户界面；App 的 Chat/Run Canvas 只是草稿面板；全应用唯一的真实模型调用是"补丁提案生成"这一个窄命令；不支持流式（`stream?: false`）。
2. **内存易失**。`InMemoryMemoryStore` 是进程级的，会话记忆不持久化；只有 Project Knowledge 通过 Rust 命令落盘。
3. **桌面观察/动作是空壳**。`observe_desktop_metadata` 返回 `WINDOW_METADATA_UNAVAILABLE`，`execute_approved_desktop_action` 永远返回 `unsupported_platform`——是诚实的失败关闭占位，但意味着该能力为零。

**工程性缺口**

4. **巨型单文件**：`App.tsx` 22,301 行（95 个面板）、`commands.rs` 14,879 行、`desktop-shell.test.ts` 36,542 行（含 676 个用例，其中不少是"读源码断言字符串存在"的 grep 型测试）。维护和合并风险高。
5. **CI 覆盖空洞**：`.github/workflows/ci.yml` 从不跑 `app:test`、`cargo test`、`app:smoke`、`app:qa:check`——整个 Tauri/React/Rust 面只能靠本地 RC 清单手动验证，绿 CI ≠ 完整质量门。
6. **架构边界怪癖**：约 62 个 app 视图文件直接 import runtime 的 **TS 源码**（`../../runtime/src/...`）而非构建产物包，等于把 runtime 源码二次编译。
7. **陈旧元数据**：`runtime/src/index.ts` 仍导出 `releaseScope = "v0.1.0"` 化石；README "v0.1.0 scope" 还称 HTTP 客户端是 skeleton（实际已是完整实现）；v1 候选已知限制文档对 v0.13+ 真实联网提案路径描述偏松。
8. **Command broker 未完工**：剩 P1N-008（冒烟/加固场景：kill-switch、危险命令、超时、超限输出的夹具）和 P1N-009（RC 打磨、全门禁、发 tag）。**且它带着一个高危设计问题（见下节 F1）**。

**质量基建（做得好的）**：157 个 runtime 测试文件约 1737 用例 + cargo 内嵌 114 测试；`verify:ci` 链完整；边界扫描脚本（837 行，grep 禁 playwright/electron/nativeMessaging 等）和密钥扫描均已通过 ✅；源码零 TODO/FIXME 标记。

## 三、安全漏洞扫描结果

先说结论：**这个项目的安全文化异常强**（摘要事件、默认脱敏、路径围栏、类型化批准回执、最小 Tauri 权限、扩展最小权限），但**最新的 command-broker 功能恰好在最重要的信任边界上打破了这个模式**。

### 🔴 F1 高危：command broker 信任客户端自报的策略结论，可无回执执行任意 shell

`app/src-tauri/src/commands.rs:5177-5443` 的 `execute_command_broker_request` 会通过 `powershell -Command` / `cmd /C` / `bash -lc` / `sh -lc` / 任意 argv 执行调用方传来的 `command_text`。问题在于**所有授权输入都是前端自报的，Rust 侧从不重新计算**：

- `brokerDecision` 只校验字符串等于 `"ready_for_tauri_execution"`（`commands.rs:5336`）
- 危险命令分类器**不在 Rust 侧重跑**，直接用客户端给的分类结果
- 没有类型化确认、没有批准回执——而同文件里其他危险操作（apply/rollback/live 提案/MCP/桌面动作）全都有
- 唯一的服务端内容闸是一个约 8 条子串的禁用词表，挡不住 `rm -rf`、`certutil`、`mshta`、`iex (New-Object Net.WebClient)…` 等

**后果**：webview 里任何 JS（XSS、被污染的依赖、甚至 devtools 控制台）都能以当前用户身份执行任意命令；即便走正常 UI，也只需选个模式、随便填个租约字符串、点一下 Execute。TS 侧那套精心设计的策略/分类/代理链**不提供实际防护**，因为它们的输出只是请求字段。UI 文案和 `SECURITY.md` 的表述高估了当前保证。

**修复方向**：在 Rust 侧重跑分类器（或像 `run_shell_verification_lane` 那样改用固定模板白名单）；任何 shell 执行前要求服务端校验的批准回执 + 类型化确认；在此之前把 `full_access`/`break_glass` 降级为 dry-run。**建议在提交这批未提交代码之前先修这个。**

### 🟡 F2 中危：正则分类器是诚实路径上唯一的内容闸，可绕过

`dangerous-command-classifier.ts:137-278` 用单条正则分类：漏 `iex` 不带下载前缀的情况、`Net.WebClient.DownloadString`、`certutil/mshta/rundll32/bitsadmin`、`powershell -e` 缩写、反斜杠凭据路径等；同时有可观的误报（任何含 "format" 字样的命令都判为 `format_disk`）。绕过样本经 UI 正常路径即可一键执行，无确认。

### 🟡 F3 中危（CLI）：`--event-log` 路径不受工作区围栏约束

`runtime/src/flows/web-table-to-csv-flow.ts:35-38` 对事件日志路径只 `resolve` 不做包含性检查，CLI 用户可向任意路径追加 JSONL 内容/创建任意目录。桌面端不暴露此 flag，故影响有限。

### 🟢 低危（4 项）

- **F4**：broker 用登录 shell（`bash -lc`/`sh -lc`），会 source 用户 profile，抵消了 env 清理的效果，应改 `-c`（`commands.rs:5502-5509`）
- **F5**：临时 payload 路径可预测且非独占写入，同用户进程可 symlink 攻击（`commands.rs:10029-10043`）
- **F6**：env 清理和密钥标记检查是黑名单制，`GITHUB_PAT`、`ghp_`、`AKIA`、`xoxb-`、JWT 等格式漏检；建议子进程 env 改白名单
- **F7**：符号链接检查与写入之间存在小 TOCTOU 窗口（已用 `"wx"` 独占创建大幅缓解）
- **F8**：`JsonlEventStore.listEvents` 遇一行坏 JSON 就整体抛错（Rust 侧已正确处理，TS 侧没有）

### ℹ️ 其他说明

- `pnpm audit` 本机跑不了（无 pnpm），依赖系人工审查：Tauri 2.11.2、React 19.2.7、vite 7/8 双版本（建议去重）、runtime 零运行时依赖，均属当前版本，lockfile 已提交、CI 用 `--frozen-lockfile`。建议把 `pnpm audit` 加进 CI。
- 租约（sessionLeaseRef）目前是 UI 里的自由文本，证明不了任何事；Rust 校验了 env 白名单但 spawn 时根本没应用它（死代码，方向安全但有误导性）。
- `.tmp/` 和 `deepseek_workbench_v0_2_1_codex_pack/` 里有旧日志与遗留包，含测试用假密钥；两者均被 gitignore，不在仓库内。

## 四、用户体验问题

### 高影响

- **H1 · 98 个板块一屏到底，没有任何导航**。`App.tsx` 无条件渲染 98 个 `<h2>` 区块，唯一可用的 Convert 流程混在约 95 个草稿/只读/预览面板中间，没有标签页、侧栏、搜索或锚点。想到达"事件回放"要滚过几十个面板。**这是日常使用的核心摩擦。**
- **H2 · 旗舰流程是 8 步手工接力**。旁加载扩展 → 抓取 → 在小 textarea 里全选复制（payload 可达 2MB）→ 切到 App → 粘贴 → 手输工作区路径 → 手输文件名 → Convert → 自己去 `workspace/drafts/` 找文件。扩展弹窗**没有"复制 JSON"和"下载 .json"按钮**，结果面板的路径是纯文本、没有"打开所在文件夹"。
- **H3 · 禁用原因直接甩开发者错误码**。点 Execute 没反应时看到 `disabled: APPROVAL_MODE_DISABLED, BROKER_DECISION_NOT_READY` 这类蛇形常量，甚至字面量 `unexpected`（会被当成 bug），没有人类语言的原因和补救指引。
- **H4 · 入门文档互相矛盾且缺关键步骤**。Quickstart 不写 Node/pnpm/Rust 版本（`package.json` 也没有 `engines`）；**完全没提浏览器扩展怎么构建/加载**；端口说明错误（文档说 5173/5174，实际 strict port 5179）；全部文档零截图。
- **H5 · 文档库过载且部分过时**。`docs/` 635 个文件（36 篇发布说明、35 个 RC 清单、41 篇手动 QA）倒序平铺；`docs/README.md` 开头还说"围绕 v0.1/v0.2 组织"（实际已 v0.35）；顶层 README 前 639 行全是各 RC 状态流水账，Quickstart 藏在第 854 行；还有链错的手工 QA 索引。
- **H6 · 错误信息面向开发者**。粘贴错 JSON 得到 "Browser payload must confirm password field values were dropped"；超大只提示 "Payload JSON is too large" 不说 2MB 上限和实际大小；App 侧没有错误码→人话+补救措施的映射层。
- **H7 · 文件名冲突无恢复手段**。`FILE_EXISTS` 后只能手动改名重试，没有"自动改名"或"覆盖"选项。

### 中影响（摘要）

- **M1** 工作区选择是纯文本框，无文件夹选择器、无失焦校验
- **M2** App 内"文档链接"按钮不打开文档，只打印路径，且四个目标全是过时的 v0.1 文档
- **M3** `.twoColumn`/`.resultPanel` 两个 CSS 类在 `styles.css` 里**根本没定义**，命令代理表单的布局因此塌掉
- **M4** `min-width: 860px` + 固定双列网格，窄窗口横向滚动，无暗色模式
- **M5** Convert 在工作区/payload 为空时也可点，全部错误只能事后暴露
- **M6** 加载态只是按钮文字变化，子进程调用无进度反馈
- **M7** 扩展 manifest 没有 icons，工具栏显示默认拼图图标
- **M8** 扩展失败时显示 `Capture failed: no_visible_tables` 而非已写好的那句人话

### 低影响（摘要）

英文界面无 i18n（L1）；无 `:focus-visible` 焦点样式、无跳转链接（L2）；`safety.ts` 有死分支（L3）；22k 行 App.tsx 导致任何输入都全量重渲染（L4）；回放视图里时间戳是 `unix-ms-…` 机器串（L5）。

### 值得保留的 UX 优点

空状态引导文案 + nextAction 模式很成熟；`safeErrorMessage` 全链路脱敏截断；ErrorBoundary 有"重置 UI"恢复按钮；v0.1 排障文档与真实错误串对得上（症状→原因→修复格式正确）；约 100 个区块有 `aria-label`、结果面板有 `aria-live`。

## 五、总结与优先级

项目本质是一个**安全设计驱动的"审批式智能体"骨架**，v0.1 的表格转 CSV 只是载体，真正的资产是那套事件/回放/回执/围栏体系。当前最紧迫的三件事：

1. **🔴 修 F1/F2 再提交 command-broker**——它现在是整个威胁模型里唯一的裸奔入口（Rust 侧重跑分类 + 强制批准回执）
2. **🟠 补 CI 空洞**——把 `app:test` + `cargo test` 加进 GitHub Actions，否则 RC 清单的"全绿"无法在机器上复现
3. **🟠 信息架构与错误人话化**——98 板块加导航（H1）、错误码映射成句子（H3/H6），这是投入产出比最高的 UX 修复

需要说明的验证边界：以上为静态分析结论，测试套件未实际运行（只读了套件存在性）；`pnpm audit` 因本机无 pnpm 未执行；conformance live 路径需要真实 API key 无法离线验证。
