import {Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef, inject} from '@angular/core';
import {Subscription} from 'rxjs';
import {ViewMode, ViewModeService} from '../service/view-mode.service';

@Directive({
  selector: '[srActiveViewMode]',
  standalone: true
})
export class ActiveViewModeDirective implements OnInit, OnDestroy {
  private templateRef = inject<TemplateRef<any>>(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  private viewModeService = inject(ViewModeService);

  private allowedModes: ViewMode[] = [];
  private hasView = false;
  private modeSubscription?: Subscription;

  @Input() set srActiveViewMode(modes: ViewMode[] | ViewMode) {
    this.allowedModes = this.normalizeModes(modes);
    this.render();
  }

  ngOnInit() {
    this.modeSubscription = this.viewModeService.viewMode.subscribe(() => {
      this.render();
    });
  }

  ngOnDestroy() {
    if (this.modeSubscription) {
      this.modeSubscription.unsubscribe();
    }
  }

  private render() {
    const shouldRender = this.allowedModes.length === 0 || this.viewModeService.isAllowed(this.allowedModes);

    if (shouldRender && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
      return;
    }

    if (!shouldRender && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private normalizeModes(modes: ViewMode[] | ViewMode): ViewMode[] {
    const values = Array.isArray(modes) ? modes : [modes];
    const unique = new Set<ViewMode>();

    values.forEach((mode) => {
      if (mode === 'simple' || mode === 'advanced' || mode === 'expert') {
        unique.add(mode);
      }
    });

    return Array.from(unique);
  }
}
