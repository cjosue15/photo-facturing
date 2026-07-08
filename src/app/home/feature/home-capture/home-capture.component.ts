import { Component, computed, inject, signal, Signal } from '@angular/core';
import {
  percentage,
  ref,
  Storage,
  uploadBytesResumable,
} from '@angular/fire/storage';
import { DataUrl, NgxImageCompressService } from 'ngx-image-compress';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { DomSanitizerPipe } from '../dom-sanitizer.pipe';
import { FOLDER_NAME } from '../storage.constants';

type IFile = { file: File; preview: any; progress?: number };

@Component({
  selector: 'app-home-capture',
  standalone: true,
  imports: [DomSanitizerPipe, RouterLink],
  templateUrl: './home-capture.component.html',
})
export default class HomeCaptureComponent {
  private readonly _storage = inject(Storage);

  private readonly imageCompress = inject(NgxImageCompressService);

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

  async uploadFiles() {
    for (const file of this.files()) {
      const image = await this._readFileAsDataURL(file.file);
      const imageCompressed = await this.compressFile(image as string);
      const blob = this._dataURLtoBlob(imageCompressed as string);
      const compressedFile = new File([blob], file.file.name, {
        type: file.file.type,
      });

      this.uploadFile({
        file: compressedFile,
        preview: file.preview,
        progress: 0,
      });
    }
  }

  compressFile(file: string) {
    return this.imageCompress
      .compressFile(file, 1, 50, 50)
      .then((result: DataUrl) => {
        return result;
      });
  }

  private _readFileAsDataURL(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  }

  private _dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  uploadFile({ file }: IFile) {
    const storageRef = ref(this._storage, `${FOLDER_NAME}/` + file.name);
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
