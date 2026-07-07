import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import type { ResumeDTO, ResumeProfileDTO } from '../../core/models';

@Component({
  selector: 'app-resume',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="page">
      <h1>Resume Manager</h1>
      <mat-card class="upload">
        <p class="muted">Upload a PDF, DOCX or TXT resume. We extract a structured profile.</p>
        <input #file type="file" accept=".pdf,.docx,.txt,.rtf" (change)="upload(file.files)" hidden />
        <button mat-flat-button color="primary" (click)="file.click()" [disabled]="busy()">
          <mat-icon>upload_file</mat-icon> Choose file
        </button>
        @if (busy()) { <mat-progress-bar mode="indeterminate" /> }
      </mat-card>

      @if (resume(); as r) {
        <mat-card class="meta">
          <strong>{{ r.originalName }}</strong> · {{ r.format }} · {{ r.parseStatus }}
          @if (r.isPrimary) { <span class="chip good">primary</span> }
        </mat-card>
      }

      @if (profile(); as p) {
        <div class="row">
          <mat-card class="col">
            <h3>{{ p.fullName || 'Profile' }}</h3>
            <p class="muted">{{ p.email }} · {{ p.phone }}</p>
            @if (p.summary) { <p>{{ p.summary }}</p> }
            <div>
              @if (p.githubUrl) { <a [href]="p.githubUrl" target="_blank" class="chip">GitHub</a> }
              @if (p.linkedinUrl) { <a [href]="p.linkedinUrl" target="_blank" class="chip">LinkedIn</a> }
              @if (p.portfolioUrl) { <a [href]="p.portfolioUrl" target="_blank" class="chip">Portfolio</a> }
            </div>
            <h3>Skills</h3>
            <div>@for (s of p.skills; track s.name) {
              <span class="chip" [class.good]="s.type === 'SOFT'">{{ s.name }}</span>
            }</div>
          </mat-card>
          <mat-card class="col">
            <h3>Experience</h3>
            @for (e of p.experiences; track e.title + e.company) {
              <div class="exp">
                <strong>{{ e.title }}</strong> — {{ e.company }}
                @if (e.isCurrent) { <span class="chip good">current</span> }
                <ul>@for (h of e.highlights; track h) { <li>{{ h }}</li> }</ul>
              </div>
            }
            <h3>Education</h3>
            @for (ed of p.educations; track ed.institution) {
              <div>{{ ed.degree }} — {{ ed.institution }}</div>
            }
          </mat-card>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .upload,
      .meta {
        padding: 16px;
        margin-bottom: 16px;
      }
      .col {
        flex: 1 1 380px;
        padding: 16px;
      }
      .exp {
        margin-bottom: 10px;
      }
      h3 {
        margin: 12px 0 4px;
      }
    `,
  ],
})
export class ResumeComponent {
  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);

  readonly resume = signal<ResumeDTO | null>(null);
  readonly profile = signal<ResumeProfileDTO | null>(null);
  readonly busy = signal(false);

  upload(files: FileList | null): void {
    const file = files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.api.uploadResume(file).subscribe({
      next: (r) => {
        this.resume.set(r);
        this.busy.set(false);
        if (r.hasProfile) {
          this.api.getResumeProfile(r.id).subscribe((p) => this.profile.set(p));
        } else {
          this.snack.open(`Parse status: ${r.parseStatus}`, 'OK', { duration: 4000 });
        }
      },
      error: (e) => {
        this.busy.set(false);
        this.snack.open(e.error?.error?.message ?? 'Upload failed', 'OK', { duration: 4000 });
      },
    });
  }
}
