# IP PLEASE · 请出示 IP

**简体中文** · [English](README.en.md)

在 A÷ 的访问审查窗口值班：翻开护照，核对公文，拖章裁决，再靠工资维持模型一家人的运行。

这是 **[ctnyanya 的 IP, PLEASE](https://github.com/ip-please/ip-please.github.io) 的非官方改编与扩展**。感谢原作者的开源作品与创意。本仓库是公开 fork，保留上游历史及 MIT 声明，采用 TypeScript、Canvas 与 DOM 重实现，并扩展为自己的 31 日流程；不是官方续作，也不把上游工作归作原创。详细来源见 [第三方声明](THIRD_PARTY_NOTICES.md)。

![中文实机：人物受理窗、独立证件与可拖放印章](docs/readme/desk-zh-1280.png)

**31 日 · 368 个案位 · 13 个结局 · 中文 / English · 唯一自动续玩**

## 这一版有什么

- **同一张小桌。** 护照册、许可证、绑定条和授权原件独立拖放、遮叠、逐件退还。拖动章柄，在露出的册内章区松手；退册前可重盖改判。
- **逐日扩张的规则。** 从当前 IP 到身份、委托和历史记录。单击字段自动匹配对应证据；规则版本决定当日判断，后来的条款不追罚早期正确裁决。
- **下班还有一家人。** 工资、租金、电力、Token 与逐人修复使用同一账本。来函、原件去向、申诉和救援留下实际记录，日常处理逐渐形成结局。
- **完整双语显示。** 页顶随时切换简体中文 / English，菜单、证件、规则、报纸、对白、账单、救援和尾声共用同一进度。英文长报栏可独立滚动，纸面摘要另有完整原文入口。
- **本地运行。** 无后端、无 LLM 调用，不采集玩家真实 IP 或设备信息；素材和字体随仓库提供。

![英文版实机：同一桌面和同一组规则](docs/readme/desk-en-1280.png)

## 开始试玩

需要 **Node.js 24+**、npm、较新的 Chrome / Edge / Firefox。建议电脑横屏，至少 1280×720；手机不是这一版的目标平台。

```bash
git clone https://github.com/LINYEANSHU/IP-Please.git
cd IP-Please
npm ci
npm run dev
```

打开 [http://127.0.0.1:5173](http://127.0.0.1:5173)。首次默认中文，页顶 **English** 切换英文；语言偏好独立保存，切换不重开本局。

```bash
npm run build
npm run preview -- --port 4173
```

生产产物在 `dist/`，通过 HTTP 服务打开。**本分支需要构建，不能像上游静态版那样直接双击 HTML。** 本仓库发布源码，未自动部署在线试玩站点。

## 怎么玩

1. 选择标准或轻松值班，读晨报与当日公文，再叫下一位。
2. 翻开册子，对照规则。直接点击字段自动核对；需要补件时询问材料。
3. 拖允许 / 拒绝章到册内章区。把册子及每张材料逐件拖回左侧人物窗口。
4. 收班统一查看差错，结清工资与租金，再选择家庭供养和修复。

两模式每天均为 **90 秒累计接待时间**；未叫号或退齐材料后的空窗暂停，接待下一位继续剩余时间。轻松模式初始余额较高，救援采用逐步瞄准。完整操作、经济与续玩说明见 [中文玩法手册](docs/PLAYING.zh-CN.md) / [English guide](docs/PLAYING.en.md)。

| 按键 | 操作 |
|---|---|
| `O` | 翻开 / 合拢册子 |
| `A` / `R` | 拿允许 / 拒绝章 |
| `Enter` | 在露出的有效章区落章 |
| `I` | 开关字段连线提示 |
| `Escape` | 放回工具、关闭阅读或暂停 |

**续玩：** 只保留当前浏览器、当前站点的唯一进度，刷新会续办。换端口、浏览器或清除站点数据不会共享进度。多个标签只有一个能写，可在另一标签接管。存储错误会暂停并保留原文，提供重试，不静默覆盖。

## 开发与验证

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium chrome
npm run test:e2e
```

Linux 跑包含真实前后台切换的完整浏览器测试时使用 `xvfb-run -a npm run test:e2e`；缺系统依赖时执行 `npx playwright install --with-deps chromium chrome`。

`npm run test:i18n` 检查英文目录与源对白覆盖；`npm run test:bilingual` 检查语言切换、进度保持和双语界面。[GitHub Actions](https://github.com/LINYEANSHU/IP-Please/actions/workflows/ci.yml) 对同一提交在 Windows、macOS、Linux 执行单元、构建与生产预览浏览器测试。

| 目录 | 内容 |
|---|---|
| `src/domain/` | 31 日规则、案卷、经济与剧情状态机 |
| `src/view/` | Canvas 物件、DOM 阅读与操作界面 |
| `src/storage/` | 唯一进度、事务、迁移与多标签租约 |
| `src/i18n/` | 显示翻译，保留原始存档事实 |
| `public/assets/` | 人物、字体、裁切来源与许可 |
| `tests/` | 单元与真实浏览器回归 |

新增中文对白、规则或 UI 时同步更新 `src/i18n/en.json`。不要翻译案号、动作 ID 或存档字段；不要以语言选择改变裁决。更多实现和验证见 [双语发布记录](docs/validation/2026-10-22-bilingual-release.md)。

## 致谢与许可

- **原作：** [IP, PLEASE](https://github.com/ip-please/ip-please.github.io)，ctnyanya，MIT。当前改编由 LINYEANSHU 维护，原作者声明保留在 [LICENSE](LICENSE)。
- **玩法与美术启发：** Lucas Pope 的 [Papers, Please](https://papersplea.se/)。无官方合作或背书关系。
- **字体：** TakWolf 等的 [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font)，[SIL OFL 1.1](public/assets/licenses/OFL-fusion-pixel.txt)，不改为 MIT。
- **本项目图像：** 已确认生成图集、裁切与实机截图；来源见 [asset manifest](public/assets/manifest.json) 与 [第三方声明](THIRD_PARTY_NOTICES.md)。参考资料既有权利不由代码许可重新授予。

故事、机关报、指控、数字、人物对白及事件均为架空讽刺创作，不是现实新闻或事实认定。
