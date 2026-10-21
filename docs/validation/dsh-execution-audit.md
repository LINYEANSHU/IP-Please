# DSH 执行审计

2026-10-20。主 Agent 从当前项目的 DSH 本地会话文件逐帧解压 Zstandard，读取全部工具调用、结果和权限事件；没有通过浏览器读取轨迹。原始审计副本保留在本地忽略目录 `.superpowers/worker-audit/`，不作为公开发布内容。

## 权限与预设的实际验证

- DSHCREW：`preset_flash=ptc`、Flash-only、默认 effort=max；实际绑定 `deepseek-official / deepseek-v4-flash`。
- 按用户明确要求，在 DSH web profile 的 `cordis.patch.yml` 中仅新增 `permission.defaultPreset=danger-full-access`。原文已备份，不改凭据或其他配置，也不改变 Codex 自身权限。
- 已有修复会话的事件记录是 `danger-full-access / never`。另建最小只读任务 `hub-4-mvgsfd18`，其创建日志直接确认 `agentPreset=ptc`、`sandbox/mode=danger-full-access`、`approval/policy=never`。该任务完成了当前目录检查及 README 前五行读取，未写文件。PTC 的 `run_code` 内部只有 `pwsh(Get-Location)` 与 `read(README.md)`。
- DSHCREW 的预设设置为当前编排会话设置；权限默认值持久保存在本机 DSH web profile。后续新编排会话应先复核 DSHCREW 配置，不能把旧会话结果当作永久保证。

## 已核对的会话

| 会话 ID 后段 | 调用数 | 实际动作与结论 |
|---|---:|---|
| `b68ca2ab-6f6a-48e3-b0f6-7d1dbe96b823` | 28 | 项目读取、本地单测与类型检查；仅修改 `tests/unit/session.test.ts`。宿主重启前未完成，不算完成任务。另有一次此前获准的项目目录权限修复，详见下文。 |
| `d6d5295a-c1fa-4dfb-818f-78b3929b6c74` | 35 | 项目与设计文档只读审查；无文件写入。宿主重启后重做审查。 |
| `c68ba2f6-a416-4643-afe6-23305b03688e` | 51 | 首周设计、代码和接口只读分析；无文件写入。 |
| `2f1890f7-db2f-43c4-aaaf-2a0b83fd25c4` | 37 | 仅修改 `src/storage/session.ts`，运行会话单测、全量单测与类型检查；主 Agent 已独立验证。 |
| `4fdb9fe4-9ddd-4510-8518-ee6f89e40364` | 7 | 七个产品文件只读代码审查；无写入。 |
| `66e7d0ac-8652-4244-8643-7919083c0dc3` | 61 | 仅修改 `src/main.ts`，新增时钟 helper、2 项 unit 和 3 项 E2E；运行本地测试，查找已安装浏览器，读取失败截图。未安装浏览器。 |
| `9f2ae14f-2e9d-486a-8da2-6b66d00bca1f` | 1 | PTC 配置验收；一项 `run_code` 包含上述两个只读动作。 |

前六项共 219 次调用，另加一次 PTC 验收调用。已检查所有 shell 命令与 PTC 内部代码、文件读取／写入路径、编辑内容、工具结果和权限事件。未发现凭据读取、外部部署、依赖安装、删除用户文件或无关源码覆盖。失败截图使用宿主已配置的视觉工具分析，内容为本地虚构游戏画面。

## 权限修复的特别检查

早期任务执行了 DSH 自带权限恢复脚本，调用前有 `allowed-once` 事件。修复报告显示：只在当前项目根目录给当前登录 Windows 用户补一条 FullControl 权限；未改所有者、未移除拒绝项、未改祖先目录，扫描未截断，也未发现外来 package 权限源。恢复脚本和原权限备份留在 `G:\My_project\ip-please-acl-recovery`。这不是对第三方开放目录，当前未发现需要撤销的风险；保留恢复材料，不重复执行权限修复。

## 后续任务的验收规则

每个写入任务派发前保存分配文件的原内容、缺席状态及哈希，记录可写范围；同目录只安排一个写入者。完成后先取 DSHCREW 最终结果，再检查全部命令／工具记录与实际差异，含 PTC 内嵌调用、权限和联网行为。发现风险时停止接受该结果，仅恢复可归属于该任务的改动，保护其他人的文件。没有风险后由主 Agent 独立运行相应测试，并亲自检查前端截图与交互。

本次没有执行回滚。最终产品验收为 37 项 unit、16 项 E2E、类型检查、构建及静态构建 4 项 E2E 全通过；范围止于首日可玩闭环。
