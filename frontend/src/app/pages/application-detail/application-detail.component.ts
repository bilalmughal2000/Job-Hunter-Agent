import { Component, type OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { APPLICATION_STATUSES } from '../../core/models';
import type { ApplicationPackageDTO, ApplicationStatus } from '../../core/models';

@Component({
  selector: 'app-application-detail',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page">
      @if (pkg(); as p) {
        <h1>{{ p.application.jobTitle }}</h1>
        <p class="muted">{{ p.application.company }}</p>

        <div class="row" style="align-items:center;gap:8px;margin-bottom:12px">
          <span class="chip">stage: {{ p.application.stage }}</span>
          <span
            class="chip"
            [class.good]="p.application.status === 'OFFER_RECEIVED'"
            [class.warn]="p.application.status === 'REJECTED'"
            >status: {{ p.application.status }}</span
          >
          @if (p.application.appliedDate) {
            <span class="chip good"
              >applied {{ p.application.appliedDate | date: 'mediumDate' }}</span
            >
          }
        </div>

        @if (busy()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <div class="row" style="margin-bottom:16px">
          @if (p.nextStage) {
            <button mat-flat-button color="primary" (click)="advance()">
              <mat-icon>arrow_forward</mat-icon> Advance to {{ p.nextStage }}
            </button>
          }
          <button mat-stroked-button [matMenuTriggerFor]="menu">
            <mat-icon>flag</mat-icon> Set status
          </button>
          <mat-menu #menu="matMenu">
            @for (s of statuses; track s) {
              <button mat-menu-item (click)="setStatus(s)">{{ s }}</button>
            }
          </mat-menu>
          @if (jobUrl()) {
            <a mat-flat-button color="accent" [href]="jobUrl()" target="_blank" rel="noopener">
              <mat-icon>open_in_new</mat-icon> Apply on site
            </a>
          }
        </div>

        <div class="row">
          <div class="col">
            <mat-card class="c">
              <h3>Package — links</h3>
              @if (p.githubUrl) {
                <a [href]="p.githubUrl" target="_blank" class="chip">GitHub</a>
              }
              @if (p.linkedinUrl) {
                <a [href]="p.linkedinUrl" target="_blank" class="chip">LinkedIn</a>
              }
              @if (p.portfolioUrl) {
                <a [href]="p.portfolioUrl" target="_blank" class="chip">Portfolio</a>
              }
              @if (!p.githubUrl && !p.linkedinUrl && !p.portfolioUrl) {
                <p class="muted">No links on your resume profile.</p>
              }
            </mat-card>

            @if (p.customizedResume; as r) {
              <mat-card class="c">
                <h3>Customized resume · ATS {{ r.atsScore }}</h3>
                <p>{{ r.summary }}</p>
                <div>
                  @for (s of r.highlightedSkills; track s) {
                    <span class="chip">{{ s }}</span>
                  }
                </div>
              </mat-card>
            } @else {
              <mat-card class="c">
                <p class="muted">No customized resume attached. Customize one from the job page.</p>
              </mat-card>
            }

            @if (p.coverLetter) {
              <mat-card class="c">
                <h3>Cover letter</h3>
                <pre class="letter">{{ p.coverLetter }}</pre>
              </mat-card>
            }
          </div>

          <mat-card class="col c">
            <h3>Timeline</h3>
            @for (e of p.events; track e.createdAt) {
              <div class="ev">
                <mat-icon>chevron_right</mat-icon>
                <div>
                  <div>{{ e.toStage }} · {{ e.toStatus }}</div>
                  <div class="muted">
                    {{ e.createdAt | date: 'short' }}{{ e.note ? ' — ' + e.note : '' }}
                  </div>
                </div>
              </div>
            }
          </mat-card>
        </div>
      } @else if (busy()) {
        <mat-progress-bar mode="indeterminate" />
      }
    </div>
  `,
  styles: [
    `
      .col {
        flex: 1 1 420px;
      }
      .c {
        padding: 16px;
        margin-bottom: 12px;
      }
      h3 {
        margin: 0 0 8px;
      }
      .letter {
        white-space: pre-wrap;
        font-family: inherit;
        background: #fafbfc;
        padding: 12px;
        border-radius: 6px;
      }
      .ev {
        display: flex;
        gap: 6px;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      .ev mat-icon {
        color: #1667d1;
      }
    `,
  ],
})
export class ApplicationDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snack = inject(MatSnackBar);

  readonly pkg = signal<ApplicationPackageDTO | null>(null);
  readonly jobUrl = signal<string | null>(null);
  readonly busy = signal(false);
  readonly statuses = APPLICATION_STATUSES;

  private get id(): string {
    return this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.busy.set(true);
    this.api.getApplication(this.id).subscribe({
      next: (p) => {
        this.pkg.set(p);
        this.busy.set(false);
        // Fetch the external posting URL so "Apply on site" works.
        this.api.getJob(p.application.jobId).subscribe((j) => this.jobUrl.set(j.url));
      },
      error: () => this.busy.set(false),
    });
  }

  advance(): void {
    this.busy.set(true);
    this.api.advanceApplication(this.id).subscribe({
      next: () => this.reload(),
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e.error?.error?.message ?? 'Cannot advance', 'OK', { duration: 4000 });
      },
    });
  }

  setStatus(status: ApplicationStatus): void {
    this.busy.set(true);
    this.api.setApplicationStatus(this.id, status).subscribe({
      next: () => this.reload(),
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e.error?.error?.message ?? 'Invalid transition', 'OK', { duration: 4000 });
      },
    });
  }
}
