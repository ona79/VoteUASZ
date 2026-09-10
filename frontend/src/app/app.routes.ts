import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ElectionListComponent } from './components/election-list/election-list.component';
import { ElectionDetailComponent } from './components/election-detail/election-detail.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { CommissionDashboardComponent } from './components/commission-dashboard/commission-dashboard.component';
import { CandidateDashboardComponent } from './components/candidate-dashboard/candidate-dashboard.component';
import { ComplaintComponent } from './components/complaint/complaint.component';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'elections', component: ElectionListComponent },
  { path: 'elections/:id', component: ElectionDetailComponent },

  // Espace Super-Admin (RBAC: SUPER_ADMIN)
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard(['SUPER_ADMIN'])]
  },

  // Espace Commission Électorale (RBAC: COMMISSION_ELECTORALE, SUPER_ADMIN)
  {
    path: 'commission',
    component: CommissionDashboardComponent,
    canActivate: [authGuard, roleGuard(['COMMISSION_ELECTORALE', 'SUPER_ADMIN'])]
  },

  // Espace Candidat (RBAC: CANDIDAT)
  {
    path: 'candidat',
    component: CandidateDashboardComponent,
    canActivate: [authGuard, roleGuard(['CANDIDAT'])]
  },

  // Réclamations électorales (tous les utilisateurs authentifiés)
  {
    path: 'reclamations',
    component: ComplaintComponent,
    canActivate: [authGuard]
  },

  { path: '', redirectTo: 'elections', pathMatch: 'full' },
  { path: '**', redirectTo: 'elections' }
];
