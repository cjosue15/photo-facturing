import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./home-capture/home-capture.component'),
  },
  {
    path: 'list',
    loadComponent: () => import('./home-list/home-list.component'),
  },
] as Routes;
