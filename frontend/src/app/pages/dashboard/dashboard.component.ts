import { Component, type OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import type { ApplicationDTO } from '../../core/models';

interface Metric {
  label: string;
  value: number | string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page">
      <h1>Dashboard</h1>
      <div class="grid">
        @for (m of metrics(); track m.label) {
          <mat-card class="metric">
            <mat-icon>{{ m.icon }}</mat-icon>
            <div class="v">{{ m.value }}</div>
            <div class="l muted">{{ m.label }}</div>
          </mat-card>
        }
      </div>

      <div class="row" style="margin-top:24px">
        <a mat-flat-button color="primary" routerLink="/jobs"><mat-icon>search</mat-icon> Find jobs</a>
        <a mat-stroked-button routerLink="/resume"><mat-icon>upload_file</mat-icon> Manage resume</a>
        <a mat-stroked-button routerLink="/applications"
          ><mat-icon>assignment</mat-icon> Applications</a
        >
      </div>
    </div>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
      }
      .metric {
        padding: 16px;
        text-align: center;
      }
      .metric mat-icon {
        color: #1667d1;
      }
      .metric .v {
        font-size: 1.8rem;
        font-weight: 600;
      }
      .metric .l {
        font-size: 0.85rem;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly metrics = signal<Metric[]>([]);

  ngOnInit(): void {
    forkJoin({
      jobs: this.api.listJobs({ pageSize: 1 }),
      apps: this.api.listApplications(),
    }).subscribe(({ jobs, apps }) => this.compute(jobs.total, apps.items));
  }

  private count(apps: ApplicationDTO[], status: string): number {
    return apps.filter((a) => a.status === status).length;
  }

  private compute(totalJobs: number, apps: ApplicationDTO[]): void {
    const submitted = this.count(apps, 'SUBMITTED');
    const interviews =
      this.count(apps, 'INTERVIEW_SCHEDULED') +
      this.count(apps, 'FINAL_INTERVIEW') +
      this.count(apps, 'TECHNICAL_TEST');
    const offers = this.count(apps, 'OFFER_RECEIVED');
    const rejections = this.count(apps, 'REJECTED');
    const successRate = submitted > 0 ? Math.round((offers / submitted) * 100) : 0;

    this.metrics.set([
      { label: 'Jobs Found', value: totalJobs, icon: 'work' },
      { label: 'Applications', value: apps.length, icon: 'assignment' },
      { label: 'Submitted', value: submitted, icon: 'send' },
      { label: 'Interviews', value: interviews, icon: 'groups' },
      { label: 'Offers', value: offers, icon: 'celebration' },
      { label: 'Rejections', value: rejections, icon: 'do_not_disturb' },
      { label: 'Success Rate', value: `${successRate}%`, icon: 'trending_up' },
    ]);
  }
}
