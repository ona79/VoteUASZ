import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ElectionListComponent } from './components/election-list/election-list.component';
import { ElectionDetailComponent } from './components/election-detail/election-detail.component';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'elections', component: ElectionListComponent },
  { path: 'elections/:id', component: ElectionDetailComponent },

  // Espace Super-Admin (RBAC: SUPER_ADMIN) - Lazy Loaded
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, roleGuard(['SUPER_ADMIN'])]
  },

  // Espace Commission Électorale (RBAC: COMMISSION_ELECTORALE, SUPER_ADMIN) - Lazy Loaded
  {
    path: 'commission',
    loadComponent: () => import('./components/commission-dashboard/commission-dashboard.component').then(m => m.CommissionDashboardComponent),
    canActivate: [authGuard, roleGuard(['COMMISSION_ELECTORALE', 'SUPER_ADMIN'])]
  },

  // Espace Candidat (RBAC: CANDIDAT) - Lazy Loaded
  {
    path: 'candidat',
    loadComponent: () => import('./components/candidate-dashboard/candidate-dashboard.component').then(m => m.CandidateDashboardComponent),
    canActivate: [authGuard, roleGuard(['CANDIDAT'])]
  },

  // Réclamations électorales (dépôt et suivi pour Électeurs et Candidats) - Lazy Loaded
  {
    path: 'reclamations',
    loadComponent: () => import('./components/complaint/complaint.component').then(m => m.ComplaintComponent),
    canActivate: [authGuard, roleGuard(['ELECTEUR', 'CANDIDAT'])]
  },

  { path: '', redirectTo: 'elections', pathMatch: 'full' },
  { path: '**', redirectTo: 'elections' }
];
