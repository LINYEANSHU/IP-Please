# 2026-10-21：文件前景、窗口对白与检查站位置

用户确认：所有文件始终在最前面，仍可自由拖动；批准后申请人道谢；增加人物与随机生活对白；检查站在栏杆受理口，警卫在检查点后方。

## 本次修改

- Canvas 的证件、公文和册页最后绘制；固定印章、底栏和场景处于其后。正在拖动的章仍显示在手上。
- 普通 DOM 控件按所有在场纸张的并集裁切，裁切同时影响显示与鼠标命中。交叠区域不会露出底下的标签，移开纸张后控件恢复。
- 批准后对话记录追加感谢并播放原有机械拟声；拒绝不产生感谢。退件后保留记录，到下一位时换新。感谢从已保存裁决派生，重复动作与刷新不追加第二次，也不改变工资和罚款。
- 新增 36 条工作闲聊、12 条生活天气闲聊、10 条感谢。普通案件在原对白后补两句，点击一次一句；已命名的固定联系人保留其职业设定，剧情人物保留原对白。按本局 ID 与案号选取，读档不会重新抽取；存档校验同步支持新增句数。
- 新增 P13–P24 共 12 张实际人物图，加入 D1 与后续普通案件；固定回访和剧情人物保留原貌。每日 60 秒与首周 80 案不变。
- 原右侧独立小屋改为闸杆旁的检查站前沿标识，警卫站在通行侧后方。

## 图像来源

- 使用内置 imagegen，参考现有 `public/assets/portraits/engineers.png`，生成新图集；保留原图集。
- 项目资源：`public/assets/portraits/engineers-v2.png`，1254 × 1254，4 列 × 3 行；裁切信息与 SHA256 见 `public/assets/manifest.json`。
- 生成提示词：

> Create a NEW sprite atlas for an existing restrained dystopian border inspection game. The provided image is STYLE REFERENCE ONLY; do not reproduce its faces or labels. Deliver exactly 12 distinct new fictional ordinary engineers / tech workers, bust portraits, facing directly forward, in a strict 4 columns by 3 rows grid. Square atlas. Every cell must have exactly equal size and identical framing: full head and upper shoulders centered, head top 8% below cell top, shoulders extend to 92% cell height; leave clean padding at all cell edges. Flat uniform dark charcoal brown background #211f1c across every cell. NO letters, NO captions, NO numbers, NO borders, NO gutters or gridlines. Match the reference's genuinely pixelated square pixels, rich but muted earth/olive/slate/rust palette, hard pixel shading, tired humane facial expressions, front-facing passport pose, painterly pixel portrait detail. Twelve new adults with very different face shapes, hair, age, skin tones, glasses and clothing; 6 men and 6 women; include a grey-haired woman network veteran, a dark-skinned man with round glasses, a man in a knit cap, a woman with tight curls, an older bald engineer, a woman with silver-framed glasses, a man with a narrow moustache, a woman with a bun and work jacket, a young man with shoulder-length hair, a freckled woman in a sweater, an older South Asian man with grey beard, and an East Asian woman with short cropped hair. No uniforms or weapons or corporate logos. These will be cropped by uniform grid coordinates into 12 actual playable portraits. This is a new atlas; preserve the existing reference asset unchanged.

## 验证内容

- 单元测试覆盖感谢、重复裁决、退件后的记录、逐句闲聊、读档及存档合法性；原有首周规则和材料测试继续执行。
- 浏览器覆盖 1280 × 720、1920 × 1080 文件与标签的交叠命中、文件压住印章、感谢与刷新、后续叫号；保留 `proofs/paper-foreground-*.png` 与 `proofs/window-thanks-*.png`。
- 浏览器旧用例同步至现有界面：印章实际坐标、纸质公文阅读入口、累积对话记录和单字段自动核对。
- Impeccable 检测仅报现有晨报 `border-bottom:3px solid`，属于像素报纸既有标题分隔线；本轮保留。

## 最终结果

- `npm run build`：通过，TypeScript 与 Vite 产物正常。
- `npm test`：22 个文件、145 项全部通过。
- `npx playwright test --grep-invert '实际鼠标办完首周80案'`：48 项全部通过，含新增的核对栏前景命中和对话按钮布局检查。
- 标准、轻松两种模式各实际鼠标完成首周 80 案，进入 D8 并验证账目与刷新续玩，均通过。最后的核对栏层级修订后未重复这两项耗时整周流程；已重跑上述 48 项快速用例。
- 旧测试中过时的印章坐标、阅读窗口名称、字体预期、手选双字段入口均已同步到现有交互；对应修订后的用例全部通过。
- 已检查 1280 × 720、1920 × 1080 的文件前景与放行感谢截图；新图集为内置 imagegen 生成，源文件 SHA256：`9620adc972b2491c47077ac74fb95011665f36a41d1f1788cb64797e3341e073`。
