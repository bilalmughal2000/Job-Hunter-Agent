import { Component, type OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import type { JobDTO, JobSortField } from '../../core/models';

@Component({
  selector: 'app-jobs',
  imports: [
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="page">
      <h1>Jobs</h1>

      <mat-card class="filters">
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Keywords</mat-label>
            <input matInput [(ngModel)]="keywords" (keyup.enter)="load()" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput [(ngModel)]="location" (keyup.enter)="load()" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Min match</mat-label>
            <input matInput type="number" [(ngModel)]="minMatchScore" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sort</mat-label>
            <mat-select [(ngModel)]="sort">
              <mat-option value="NEWEST">Newest</mat-option>
              <mat-option value="HIGHEST_MATCH">Highest match</mat-option>
              <mat-option value="SALARY">Salary</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" (click)="load()">
            <mat-icon>filter_list</mat-icon> Apply
          </button>
          <button mat-stroked-button (click)="runSearch()" [disabled]="searching()">
            <mat-icon>search</mat-icon> Search sources
          </button>
        </div>
      </mat-card>

      @if (loading() || searching()) { <mat-progress-bar mode="indeterminate" /> }

      <p class="muted">{{ total() }} jobs</p>
      <div class="list">
        @for (job of jobs(); track job.id) {
          <mat-card class="job">
            <div class="row" style="justify-content:space-between;align-items:flex-start">
              <div>
                <a [routerLink]="['/jobs', job.id]"><strong>{{ job.title }}</strong></a>
                <div class="muted">{{ job.company }} · {{ job.location }} · {{ job.remoteType }}</div>
              </div>
              @if (job.matchScore !== null) {
                <span class="chip" [class.good]="job.matchScore >= 75">{{ job.matchScore }}% match</span>
              }
            </div>
            @if (job.salary) { <div class="muted">💰 {{ job.salary }}</div> }
            <div>
              @for (s of job.missingSkills; track s) { <span class="chip warn">missing: {{ s }}</span> }
            </div>
          </mat-card>
        } @empty {
          <p class="muted">No jobs yet — try “Search sources”.</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .filters {
        padding: 8px 16px;
        margin-bottom: 16px;
      }
      .filters .row {
        align-items: center;
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .job {
        padding: 14px 16px;
      }
    `,
  ],
})
export class JobsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);

  keywords = '';
  location = '';
  minMatchScore: number | null = null;
  sort: JobSortField = 'NEWEST';

  readonly jobs = signal<JobDTO[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly searching = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .listJobs({
        keywords: this.keywords || undefined,
        location: this.location || undefined,
        minMatchScore: this.minMatchScore ?? undefined,
        sort: this.sort,
        pageSize: 50,
      })
      .subscribe({
        next: (p) => {
          this.jobs.set(p.items);
          this.total.set(p.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  runSearch(): void {
    this.searching.set(true);
    this.api
      .runSearch({ keywords: this.keywords ? this.keywords.split(' ') : ['angular'], locations: ['Lahore'] })
      .subscribe({
        next: (s) => {
          this.searching.set(false);
          this.snack.open(`Found ${s.totalFound}, ${s.newlyPersisted} new`, 'OK', { duration: 3000 });
          this.load();
        },
        error: () => {
          this.searching.set(false);
          this.snack.open('Search failed', 'OK', { duration: 3000 });
        },
      });
  }
}
