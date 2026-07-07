import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  template: `
    <mat-toolbar color="primary" class="topbar">
      <button mat-icon-button (click)="sidenav.toggle()" aria-label="Toggle menu">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="brand">🎯 AI Job Hunter</span>
      <span class="spacer"></span>
      <button mat-button [matMenuTriggerFor]="menu">
        <mat-icon>account_circle</mat-icon>
        {{ auth.user()?.name || auth.user()?.email || 'Account' }}
      </button>
      <mat-menu #menu="matMenu">
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon><span>Log out</span>
        </button>
      </mat-menu>
    </mat-toolbar>

    <mat-sidenav-container class="container">
      <mat-sidenav #sidenav mode="side" opened class="sidenav">
        <mat-nav-list>
          @for (item of nav; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              [activated]="rla.isActive"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .brand {
        font-weight: 500;
        margin-left: 8px;
      }
      .container {
        position: absolute;
        top: 64px;
        bottom: 0;
        left: 0;
        right: 0;
      }
      .sidenav {
        width: 240px;
        padding-top: 8px;
      }
    `,
  ],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/jobs', label: 'Jobs', icon: 'work' },
    { path: '/resume', label: 'Resume Manager', icon: 'description' },
    { path: '/applications', label: 'Applications', icon: 'assignment_turned_in' },
    { path: '/analytics', label: 'Analytics', icon: 'insights' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
  ];

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
