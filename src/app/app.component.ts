import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import {
  Storage,
  ref,
  uploadBytesResumable,
  percentage,
} from '@angular/fire/storage';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly _storage = inject(Storage);

  percent = signal(0);

  percentString = computed(() => {
    return this.percent() + '%';
  });

  unsuscribe$ = new Subject<void>();

  susbscription: Subscription | undefined = undefined;

  onFileSelected(event: Event) {
    if (!event) return;
    this.percent.set(0);

    const fileList = (event.target as HTMLInputElement).files;

    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];

    const storageRef = ref(this._storage, 'uploads/' + file.name);
    const uploadTask = uploadBytesResumable(storageRef, file);

    if (this.susbscription) {
      this.susbscription.unsubscribe();
      this.susbscription = undefined;
    }

    this.susbscription = percentage(uploadTask)
      .pipe(takeUntil(this.unsuscribe$))
      .subscribe((value) => {
        const progress = Math.round(value.progress);
        this.percent.set(progress);
      });
  }
}
