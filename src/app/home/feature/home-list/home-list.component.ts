import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  Storage,
  StorageReference,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
} from '@angular/fire/storage';
import { FOLDER_NAME } from '../storage.constants';

type IStoredFile = {
  name: string;
  url: string;
  isPdf: boolean;
  timeCreated: string;
};

type ISortedRef = {
  ref: StorageReference;
  timeCreated: string;
  contentType?: string;
};

const PAGE_SIZE = 10;

@Component({
  selector: 'app-home-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './home-list.component.html',
})
export default class HomeListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly _storage = inject(Storage);

  // All the refs of the folder sorted by upload date (newest first).
  // Only names + metadata live here; download URLs are resolved per page.
  private _sortedRefs: ISortedRef[] = [];

  private _observer: IntersectionObserver | undefined;

  @ViewChild('sentinel') sentinel: ElementRef<HTMLElement> | undefined;

  files = signal<IStoredFile[]>([]);

  loading = signal(true);

  loadingMore = signal(false);

  hasMore = signal(false);

  error = signal<string | undefined>(undefined);

  async ngOnInit() {
    try {
      const result = await listAll(ref(this._storage, FOLDER_NAME));

      const refsWithMeta = await Promise.all(
        result.items.map(async (item) => {
          const meta = await getMetadata(item);
          return {
            ref: item,
            timeCreated: meta.timeCreated,
            contentType: meta.contentType,
          };
        })
      );

      refsWithMeta.sort((a, b) => b.timeCreated.localeCompare(a.timeCreated));

      this._sortedRefs = refsWithMeta;
      this.hasMore.set(this._sortedRefs.length > 0);

      await this.loadMore();
    } catch (error) {
      this.error.set('Could not load the files. Please try again later.');
    } finally {
      this.loading.set(false);
    }
  }

  ngAfterViewInit() {
    this._observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    });
    if (this.sentinel) {
      this._observer.observe(this.sentinel.nativeElement);
    }
  }

  async loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;

    this.loadingMore.set(true);

    try {
      const nextRefs = this._sortedRefs.slice(
        this.files().length,
        this.files().length + PAGE_SIZE
      );

      const page = await Promise.all(
        nextRefs.map(async (item) => ({
          name: item.ref.name,
          url: await getDownloadURL(item.ref),
          isPdf:
            item.contentType === 'application/pdf' ||
            item.ref.name.toLowerCase().endsWith('.pdf'),
          timeCreated: item.timeCreated,
        }))
      );

      this.files.update((prev) => [...prev, ...page]);
      this.hasMore.set(this.files().length < this._sortedRefs.length);
    } catch (error) {
      this.error.set('Could not load more files. Please try again later.');
    } finally {
      this.loadingMore.set(false);
    }
  }

  ngOnDestroy() {
    this._observer?.disconnect();
  }
}
