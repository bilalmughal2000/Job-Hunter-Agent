import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { type Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  ApiSuccess,
  ApplicationDTO,
  ApplicationPackageDTO,
  ApplicationStatus,
  CoverLetterDTO,
  JobAnalysis,
  JobDTO,
  JobFilter,
  AnalyticsDTO,
  CareerAssistantDTO,
  MatchResult,
  NotificationDTO,
  NotifyResult,
  Paginated,
  ResumeDTO,
  ResumeProfileDTO,
  ResumeVersionDTO,
  SearchRunSummary,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiBase;
  constructor(private readonly http: HttpClient) {}

  private data<T>(o: Observable<ApiSuccess<T>>): Observable<T> {
    return o.pipe(map((r) => r.data));
  }

  // ── Jobs ──────────────────────────────────────────────
  listJobs(filter: JobFilter): Observable<Paginated<JobDTO>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filter)) {
      if (v === undefined || v === null || v === '') continue;
      params = params.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    return this.data(this.http.get<ApiSuccess<Paginated<JobDTO>>>(`${this.base}/jobs`, { params }));
  }

  getJob(id: string): Observable<JobDTO> {
    return this.data(this.http.get<ApiSuccess<JobDTO>>(`${this.base}/jobs/${id}`));
  }

  runSearch(body: {
    keywords: string[];
    locations?: string[];
    excludeKeywords?: string[];
  }): Observable<SearchRunSummary> {
    return this.data(this.http.post<ApiSuccess<SearchRunSummary>>(`${this.base}/search`, body));
  }

  analyzeJob(id: string): Observable<JobAnalysis> {
    return this.data(
      this.http.post<ApiSuccess<JobAnalysis>>(`${this.base}/jobs/${id}/analyze`, {}),
    );
  }

  matchJob(id: string, resumeId?: string): Observable<MatchResult> {
    return this.data(
      this.http.post<ApiSuccess<MatchResult>>(`${this.base}/jobs/${id}/match`, { resumeId }),
    );
  }

  // ── Resume ────────────────────────────────────────────
  uploadResume(file: File): Observable<ResumeDTO> {
    const form = new FormData();
    form.append('resume', file);
    return this.data(this.http.post<ApiSuccess<ResumeDTO>>(`${this.base}/resume/upload`, form));
  }

  getResume(id: string): Observable<ResumeDTO> {
    return this.data(this.http.get<ApiSuccess<ResumeDTO>>(`${this.base}/resume/${id}`));
  }

  getResumeProfile(id: string): Observable<ResumeProfileDTO> {
    return this.data(
      this.http.get<ApiSuccess<ResumeProfileDTO>>(`${this.base}/resume/${id}/profile`),
    );
  }

  customizeResume(jobId: string, resumeId?: string): Observable<ResumeVersionDTO> {
    return this.data(
      this.http.post<ApiSuccess<ResumeVersionDTO>>(`${this.base}/resume/customize`, {
        jobId,
        resumeId,
      }),
    );
  }

  listVersions(jobId: string): Observable<ResumeVersionDTO[]> {
    return this.data(
      this.http.get<ApiSuccess<ResumeVersionDTO[]>>(`${this.base}/resume/versions/${jobId}`),
    );
  }

  // ── Cover letters ─────────────────────────────────────
  createCoverLetter(jobId: string, resumeVersionId: string): Observable<CoverLetterDTO> {
    return this.data(
      this.http.post<ApiSuccess<CoverLetterDTO>>(`${this.base}/cover-letter`, {
        jobId,
        resumeVersionId,
      }),
    );
  }

  editCoverLetter(id: string, content: string): Observable<CoverLetterDTO> {
    return this.data(
      this.http.put<ApiSuccess<CoverLetterDTO>>(`${this.base}/cover-letter/${id}`, { content }),
    );
  }

  // ── Applications ──────────────────────────────────────
  listApplications(status?: ApplicationStatus): Observable<Paginated<ApplicationDTO>> {
    let params = new HttpParams().set('pageSize', '100');
    if (status) params = params.set('status', status);
    return this.data(
      this.http.get<ApiSuccess<Paginated<ApplicationDTO>>>(`${this.base}/applications`, { params }),
    );
  }

  createApplication(body: {
    jobId: string;
    resumeVersionId?: string;
    coverLetterId?: string;
  }): Observable<ApplicationDTO> {
    return this.data(this.http.post<ApiSuccess<ApplicationDTO>>(`${this.base}/applications`, body));
  }

  getApplication(id: string): Observable<ApplicationPackageDTO> {
    return this.data(
      this.http.get<ApiSuccess<ApplicationPackageDTO>>(`${this.base}/applications/${id}`),
    );
  }

  advanceApplication(id: string, note?: string): Observable<ApplicationDTO> {
    return this.data(
      this.http.post<ApiSuccess<ApplicationDTO>>(`${this.base}/applications/${id}/advance`, {
        note,
      }),
    );
  }

  setApplicationStatus(
    id: string,
    status: ApplicationStatus,
    note?: string,
  ): Observable<ApplicationDTO> {
    return this.data(
      this.http.put<ApiSuccess<ApplicationDTO>>(`${this.base}/applications/${id}/status`, {
        status,
        note,
      }),
    );
  }

  updateApplication(id: string, patch: Partial<ApplicationDTO>): Observable<ApplicationDTO> {
    return this.data(
      this.http.patch<ApiSuccess<ApplicationDTO>>(`${this.base}/applications/${id}`, patch),
    );
  }

  // ── Notifications ─────────────────────────────────────
  listNotifications(): Observable<Paginated<NotificationDTO>> {
    return this.data(
      this.http.get<ApiSuccess<Paginated<NotificationDTO>>>(`${this.base}/notifications`),
    );
  }

  notify(body: { jobId?: string; subject?: string; body?: string }): Observable<NotifyResult> {
    return this.data(this.http.post<ApiSuccess<NotifyResult>>(`${this.base}/notifications`, body));
  }

  // ── Analytics & career assistant ──────────────────────
  getAnalytics(): Observable<AnalyticsDTO> {
    return this.data(this.http.get<ApiSuccess<AnalyticsDTO>>(`${this.base}/analytics`));
  }

  careerAssistant(jobId: string): Observable<CareerAssistantDTO> {
    return this.data(
      this.http.get<ApiSuccess<CareerAssistantDTO>>(`${this.base}/jobs/${jobId}/assistant`),
    );
  }
}
