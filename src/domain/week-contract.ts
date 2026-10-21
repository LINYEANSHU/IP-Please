import type {DayOneCase,Decision,Region} from './day-one';

export type PaperKind='permit'|'passport'|'binding'|'connection'|'business'|'receipt'|'note'|'identity'|'overseas'|'context'|'delegation'|'relation'|'history'|'language'|'browser'|'input'|'exception'|'search'|'phoneHistory'|'configuration'|'freeze';
export interface EvidencePaper {
  id:string;kind:PaperKind;title:string;subject:string;
  issuer?:string;number?:string;applicationId?:string;passportNumber?:string;
  validFrom?:number;validTo?:number;account?:string;phone?:string;
  location?:Region;session?:string;authorized?:boolean;scope?:readonly string[];principal?:string;
  note?:string;
  values?:Record<string,string>;
}
export interface WeekCase extends DayOneCase {
  personId:string;name:string;nationality:Region;passportNumber:string;applicationId:string;
  account:string;phone:string;location:Region;purpose:'personal'|'business';requestedScope:string;
  principal:string;connectionIssue:'none'|'shared'|'session'|'identity';connectionSession:string;
  initialPapers:readonly EvidencePaper[];askedPapers:readonly EvidencePaper[];askLines:readonly string[];
  profile?:{registered:Region;systemLanguage:string;browser:string;input:string;search:string;historicalInput:string;historicalRegion:Region;controlled:boolean;minorOmission?:string};
}
export interface DayDef {
  day:number;version:string;headline:string;deck:string;news:readonly string[];
  ruleTitle:string;rules:readonly string[];scene:readonly string[];cases:readonly WeekCase[];
}
export interface Evaluation {decision:Decision;findings:readonly string[];disposition?:'ban'|'review';minor?:boolean}
export type FamilyMemberId='player'|'father'|'mother'|'wife'|'son';
export interface MemberState {powerPressure:number;tokenPressure:number;damage:0|1|2|3|4;memoryIntact:boolean}
export type FamilyState=Record<FamilyMemberId,MemberState>;
export interface SupplyChoice {electricity:boolean;tokens:boolean;repairs?:FamilyMemberId[]}
export interface FamilyProjection {family:FamilyState;cost:number;warnings:Record<FamilyMemberId,string>}
