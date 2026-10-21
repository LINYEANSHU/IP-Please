# 机关报、桌面核对与 90 秒值班

## 用户本轮确认的修改

- 点击许可证、绑定、连接或商业材料只置顶，不打开二级阅读窗口；点击字段直接核对。册子仍可翻页，纸质公文保留阅读入口。
- 删除可见核对结果面板，只在字段之间画连线与端点。结果颜色沿用一致／不符；完整文字仅提供给辅助阅读，不占上方画面。
- 《安全日报》改成三栏机关报，七天各有社论、领袖讲话、融资消息、对外宣传、生活短讯和更正启事；当日真实办件条款独立成栏，报道不增加审批条件。
- 逐案指定人物头像，删除按案号轮换头像；头像清单增加人工核对的性别表现记录，保证叶莲娜、安娜、Olivia、Lucas、Benoît 等姓名与头像相配。
- 供养与修复可正常勾选，费用过高时按钮仍可点击；支付时弹“余额不足”，列明余额、费用和差额，不扣钱、不推进，关闭后保留勾选。
- 册子递还前可重新盖章，替换本案裁决并撤回上一裁决对应的工资、罚款和差错数；同章重复不入账。递还册子后不能修改。
- 原创常客“老乔”每天出现一次：练习递件、举手绘材料、倒拿同事的材料、敬礼、翻口袋、鞠躬、展示没有围栏的画。使用同一面孔、不同对白与实际 Canvas 小动作，支持减少动态效果设置。仍占正常案位，不引入新通关条件。
- 标准与轻松模式每天均为 90 秒。未标记的旧 schema2 60 秒在场进度在内存加 30 秒，保留已用时间；关闭的班次不重新打开。首次读取不覆写存档，成功操作后保存 90 秒标记。

## 现实资料与架空内容

Anthropic 官方领导页面确认 Dario Amodei 为联合创始人兼 CEO：
https://www.anthropic.com/company/leadership

这里只核对名字和身份。机关报中的领袖角色、讲话、融资数字、国家机构和对中国模型／俄罗斯来源流量的指控均为游戏内虚构宣传。报纸页脚明确标为架空讽刺剧情，审批规则与此分栏。

## 新图像来源

- 内置 imagegen 生成；保存为 `public/assets/portraits/old-qiao.png`，资产 ID `Q01`。原有图集保留，裁切与 SHA256 记入 `public/assets/manifest.json`。
- 提示词：

> One original fictional comic recurring visitor portrait for a muted pixel-art border inspection game, inspired by the archetype of an endearing hopelessly optimistic habitual applicant, not a copy of an existing named character. A clearly male middle-aged scruffy repairman with a slightly long narrow face, very large expressive eyebrows, protruding ears, crooked friendly grin showing one missing tooth, an oversized battered olive-brown cap sitting comically askew, rusty brown patched work coat with loose collar, a short pencil tucked behind one ear. Front facing upper body passport-window pose; head and complete cap fully within image, modest shoulders, plenty of dark charcoal brown empty background #211f1c. Restrained, melancholy-but-funny, kind human expression, a little mischievous, tired eyes, no sinister villain. Authentic crisp square-pixel illustration with muted earth, slate, olive and warm skin tones, hard pixel shading, NO vector outlines, NO smooth cartoon, NO text, NO labels, NO badge, NO weapons. Square image, face centered, head top at 10% image height, shoulders at 90%. Match the reference sheet's pixel size and shading closely; the reference is for style only, make this a distinct new face. This is the final actual playable character asset called Old Qiao.

## 验证

本轮新增 17 项单元测试覆盖姓名与头像、七期日报与当日规则、90 秒及旧存档内存适配、改章账目、七天常客；连同原有单测共 162 项通过。浏览器实际测试支付弹窗、重复改章、文件点选不弹窗、连线核对、七天报纸排版与常客动作。1280×720、1920×1080 的报纸与交互图证保存在 `proofs/press-*`、`proofs/old-qiao-*`、`proofs/desk-line-only.png`、`proofs/insufficient-balance.png`。

最终结果：

- `npm run build`：TypeScript 与 Vite 构建通过。
- `npm test`：24 个文件、162 项全部通过。
- 54 项快速浏览器检查分批通过：首批 19 项，正式构建后续 34 项，以及独立会话事务 1 项。包含 90 秒两种模式截止、七天×两种尺寸报纸完整性、七天人物动作、改章、退件、余额不足、保存失败与接管。
- `IP_PLEASE_PRODUCTION=1 npx playwright test tests/e2e/week.spec.ts -g 标准值班`：实际鼠标完成标准模式首周 80 案、D7 过场、结算与 D8 续玩，1 项通过。轻松模式整周经济由单元测试覆盖，本轮没有重复轻松模式的完整 80 案浏览器长流程。
- 开发预览的一次并行检查中出现页面加载超时；对应条目已在正式构建预览中复核通过。源程序恢复后重新通过类型检查、构建与完整单测，存档未被恢复操作修改。
- 已实际查看日报、老乔与余额不足弹窗截图；两种尺寸的每栏均完成溢出检查。
- 原 Impeccable 检测仅有既有像素晨报分隔线的样式告警，没有新增检测项。
- 老乔资源 SHA256：`f1cb651f9a1221d3d27c56d18910e666126515ac008ad7c95b17f33a57d073c3`。
