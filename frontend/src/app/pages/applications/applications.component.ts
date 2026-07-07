import { Component, type OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { APPLICATION_STATUSES, WORKFLOW_STAGES } from '../../core/models';
import type { ApplicationDTO, ApplicationStatus } from '../../core/models';

@Component({
  selector: 'app-applications',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="page">
      <h1>Applications</h1>
      <p class="muted">Workflow board — advance stages and track status. Submission needs approval.</p>

      <div class="board">
        @for (stage of stages; track stage) {
          <div class="col">
            <div class="col-head">{{ label(stage) }} <span class="count">{{ byStage(stage).length }}</span></div>
            @for (a of byStage(stage); track a.id) {
              <mat-card class="card">
                <strong>{{ a.jobTitle }}</strong>
                <div class="muted">{{ a.company }}</div>
                <span class="chip" [class.good]="a.status === 'OFFER_RECEIVED'"
                  [class.warn]="a.status === 'REJECTED'">{{ a.status }}</span>
                <div class="actions">
                  <button mat-icon-button title="Advance stage" (click)="advance(a)">
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                  <button mat-icon-button [matMenuTriggerFor]="menu" title="Set status">
                    <mat-icon>flag</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu">
                    @for (s of statuses; track s) {
                      <button mat-menu-item (click)="setStatus(a, s)">{{ s }}</button>
                    }
                  </mat-menu>
                </div>
              </mat-card>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .board {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 12px;
      }
      .col {
        min-width: 220px;
        flex: 0 0 220px;
        background: #eef1f5;
        border-radius: 8px;
        padding: 8px;
      }
      .col-head {
        font-weight: 600;
        font-size: 0.8rem;
        padding: 4px 6px 8px;
        display: flex;
        justify-content: space-between;
      }
      .count {
        background: #dfe5ee;
        border-radius: 999px;
        padding: 0 8px;
      }
      .card {
        padding: 10px;
        margin-bottom: 8px;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class ApplicationsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);

  readonly stages = WORKFLOW_STAGES;
  readonly statuses = APPLICATION_STATUSES;
  readonly apps = signal<ApplicationDTO[]>([]);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.listApplications().subscribe((p) => this.apps.set(p.items));
  }

  label(stage: string): string {
    return stage.replace(/_/g, ' ').toLowerCase();
  }

  byStage(stage: string): ApplicationDTO[] {
    return this.apps().filter((a) => a.stage === stage);
  }

  advance(a: ApplicationDTO): void {
    this.api.advanceApplication(a.id).subscribe({
      next: () => this.load(),
      error: (e) => this.snack.open(e.error?.error?.message ?? 'Cannot advance', 'OK', { duration: 4000 }),
    });
  }

  setStatus(a: ApplicationDTO, status: ApplicationStatus): void {
    this.api.setApplicationStatus(a.id, status).subscribe({
      next: () => this.load(),
      error: (e) => this.snack.open(e.error?.error?.message ?? 'Invalid transition', 'OK', { duration: 4000 }),
    });
  }
}
