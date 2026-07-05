import { AfterViewInit, Component, inject, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '../../../../iam/application/auth-store';
import { SubscriptionStore } from '../../../application/subscription-store';

declare global {
  interface Window {
    paypal?: any;
  }
}

const PAYPAL_CLIENT_ID = 'AdUsVXwA3QKQ_3UgFaH3wJZ6NgdzwL3PuEfi-um2YHyLAPiX7yRLMK2yJASwlT1i18KiD7RP30nwErH7';

@Component({
  selector: 'app-checkout',
  imports: [],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class Checkout implements AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthStore);
  private subStore = inject(SubscriptionStore);

  readonly planName = signal('');
  readonly planPrice = signal('');
  readonly planTier = signal('');
  readonly credit = signal('');
  readonly mode = signal<'new' | 'upgrade'>('new');
  readonly status = signal<'idle' | 'success' | 'error' | 'cancelled'>('idle');
  readonly sdkReady = signal(false);

  private orgId: number | null = null;
  private scriptEl: HTMLScriptElement | null = null;
  private buttonsRendered = false;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.planName.set(params.get('plan') ?? '');
    this.planPrice.set(params.get('price') ?? '');
    this.planTier.set(params.get('tier') ?? '');
    this.credit.set(params.get('credit') ?? '');
    this.mode.set(params.get('mode') === 'upgrade' ? 'upgrade' : 'new');
    this.orgId = params.get('orgId') ? Number(params.get('orgId')) : null;
  }

  ngAfterViewInit(): void {
    this.loadPaypalSdk().then(() => {
      this.sdkReady.set(true);
      this.renderButtons();
    }).catch(err => {
      console.error(err);
      this.status.set('error');
    });
  }

  ngOnDestroy(): void {
    if (this.scriptEl && document.head.contains(this.scriptEl)) {
      document.head.removeChild(this.scriptEl);
      this.scriptEl = null;
    }
  }

  private numericPrice(): string {
    const raw = this.planPrice().replace(',', '.');
    const match = raw.match(/(\d+\.?\d*)/);
    return match ? match[1] : '9.99';
  }

  private loadPaypalSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.paypal) {
        resolve();
        return;
      }
      const existing = document.getElementById('paypal-sdk-co') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('PayPal SDK failed to load')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = 'paypal-sdk-co';
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&components=buttons`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('PayPal SDK failed to load'));
      document.head.appendChild(script);
      this.scriptEl = script;
    });
  }

  private renderButtons(): void {
    if (this.buttonsRendered) return;
    const container = document.getElementById('paypal-button-container');
    if (!container || !window.paypal) return;
    container.replaceChildren();
    this.buttonsRendered = true;

    const amount = this.numericPrice();
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 48 },

      createOrder: (_data: any, actions: any) =>
        actions.order.create({
          purchase_units: [{
            description: `SafeRoute - Plan ${this.planName()}`,
            amount: { currency_code: 'USD', value: amount },
          }],
        }),

      onApprove: async (_data: any, actions: any) => {
        await actions.order.capture();
        if (this.orgId) {
          if (this.mode() === 'upgrade') {
            this.subStore.upgradeFromCheckout(this.orgId, this.planName(), this.planTier());
          } else {
            this.subStore.createFromCheckout(this.orgId, this.planName(), amount, this.planTier());
          }
        }
        this.status.set('success');
        if (this.mode() === 'upgrade') {
          setTimeout(() => this.router.navigate(['/subscription/status']), 1800);
        } else {
          this.auth.clearSession();
          setTimeout(() => this.router.navigate(['/iam/sign-in']), 2500);
        }
      },

      onCancel: () => this.status.set('cancelled'),

      onError: (err: any) => {
        console.error('PayPal error', err);
        this.status.set('error');
      },
    }).render('#paypal-button-container');
  }

  goBack(): void {
    this.router.navigate([this.mode() === 'upgrade' ? '/subscription/status' : '/iam/sign-in']);
  }
}
