import { Election } from '../models/vote.models';

export function getElectionScopeLabel(election: Election): string {
  const ufr = election.targetUfr || 'Toutes UFRs';
  return election.targetNiveau ? `${ufr} · ${election.targetNiveau}` : ufr;
}

export function getElectionStatusLabel(status: string): string {
  switch (status) {
    case 'VOTE_OUVERT': return 'Vote ouvert';
    case 'CONFIGURATION': return 'Configuration';
    case 'CAMPAGNE': return 'Campagne';
    case 'DEPOUILLEMENT': return 'Dépouillement';
    case 'PUBLICATION': return 'Publication';
    case 'CLOTURE': return 'Clôturé';
    default: return status;
  }
}

export function getElectionStatusBadgeClass(status: string): string {
  switch (status) {
    case 'VOTE_OUVERT': return 'bg-emerald-50 text-[#047857] border-emerald-200';
    case 'CONFIGURATION': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'PUBLICATION': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
    case 'CLOTURE': return 'bg-slate-100 text-slate-600 border-slate-300';
    case 'DEPOUILLEMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'CAMPAGNE': return 'bg-emerald-50/70 text-emerald-800 border-emerald-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}
