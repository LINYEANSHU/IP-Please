import {addEntry} from './run';
import type {RunState,Transition,SupplyChoice,FamilyState} from './run';
import {getModePolicy} from './day-one';
import {ECONOMY_VERSION,SUPPLY_COST} from './economy';
import {projectFamily,REPAIR_COST} from './family';
import {auditExpired,resolveDeparture,resolveStaying,flag} from './campaign';
export function settleDay(previous:RunState):Transition {
  if(previous.phase!=='night'||previous.rentPaid||previous.ending)return {state:previous,effects:[]};
  const s=structuredClone(previous);
  if(auditExpired(s)){s.phase='ending';s.ending='E03';s.revision++;return {state:s,effects:[]};}
  addEntry(s,{id:`day:${s.day}:salary`,kind:'salary',amount:getModePolicy(s.mode).salary,economyVersion:ECONOMY_VERSION});
  if(s.balance<20){s.phase='ending';s.ending='E13';}else{addEntry(s,{id:`day:${s.day}:rent`,kind:'rent',amount:-20});s.rentPaid=true;}
  if(s.rentPaid){const departure=resolveDeparture(s);if(departure){s.phase='ending';s.ending=departure;if(departure==='E05'||departure==='E10')flag(s,'source-stopped');}}
  s.revision++;return {state:s,effects:[]};
}
export function previewSupply(s:RunState,choice:SupplyChoice):{affordable:boolean;balance:number;family:FamilyState;warnings:ReturnType<typeof projectFamily>['warnings']} {
  const p=projectFamily(s.family,choice);return {affordable:s.rentPaid&&s.balance>=p.cost,balance:s.balance-p.cost,family:p.family,warnings:p.warnings};
}
export function submitSupply(previous:RunState,choice:SupplyChoice,actionId:string):Transition {
  if(previous.phase!=='night'||!previous.rentPaid||previous.supply||previous.appliedActions.includes(actionId))return {state:previous,effects:[]};
  const p=previewSupply(previous,choice);if(!p.affordable)return {state:previous,effects:[]};
  const s=structuredClone(previous),repairs=[...new Set(choice.repairs??[])].filter(id=>s.family[id].damage>0&&s.family[id].damage<4);
  if(choice.electricity)addEntry(s,{id:`day:${s.day}:electricity`,kind:'electricity',amount:-SUPPLY_COST,economyVersion:ECONOMY_VERSION});
  if(choice.tokens)addEntry(s,{id:`day:${s.day}:tokens`,kind:'tokens',amount:-SUPPLY_COST,economyVersion:ECONOMY_VERSION});
  for(const id of repairs)addEntry(s,{id:`day:${s.day}:repair:${id}`,kind:'repair',amount:-REPAIR_COST[id]});
  s.family=p.family;s.supply={electricity:choice.electricity,tokens:choice.tokens,...(repairs.length?{repairs}:{})};s.phase='family';
  if(s.family.player.damage===4){s.phase='ending';s.ending='E04';}
  else if(s.day===31){s.phase='ending';s.ending=resolveStaying(s);}
  s.revision++;s.appliedActions=[...s.appliedActions,actionId].slice(-512);return {state:s,effects:[]};
}
