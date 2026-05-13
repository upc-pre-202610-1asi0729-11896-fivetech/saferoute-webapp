import { Routes } from '@angular/router';

const studentMgmt = () => import('./views/student-management/student-management').then(m => m.StudentManagement);
const vehicleMgmt = () => import('./views/vehicle-management/vehicle-management').then(m => m.VehicleManagement);

export const stakeholderRoutes: Routes = [
  { path: 'profiles', loadComponent: studentMgmt, title: 'SafeRoute - People Management' },
  { path: 'students', loadComponent: studentMgmt, title: 'SafeRoute - Students' },
  { path: 'vehicles', loadComponent: vehicleMgmt, title: 'SafeRoute - Vehicles' },
  { path: '', redirectTo: 'profiles', pathMatch: 'full' }
];
