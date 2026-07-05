import { Component, OnInit, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationStore } from '../../../application/notification-store';
import { AuthStore } from '../../../../iam/application/auth-store';

@Component({
  selector: 'app-notification-list',
  imports: [MatCardModule, MatListModule, MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.css'
})
export class NotificationList implements OnInit {
  protected store = inject(NotificationStore);
  private auth = inject(AuthStore);

  ngOnInit(): void {
    this.store.loadNotifications(this.auth.currentUser()?.email);
  }

  markRead(id: number | string): void {
    this.store.markAsRead(id);
  }
}
