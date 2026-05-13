import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-vehicle-management',
  imports: [MatCardModule, MatIconModule, TranslatePipe],
  templateUrl: './vehicle-management.html',
  styleUrl: './vehicle-management.css'
})
export class VehicleManagement {}
