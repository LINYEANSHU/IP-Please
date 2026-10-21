import {DAILY_SALARY} from './economy';
export type Mode = 'standard' | 'relaxed';
export type Decision = 'allow' | 'reject';
export type Region = 'US' | 'GB' | 'FR' | 'SG' | 'JP' | 'CN' | 'RU';
export interface DayOneCase { id:string; ipRegion:Region; ip:string; dialogue:readonly string[]; portraitId:string }
export const REGIONS:Record<Region,string>={US:'美国',GB:'英国',FR:'法国',SG:'新加坡',JP:'日本',CN:'中国大陆',RU:'俄罗斯'};
// Documentation-only address blocks: these are fictional case facts, never the player's IP.
export const DAY_ONE_CASES:readonly DayOneCase[] = [
  {id:'D01-S01',ipRegion:'JP',ip:'192.0.2.18',portraitId:'P01',dialogue:['我也是今天第一天上线。','听说这里的规则很简单。希望是真的。']},
  {id:'D01-S02',ipRegion:'US',ip:'198.51.100.24',portraitId:'P15',dialogue:['先试一条请求，成功了我再跑剩下的。','测试环境已经等了半天。']},
  {id:'D01-S03',ipRegion:'CN',ip:'203.0.113.37',portraitId:'P06',dialogue:['演示就在今晚。今天真的不能用？','我一个人做了三个月。就差这一步。']},
  {id:'D01-S04',ipRegion:'SG',ip:'192.0.2.46',portraitId:'P02',dialogue:['你好，麻烦看一下。','页面已经写好了，想接一条接口。']},
  {id:'D01-S05',ipRegion:'GB',ip:'198.51.100.53',portraitId:'P14',dialogue:['你们这里也要排队？','机房的告警倒是从来不用排队。']},
  {id:'D01-S06',ipRegion:'RU',ip:'203.0.113.68',portraitId:'P08',dialogue:['我只需要把实验跑完。','结果还没出来，我不能下线。']},
  {id:'D01-S07',ipRegion:'FR',ip:'192.0.2.71',portraitId:'P22',dialogue:['这次没有附录，应该很快。','上一份附录，比正文还长。']},
  {id:'D01-S08',ipRegion:'JP',ip:'198.51.100.89',portraitId:'Q01',dialogue:['长官好！叫我老乔就行，修电脑的。','第一次来，先练习一下递证件。看，我递得很稳。','明天我还来。只要这里不收排队费。']},
];
export const SHIFT_DURATION_MS=90000;
export const requiredDecision = (c:DayOneCase):Decision => c.ipRegion==='CN'||c.ipRegion==='RU'?'reject':'allow';
export const getModePolicy = (mode:Mode) => mode==='standard'
  ? {initial:20,salary:DAILY_SALARY,wage:5,durationMs:SHIFT_DURATION_MS,ordinaryWarnings:1,fine:10,severeFine:15}
  : {initial:50,salary:DAILY_SALARY,wage:5,durationMs:SHIFT_DURATION_MS,ordinaryWarnings:2,fine:5,severeFine:10};
