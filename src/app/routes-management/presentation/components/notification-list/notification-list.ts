import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationStore } from '../../../application/routes-management.store';

@Component({
  selector: 'app-notification-list',
  imports: [MatCardModule, MatListModule, MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.css'
})
export class NotificationList {
  protected store = inject(NotificationStore);

  markRead(id: number): void {
    this.store.markAsRead(id);
  }
}
