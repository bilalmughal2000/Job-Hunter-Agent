import { Component, type OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import type {
  CoverLetterDTO,
  JobAnalysis,
  JobDTO,
  MatchResult,
  ResumeVersionDTO,
} from '../../core/models';

@Component({
  selector: 'app-job-detail',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="page">
      @if (job(); as j) {
        <h1>{{ j.title }}</h1>
        <p class="muted">
          {{ j.company }} · {{ j.location }} · {{ j.remoteType }} · {{ j.source }}
        </p>
        @if (busy()) {
          <mat-progress-bar mode="indeterminate" />
        }

        <div class="row" style="margin:12px 0">
          <button mat-flat-button color="primary" (click)="analyze(j.id)">
            <mat-icon>psychology</mat-icon> Analyze
          </button>
          <button mat-flat-button color="primary" (click)="match(j.id)">
            <mat-icon>compare_arrows</mat-icon> Match resume
          </button>
          <button mat-stroked-button (click)="customize(j.id)">
            <mat-icon>tune</mat-icon> Customize resume
          </button>
          <button mat-stroked-button [disabled]="!version()" (click)="coverLetter(j.id)">
            <mat-icon>mail</mat-icon> Cover letter
          </button>
          <button mat-stroked-button (click)="createApplication(j.id)">
            <mat-icon>add</mat-icon> Track application
          </button>
          <a mat-flat-button color="accent" [href]="j.url" target="_blank" rel="noopener">
            <mat-icon>open_in_new</mat-icon> Apply on site
          </a>
        </div>
        <p class="muted" style="margin-top:-4px">
          Tip: “Apply on site” opens the real posting to submit there, then track it under
          <strong>Applications</strong>. This app never auto-submits on your behalf.
        </p>

        <div class="row">
          <mat-card class="col">
            <h3>Description</h3>
            <p>{{ j.description }}</p>
            @if (j.requirements) {
              <h3>Requirements</h3>
              <p>{{ j.requirements }}</p>
            }
          </mat-card>

          <div class="col results">
            @if (analysis(); as a) {
              <mat-card>
                <h3>AI Summary</h3>
                <p>{{ a.summary }}</p>
                <div>
                  @for (s of a.requiredSkills; track s) {
                    <span class="chip">{{ s }}</span>
                  }
                </div>
                <div>
                  @for (s of a.preferredSkills; track s) {
                    <span class="chip good">pref: {{ s }}</span>
                  }
                </div>
              </mat-card>
            }
            @if (matchResult(); as m) {
              <mat-card>
                <h3>Match: {{ m.matchScore }}%</h3>
                <p>{{ m.explanation }}</p>
                <div>
                  @for (s of m.strongSkills; track s) {
                    <span class="chip good">{{ s }}</span>
                  }
                </div>
                <div>
                  @for (s of m.missingSkills; track s) {
                    <span class="chip warn">{{ s }}</span>
                  }
                </div>
                <p class="muted">{{ m.recommendation }}</p>
              </mat-card>
            }
            @if (version(); as v) {
              <mat-card>
                <h3>Customized resume v{{ v.version }} · ATS {{ v.atsScore }}</h3>
                <p>{{ v.content.summary }}</p>
                <div>
                  @for (s of v.content.highlightedSkills; track s) {
                    <span class="chip">{{ s }}</span>
                  }
                </div>
              </mat-card>
            }
            @if (cover(); as c) {
              <mat-card>
                <h3>Cover letter</h3>
                <pre class="letter">{{ c.content }}</pre>
              </mat-card>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .col {
        flex: 1 1 380px;
        padding: 16px;
      }
      .results {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .letter {
        white-space: pre-wrap;
        font-family: inherit;
        background: #fafbfc;
        padding: 12px;
        border-radius: 6px;
      }
      h3 {
        margin: 8px 0 4px;
      }
    `,
  ],
})
export class JobDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);

  readonly job = signal<JobDTO | null>(null);
  readonly analysis = signal<JobAnalysis | null>(null);
  readonly matchResult = signal<MatchResult | null>(null);
  readonly version = signal<ResumeVersionDTO | null>(null);
  readonly cover = signal<CoverLetterDTO | null>(null);
  readonly busy = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.getJob(id).subscribe((j) => this.job.set(j));
  }

  private err(msg: string): void {
    this.busy.set(false);
    this.snack.open(msg, 'OK', { duration: 4000 });
  }

  analyze(id: string): void {
    this.busy.set(true);
    this.api.analyzeJob(id).subscribe({
      next: (a) => {
        this.analysis.set(a);
        this.busy.set(false);
      },
      error: () => this.err('Analyze failed'),
    });
  }

  match(id: string): void {
    this.busy.set(true);
    this.api.matchJob(id).subscribe({
      next: (m) => {
        this.matchResult.set(m);
        this.busy.set(false);
      },
      error: (e) => this.err(e.error?.error?.message ?? 'Match failed — upload a resume first'),
    });
  }

  customize(id: string): void {
    this.busy.set(true);
    this.api.customizeResume(id).subscribe({
      next: (v) => {
        this.version.set(v);
        this.busy.set(false);
      },
      error: (e) => this.err(e.error?.error?.message ?? 'Customize failed — upload a resume first'),
    });
  }

  coverLetter(id: string): void {
    const v = this.version();
    if (!v) return;
    this.busy.set(true);
    this.api.createCoverLetter(id, v.id).subscribe({
      next: (c) => {
        this.cover.set(c);
        this.busy.set(false);
      },
      error: () => this.err('Cover letter failed'),
    });
  }

  createApplication(id: string): void {
    this.api
      .createApplication({
        jobId: id,
        resumeVersionId: this.version()?.id,
        coverLetterId: this.cover()?.id,
      })
      .subscribe({
        next: (a) => {
          this.snack
            .open('Application created', 'View', { duration: 3000 })
            .onAction()
            .subscribe(() => void this.router.navigate(['/applications']));
          void a;
        },
        error: (e) => this.err(e.error?.error?.message ?? 'Could not create application'),
      });
  }
}
