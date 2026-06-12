import { Directive, ElementRef, Input, OnInit, OnDestroy, NgModule } from '@angular/core';

@Directive({
  selector: '[scrollAnimate]',
  standalone: true,
})
export class ScrollAnimateDirective implements OnInit, OnDestroy {
  @Input('scrollAnimate') animationClass = 'animate-fade-up';
  @Input() threshold = 0.15;
  @Input() delay = 0;

  private observer: IntersectionObserver | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const el = this.el.nativeElement;
    el.style.opacity = '0';
    if (this.delay) el.style.transitionDelay = `${this.delay}ms`;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add(this.animationClass);
            el.style.opacity = '1';
            this.observer?.unobserve(el);
          }
        });
      },
      { threshold: this.threshold }
    );
    this.observer.observe(el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}

@NgModule({
  imports: [ScrollAnimateDirective],
  exports: [ScrollAnimateDirective],
})
export class ScrollAnimateModule {}
