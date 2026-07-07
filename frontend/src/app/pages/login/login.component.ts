import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="wrap">
      <mat-card class="card">
        <h1>🎯 AI Job Hunter</h1>
        <p class="muted">Find, score and manage Angular jobs in Lahore.</p>
        @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
        <mat-tab-group>
          <mat-tab label="Log in">
            <form (ngSubmit)="login()" class="form">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" name="email" [(ngModel)]="email" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput type="password" name="password" [(ngModel)]="password" required />
              </mat-form-field>
              <button mat-flat-button color="primary" [disabled]="loading()">Log in</button>
            </form>
          </mat-tab>
          <mat-tab label="Register">
            <form (ngSubmit)="register()" class="form">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput name="rname" [(ngModel)]="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" name="remail" [(ngModel)]="email" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Password (min 8 chars)</mat-label>
                <input matInput type="password" name="rpassword" [(ngModel)]="password" required />
              </mat-form-field>
              <button mat-flat-button color="primary" [disabled]="loading()">Create account</button>
            </form>
          </mat-tab>
        </mat-tab-group>
        @if (error()) { <p class="err">{{ error() }}</p> }
      </mat-card>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 16px;
      }
      .card {
        width: 100%;
        max-width: 420px;
        padding: 24px;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-top: 16px;
      }
      .err {
        color: #c62828;
        margin: 8px 0 0;
      }
      h1 {
        margin: 0 0 4px;
        font-size: 1.4rem;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  name = '';
  readonly loading = signal(false);
  readonly error = signal('');

  private done(): void {
    this.loading.set(false);
    void this.router.navigate(['/dashboard']);
  }

  private fail(err: HttpErrorResponse): void {
    this.loading.set(false);
    this.error.set(err.error?.error?.message ?? 'Something went wrong');
  }

  login(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({ next: () => this.done(), error: (e) => this.fail(e) });
  }

  register(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth
      .register(this.email, this.password, this.name || undefined)
      .subscribe({ next: () => this.done(), error: (e) => this.fail(e) });
  }
}
