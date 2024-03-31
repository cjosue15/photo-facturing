import {
  ApplicationConfig,
  isDevMode,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getStorage, provideStorage } from '@angular/fire/storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    importProvidersFrom(
      provideFirebaseApp(() =>
        initializeApp({
          projectId: 'photo-facturing',
          appId: '1:973961999376:web:8e71067f24c04fe024c695',
          storageBucket: 'photo-facturing.appspot.com',
          apiKey: 'AIzaSyAQPm2D81McsbFxRFadZfm_aaF5HRXZTVo',
          authDomain: 'photo-facturing.firebaseapp.com',
          messagingSenderId: '973961999376',
        }),
      ),
    ),
    importProvidersFrom(provideStorage(() => getStorage())),
  ],
};
