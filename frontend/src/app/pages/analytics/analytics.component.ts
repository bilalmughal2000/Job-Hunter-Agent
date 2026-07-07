import { Component, type OnInit, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import type { AnalyticsDTO, CountItem } from '../../core/models';

@Component({
  selector: 'app-analytics',
  imports: [MatCardModule, MatIconModule],
  template: `
    <div class="page">
      <h1>Analytics</h1>
      @if (a(); as data) {
        <div class="grid">
          <mat-card class="metric"
            ><div class="v">{{ data.totalJobs }}</div>
            <div class="l muted">Jobs</div></mat-card
          >
          <mat-card class="metric"
            ><div class="v">{{ data.applications.total }}</div>
            <div class="l muted">Applications</div></mat-card
          >
          <mat-card class="metric"
            ><div class="v">{{ data.applications.submitted }}</div>
            <div class="l muted">Submitted</div></mat-card
          >
          <mat-card class="metric"
            ><div class="v">{{ data.applications.interviews }}</div>
            <div class="l muted">Interviews</div></mat-card
          >
          <mat-card class="metric"
            ><div class="v">{{ data.applications.offers }}</div>
            <div class="l muted">Offers</div></mat-card
          >
          <mat-card class="metric"
            ><div class="v">{{ data.applications.successRate }}%</div>
            <div class="l muted">Success</div></mat-card
          >
          <mat-card class="metric"
            ><div class="v">{{ data.averageSalary || '—' }}</div>
            <div class="l muted">Avg salary</div></mat-card
          >
        </div>

        <div class="row">
          <mat-card class="col">
            <h3>Hiring trend (14 days)</h3>
            <div class="spark">
              @for (d of data.hiringTrend; track d.date) {
                <div
                  class="bar"
                  [style.height.%]="barHeight(d.count, data.hiringTrend)"
                  [title]="d.date + ': ' + d.count"
                ></div>
              }
            </div>
          </mat-card>
          <mat-card class="col">
            <h3>Top hiring companies</h3>
            @for (b of data.topCompanies; track b.label) {
              <div class="bar-row">
                <span class="bl">{{ b.label }}</span>
                <div class="track">
                  <div class="fill alt" [style.width.%]="pct(b, data.topCompanies)"></div>
                </div>
                <span class="bv">{{ b.count }}</span>
              </div>
            }
            @if (data.topCompanies.length === 0) {
              <p class="muted">No jobs yet.</p>
            }
          </mat-card>
        </div>

        <div class="row">
          <mat-card class="col">
            <h3>Most in-demand skills</h3>
            @for (b of data.mostDemandedSkills; track b.label) {
              <div class="bar-row">
                <span class="bl">{{ b.label }}</span>
                <div class="track">
                  <div class="fill" [style.width.%]="pct(b, data.mostDemandedSkills)"></div>
                </div>
                <span class="bv">{{ b.count }}</span>
              </div>
            }
            @if (data.mostDemandedSkills.length === 0) {
              <p class="muted">Analyze some jobs to populate this.</p>
            }
          </mat-card>
          <mat-card class="col">
            <h3>Your skill gaps</h3>
            @for (b of data.skillGaps; track b.label) {
              <div class="bar-row">
                <span class="bl">{{ b.label }}</span>
                <div class="track">
                  <div class="fill warn" [style.width.%]="pct(b, data.skillGaps)"></div>
                </div>
                <span class="bv">{{ b.count }}</span>
              </div>
            }
            @if (data.skillGaps.length === 0) {
              <p class="muted">Run matching on jobs to see gaps.</p>
            }
          </mat-card>
        </div>
      } @else {
        <p class="muted">Loading analytics…</p>
      }
    </div>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .metric {
        padding: 12px;
        text-align: center;
      }
      .metric .v {
        font-size: 1.3rem;
        font-weight: 600;
      }
      .metric .l {
        font-size: 0.75rem;
      }
      .col {
        flex: 1 1 340px;
        padding: 16px;
      }
      h3 {
        margin: 0 0 12px;
      }
      .spark {
        display: flex;
        align-items: flex-end;
        gap: 3px;
        height: 80px;
      }
      .spark .bar {
        flex: 1;
        background: #1667d1;
        border-radius: 2px 2px 0 0;
        min-height: 2px;
      }
      .bar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 0.85rem;
      }
      .bl {
        width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bv {
        width: 28px;
        text-align: right;
      }
      .track {
        flex: 1;
        background: #eef1f5;
        border-radius: 999px;
        height: 12px;
        overflow: hidden;
      }
      .fill {
        height: 100%;
        background: #1667d1;
      }
      .fill.alt {
        background: #2e9e6b;
      }
      .fill.warn {
        background: #d9822b;
      }
    `,
  ],
})
export class AnalyticsComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly a = signal<AnalyticsDTO | null>(null);

  ngOnInit(): void {
    this.api.getAnalytics().subscribe((d) => this.a.set(d));
  }

  pct(b: CountItem, all: CountItem[]): number {
    const max = Math.max(1, ...all.map((x) => x.count));
    return Math.round((b.count / max) * 100);
  }

  barHeight(count: number, trend: { count: number }[]): number {
    const max = Math.max(1, ...trend.map((x) => x.count));
    return Math.max(4, Math.round((count / max) * 100));
  }
}
