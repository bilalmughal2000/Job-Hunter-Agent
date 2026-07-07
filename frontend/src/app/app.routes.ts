import type { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { ShellComponent } from './shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'jobs',
        loadComponent: () => import('./pages/jobs/jobs.component').then((m) => m.JobsComponent),
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./pages/job-detail/job-detail.component').then((m) => m.JobDetailComponent),
      },
      {
        path: 'resume',
        loadComponent: () =>
          import('./pages/resume/resume.component').then((m) => m.ResumeComponent),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./pages/applications/applications.component').then(
            (m) => m.ApplicationsComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
