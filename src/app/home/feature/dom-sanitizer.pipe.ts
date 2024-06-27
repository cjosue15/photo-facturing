import { Pipe, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({ standalone: true, name: 'domSanitizer' })
export class DomSanitizerPipe extends Pipe {
  private readonly domSanitizer = inject(DomSanitizer);

  transform(url: string) {
    return this.domSanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
