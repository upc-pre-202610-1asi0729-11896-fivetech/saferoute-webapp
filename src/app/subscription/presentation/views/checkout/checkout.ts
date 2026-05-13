import { Component, AfterViewInit, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../../../iam/application/auth-store';
import { SubscriptionStore } from '../../../application/subscription-store';

declare const paypal: any;

@Component({
  selector: 'app-checkout',
  imports: [],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements AfterViewInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private auth   = inject(AuthStore);
  private subStore = inject(SubscriptionStore);

  readonly planName  = signal<string>('');
  readonly planPrice = signal<string>('');
  readonly status    = signal<'idle' | 'success' | 'error' | 'cancelled'>('idle');
  readonly sdkReady  = signal(false);

  private orgId: number | null = null;
  private scriptEl: HTMLScriptElement | null = null;

  constructor() {
    const p = this.route.snapshot.queryParamMap;
    this.planName.set(p.get('plan')   ?? '');
    this.planPrice.set(p.get('price') ?? '');
    this.orgId = p.get('orgId') ? Number(p.get('orgId')) : null;
  }

  ngAfterViewInit(): void {
    this.loadPaypalSdk().then(() => {
      this.sdkReady.set(true);
      this.renderButtons();
    });
  }

  ngOnDestroy(): void {
    if (this.scriptEl) {
      document.head.removeChild(this.scriptEl);
      this.scriptEl = null;
    }
  }

  private loadPaypalSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof paypal !== 'undefined') { resolve(); return; }
      const script = document.createElement('script');
      script.src =
        'https://www.paypal.com/sdk/js?client-id=AdUsVXwA3QKQ_3UgFaH3wJZ6NgdzwL3PuEfi-um2YHyLAPiX7yRLMK2yJASwlT1i18KiD7RP30nwErH7&currency=USD&intent=capture&components=buttons';
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
      this.scriptEl = script;
    });
  }

  private renderButtons(): void {
    const raw   = this.planPrice().replace(',', '.');
    const match = raw.match(/(\d+\.?\d*)/);
    const amount = match ? match[1] : '9.99';

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 },

      createOrder: (_data: any, actions: any) =>
        actions.order.create({
          purchase_units: [{
            description: `SafeRoute — ${this.planName()}`,
            amount: { currency_code: 'USD', value: amount },
          }],
        }),

      onApprove: (_data: any, actions: any) =>
        actions.order.capture().then(() => {
          // Create subscription record in the database
          if (this.orgId) {
            this.subStore.createFromCheckout(this.orgId, this.planName(), amount);
          }
          this.status.set('success');
          // Clear any existing session so the user logs in fresh as the new admin
          this.auth.clearSession();
          setTimeout(() => this.router.navigate(['/iam/sign-in']), 2500);
        }),

      onCancel: () => this.status.set('cancelled'),

      onError: (err: any) => {
        console.error('PayPal error', err);
        this.status.set('error');
      },
    }).render('#paypal-button-container');
  }

  goBack(): void {
    this.router.navigate(['/iam/sign-in']);
  }
}
