import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { interval } from 'rxjs';
import { startWith } from 'rxjs/operators';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly _swUpdate = inject(SwUpdate);
  private readonly _destroyRef = inject(DestroyRef);

  updateAvailable = signal(false);
  updateDismissed = signal(false);

  showBanner = computed(
    () => this.updateAvailable() && !this.updateDismissed(),
  );

  constructor() {
    if (!this._swUpdate.isEnabled) return;

    this._swUpdate.versionUpdates
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((evt) => {
        if (evt.type === 'VERSION_READY') {
          this.updateAvailable.set(true);
        }
      });

    interval(CHECK_INTERVAL_MS)
      .pipe(startWith(0), takeUntilDestroyed(this._destroyRef))
      .subscribe(() => {
        this._swUpdate.checkForUpdate();
      });
  }

  reloadToUpdate(): void {
    this._swUpdate
      .activateUpdate()
      .then(() => document.location.reload());
  }

  dismissUpdate(): void {
    this.updateDismissed.set(true);
  }
}
