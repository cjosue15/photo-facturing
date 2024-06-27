import { Component, signal, inject, computed, Signal } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytesResumable,
  percentage,
} from '@angular/fire/storage';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizerPipe } from '../dom-sanitizer.pipe';

type IFile = { file: File; preview: any; progress?: number };

@Component({
  selector: 'app-home-capture',
  standalone: true,
  imports: [DomSanitizerPipe],
  templateUrl: './home-capture.component.html',
})
export default class HomeCaptureComponent {
  private readonly _storage = inject(Storage);

  files = signal<IFile[]>([]);

  showUploader = signal(false);

  unsuscribe$ = new Subject<void>();

  susbscription: Subscription[] | undefined = undefined;

  totalProgress: Signal<number> = computed(() => {
    if (this.files().length === 0) return 0;
    return Number(
      (
        this.files().reduce((acc, file) => acc + file.progress!, 0) /
        this.files().length
      ).toFixed(2)
    );
  });

  onFileSelected(event: Event) {
    if (!event) return;
    const fileList = (event.target as HTMLInputElement).files;

    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      console.log(file.type);
      if (file.type === 'application/pdf') {
        const preview = URL.createObjectURL(file);
        this.files.update((prev) => [...prev, { file, preview, progress: 0 }]);
      } else {
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const preview = e.target?.result;
          this.files.update((prev) => [
            ...prev,
            { file, preview, progress: 0 },
          ]);
        };
      }
    }

    this.showUploader.set(true);
  }

  uploadFiles() {
    for (const file of this.files()) {
      this.uploadFile(file);
    }
  }

  uploadFile({ file }: IFile) {
    const storageRef = ref(this._storage, '2024/' + file.name);
    const uploadTask = uploadBytesResumable(storageRef, file);

    if (this.susbscription && this.susbscription?.length > 0) {
      for (const sub of this.susbscription) {
        sub.unsubscribe();
      }
      this.susbscription = undefined;
    }

    const subscription = percentage(uploadTask)
      .pipe(takeUntil(this.unsuscribe$))
      .subscribe((value) => {
        const progress = Math.round(value.progress);

        this.files.update((prevFilesFiles) => {
          return prevFilesFiles.map((oldFile) => {
            if (oldFile.file.name === file.name) {
              oldFile.progress = progress;
            }
            return oldFile;
          });
        });
      });

    this.susbscription?.push(subscription);
  }

  ngOnDestroy() {
    this.unsuscribe$.next();
    this.unsuscribe$.complete();
  }
}
