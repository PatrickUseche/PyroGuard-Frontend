import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'registro', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () => import('./core/layout/app-layout').then((module) => module.AppLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((module) => module.DashboardPage),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login-page').then((module) => module.LoginPage),
      },
      {
        path: 'nodos/:id',
        loadComponent: () =>
          import('./features/nodes/node-detail-page').then((module) => module.NodeDetailPage),
      },
      {
        path: 'mapa',
        loadComponent: () => import('./features/map/node-map').then((module) => module.NodeMap),
      },
      {
        path: 'alertas/:id',
        loadComponent: () =>
          import('./features/alerts/alert-detail-page').then((module) => module.AlertDetailPage),
      },
      {
        path: 'alertas',
        loadComponent: () =>
          import('./features/alerts/alerts-history-page').then(
            (module) => module.AlertsHistoryPage,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
