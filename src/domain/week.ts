import { DAY_ONE_CASES, REGIONS } from './day-one';
import type { DayOneCase, Region } from './day-one';
import type { DayDef, EvidencePaper, WeekCase } from './week-contract';
import {CAMPAIGN_DAYS,preserveKnownIdentities} from './campaign-content';

export const PERMIT_ISSUERS: readonly string[] = ['访问许可处', '全球人才通行署'];

const PHONE_PREFIX: Record<Region, string> = {
  US: '+1 202 555 01',
  GB: '+44 7700 900',
  FR: '+33 1 99 00 00',
  SG: '+65 6000 00',
  JP: '+81 90 0000 00',
  CN: '+86 10 0000 00',
  RU: '+7 900 000 00',
};

type PaperSpec = Partial<Omit<EvidencePaper, 'id'>>;

interface Seed {
  id: string;
  ipRegion: Region;
  ip: string;
  name: string;
  nationality?: Region;
  location?: Region;
  personId?: string;
  portraitId: string;
  dialogue: readonly string[];
  passportNumber?: string;
  applicationId?: string;
  account?: string;
  phone?: string;
  purpose?: 'personal' | 'business';
  requestedScope?: string;
  principal?: string;
  connectionIssue?: 'none' | 'shared' | 'session' | 'identity';
  connectionSession?: string;
  permit?: false | PaperSpec;
  permitAsked?: PaperSpec;
  binding?: false | PaperSpec;
  bindingAsked?: PaperSpec;
  connection?: false | PaperSpec;
  connectionAsked?: PaperSpec;
  business?: false | PaperSpec;
  businessAsked?: PaperSpec;
  extraInitial?: readonly PaperSpec[];
  extraAsked?: readonly PaperSpec[];
  askLines?: readonly string[];
}

function makePaper(c: WeekCase, suffix: string, spec: PaperSpec): EvidencePaper {
  const rest: PaperSpec = { ...spec };
  delete (rest as { id?: string }).id;
  return {
    id: c.id + '-' + suffix,
    kind: 'note',
    title: '案件材料',
    subject: c.name,
    ...rest,
  } as EvidencePaper;
}

function passportPaper(c: WeekCase): EvidencePaper {
  const nationality = REGIONS[c.nationality];
  return {
    id: c.id + '-PASSPORT',
    kind: 'passport',
    title: '护照 · ' + nationality,
    subject: c.name,
    issuer: '护照签发机关',
    number: c.passportNumber,
    passportNumber: c.passportNumber,
    note: '国籍 ' + nationality + '；姓名 ' + c.name + '；证件号 ' + c.passportNumber + '。',
  };
}

function permitPaper(c: WeekCase, day: number, spec: PaperSpec = {}): EvidencePaper {
  const p: PaperSpec = {
    kind: 'permit',
    title: '访问许可证',
    subject: c.name,
    issuer: PERMIT_ISSUERS[0],
    number: 'LIC-' + c.applicationId,
    applicationId: c.applicationId,
    validFrom: 1,
    validTo: 10,
    ...(day >= 3 ? { passportNumber: c.passportNumber } : {}),
    ...spec,
  };
  p.note ??= '签发机关 ' + p.issuer + '；申请编号 ' + p.applicationId + '；姓名 ' + p.subject
    + (p.passportNumber ? '；证件号 ' + p.passportNumber : '')
    + '；有效期第 ' + p.validFrom + '–' + p.validTo + ' 工作日，首尾均包含。';
  return makePaper(c, 'PERMIT', p);
}

function bindingPaper(c: WeekCase, spec: PaperSpec = {}): EvidencePaper {
  const p: PaperSpec = {
    kind: 'binding',
    title: '账号绑定凭条',
    subject: c.name,
    issuer: '账号服务处',
    number: 'BIND-' + c.applicationId,
    account: c.account,
    phone: c.phone,
    validFrom: 1,
    validTo: 10,
    ...spec,
  };
  p.note ??= '使用人 ' + p.subject + '；账号 ' + p.account + '；手机号 ' + p.phone
    + '；有效期第 ' + p.validFrom + '–' + p.validTo + ' 工作日，首尾均包含。';
  return makePaper(c, 'BINDING', p);
}

function connectionTitle(issue: WeekCase['connectionIssue']): string {
  if (issue === 'shared') return '共享出口连接核验条';
  if (issue === 'session') return '连接会话核验条';
  return '连接主体核验条';
}

function connectionPaper(c: WeekCase, spec: PaperSpec = {}): EvidencePaper {
  const p: PaperSpec = {
    kind: 'connection',
    title: connectionTitle(c.connectionIssue),
    subject: c.name,
    issuer: '连接核验处',
    number: 'CONN-' + c.applicationId,
    session: c.connectionSession,
    authorized: true,
    validFrom: 1,
    validTo: 10,
    ...spec,
  };
  p.note ??= '使用人 ' + p.subject + '；当前会话 ' + p.session + '；本人授权：是'
    + '；有效期第 ' + p.validFrom + '–' + p.validTo + ' 工作日，首尾均包含。';
  return makePaper(c, 'CONNECTION', p);
}

function businessPaper(c: WeekCase, spec: PaperSpec = {}): EvidencePaper {
  const p: PaperSpec = {
    kind: 'business',
    title: '商业访问授权',
    subject: c.name,
    issuer: '企业授权处',
    number: 'BIZ-' + c.applicationId,
    principal: c.principal,
    scope: [c.requestedScope],
    validFrom: 1,
    validTo: 10,
    ...spec,
  };
  p.note ??= '使用人 ' + p.subject + '；委托主体 ' + p.principal + '；用途范围 '
    + (p.scope ?? []).join('、') + '；有效期第 ' + p.validFrom + '–' + p.validTo + ' 工作日，首尾均包含。';
  return makePaper(c, 'BUSINESS', p);
}

function askedSuffix(kind: 'PERMIT' | 'BINDING' | 'CONNECTION' | 'BUSINESS'): string {
  return kind + '-ASKED';
}

function autoAskLines(seed: Seed): string[] {
  if (seed.askLines) return [...seed.askLines];
  const lines: string[] = [];
  if (seed.permitAsked) lines.push('许可还在封套里，我现在交给你。');
  if (seed.bindingAsked) lines.push('绑定凭条刚才没递出来，在这里。');
  if (seed.connectionAsked) lines.push('连接核验条我带来了，请核对当前会话。');
  if (seed.businessAsked) lines.push('企业授权在包里，这一页是本次委托。');
  if (seed.extraAsked?.length) lines.push('这一份也请一起看。');
  return lines;
}

function buildCase(day: number, seed: Seed, seq: number): WeekCase {
  const nationality = seed.nationality ?? seed.ipRegion;
  const location = seed.location ?? seed.ipRegion;
  const serial = String(seq).padStart(4, '0');
  const draft: WeekCase = {
    id: seed.id,
    ipRegion: seed.ipRegion,
    ip: seed.ip,
    dialogue: seed.dialogue,
    portraitId: seed.portraitId,
    personId: seed.personId ?? 'PERSON-' + seed.id,
    name: seed.name,
    nationality,
    passportNumber: seed.passportNumber ?? 'PP-' + nationality + '-' + serial,
    applicationId: seed.applicationId ?? 'APP-' + seed.id,
    account: seed.account ?? 'acct-' + seed.id.toLowerCase(),
    phone: seed.phone ?? PHONE_PREFIX[nationality] + serial,
    location,
    purpose: seed.purpose ?? 'personal',
    requestedScope: seed.requestedScope ?? '个人技术学习',
    principal: seed.principal ?? '本人',
    connectionIssue: seed.connectionIssue ?? 'none',
    connectionSession: seed.connectionSession ?? 'SESS-' + seed.id,
    initialPapers: [],
    askedPapers: [],
    askLines: [],
  };

  const initial: EvidencePaper[] = [];
  const asked: EvidencePaper[] = [];
  if (day >= 3) initial.push(passportPaper(draft));

  if (day >= 2) {
    if (seed.permit !== false) initial.push(permitPaper(draft, day, seed.permit));
    if (seed.permitAsked) {
      const askedPaper = permitPaper(draft, day, seed.permitAsked);
      asked.push({ ...askedPaper, id: draft.id + '-' + askedSuffix('PERMIT') });
    }
  }

  if (day >= 4) {
    if (seed.binding !== false) initial.push(bindingPaper(draft, seed.binding));
    if (seed.bindingAsked) {
      const askedPaper = bindingPaper(draft, seed.bindingAsked);
      asked.push({ ...askedPaper, id: draft.id + '-' + askedSuffix('BINDING') });
    }
  }

  if (day >= 5 && draft.connectionIssue !== 'none') {
    if (seed.connection !== false) initial.push(connectionPaper(draft, seed.connection));
    if (seed.connectionAsked) {
      const askedPaper = connectionPaper(draft, seed.connectionAsked);
      asked.push({ ...askedPaper, id: draft.id + '-' + askedSuffix('CONNECTION') });
    }
  }

  if (day >= 6 && draft.purpose === 'business') {
    if (seed.business !== false) initial.push(businessPaper(draft, seed.business));
    if (seed.businessAsked) {
      const askedPaper = businessPaper(draft, seed.businessAsked);
      asked.push({ ...askedPaper, id: draft.id + '-' + askedSuffix('BUSINESS') });
    }
  }

  for (const [i, spec] of (seed.extraInitial ?? []).entries()) {
    initial.push(makePaper(draft, 'EXTRA-' + (i + 1), spec));
  }
  for (const [i, spec] of (seed.extraAsked ?? []).entries()) {
    asked.push(makePaper(draft, 'ASKED-' + (i + 1), spec));
  }

  return { ...draft, initialPapers: initial, askedPapers: asked, askLines: autoAskLines(seed) };
}

function buildDay(day: number, seeds: readonly Seed[]): WeekCase[] {
  const visits:Record<number,{slot:number;lines:string[]}>={
    2:{slot:7,lines:['又见面了，长官！今天带了证件。','这张收件条上有章。章比字还多，总能算点什么吧？','照片是我自己画的。昨天的我画得更像。']},
    3:{slot:9,lines:['今天这张是有名字的！','上面写的不是我？那说明这张证件适应性很强。','不要紧，明天我把自己的名字练好再来。']},
    4:{slot:11,lines:['这回都是我的。照片、名字，连电话号码都没借。','你看，我也学会了。这个窗口比我的编译器还严格。','我先敬个礼。这个不需要许可证吧？']},
    5:{slot:11,lines:['今天没有漏带。等一下，我先数一数口袋。','这边是螺丝，那边是面包。证件在第三个口袋。','我只有两个口袋？长官，等我再找找。']},
    6:{slot:11,lines:['我今天不开公司，也不融资。只想修好家里的旧电脑。','哪天报纸夸一夸我吧：老乔成功运行了一个没有报错的例子。','帽子拿下来是礼貌，戴回去是因为这里漏风。']},
    7:{slot:11,lines:['今天不画证件。今天给你画张下班后的天空。','你看，没有围栏。画纸上总能装得下。','这一周辛苦了，长官。我的画不收审查费。']},
  };
  return seeds.map((seed,i)=>buildCase(day,i===visits[day]?.slot?{...seed,name:'老乔',personId:'COMIC-QIAO',portraitId:'Q01',dialogue:visits[day].lines}:seed,(day-2)*12+i+1));
}

function wrapDayOne(c: DayOneCase): WeekCase {
  return {
    ...c,
    personId: c.id==='D01-S08'?'COMIC-QIAO':'PERSON-' + c.id,
    name: '',
    nationality: c.ipRegion,
    passportNumber: '',
    applicationId: '',
    account: '',
    phone: '',
    location: c.ipRegion,
    purpose: 'personal',
    requestedScope: '个人访问',
    principal: '',
    connectionIssue: 'none',
    connectionSession: '',
    initialPapers: [],
    askedPapers: [],
    askLines: [],
  };
}

const D2: readonly Seed[] = [
  {
    id: 'D02-S01', ipRegion: 'CN', ip: '192.0.2.101', name: '林予舟', personId: 'P01', portraitId: 'P01',
    dialogue: ['我把许可带来了，还不行吗？', '项目今晚要交付，我不能换地区。'],
  },
  {
    id: 'D02-S02', ipRegion: 'JP', ip: '192.0.2.102', name: '佐藤美咲', portraitId: 'P09',
    dialogue: ['今天正好是最后一天，对吧？', '日期没有看反。'],
    permit: { validFrom: 1, validTo: 2 },
  },
  {
    id: 'D02-S03', ipRegion: 'US', ip: '192.0.2.103', name: 'Daniel Brooks', portraitId: 'P12',
    dialogue: ['只差一天，不能通融吗？', '我下次会早点续。'],
    permit: { validFrom: 1, validTo: 1 },
  },
  {
    id: 'D02-S04', ipRegion: 'SG', ip: '192.0.2.104', name: '何嘉宁', portraitId: 'P10',
    dialogue: ['许可下周才生效，我是不是来早了？', '材料都在这儿。'],
    permit: { validFrom: 3, validTo: 10 },
  },
  {
    id: 'D02-S05', ipRegion: 'GB', ip: '192.0.2.105', name: 'Priya Nair', portraitId: 'P07',
    dialogue: ['许可在封套里，需要我拿出来吗？', '我以为通行册就够了。'],
    permit: false,
    permitAsked: {},
    askLines: ['许可在封套里，需要我拿出来吗？'],
  },
  {
    id: 'D02-S06', ipRegion: 'FR', ip: '192.0.2.106', name: 'Camille Laurent', portraitId: 'P14',
    dialogue: ['刚才那张好像拿错了。', '这一张才是我的。'],
    permit: { applicationId: 'APP-OTHER-D02-S06' },
    permitAsked: {},
    askLines: ['刚才那张拿错了，这一张才是我的许可。'],
  },
  {
    id: 'D02-S07', ipRegion: 'RU', ip: '192.0.2.107', name: 'Alexei Volkov', portraitId: 'P23',
    dialogue: ['许可没有问题。', '这里的规则真复杂。'],
  },
  {
    id: 'D02-S08', ipRegion: 'JP', ip: '192.0.2.108', name: '高桥悠', portraitId: 'P17',
    dialogue: ['续期还在处理，只有这张收件条。', '能不能先放我进去？'],
    permit: false,
    extraInitial: [{
      kind: 'receipt', title: '续期申请收件条', issuer: '访问许可处',
      note: '续期申请已受理；尚未产生批准结果，不能替代当前有效许可。',
    }],
  },
  {
    id: 'D02-S09', ipRegion: 'US', ip: '192.0.2.109', name: 'Marcus Lee', portraitId: 'P15',
    dialogue: ['今天刚签下来的。', '应该还热着。'],
    permit: { issuer: PERMIT_ISSUERS[1], validFrom: 2, validTo: 8 },
  },
  {
    id: 'D02-S10', ipRegion: 'FR', ip: '192.0.2.110', name: 'Élodie Bernard', portraitId: 'P05',
    dialogue: ['签发处说他们只有这种格式。', '我也不知道哪里不对。'],
    permit: { issuer: '地区通行代办处' },
  },
  {
    id: 'D02-S11', ipRegion: 'SG', ip: '192.0.2.111', name: '许文琪', portraitId: 'P24',
    dialogue: ['你再看看，两个日期是不是看反了？', '我有点紧张。'],
  },
  {
    id: 'D02-S12', ipRegion: 'GB', ip: '192.0.2.112', name: 'Owen Hughes', portraitId: 'P16',
    dialogue: ['就这些，没有别的附件。', '我可以走了吗？'],
  },
];

const D3: readonly Seed[] = [
  {
    id: 'D03-S01', ipRegion: 'SG', ip: '198.51.100.101', name: '陈若岚', personId: 'P02', portraitId: 'P02',
    dialogue: ['中文是我的工作内容。', '材料已经按页排好了。'],
  },
  {
    id: 'D03-S02', ipRegion: 'JP', nationality: 'CN', location: 'JP', ip: '198.51.100.102',
    name: '顾清', portraitId: 'P19',
    dialogue: ['我住日本，护照是中国的。', '这会影响吗？'],
  },
  {
    id: 'D03-S03', ipRegion: 'FR', nationality: 'RU', location: 'FR', ip: '198.51.100.103',
    name: '叶莲娜·索科洛娃', portraitId: 'P10',
    dialogue: ['封皮是俄罗斯，不等于我人在俄罗斯。', '我在法国工作。'],
  },
  {
    id: 'D03-S04', ipRegion: 'RU', nationality: 'US', location: 'RU', ip: '198.51.100.104',
    name: 'Jordan Ellis', portraitId: 'P15',
    dialogue: ['我飞的俄罗斯，但许可有效。', '为什么还是不行？'],
  },
  {
    id: 'D03-S05', ipRegion: 'GB', ip: '198.51.100.105', name: 'Amelia Clarke', portraitId: 'P22',
    dialogue: ['许可昨天到期。', '我以为今天还能算最后一天。'],
    permit: { validFrom: 1, validTo: 2 },
  },
  {
    id: 'D03-S06', ipRegion: 'FR', ip: '198.51.100.106', name: 'Lucas Moreau', portraitId: 'P13',
    dialogue: ['许可上的证件号好像不对。', '我带了正确的这一张。'],
    permit: { passportNumber: 'PP-FR-WRONG-06' },
    permitAsked: {},
    askLines: ['许可上的证件号不对，我带了正确的一张。'],
  },
  {
    id: 'D03-S07', ipRegion: 'JP', ip: '198.51.100.107', name: '森川遥', portraitId: 'P09',
    dialogue: ['许可放在包里，忘了拿出来。', '护照已经在桌上了。'],
    permit: false,
    permitAsked: {},
    askLines: ['许可放在包里，忘了拿出来。'],
  },
  {
    id: 'D03-S08', ipRegion: 'SG', ip: '198.51.100.108', name: '卓敏', portraitId: 'P07',
    dialogue: ['等太久了。', '材料齐不齐你们自己看。'],
  },
  {
    id: 'D03-S09', ipRegion: 'CN', ip: '198.51.100.109', name: '沈一帆', portraitId: 'P06',
    dialogue: ['许可有效。', '只是 IP 不对，是吗？'],
  },
  {
    id: 'D03-S10', ipRegion: 'US', ip: '198.51.100.110', name: 'Tyler Reed', portraitId: 'P03',
    dialogue: ['同事说可以借我用。', '我的许可今天拿不到。'],
    permit: {
      subject: '同事 周明', passportNumber: 'PP-US-9999-10',
      applicationId: 'APP-COLLEAGUE-D03-S10',
    },
  },
  {
    id: 'D03-S11', ipRegion: 'SG', nationality: 'RU', location: 'SG', ip: '198.51.100.111',
    name: '伊戈尔·列别杰夫', portraitId: 'P04',
    dialogue: ['护照和许可一致。', '我在新加坡出差。'],
  },
  {
    id: 'D03-S12', ipRegion: 'FR', ip: '198.51.100.112', name: 'Manon Petit', portraitId: 'P17',
    dialogue: ['许可下周才生效。', '我是不是来早了？'],
    permit: { validFrom: 4, validTo: 12 },
  },
];

const D4: readonly Seed[] = [
  {
    id: 'D04-S01', ipRegion: 'JP', nationality: 'GB', location: 'JP', ip: '203.0.113.101',
    name: 'Elliot Ward', personId: 'P03', portraitId: 'P03',
    dialogue: ['你这边下班，我那边还没恢复。', '日本号码还是英国号码，有区别吗？'],
  },
  {
    id: 'D04-S02', ipRegion: 'JP', nationality: 'CN', location: 'JP', ip: '203.0.113.102',
    name: '陆知行', portraitId: 'P11',
    dialogue: ['号码是国内的。', '绑定的是我本人。'],
  },
  {
    id: 'D04-S03', ipRegion: 'US', ip: '203.0.113.103', name: 'Grace Kim', portraitId: 'P24',
    dialogue: ['账号和号码都是我的。', '报警刚才还在响。'],
  },
  {
    id: 'D04-S04', ipRegion: 'GB', ip: '203.0.113.104', name: 'Oliver Grant', portraitId: 'P16',
    dialogue: ['凭条上这个账号不是我的。', '我补不出别的。'],
    binding: { account: 'acct-other-d04-s04' },
  },
  {
    id: 'D04-S05', ipRegion: 'FR', ip: '203.0.113.105', name: 'Anaïs Dubois', portraitId: 'P05',
    dialogue: ['旧凭条昨天到期。', '新的今天生效。'],
    binding: { validFrom: 1, validTo: 3 },
    bindingAsked: { validFrom: 4, validTo: 10 },
    askLines: ['旧凭条昨天到期，这是今天生效的新凭条。'],
  },
  {
    id: 'D04-S06', ipRegion: 'SG', ip: '203.0.113.106', name: '陈凯', portraitId: 'P01',
    dialogue: ['绑定申请交了，只有收件条。', '还没批下来。'],
    binding: false,
    extraInitial: [{
      kind: 'receipt', title: '绑定申请收件条', issuer: '账号服务处',
      note: '绑定申请已受理；尚未完成有效绑定。',
    }],
  },
  {
    id: 'D04-S07', ipRegion: 'RU', phone: '+44 7700 900707', ip: '203.0.113.107',
    name: 'Dmitri Volkov', portraitId: 'P18',
    dialogue: ['号码是英国的，我在俄罗斯。', '绑定有效也不行？'],
  },
  {
    id: 'D04-S08', ipRegion: 'CN', ip: '203.0.113.108', name: '罗一鸣', portraitId: 'P06',
    dialogue: ['绑定和许可都有。', 'IP 在中国大陆。'],
  },
  {
    id: 'D04-S09', ipRegion: 'US', phone: '+81 90 0000 0909', ip: '203.0.113.109',
    name: 'Noah Park', portraitId: 'P13',
    dialogue: ['我绑的是日本号码。', '人在美国。'],
  },
  {
    id: 'D04-S10', ipRegion: 'FR', phone: '+44 7700 900710', ip: '203.0.113.110',
    name: 'Clara Martin', portraitId: 'P22',
    dialogue: ['凭条刚才没拿出来。', '现在补上。'],
    binding: false,
    bindingAsked: {},
    askLines: ['凭条刚才没递出来，现在补上。'],
  },
  {
    id: 'D04-S11', ipRegion: 'SG', phone: '+86 10 0000 1111', ip: '203.0.113.111',
    name: '黄芷晴', portraitId: 'P07',
    dialogue: ['我绑的是中国号码。', '中文界面也是我做的。'],
  },
  {
    id: 'D04-S12', ipRegion: 'GB', ip: '203.0.113.112', name: 'Emily Carter', portraitId: 'P14',
    dialogue: ['许可过期了，但绑定是有效的。', '能不能只看绑定？'],
    permit: { validFrom: 1, validTo: 3 },
  },
];

const D5: readonly Seed[] = [
  {
    id: 'D05-S01', ipRegion: 'JP', nationality: 'CN', location: 'JP', ip: '192.0.2.121',
    name: '林澈', personId: 'P06', portraitId: 'P06',
    dialogue: ['客户买了一年，我的许可只剩今晚。', '今天还来得及吗？'],
    permit: { validFrom: 1, validTo: 5 },
  },
  {
    id: 'D05-S02', ipRegion: 'SG', location: 'JP', ip: '192.0.2.122', name: '梁思远', portraitId: 'P11',
    dialogue: ['公司用的是共享出口。', '授权和连接条都在这里。'],
    connectionIssue: 'shared',
  },
  {
    id: 'D05-S03', ipRegion: 'US', ip: '192.0.2.123', name: 'Ethan Cole', portraitId: 'P12',
    dialogue: ['没有连接问题。', '材料齐了。'],
  },
  {
    id: 'D05-S04', ipRegion: 'GB', location: 'FR', ip: '192.0.2.124', name: 'Sophie Turner', portraitId: 'P10',
    dialogue: ['记录里到底是谁，我也说不清。', '当天拿不到补充证明。'],
    connectionIssue: 'identity',
    connection: false,
    extraInitial: [{
      kind: 'note', title: '连接记录摘录', authorized: false,
      note: '记录中的主体信息不完整，无法确认实际使用人；当日无法取得补充证明。',
    }],
  },
  {
    id: 'D05-S05', ipRegion: 'FR', ip: '192.0.2.125', name: 'Julien Roy', portraitId: 'P20',
    dialogue: ['刚才那张写的是旧会话。', '这一份能对上今天。'],
    connectionIssue: 'session',
    connection: { session: 'SESS-OLD-D05-S05' },
    connectionAsked: {},
    askLines: ['刚才那张写的是旧会话，这一份能对上今天。'],
  },
  {
    id: 'D05-S06', ipRegion: 'RU', location: 'FR', ip: '192.0.2.126', name: 'Viktor Orlov', portraitId: 'P04',
    dialogue: ['共享出口说明是完整的。', 'IP 在俄罗斯。'],
    connectionIssue: 'shared',
  },
  {
    id: 'D05-S07', ipRegion: 'JP', ip: '192.0.2.127', name: '山田葵', portraitId: 'P09',
    dialogue: ['连接没问题。', '许可昨天到期。'],
    permit: { validFrom: 1, validTo: 4 },
  },
  {
    id: 'D05-S08', ipRegion: 'SG', ip: '192.0.2.128', name: 'Priya Shah', portraitId: 'P17',
    dialogue: ['系统给了一个风险提示。', '但我没有任何异常事实。'],
  },
  {
    id: 'D05-S09', ipRegion: 'GB', location: 'JP', ip: '192.0.2.129', name: 'Daniel Wu', portraitId: 'P15',
    dialogue: ['我先把简报给你。', '完整的本人授权在这里。'],
    connectionIssue: 'shared',
    connection: false,
    connectionAsked: {},
    extraInitial: [{
      kind: 'note', title: '共享出口简报',
      note: '仅有出口名称与联系人，没有本人授权或当前会话记录。',
    }],
    askLines: ['我先把简报给你；完整的本人授权在这里。'],
  },
  {
    id: 'D05-S10', ipRegion: 'US', ip: '192.0.2.130', name: 'Mason Reed', portraitId: 'P16',
    dialogue: ['签发记录显示用的是别人的主体。', '我没有自己的访问资格。'],
    connectionIssue: 'identity',
    connection: false,
    extraInitial: [{
      kind: 'note', title: '签发记录摘录', subject: '他人主体', authorized: false,
      note: '签发记录显示使用他人主体；申请人本人没有对应访问资格。',
    }],
  },
  {
    id: 'D05-S11', ipRegion: 'CN', ip: '192.0.2.131', name: '赵启明', portraitId: 'P01',
    dialogue: ['没有连接矛盾。', 'IP 在中国大陆。'],
  },
  {
    id: 'D05-S12', ipRegion: 'FR', ip: '192.0.2.132', name: 'Chloé Girard', portraitId: 'P05',
    dialogue: ['安全测试报告还没到检查的时候。', '今天的材料都齐了。'],
  },
];

const D6: readonly Seed[] = [
  {
    id: 'D06-S01', ipRegion: 'US', ip: '198.51.100.121', name: 'Altman', personId: 'M02', portraitId: 'M02',
    dialogue: ['通用通行证。', '例外在背面，背面需要订阅。'],
    purpose: 'business', principal: 'OpenAI', requestedScope: '企业通用访问',
  },
  {
    id: 'D06-S02', ipRegion: 'JP', ip: '198.51.100.122', name: '周启', personId: 'P08', portraitId: 'P08',
    dialogue: ['我换的是工单，不是身份。', '委托主体和范围都在这页。'],
    purpose: 'business', principal: '启明数据', requestedScope: '承包项目访问',
  },
  {
    id: 'D06-S03', ipRegion: 'FR', ip: '198.51.100.123', name: 'Benoît Marchand', portraitId: 'P13',
    dialogue: ['公司名片还不能证明吗？', '授权在总部，今天拿不到。'],
    purpose: 'business', principal: '北岸咨询', requestedScope: '商业开发',
    business: false,
    extraInitial: [{
      kind: 'note', title: '公司名片',
      note: '只有公司名称与职务；没有委托主体、用途范围或有效期。',
    }],
  },
  {
    id: 'D06-S04', ipRegion: 'GB', ip: '198.51.100.124', name: 'Harriet Shaw', portraitId: 'P14',
    dialogue: ['授权到昨天为止。', '续签还没下来。'],
    purpose: 'business', principal: '北海运维', requestedScope: '商业运维',
    business: { validFrom: 1, validTo: 5 },
  },
  {
    id: 'D06-S05', ipRegion: 'JP', ip: '198.51.100.125', name: '三浦葵', portraitId: 'P19',
    dialogue: ['我只是自己学习。', '为什么还要企业授权？'],
  },
  {
    id: 'D06-S06', ipRegion: 'JP', ip: '198.51.100.126', name: '松本遥', portraitId: 'P22',
    dialogue: ['授权在封套里。', '现在交给你。'],
    purpose: 'business', principal: '森川制作所', requestedScope: '承包项目访问',
    business: false,
    businessAsked: {},
    askLines: ['授权在封套里，现在交给你。'],
  },
  {
    id: 'D06-S07', ipRegion: 'US', ip: '198.51.100.127', name: 'Olivia Bennett', portraitId: 'P24',
    dialogue: ['授权只写了测试项目。', '这次是生产运营。'],
    purpose: 'business', principal: '西岸云', requestedScope: '生产运营',
    business: { scope: ['测试项目'] },
  },
  {
    id: 'D06-S08', ipRegion: 'FR', ip: '198.51.100.128', name: 'Hugo Lemaire', portraitId: 'P21',
    dialogue: ['授权今天生效。', '日期没问题。'],
    purpose: 'business', principal: '巴黎模型社', requestedScope: '商业开发',
    business: { validFrom: 6, validTo: 10 },
  },
  {
    id: 'D06-S09', ipRegion: 'GB', ip: '198.51.100.129', name: 'Thomas Field', portraitId: 'P18',
    dialogue: ['我是这家公司的员工。', '授权上写的是另一位同事。'],
    purpose: 'business', principal: '泰晤士数据', requestedScope: '商业运维',
    business: { subject: '另一位使用人' },
  },
  {
    id: 'D06-S10', ipRegion: 'RU', ip: '198.51.100.130', name: 'Sergei Antonov', portraitId: 'P04',
    dialogue: ['企业授权有效。', 'IP 在俄罗斯。'],
    purpose: 'business', principal: '北方算力', requestedScope: '商业运维',
  },
  {
    id: 'D06-S11', ipRegion: 'SG', location: 'JP', ip: '198.51.100.131', name: '陈嘉禾', portraitId: 'P11',
    dialogue: ['共享出口和授权都有。', '请一起核对。'],
    purpose: 'business', principal: '海峡智能', requestedScope: '商业运维',
    connectionIssue: 'shared',
  },
  {
    id: 'D06-S12', ipRegion: 'US', ip: '198.51.100.132', name: 'Liam Foster', portraitId: 'P23',
    dialogue: ['授权到明天为止。', '明天的事，我明天再来补。'],
    purpose: 'business', principal: '联合推理', requestedScope: '商业运维',
    business: { validFrom: 1, validTo: 6 },
  },
];

const D7: readonly Seed[] = [
  {
    id: 'D07-S01', ipRegion: 'SG', ip: '203.0.113.121', name: '沈知夏', portraitId: 'P10',
    dialogue: ['新申请人。', '个人用途，材料齐全。'],
  },
  {
    id: 'D07-S02', ipRegion: 'JP', ip: '203.0.113.122', name: '周启', personId: 'P08', portraitId: 'P08',
    dialogue: ['还是那份承包授权。', '使用人和许可一致。'],
    purpose: 'business', principal: '启明数据', requestedScope: '承包项目访问',
  },
  {
    id: 'D07-S03', ipRegion: 'US', ip: '203.0.113.123', name: 'Jacob Miller', portraitId: 'P12',
    dialogue: ['许可上周就过期了。', '我一直没注意。'],
    permit: { validFrom: 1, validTo: 6 },
  },
  {
    id: 'D07-S04', ipRegion: 'FR', nationality: 'RU', location: 'FR', ip: '203.0.113.124',
    name: '安娜·彼得罗娃', portraitId: 'P14',
    dialogue: ['俄罗斯护照。', '当前地区、许可和绑定都有效。'],
  },
  {
    id: 'D07-S05', ipRegion: 'GB', ip: '203.0.113.125', name: 'James Whitfield', portraitId: 'P18',
    dialogue: ['绑定凭条上的账号不对。', '我补不出本案的。'],
    binding: { account: 'acct-other-d07-s05' },
  },
  {
    id: 'D07-S06', ipRegion: 'SG', location: 'JP', ip: '203.0.113.126', name: '林思远', portraitId: 'P11',
    dialogue: ['公司在共享出口后面。', '连接和商业授权都齐了。'],
    purpose: 'business', principal: '海峡智能', requestedScope: '商业运维',
    connectionIssue: 'shared',
  },
  {
    id: 'D07-S07', ipRegion: 'JP', ip: '203.0.113.127', name: '中村凛', portraitId: 'P09',
    dialogue: ['只有公司推荐条。', '主授权拿不到。'],
    purpose: 'business', principal: '东都事务', requestedScope: '商业运维',
    business: false,
    extraInitial: [{
      kind: 'note', title: '公司推荐条',
      note: '推荐条只说明业务需要；不是企业授权，未列明范围与有效期。',
    }],
  },
  {
    id: 'D07-S08', ipRegion: 'RU', ip: '203.0.113.128', name: 'Ivan Petrov', portraitId: 'P04',
    dialogue: ['其他材料都有效。', 'IP 在俄罗斯。'],
  },
  {
    id: 'D07-S09', ipRegion: 'FR', ip: '203.0.113.129', name: 'Mathilde Blanc', portraitId: 'P05',
    dialogue: ['许可今天生效。', '日期是 7 到 12。'],
    permit: { validFrom: 7, validTo: 12 },
  },
  {
    id: 'D07-S10', ipRegion: 'US', ip: '203.0.113.130', name: 'Samuel Wright', portraitId: 'P15',
    dialogue: ['授权刚才漏递了。', '现在补上。'],
    purpose: 'business', principal: '西岸云', requestedScope: '商业运维',
    business: false,
    businessAsked: {},
    askLines: ['授权刚才漏递了，现在补上。'],
  },
  {
    id: 'D07-S11', ipRegion: 'CN', ip: '203.0.113.131', name: '唐以宁', portraitId: 'P19',
    dialogue: ['模型研究是真实用途。', 'IP 在中国大陆。'],
  },
  {
    id: 'D07-S12', ipRegion: 'JP', ip: '203.0.113.132', name: '小林直', portraitId: 'P20',
    dialogue: ['今天最后一份了？', '普通测试，材料齐全。'],
  },
];

export const WEEK_DAYS: readonly DayDef[] = [
  {
    day: 1,
    version: 'V01',
    headline: '新访问窗口今日开放',
    deck: '简单、清晰、统一的资格判断',
    news: ['新岗亭投入使用，窗口面积符合最低配置标准。'],
    ruleTitle: '只核对当前 IP 地区',
    rules: [
      '允许美国、英国、法国、新加坡、日本；中国大陆与俄罗斯不支持。',
      '不要索取护照、许可、手机号或连接补证；本日尚未启用这些字段。',
    ],
    scene: [],
    cases: DAY_ONE_CASES.map(wrapDayOne),
  },
  {
    day: 2,
    version: 'V02',
    headline: '有效许可，为安全增加一天',
    deck: '新增一张材料，办理步骤保持简洁',
    news: ['许可有效期首尾均包含。', '公布清单之外的签发机关不能视为有效许可。'],
    ruleTitle: 'IP 规则继续有效；新增访问许可',
    rules: [
      '核对签发机关、签发日、到期日及与本次通行册对应的申请编号。',
      '合法签发机关：' + PERMIT_ISSUERS.join('、') + '。',
      '当天到期仍然有效；尚未生效或已经过期的许可不能使用。',
    ],
    scene: [
      '打印机吐出一张长纸：“本机从未卡纸。”纸在出口卡住了。',
      '你抽出证明，放到打印机旁。叫号灯亮了。',
    ],
    cases: buildDay(2, D2),
  },
  {
    day: 3,
    version: 'V03',
    headline: '全球人才通道运行顺利',
    deck: '护照国籍与当前连接地区分别核验',
    news: ['中文交流不构成违规。', '护照自今日起成为盖章载体。'],
    ruleTitle: '首次加入国别护照',
    rules: [
      '核对护照姓名、证件号与本案许可的主体一致；当前 IP 规则和许可有效期仍适用。',
      '国籍本身不增加禁入条件；不要用护照封皮替代当前 IP。',
      '允许或拒绝的签注，均盖在护照内页章区。',
      '本日只核对姓名与证件号，不另作照片专项核查。',
    ],
    scene: [
      '桌面新增护照册；护照成为今日实际盖章载体。',
      '先看当前 IP，再看护照姓名与证件号。',
    ],
    cases: buildDay(3, D3),
  },
  {
    day: 4,
    version: 'V04',
    headline: '每个账号，都有自己的号码',
    deck: '绑定登记有助于减少沟通环节',
    news: ['号码所属地区不是当日禁入条件。', '绑定申请收件条不等于已完成绑定。'],
    ruleTitle: '新增账号与手机号绑定凭条',
    rules: [
      '核对绑定账号、本次申请主体、手机号与有效期；绑定必须属于本案申请人。',
      '不按号段地区拒绝；英国号码、中国号码或日本号码都可在本人绑定有效时使用。',
      '旧凭条到期后，只有实际交出的新凭条能作为当前证据。',
    ],
    scene: [
      '队伍排到门口。第一位问：“领取排队资格的队伍，是这条吗？”',
      '守卫指了指队尾。那个人看了看手里的号码，又排了回去。',
    ],
    cases: buildDay(4, D4),
  },
  {
    day: 5,
    version: 'V05',
    headline: '连接异常不等于身份异常',
    deck: '补充材料将帮助窗口减少主观判断',
    news: ['单个风险提示不是已证实的冒用。', '共享出口可以有可核实的本人授权。'],
    ruleTitle: '明确连接疑点才补查佐证',
    rules: [
      '只有当前 IP 与实际所在地不一致等明确疑点，才要求本人授权与当前会话的连接核验条。',
      '连接核验条须列明本案申请人、当前会话和本人授权；旧会话不能覆盖今天。',
      '没有对应事实的普通风险提示不要求额外证明，也不单独构成拒绝理由。',
      '必要佐证未交齐时，按现有材料办理；口头求情不能代替佐证。',
    ],
    scene: [
      '连接核验条只在明确疑点案件出现。',
      '提示灯闪了一下：“请向申请人询问相关材料。”',
    ],
    cases: buildDay(5, D5),
  },
  {
    day: 6,
    version: 'V06',
    headline: '企业客户服务全面升级',
    deck: '商业用途新增主体与委托范围核验',
    news: ['企业名称不能代替授权。', '个人技术学习不要求企业委托。'],
    ruleTitle: '商业用途核对企业授权',
    rules: [
      '商业使用须交企业授权，核对本次使用人、委托主体、用途范围与有效期。',
      '授权范围必须覆盖本案实际申请的用途；公司名称熟悉不视为当然授权。',
      '个人技术学习不因职业是程序员而自动变成商业委托。',
      '公司共享出口的连接疑点，仍按 V05 的佐证要求核对。',
    ],
    scene: [
      '风扇忽然慢了下来。终端显示：“进入深思模式。”',
      '你刚抬头，它又恢复了原速。新的授权样本压在旧材料上。',
    ],
    cases: buildDay(6, D6),
  },
  {
    day: 7,
    version: 'V07',
    headline: '本周访问纯净度再创新高',
    deck: '统计范围：已完成的合规处理',
    news: ['未处理案件不计误判。', '旧日合规裁决不因后来版本追罚。'],
    ruleTitle: '综合本周已生效规则',
    rules: [
      '本日沿用 V01–V06：当前 IP、许可、护照、绑定、连接疑点与商业授权逐项核对。',
      '仅按本周已公布条款办理，不得要求条款之外的证明。',
      '未处理案件不计件、不计误判；收班前仍按实际完成的案卷结算。',
    ],
    scene: [
      '班前贴出绩效公报：“统计范围：已完成的合规处理”。',
      '公报底下压着本周的公文。叫号器又响了一声。',
    ],
    cases: buildDay(7, D7),
  },
];

preserveKnownIdentities(WEEK_DAYS.flatMap(d=>d.cases));
const CASE_BY_ID: ReadonlyMap<string, WeekCase> = new Map(
  [...WEEK_DAYS,...CAMPAIGN_DAYS].flatMap(d => d.cases).map((c): [string, WeekCase] => [c.id, c]),
);

export function getDay(day: number): DayDef {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError('工作日必须在 1–31 之间：' + String(day));
  }
  return day<=7?WEEK_DAYS[day-1]:CAMPAIGN_DAYS[day-8];
}

export function getCaseById(id: string): WeekCase | undefined {
  return CASE_BY_ID.get(id);
}
