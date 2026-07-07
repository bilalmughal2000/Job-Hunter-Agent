import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import type { ApiSuccess, AuthResult, AuthUser } from './models';

const TOKEN_KEY = 'ajh_token';
const USER_KEY = 'ajh_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiBase;
  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _user = signal<AuthUser | null>(this.readUser());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null);

  constructor(private readonly http: HttpClient) {}

  get token(): string | null {
    return this._token();
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }

  private persist(result: AuthResult): void {
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    this._token.set(result.token);
    this._user.set(result.user);
  }

  login(email: string, password: string): Observable<ApiSuccess<AuthResult>> {
    return this.http
      .post<ApiSuccess<AuthResult>>(`${this.base}/auth/login`, { email, password })
      .pipe(tap((res) => this.persist(res.data)));
  }

  register(email: string, password: string, name?: string): Observable<ApiSuccess<AuthResult>> {
    return this.http
      .post<ApiSuccess<AuthResult>>(`${this.base}/auth/register`, { email, password, name })
      .pipe(tap((res) => this.persist(res.data)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }
}
