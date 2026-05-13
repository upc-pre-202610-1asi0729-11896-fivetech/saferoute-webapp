import { Routes } from '@angular/router';

const planList = () => import('./views/plan-list/plan-list').then(m => m.PlanList);
const mySubscription = () => import('./views/my-subscription/my-subscription').then(m => m.MySubscription);

export const subscriptionRoutes: Routes = [
  { path: 'plans', loadComponent: planList, title: 'SafeRoute - Plans' },
  { path: 'status', loadComponent: mySubscription, title: 'SafeRoute - My Subscription' },
  { path: '', redirectTo: 'plans', pathMatch: 'full' }
];
