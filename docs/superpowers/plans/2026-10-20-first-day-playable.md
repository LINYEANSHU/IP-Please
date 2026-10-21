# First Day Playable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current conversation. Steps use checkbox (`- [ ]`) syntax for tracking. Native execution is the recommendation for this single connected milestone; this document is a plan, not an execution report.

**Goal:** 交付可在本地浏览器实际操作的 D1 闭环，严格保持首日仅 IP 核查，并为下一阶段 D1–D7 留下可续玩的数据。

**Architecture:** 纯 TypeScript 规则、计件、经济和状态变更先计算结果，再把一个完整状态写入唯一续玩记录，写入成功后播放反馈。Canvas 绘制 640×360 世界、纸张和印章，DOM 负责设置、可读文本及辅助操作。首日使用固定的 8 个案位和已确认人物方向，不在此阶段实现终日路线或中后期工具。

**Tech Stack:** TypeScript、Canvas 2D、Vite；Vitest 验证纯逻辑，Playwright 验证真实页面输入、刷新和存储边界。当前机器只读核查为 Node v24.21.0、npm 11.19.0；尚未安装本项目依赖。开始实施时记录实际安装版本并提交 lockfile。

**Spec:** `docs/superpowers/specs/2026-10-19-ip-please-design.md`；案卷逐字依据 `docs/design-discussion/2026-10-20-first-seven-days-content.md` 的 D1；最新叙事依据 `docs/design-discussion/2026-10-20-everyday-actions-and-ending-causality.md`。

## Global Constraints

- 当前目录只有设计与参考素材，没有产品工程或 Git 仓库；在当前工作区新增限定文件，保留原稿。不开云项目、不公开发布、不自行初始化或推送 Git。
- 简体中文、电脑横屏鼠标优先；世界基准 640×360；上方队列、左侧窗口、右侧桌面，长文本支持辅助阅读。
- D1 为 8 案，只有当前 IP、地区规则和最简 IP 通行册有效章区；许可 D2、护照 D3，此阶段不提前出现。
- 支持地区美国、英国、法国、新加坡、日本；中国大陆、俄罗斯不支持。D1 不按国籍、语言、时区或真实网络判定。
- 允许／拒绝为实体印章，拖动松手盖在当前册的有效章区；章迹保留。材料按已确认方式手动交还。
- 标准初始 20、底薪 0、计件 5，首日值班制作初值 360 秒；轻松初始 50、底薪 10、计件 5、不限时；同一周目不改经济模式。
- 正常允许和正常拒绝均计件 5；明显违规放行必查获、取消计件、直接罚标准 10／轻松 5；重复严重档标准 15／轻松 10。普通错拒走标准首次／轻松前两次警告、取消计件，其后标准 10／轻松 5。
- 重复严重的首日制作初值为“同日第 2 次明显违规放行起”，写在班前处罚说明；这是消除实现歧义的可调初值，不称为用户单独指定的阈值。
- 日终先结清收入、底薪及罚款，再自动扣租 20；可用余额不足 20 则 E13。恰好 20 可付租剩 0。电费、Token 费各整包可选 20，无法超余额提交。
- 模型共五个：玩家 Opus 5.5、父亲 Opus 4.6、母亲 Opus 4.8、妻子 Fable 5、儿子 Fable 5.1；家属采用已确认人脸终端。首日初始健康、两项压力 0，缺某项当晚该项 +2，提供则 -1 最低 0；首晚不会凭空达到损伤阈值。
- 单线唯一自动续玩；不提供手动存档、选日、回退、导入导出；跨标签只允许一个可写进程。存储失败显示真实失败状态，不假装已保存。
- 人物逐句点击，拟声播完仍等待；音乐、音效可关、静音能理解。后台与暂停停止标准计时；强制教学／罚单暂停，普通拖动／问话计时。
- 叙事分支采用日常行为累积，无重大／不可逆、锁路线提示、特殊确认或结局菜单；D1 不添加原案卷没有的重大分支。
- 所有终局额外费用为 0；本阶段只有原机制允许的 E13 可能实际到达，其余不摆占位结局。
- 本样段结束在首晚完成后的“次日待续”状态，保存为 D2 班前待续；继续入口如实说明本版内容范围，不伪造可玩的 D2。
- 后续阶段 D7 固定牺牲，D8 增援，D16 发枪；本阶段不以“功能演示”为由提前加入封号或枪械。

## Review Focus

- **误判提交：** 鼠标从缩放后画布外释放、窗口失焦、双击或重复 pointerup，不能在错误位置盖章或重复裁决；由 Task 2、4 的测试固定。
- **结算中断：** 罚单／盖章动画、扣租或夜间提交时刷新，不能复制计件、重扣或重走一晚；由 Task 2、3、5 固定。
- **跨文化案卷：** D01-S04 新加坡中文台词必须合规允许，不能渲染或校验未解锁字段；由 Task 1、4 固定。
- **本地状态异常：** 存储不可写、坏 JSON、未知版本、双标签接管时保留可用原数据并阻止双写；由 Task 3 固定。
- **小屏与静音：** 1280×720 和 1920×1080 均可读、可触达，静音对话不自动前进，长文本辅助阅读不吞纸张输入；由 Task 4、6 固定。

## File Structure

| 文件 | 职责 |
|---|---|
| `package.json`、`package-lock.json`、`tsconfig.json`、`vite.config.ts`、`index.html` | 静态入口与 typecheck／test／build／e2e 命令 |
| `src/domain/day-one.ts` | 8 案、当日地区规则、模式参数与处罚初值 |
| `src/domain/run.ts` | 状态、动作、裁决、返还、时钟及一次性账本 |
| `src/domain/night.ts` | 强制租金、供养组合与首晚家庭推进 |
| `src/storage/session.ts` | 存档结构校验、唯一续玩及标签写入权 |
| `src/view/desk.ts`、`src/view/hit-test.ts` | 画布渲染、纸张层级、坐标转换与印章命中 |
| `src/view/shell.ts`、`src/view/styles.css` | 模式、读报、账单、家庭、设置与可读文本 |
| `src/audio/feedback.ts` | 浏览器内原创拟声、印章反馈与音量 |
| `src/main.ts` | 输入、保存、效果播放的唯一调度入口 |
| `public/assets/portraits/`、`public/assets/manifest.json` | 已确认形象的运行素材与来源／图集坐标 |
| `tests/unit/*.test.ts`、`tests/e2e/day-one.spec.ts` | 下述有业务意义的逻辑与页面验证 |
| `playwright.config.ts`、`README.md` | 真实浏览器验证配置与本地试玩说明 |
| `docs/validation/first-day-playable.md` | 实际执行、截图、余额、断点续玩与限制记录 |

## Shared Interfaces

在 Task 1／2 定义并随后复用这些类型，不另建另一份状态：

- `Mode = 'standard' | 'relaxed'`；`Decision = 'allow' | 'reject'`；`Region = 'US' | 'GB' | 'FR' | 'SG' | 'JP' | 'CN' | 'RU'`。
- `DayOneCase = { id: string; ipRegion: Region; dialogue: readonly string[]; portraitId: string }`。对外可见证件只含首日字段。
- `Phase = 'title' | 'newspaper' | 'desk' | 'returning' | 'night' | 'family' | 'next-day' | 'ending'`。
- `RunState` 包含 `schemaVersion: 1`、`runId`、`mode`、`day`、`phase`、当前案号、固定案列、材料坐标／层级／章迹、对话行号、剩余毫秒、暂停原因、已执行 actionId、一次性账本、罚款欠缴、租金状态、家庭状态以及 `ending: null | 'E13'`。
- `RunAction` 明确覆盖开班、推进一句、普通计时、盖章、退件完成、结算、供养提交和暂停；每个会改变事实的动作含 `actionId: string`，裁决另含 `caseId` 与 `decision`。动作名在 Task 2 固定后所有后续模块复用。
- `Transition = { state: RunState; effects: readonly Effect[] }`；`reduceRun(state: RunState, action: RunAction): Transition` 不读取时间或浏览器。
- `Effect` 为呈现效果的判别联合：`{ kind: 'stamp'; caseId: string } | { kind: 'notice'; text: string } | { kind: 'utterance'; profileId: string; text: string }`，只在状态保存成功后播放，不另外修改业务状态。
- `SupplyChoice = { electricity: boolean; tokens: boolean }`；`FamilyMemberId = 'player' | 'father' | 'mother' | 'wife' | 'son'`；`FamilyState = Record<FamilyMemberId, { powerPressure: number; tokenPressure: number; damage: 0 | 1 | 2 | 3 | 4; memoryIntact: boolean }>`，损伤级别沿主规格的健康到核心销毁顺序。
- `LoadResult = { kind: 'empty' } | { kind: 'valid'; state: RunState } | { kind: 'invalid'; raw: string; reason: string }`；`SaveResult = { ok: true } | { ok: false; reason: string }`；`SessionLease = { canWrite(): boolean; takeOver(): Promise<boolean>; release(): void }`。
- `AssetCatalog = { portraits: Record<string, { image: CanvasImageSource; rect: { x: number; y: number; width: number; height: number } }> }`；`hitStampArea` 的 point 为世界坐标，booklet 为 `Rect`，page 为 `'cover' | 'inside'`；`Rect = { x: number; y: number; width: number; height: number }`。实际有效章区由册内页布局常量定义。
- `commitTransition(previous: RunState, transition: Transition): Promise<{ ok: true; state: RunState } | { ok: false; reason: string }>` 校验标签写入权并保存后才允许 effects 播放；失败时不让后续办件越过未保存事务。

### Task 1: 固定首日案卷和规则

**Files:** Create `src/domain/day-one.ts`, `tests/unit/day-one.test.ts`，以及本任务必需的 package／TypeScript／Vite 配置。

**Interfaces:** Produces `DAY_ONE_CASES: readonly DayOneCase[]`、`requiredDecision(caseFile: DayOneCase): Decision`、`getModePolicy(mode: Mode)` 与上面的基础类型。

- [ ] 先写业务断言：8 案 id 为 D01-S01…S08，IP 顺序 JP、US、CN、SG、GB、RU、FR、JP；结果依次允许、允许、拒绝、允许、允许、拒绝、允许、允许；新加坡中文不增加拒绝理由。
- [ ] 添加最小脚本：`dev=vite --host 127.0.0.1`、`typecheck=tsc --noEmit`、`test=vitest run`、`build=tsc --noEmit && vite build`、`preview=vite preview --host 127.0.0.1`、`test:e2e=playwright test`；锁定实际依赖版本，不用脚手架覆盖已有设计文件。
- [ ] Run `npm run test -- tests/unit/day-one.test.ts`，确认先因缺少领域模块失败，再实现固定数据与规则。
- [ ] 重跑该测试和 `npm run typecheck`；要求全部通过，数据中没有提前出现许可／护照／语言资格。

### Task 2: 裁决、返还与一次性账本

**Files:** Create `src/domain/run.ts`, `tests/unit/run.test.ts`。

**Interfaces:** Consumes Task 1；produces `newRun(mode: Mode, runId: string): RunState`、`reduceRun` 和全部动作／Effect 定义。账本用稳定业务 id，如 `case:D01-S01:wage`，不以动画帧作交易标识。

- [ ] 写失败用例：正确拒绝同样 +5；明显违规 CN 放行标准首罚 10、取消该案计件且不占普通警告；第二次 RU 明显违规按制作初值罚 15；普通错拒标准第一次仅警告、后一次 10。轻松对应 5／10、两次普通警告。
- [ ] 写失败用例：同一 actionId、同一案件已裁决后的第二枚章均不能重复结算；必须按手动返还完成才叫下一人；第 8 案后不生成第 9 案。
- [ ] 写计时边界：标准初值 360000ms，教学／罚单／后台／设置暂停；普通办件递减；归零可完成已在场案件，再收班；轻松始终不限时。
- [ ] Run `npm run test -- tests/unit/run.test.ts` 确认失败，再实现纯状态迁移。每笔查获与计件同一事务产生，先保存事实后允许显示动画。
- [ ] 重跑 Task 1／2 测试与 typecheck，保留每个错误裁决对应的规则版本及处罚事实供后续首周使用。

### Task 3: 刷新续玩与唯一写入进程

**Files:** Create `src/storage/session.ts`, `tests/unit/session.test.ts`, `tests/e2e/session.spec.ts`, `tests/fixtures/session.html`, `tests/fixtures/session.ts`，以及本任务所需 Playwright 配置。

**Interfaces:** Consumes RunState／Transition；produces `loadRun(): LoadResult`、`saveRun(state: RunState): SaveResult`、`acquireSession(): Promise<SessionLease>` 与 `commitTransition`。SessionLease 暴露写入资格、接管和释放，不向产品提供历史存档入口。

- [ ] 写失败用例：坏 JSON、未知 schemaVersion、配额写入异常均保留原始存储并返回可显示的失败；重复读取不创建新局；使用单一完整快照保证不能只保存半张账单。
- [ ] 在专用 session fixture 接入 Task 2 的真实 reducer 和本任务存储，用最小办件／接管控件验证浏览器行为；此时尚未依赖 Task 4 的正式画布。用例：盖章结果保存后 reload，已入账一次、仍能继续返还；第二标签只读待接管，接管后旧标签不可再提交。Task 6 再用正式页面复核同样场景。
- [ ] Run `npm run test -- tests/unit/session.test.ts` 确认失败；实现可校验快照和浏览器锁／显式接管。写权限缺失时阻止提交，不以默认成功绕过。
- [ ] Run 单测及 `npm run test:e2e -- tests/e2e/session.spec.ts`；要求真实页面证明刷新和双标签行为，不仅 mock 保存函数。
- [ ] 尚未实现的后续工作日不得从空默认值伪造出来；D1 完成记录可稳定保存为 D2 班前待续。

### Task 4: 三分屏、实体通行册与拖章

**Files:** Create `src/view/desk.ts`, `src/view/hit-test.ts`, `src/view/shell.ts`, `src/view/styles.css`, `src/main.ts`, `tests/unit/hit-test.test.ts`, `tests/e2e/desk.spec.ts`。

**Interfaces:** Consumes reducer 和已提交 RunState；produces `toWorldPoint(clientX: number, clientY: number, bounds: DOMRect): { x: number; y: number } | null`、`hitStampArea(point, booklet, page): boolean`、`renderDesk(ctx: CanvasRenderingContext2D, state: RunState, assets: AssetCatalog): void`。交互只派发 Task 2 定义动作。

- [ ] 写失败用例：画布 letterbox／2×与3×缩放坐标一致；落在非章区、未打开册页、画布外 pointerup 或取消拖动不裁决。
- [ ] 实现大幅独立晨报、上班入口及班前 V01 纸条；桌上只有两章、地区规则与申请人实际交出的通行册。通行册有封皮和内页，章迹留在纸上。
- [ ] 使用已确认普通人物样板作为图集输入，记录每个 portraitId 的源图与矩形；Canvas 按矩形取图并保持像素边缘，不修改源图或重新发起长相选择。家属使用已确认 A 行，守卫仅灰衣蒙面，不显示个人姓名。
- [ ] 接入拖动、层级、打开册页、有效盖章与手动返还。pointer capture／失焦取消有明确状态，不让返还或辅助文字层吞掉盖章输入。
- [ ] Run unit tests；用 Playwright 真正拖动鼠标测试有效章区、无效落点、快速双释放、返还后叫号，要求账本与页面同一案件状态一致。
- [ ] 在 1280×720、1920×1080 观察并截取晨报、窗口和章区；长文本可读，D01-S04 中文合规，页面不出现未解锁字段。

### Task 5: 强制租金、供养预览与家属终端

**Files:** Create `src/domain/night.ts`, `tests/unit/night.test.ts`；Modify run／shell／main；Create `tests/e2e/night.spec.ts`。

**Interfaces:** Produces `settleDay(state: RunState): Transition`、`previewSupply(state: RunState, choice: SupplyChoice): { affordable: boolean; balance: number; family: FamilyState }`、`submitSupply(state: RunState, choice: SupplyChoice, actionId: string): Transition`；FamilyState 包含五个固定模型的两项压力、健康及记忆状态。预览不修改真实状态。

- [ ] 失败断言：标准 20＋8×5－20－20－20＝0；轻松 50＋8×5＋10－20－20－20＝40；未处理案 0，不额外发培训补贴。
- [ ] 失败断言：扣租点余额 19 直接 E13；20 可付租剩 0；21 剩 1；超余额供养组合不可提交；收入先清欠罚，可用余额不把欠缴计为钱。
- [ ] 失败断言：预览四种套餐不变更状态；首晚缺某项压力 +2、提供则最低 0；两项全付没有损伤；同 actionId 重复提交不扣第二次也不推进第二晚。
- [ ] Run `npm run test -- tests/unit/night.test.ts` 确认失败，再实现账单与首晚推进。家庭 UI 用人脸终端、模型名和当前短句；首日健康不摆无效修复购买项。
- [ ] 页面验证在扣租后、供养提交后各刷新一次，余额与家属状态一致；结束到 D2 待续，E13 则本局结束并保留唯一状态。
- [ ] Run Task 1–5 单测与相关 e2e，记录两种模式的实际首晚余额截图。

### Task 6: 拟声、整体试玩和本地交付

**Files:** Create `src/audio/feedback.ts`, `tests/e2e/day-one.spec.ts`, `README.md`, `docs/validation/first-day-playable.md`；Modify shell／main；Create runtime asset manifest。

**Interfaces:** Produces `playUtterance(profileId: string, text: string): void`、`stopFeedback(): void`、`setAudioLevels(music: number, effects: number): void`；音频不能推进 reducer 的对话行。素材 manifest 记录图集源、许可与原生显示尺寸。

- [ ] 写页面用例：播放结束／静音后台词仍等待一次点击；下一句一次点击只前进一步；页面后台与设置暂停时钟；恢复不补扣后台经过时间。
- [ ] 用浏览器内原创短促拟声和机械反馈接入音量，不下载来历不明的原作声音；权限需用户首次操作时正常激活。静音时字幕与规则完整。
- [ ] Run `npm run typecheck`、`npm test`、`npm run test:e2e`、`npm run build`。只在新失败或修改后重跑对应检查，不能把未执行的命令写成已通过。
- [ ] 由本地静态服务器打开构建结果，实际操作两种模式各完成 D1；检查失败路径 E13、刷新、两种视口、静音与素材缺失的可见状态。截图和余额写入 validation 文件。
- [ ] README 写本地启动、操作、首日范围、唯一续玩和已验证／未覆盖内容；交付源码及 dist，不进行云发布。当前不是完整31天，不能声称全部13结局可达。
- [ ] 人工复核：首日规则只有 IP，实体册形制正确，日常交互无路线提示或特别不可逆确认，素材沿用已确认方向。通过后为 D1–D7 的许可、护照、80 案和固定首袭单独列下一阶段计划。

## Self-Review / 计划复核

- 覆盖本里程碑全部 D1 规则、8 案、两种模式、实体印章、结算／E13、家庭、拟声及唯一续玩；完整 31 天、封号、枪械、复杂损伤和其余终局属于后续独立里程碑。
- 五项 Review Focus 均有对应逻辑或页面断言；没有用“页面能打开”代替办完一天。
- 同一 RunState、actionId、caseId 和 Transition 从规则到输入、保存、动画一致；账本与画面不能各自维护余额。
- 计划中的命令、依赖与文件均是未来动作，未声称已创建、安装或通过。尚无 Git，因此此阶段记录可检查的本地交付；不插入失败必然的 commit 命令。
- 一切以实际图像、余额、交互和刷新结果复核；运行样段交付后再校准节奏和手感。

## 查阅过的官方工具资料

仅作为制作工具依据，当前不把产品接入这些网站：[Vite](https://vite.dev/guide/)、[Vitest](https://vitest.dev/guide/)、[Playwright](https://playwright.dev/docs/intro)。工具选择是实现细节，不新增玩家流程或收费。

