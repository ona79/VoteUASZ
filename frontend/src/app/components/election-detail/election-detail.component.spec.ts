import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ElectionDetailComponent } from './election-detail.component';
import { ElectionService } from '../../services/election.service';
import { VoteService } from '../../services/vote.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Election, LiveResultsDto } from '../../models/vote.models';

describe('ElectionDetailComponent', () => {
  let fixture: ComponentFixture<ElectionDetailComponent>;
  let component: ElectionDetailComponent;
  let electionServiceSpy: jasmine.SpyObj<ElectionService>;
  let wsServiceSpy: jasmine.SpyObj<WebSocketService>;
  let resultsSubject: BehaviorSubject<LiveResultsDto | null>;
  let isLoggedIn = false;
  let currentUserRole: 'ELECTEUR' | 'SUPER_ADMIN' = 'ELECTEUR';

  const mockElection = (statut: Election['statut']): Election => ({
    id: 1,
    titre: 'Élection Délégué L3',
    description: 'Test',
    type: 'DELEGUE',
    statut,
    dateDebut: '2026-01-01T08:00:00',
    dateFin: '2026-12-31T18:00:00'
  });

  beforeEach(async () => {
    resultsSubject = new BehaviorSubject<LiveResultsDto | null>(null);
    electionServiceSpy = jasmine.createSpyObj('ElectionService', [
      'getElection', 'getCandidatures', 'getCampaignPostsByElection',
      'getLiveResults', 'getVoteStatus', 'exportPdfReport'
    ]);
    electionServiceSpy.getCandidatures.and.returnValue(of([]));
    electionServiceSpy.getCampaignPostsByElection.and.returnValue(of([]));
    electionServiceSpy.getVoteStatus.and.returnValue(of({ hasVoted: false, authenticated: true }));
    electionServiceSpy.getLiveResults.and.returnValue(of({
      electionId: 1,
      electionTitre: 'Élection Délégué L3',
      totalVotes: 5,
      candidateResults: [
        { candidatureId: 10, nomCandidat: 'Awa Ndiaye', nomListe: 'Awa Ndiaye', voteCount: 3, percentage: 60 },
        { candidatureId: 11, nomCandidat: 'Moussa Diop', nomListe: 'Moussa Diop', voteCount: 2, percentage: 40 }
      ]
    }));

    wsServiceSpy = jasmine.createSpyObj('WebSocketService', ['connect', 'disconnect'], {
      results$: resultsSubject.asObservable()
    });

    const authMock = {
      isLoggedIn: () => isLoggedIn,
      currentUser: () => isLoggedIn ? { role: currentUserRole, ufr: 'UFR_SAT' } : null
    };

    await TestBed.configureTestingModule({
      imports: [ElectionDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
        { provide: ElectionService, useValue: electionServiceSpy },
        { provide: VoteService, useValue: jasmine.createSpyObj('VoteService', ['requestOtp', 'verifyOtp', 'submitVote']) },
        { provide: WebSocketService, useValue: wsServiceSpy },
        { provide: AuthService, useValue: authMock },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError', 'showInfo']) }
      ]
    }).compileComponents();
  });

  it('should not connect WebSocket or fetch results when unauthenticated', () => {
    isLoggedIn = false;
    electionServiceSpy.getElection.and.returnValue(of(mockElection('VOTE_OUVERT')));

    fixture = TestBed.createComponent(ElectionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(wsServiceSpy.connect).not.toHaveBeenCalled();
    expect(electionServiceSpy.getLiveResults).not.toHaveBeenCalled();
  });

  it('should not connect WebSocket for ELECTEUR during VOTE_OUVERT', () => {
    isLoggedIn = true;
    currentUserRole = 'ELECTEUR';
    electionServiceSpy.getElection.and.returnValue(of(mockElection('VOTE_OUVERT')));

    fixture = TestBed.createComponent(ElectionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(wsServiceSpy.connect).not.toHaveBeenCalled();
    expect(electionServiceSpy.getLiveResults).not.toHaveBeenCalled();
  });

  it('should connect WebSocket and load results for authenticated user in DEPOUILLEMENT', () => {
    isLoggedIn = true;
    currentUserRole = 'ELECTEUR';
    electionServiceSpy.getElection.and.returnValue(of(mockElection('DEPOUILLEMENT')));

    fixture = TestBed.createComponent(ElectionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(wsServiceSpy.connect).toHaveBeenCalledWith(1);
    expect(electionServiceSpy.getLiveResults).toHaveBeenCalledWith(1);
    expect(component.resultsList.length).toBe(2);
  });

  it('should update liveResults on WebSocket push and switch chartType', () => {
    isLoggedIn = true;
    currentUserRole = 'SUPER_ADMIN';
    electionServiceSpy.getElection.and.returnValue(of(mockElection('VOTE_OUVERT')));

    fixture = TestBed.createComponent(ElectionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    resultsSubject.next({
      electionId: 1,
      electionTitre: 'Élection Délégué L3',
      totalVotes: 10,
      candidateResults: [
        { candidatureId: 10, nomCandidat: 'Awa Ndiaye', nomListe: 'Awa Ndiaye', voteCount: 7, percentage: 70 }
      ]
    });

    expect(component.liveResults?.totalVotes).toBe(10);
    component.setChartType('doughnut');
    expect(component.chartType).toBe('doughnut');
  });
});
