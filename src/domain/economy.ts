import type {Mode} from './day-one';

export const ECONOMY_VERSION=2 as const;
export const DAILY_SALARY=10;
export const SUPPLY_COST=10;
export type EconomyKind='salary'|'electricity'|'tokens';

// Untagged entries are already-settled bills from the original tariff.
export function economyAmount(kind:EconomyKind,mode:Mode,version?:2):number {
  if(kind==='salary')return version===ECONOMY_VERSION?DAILY_SALARY:mode==='standard'?0:10;
  return -(version===ECONOMY_VERSION?SUPPLY_COST:20);
}
export function validEconomyEntry(entry:Record<string,unknown>):boolean {
  return entry.economyVersion===undefined||entry.economyVersion===ECONOMY_VERSION&&typeof entry.kind==='string'&&['salary','electricity','tokens'].includes(entry.kind);
}
