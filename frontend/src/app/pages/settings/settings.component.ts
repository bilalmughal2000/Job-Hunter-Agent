import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-settings',
  imports: [MatCardModule, MatIconModule],
  template: `
    <div class="page">
      <h1>Settings</h1>
      <mat-card class="c">
        <h3>Account</h3>
        <p><strong>Name:</strong> {{ auth.user()?.name || '—' }}</p>
        <p><strong>Email:</strong> {{ auth.user()?.email }}</p>
        <p><strong>Role:</strong> {{ auth.user()?.role }}</p>
      </mat-card>
      <mat-card class="c">
        <h3>AI backend</h3>
        <p class="muted">
          The backend defaults to an offline heuristic engine (no key needed). To enable real LLMs,
          set <code>AI_PROVIDER=openai-compatible</code> with a free Groq/Gemini key (or local
          Ollama) in the backend environment.
        </p>
      </mat-card>
      <mat-card class="c">
        <h3>Search preferences</h3>
        <p class="muted">
          Default target: Frontend Angular roles in Lahore, Pakistan. Scheduled searches run every 4
          hours / daily / weekly on the backend.
        </p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .c {
        padding: 16px;
        margin-bottom: 16px;
        max-width: 640px;
      }
      h3 {
        margin: 0 0 8px;
      }
    `,
  ],
})
export class SettingsComponent {
  readonly auth = inject(AuthService);
}
