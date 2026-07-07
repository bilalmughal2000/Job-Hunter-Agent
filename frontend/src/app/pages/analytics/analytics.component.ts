import { Component, type OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/api.service';
import { WORKFLOW_STAGES } from '../../core/models';
import type { ApplicationDTO, JobDTO } from '../../core/models';

interface Bar {
  label: string;
  value: number;
  pct: number;
}

@Component({
  selector: 'app-analytics',
  imports: [MatCardModule],
  template: `
    <div class="page">
      <h1>Analytics</h1>
      <div class="row">
        <mat-card class="col">
          <h3>Application funnel</h3>
          @for (b of funnel(); track b.label) {
            <div class="bar-row">
              <span class="bl">{{ b.label }}</span>
              <div class="track"><div class="fill" [style.width.%]="b.pct"></div></div>
              <span class="bv">{{ b.value }}</span>
            </div>
          } @empty {
            <p class="muted">No applications yet.</p>
          }
        </mat-card>

        <mat-card class="col">
          <h3>Top hiring companies</h3>
          @for (b of topCompanies(); track b.label) {
            <div class="bar-row">
              <span class="bl">{{ b.label }}</span>
              <div class="track"><div class="fill alt" [style.width.%]="b.pct"></div></div>
              <span class="bv">{{ b.value }}</span>
            </div>
          } @empty {
            <p class="muted">No jobs yet.</p>
          }
        </mat-card>

        <mat-card class="col">
          <h3>Most in-demand skills (missing)</h3>
          @for (b of skillGaps(); track b.label) {
            <div class="bar-row">
              <span class="bl">{{ b.label }}</span>
              <div class="track"><div class="fill warn" [style.width.%]="b.pct"></div></div>
              <span class="bv">{{ b.value }}</span>
            </div>
          } @empty {
            <p class="muted">Run matching to see skill gaps.</p>
          }
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .col {
        flex: 1 1 340px;
        padding: 16px;
      }
      h3 {
        margin: 0 0 12px;
      }
      .bar-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 0.85rem;
      }
      .bl {
        width: 130px;
        text-transform: capitalize;
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
  private readonly apps = signal<ApplicationDTO[]>([]);
  private readonly jobs = signal<JobDTO[]>([]);

  ngOnInit(): void {
    this.api.listApplications().subscribe((p) => this.apps.set(p.items));
    this.api.listJobs({ pageSize: 100 }).subscribe((p) => this.jobs.set(p.items));
  }

  private toBars(counts: Map<string, number>, limit = 8): Bar[] {
    const entries = [...counts.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    const max = Math.max(1, ...entries.map(([, v]) => v));
    return entries.map(([label, value]) => ({
      label,
      value,
      pct: Math.round((value / max) * 100),
    }));
  }

  readonly funnel = computed<Bar[]>(() => {
    const apps = this.apps();
    if (apps.length === 0) return [];
    const counts = new Map<string, number>();
    for (const stage of WORKFLOW_STAGES) {
      const idx = WORKFLOW_STAGES.indexOf(stage);
      // Count applications that reached at least this stage.
      counts.set(
        stage.replace(/_/g, ' ').toLowerCase(),
        apps.filter((a) => WORKFLOW_STAGES.indexOf(a.stage) >= idx).length,
      );
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()].map(([label, value]) => ({
      label,
      value,
      pct: Math.round((value / max) * 100),
    }));
  });

  readonly topCompanies = computed<Bar[]>(() => {
    const counts = new Map<string, number>();
    for (const j of this.jobs()) {
      const c = j.company ?? 'Unknown';
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return this.toBars(counts);
  });

  readonly skillGaps = computed<Bar[]>(() => {
    const counts = new Map<string, number>();
    for (const j of this.jobs()) {
      for (const s of j.missingSkills) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return this.toBars(counts);
  });
}
