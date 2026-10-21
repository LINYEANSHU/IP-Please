import type {DayOneCase} from './day-one';

// A run-specific choice stays stable across reloads without changing case facts.
function pickSeed(value:string):number {
  let hash=2166136261;
  for(const ch of value)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  return hash>>>0;
}
const WORK_CHAT:readonly (readonly string[])[]=[
  ['今天凌晨又被告警叫醒了，手机比闹钟尽责。','我是做运维的。服务器没事的时候，才轮到我吃饭。','昨晚刚把机房收拾好，今天又多了一排线。'],
  ['我教编程。学生今天问，报错信息能不能算阅读理解。','学校的旧电脑终于能开机了，我想给孩子们多做几个例子。','今天第一节课讲循环，教室的投影仪倒是一直在重启。'],
  ['我是做前端的。今天把按钮挪了两像素，又挪回去了。','客户说页面要简洁，附件发来三十七条修改。','今天总算把小屏适配好了，老板换了块更小的屏。'],
  ['做后端的。今天最想听到的一句话是，没有新增需求。','早上发布的时候，我连咖啡都没敢碰。','队列倒是很眼熟。平时我负责修另一种队列。'],
  ['我的实验还在跑。今天最好别再停电了。','论文的截止日期不会等我，显卡倒是经常让我等。','今天的实验终于没报错，只是结果和昨天一样。'],
  ['我在小公司做测试，今天总算轮到别人检查我的材料。','昨天抓到一个只在周五出现的错误，今天还没敢庆祝。','同事说已经全测过了。我一般听到这句就开始加班。'],
  ['做无障碍工具的。今天有人第一次自己读完了一封信。','我做字幕工具，最怕别人说，差不多能看就行。','早上有位用户发来感谢邮件，我把它打印出来带着了。'],
  ['我修老系统。今天发现一段注释，比我工龄还长。','文档写着临时方案。看日期，已经临时了九年。','今天接手一台旧机器，开机声音像我小时候的电风扇。'],
  ['一个人做独立游戏。今天给角色加了睡觉，我自己还没睡。','游戏里的商店终于能找零了，现实里的账还没算完。','今天修好了存档。做完才想起来自己还没吃早饭。'],
  ['我做数据清洗。今天表格里又有人把姓名填成了日期。','早上的数据多了一个空格，半个团队陪着找了两小时。','今天最大的进展，是终于知道昨天的数据为什么不对。'],
  ['我做翻译工具。今天又有个成语让机器想了半天。','早上校对了一封家书，写得很短，改得特别慢。','有些句子不难翻，就是翻完听起来不像人在说话。'],
  ['我是刚入职的工程师，今天第一次拿到自己的工牌。','导师让我多问问题，今天排队时我把问题都想好了。','今天第一次自己发了版本。现在还忍不住看手机。'],
];
const DAILY_CHAT=[
  '今天风真大，排队的时候一直按着这些纸。',
  '来时的车晚了两班，还好赶上窗口开着。',
  '门口的热饮机又坏了，只剩一盏灯亮着。',
  '早上出门太急，走到这里才发现带了两把钥匙。',
  '外面有人分面包，可惜排到我的时候刚好发完。',
  '今天的天色一直这样，差点分不清早上还是傍晚。',
  '刚才排在我前面的人，把伞落在长椅上了。',
  '下班后想去买点菜，希望那家店还开着。',
  '今天好像要下雨。你们这个窗口倒是淋不到。',
  '来的路上碰到老同事，聊了半天，谁也没提工作。',
  '早上收音机说天气不错。可能说的是别的地方。',
  '我把材料装了三次才出门，总觉得会落下一张。',
];
const THANKS=[
  '谢谢，我这就过去。', '谢谢，今天总算有件顺利的事。',
  '谢谢你。祝你今天值班顺利。', '谢谢，我会把材料收好的。',
  '谢谢，终于赶上了。', '谢谢。外面风大，你也注意保暖。',
  '谢谢，那我先走了。', '谢谢，辛苦了。',
  '谢谢，我可以回去继续干活了。', '谢谢。希望下次不用排这么久。',
];
export function applicantDialogue(c:DayOneCase&{personId?:string},runId:string):readonly string[] {
  // Story contacts keep their authored dialogue and their own voice.
  if(c.portraitId.startsWith('M'))return c.dialogue;
  const seed=pickSeed(`${runId}:${c.id}`),work=WORK_CHAT[seed%WORK_CHAT.length];
  if(c.personId&&!c.personId.startsWith('PERSON-'))return [...c.dialogue,DAILY_CHAT[seed%DAILY_CHAT.length]];
  return [...c.dialogue,work[Math.floor(seed/WORK_CHAT.length)%work.length],DAILY_CHAT[Math.floor(seed/97)%DAILY_CHAT.length]];
}
export function approvalThanks(c:DayOneCase,runId:string):string {
  return THANKS[pickSeed(`${runId}:${c.id}:approval`)%THANKS.length];
}
