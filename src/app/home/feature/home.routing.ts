import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./home-capture/home-capture.component'),
  },
] as Routes;
