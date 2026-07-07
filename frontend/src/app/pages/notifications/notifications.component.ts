import { Component, type OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import type { NotificationDTO } from '../../core/models';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <h1>Notifications</h1>
      <p class="muted">
        In-app alerts are always on. Configure Telegram / email in the backend env to also receive
        them there.
      </p>

      <div class="row" style="margin-bottom:16px">
        <button mat-flat-button color="primary" (click)="sendTest()">
          <mat-icon>notifications_active</mat-icon> Send test notification
        </button>
      </div>

      <div class="list">
        @for (n of items(); track n.id) {
          <mat-card class="n">
            <div class="row" style="justify-content:space-between;align-items:flex-start">
              <strong>{{ n.subject || '(no subject)' }}</strong>
              <span
                class="chip"
                [class.good]="n.status === 'SENT'"
                [class.warn]="n.status === 'FAILED'"
              >
                {{ n.channel }} · {{ n.status }}
              </span>
            </div>
            <pre class="body">{{ n.body }}</pre>
            <div class="muted">
              {{ n.createdAt | date: 'short' }}{{ n.error ? ' — ' + n.error : '' }}
            </div>
          </mat-card>
        } @empty {
          <p class="muted">
            No notifications yet. Send a test, or new-job alerts will appear here.
          </p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 720px;
      }
      .n {
        padding: 14px 16px;
      }
      .body {
        white-space: pre-wrap;
        font-family: inherit;
        margin: 8px 0;
      }
    `,
  ],
})
export class NotificationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  readonly items = signal<NotificationDTO[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listNotifications().subscribe((p) => this.items.set(p.items));
  }

  sendTest(): void {
    this.api.notify({}).subscribe({
      next: (r) => {
        this.snack.open(
          `Delivered via: ${r.delivered.map((d) => d.channel).join(', ') || 'none'}`,
          'OK',
          {
            duration: 3000,
          },
        );
        this.load();
      },
      error: () => this.snack.open('Failed to send', 'OK', { duration: 3000 }),
    });
  }
}
