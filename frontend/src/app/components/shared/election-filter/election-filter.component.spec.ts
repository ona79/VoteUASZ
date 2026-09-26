import { ElectionFilterComponent } from './election-filter.component';
import { Election } from '../../../models/vote.models';
import { SimpleChange } from '@angular/core';

/**
 * Tests unitaires de applyFilters() — instanciation directe, sans TestBed.
 * applyFilters() est une fonction pure sur tableau : rapide, déterministe, sans dépendances Angular.
 */
describe('ElectionFilterComponent — applyFilters()', () => {

  let component: ElectionFilterComponent;
  let emittedResult: Election[] = [];

  /** Jeu de données de test couvrant tous les cas */
  const mockElections: Election[] = [
    { id: 1, titre: 'Délégué L3 Info',    statut: 'VOTE_OUVERT', type: 'DELEGUE',      targetUfr: 'UFR_SAT'  },
    { id: 2, titre: 'Élection DUFR SAT',  statut: 'CAMPAGNE',    type: 'DUFR',          targetUfr: 'UFR_SAT'  },
    { id: 3, titre: 'Vice-Recteur UASZ',  statut: 'VOTE_OUVERT', type: 'VICE_RECTEUR',  targetUfr: undefined  },
    { id: 4, titre: 'Délégué L2 Droit',   statut: 'CLOTURE',     type: 'DELEGUE',       targetUfr: 'UFR_SJAG' },
    { id: 5, titre: 'Délégué L1 Lettres', statut: 'VOTE_OUVERT', type: 'DELEGUE',       targetUfr: 'UFR_LL'   },
  ];

  beforeEach(() => {
    component = new ElectionFilterComponent();
    // Capturons les émissions du composant
    component.filtered.subscribe((result: Election[]) => { emittedResult = result; });
    // Chargeons les données et construisons les pilules
    component.elections = mockElections;
    component.ngOnChanges({
      elections: new SimpleChange([], mockElections, false)
    });
    emittedResult = []; // Reset après ngOnChanges qui émet une première fois
  });

  // ─── Test 1 : filtre par statut seul ─────────────────────────────────────────

  it('filtre par statut VOTE_OUVERT → retourne les élections id 1, 3 et 5', () => {
    component.setStatut('VOTE_OUVERT');

    const ids = emittedResult.map(e => e.id);
    expect(ids).toContain(1);
    expect(ids).toContain(3);
    expect(ids).toContain(5);
    expect(ids).not.toContain(2); // CAMPAGNE exclu
    expect(ids).not.toContain(4); // CLOTURE exclu
    expect(emittedResult.length).toBe(3);
  });

  it('filtre par statut CLOTURE → retourne uniquement l\'élection id 4', () => {
    component.setStatut('CLOTURE');

    expect(emittedResult.length).toBe(1);
    expect(emittedResult[0].id).toBe(4);
  });

  it('statut TOUTES → retourne toutes les élections', () => {
    component.setStatut('VOTE_OUVERT');
    component.setStatut('TOUTES'); // reset

    expect(emittedResult.length).toBe(mockElections.length);
  });

  // ─── Test 2 : filtre par UFR seul ────────────────────────────────────────────

  it('filtre par UFR UFR_SAT → retourne id 1 (UFR_SAT) + id 2 (UFR_SAT) + id 3 (global, sans targetUfr)', () => {
    component.activeUfr = 'UFR_SAT';
    component.applyFilters();

    const ids = emittedResult.map(e => e.id);
    expect(ids).toContain(1); // UFR_SAT
    expect(ids).toContain(2); // UFR_SAT
    expect(ids).toContain(3); // Globale (VICE_RECTEUR, sans targetUfr) — TOUJOURS visible
    expect(ids).not.toContain(4); // UFR_SJAG exclu
    expect(ids).not.toContain(5); // UFR_LL exclu
    expect(emittedResult.length).toBe(3);
  });

  it('élection globale (sans targetUfr) visible pour tous les filtres UFR', () => {
    // id=3 (VICE_RECTEUR, targetUfr=undefined) doit apparaître quelle que soit l'UFR sélectionnée
    const ufrs = ['UFR_SAT', 'UFR_SJAG', 'UFR_LL'];
    for (const ufr of ufrs) {
      component.activeUfr = ufr;
      component.applyFilters();
      const ids = emittedResult.map(e => e.id);
      expect(ids).withContext(`UFR=${ufr} — l'élection globale id=3 doit être visible`).toContain(3);
    }
  });

  // ─── Test 3 : filtre par recherche texte seul ────────────────────────────────

  it('recherche "délégué" (insensible à la casse) → retourne id 1, 4 et 5', () => {
    component.searchText = 'délégué';
    component.applyFilters();

    const ids = emittedResult.map(e => e.id);
    expect(ids).toContain(1);
    expect(ids).toContain(4);
    expect(ids).toContain(5);
    expect(ids).not.toContain(2); // "DUFR" exclu
    expect(ids).not.toContain(3); // "Vice-Recteur" exclu
    expect(emittedResult.length).toBe(3);
  });

  it('recherche insensible à la casse : "VICE" trouve l\'élection "Vice-Recteur UASZ"', () => {
    component.searchText = 'VICE';
    component.applyFilters();

    expect(emittedResult.length).toBe(1);
    expect(emittedResult[0].id).toBe(3);
  });

  it('recherche avec aucun résultat → émet un tableau vide', () => {
    component.searchText = 'xXtermXx_inexistant';
    component.applyFilters();

    expect(emittedResult.length).toBe(0);
  });

  // ─── Test 4 : combinaison des trois filtres ───────────────────────────────────

  it('combinaison statut VOTE_OUVERT + UFR UFR_SAT + texte "info" → retourne uniquement id 1', () => {
    component.activeStatut = 'VOTE_OUVERT';
    component.activeUfr = 'UFR_SAT';
    component.searchText = 'info';
    component.applyFilters();

    expect(emittedResult.length).toBe(1);
    expect(emittedResult[0].id).toBe(1);
    expect(emittedResult[0].titre).toBe('Délégué L3 Info');
  });

  it('combinaison incompatible → émet un tableau vide', () => {
    component.activeStatut = 'CLOTURE';  // seul id=4 (UFR_SJAG)
    component.activeUfr = 'UFR_SAT';     // incompatible avec UFR_SJAG (id=4 non global)
    component.searchText = '';
    component.applyFilters();

    expect(emittedResult.length).toBe(0);
  });

  // ─── Test 5 : réinitialisation ───────────────────────────────────────────────

  it('resetAll() → retourne toutes les élections et remet les filtres à zéro', () => {
    // Activer des filtres
    component.activeStatut = 'CLOTURE';
    component.activeUfr = 'UFR_SJAG';
    component.searchText = 'droit';
    component.applyFilters();
    expect(emittedResult.length).toBe(1);

    // Reset
    component.resetAll();
    expect(emittedResult.length).toBe(mockElections.length);
    expect(component.activeStatut).toBe('TOUTES');
    expect(component.activeUfr).toBe('TOUTES');
    expect(component.searchText).toBe('');
    expect(component.hasActiveFilters()).toBeFalse();
  });

  // ─── Test 6 : compteurs des pilules ──────────────────────────────────────────

  it('buildPills() calcule les bons compteurs sur la liste complète', () => {
    const toutesP = component.statusPills.find(p => p.value === 'TOUTES');
    const voteP   = component.statusPills.find(p => p.value === 'VOTE_OUVERT');
    const clotP   = component.statusPills.find(p => p.value === 'CLOTURE');
    const campP   = component.statusPills.find(p => p.value === 'CAMPAGNE');

    expect(toutesP?.count).toBe(5);  // total
    expect(voteP?.count).toBe(3);    // id 1, 3, 5
    expect(clotP?.count).toBe(1);    // id 4
    expect(campP?.count).toBe(1);    // id 2
  });

  it('les pilules à count=0 ne sont pas affichées', () => {
    // DEPOUILLEMENT n'est pas dans mockElections → pilule ne doit pas exister
    const depP = component.statusPills.find(p => p.value === 'DEPOUILLEMENT');
    expect(depP).toBeUndefined();
  });
});
