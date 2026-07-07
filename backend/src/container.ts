import { DeduplicationAgent } from './agents/dedup/index.js';
import { SearchAgent } from './agents/search/index.js';
import {
  DocxTextExtractor,
  HeuristicStructuredExtractor,
  PdfTextExtractor,
  TesseractOcrExtractor,
  TextExtractionService,
  TxtTextExtractor,
} from './agents/resume-application/extraction/index.js';
import { HeuristicMatchingAgent, LlmMatchingAgent } from './agents/matching/index.js';
import type { MatchingAgent } from './agents/matching/index.js';
import { HeuristicJobAnalysisAgent, LlmJobAnalysisAgent } from './agents/job-analysis/index.js';
import type { JobAnalysisAgent } from './agents/job-analysis/index.js';
import { HeuristicResumeOptimizer, LlmResumeOptimizer } from './agents/resume-optimizer/index.js';
import type { ResumeOptimizerAgent } from './agents/resume-optimizer/index.js';
import { LlmCoverLetterAgent, TemplateCoverLetterAgent } from './agents/cover-letter/index.js';
import type { CoverLetterAgent } from './agents/cover-letter/index.js';
import { HeuristicCareerAssistant, LlmCareerAssistant } from './agents/career-assistant/index.js';
import type { CareerAssistantAgent } from './agents/career-assistant/index.js';
import { EmailChannel, InAppChannel, TelegramChannel } from './agents/notification/index.js';
import { OpenAiCompatibleClient } from './ai/index.js';
import { buildDefaultRegistry } from './providers/index.js';
import {
  ApplicationRepository,
  CompanyRepository,
  CoverLetterRepository,
  JobRepository,
  MatchResultRepository,
  NotificationRepository,
  ResumeRepository,
  ResumeVersionRepository,
  SearchHistoryRepository,
  UserRepository,
} from './repositories/index.js';
import {
  AnalyticsService,
  ApplicationDocsService,
  ApplicationService,
  AuthService,
  CareerAssistantService,
  JobAnalysisService,
  JobService,
  LocalStorage,
  MatchingService,
  NotificationService,
  ResumeService,
  SearchService,
} from './services/index.js';
import type {
  IAnalyticsService,
  IApplicationDocsService,
  IApplicationService,
  IAuthService,
  ICareerAssistantService,
  IJobAnalysisService,
  IJobService,
  IMatchingService,
  INotificationService,
  IResumeService,
  ISearchService,
} from './services/index.js';
import { SchedulerService } from './scheduler/scheduler.service.js';
import { env } from './config/index.js';
import { prisma } from './database/index.js';
import { InMemoryCache } from './utils/cache.js';
import { logger } from './utils/logger.js';

interface AiAgents {
  matching: MatchingAgent;
  jobAnalysis: JobAnalysisAgent;
  optimizer: ResumeOptimizerAgent;
  coverLetter: CoverLetterAgent;
  assistant: CareerAssistantAgent;
}

/**
 * Selects AI agent implementations. With a configured OpenAI-compatible provider
 * (OpenAI/Groq/Gemini/…) the LLM agents are used; otherwise the deterministic
 * offline agents — so the app is fully functional with no API key.
 */
function buildAiAgents(): AiAgents {
  if (env.AI_PROVIDER === 'openai-compatible' && env.AI_API_KEY) {
    const client = new OpenAiCompatibleClient(
      {
        baseUrl: env.AI_BASE_URL,
        apiKey: env.AI_API_KEY,
        model: env.AI_MODEL,
        timeoutMs: env.AI_TIMEOUT_MS,
      },
      logger,
    );
    logger.info({ backend: client.name }, 'AI agents: LLM backend');
    return {
      matching: new LlmMatchingAgent(client),
      jobAnalysis: new LlmJobAnalysisAgent(client),
      optimizer: new LlmResumeOptimizer(client),
      coverLetter: new LlmCoverLetterAgent(client),
      assistant: new LlmCareerAssistant(client),
    };
  }
  logger.info('AI agents: heuristic backend (no API key configured)');
  return {
    matching: new HeuristicMatchingAgent(),
    jobAnalysis: new HeuristicJobAnalysisAgent(),
    optimizer: new HeuristicResumeOptimizer(),
    coverLetter: new TemplateCoverLetterAgent(),
    assistant: new HeuristicCareerAssistant(),
  };
}

/** The set of dependencies the HTTP layer needs. Injected into the app. */
export interface AppContainer {
  jobService: IJobService;
  searchService: ISearchService;
  resumeService: IResumeService;
  jobAnalysisService: IJobAnalysisService;
  matchingService: IMatchingService;
  applicationDocsService: IApplicationDocsService;
  applicationService: IApplicationService;
  notificationService: INotificationService;
  analyticsService: IAnalyticsService;
  careerAssistantService: ICareerAssistantService;
  scheduler: SchedulerService;
  authService: IAuthService;
  /** Resolves a fallback user id for pre-auth endpoints (prefers the JWT user). */
  resolveDemoUserId: () => Promise<string>;
}

/** Builds the production container wired to Prisma + the default providers. */
export function buildContainer(): AppContainer {
  const dedup = new DeduplicationAgent();
  const registry = buildDefaultRegistry(
    {
      cache: new InMemoryCache(),
      logger,
      rateLimitMs: 500,
      retries: 2,
    },
    { jsearchApiKey: env.JSEARCH_API_KEY, jsearchHost: env.JSEARCH_HOST },
  );
  const searchAgent = new SearchAgent(registry, dedup, logger);

  const jobRepo = new JobRepository(prisma);
  const companyRepo = new CompanyRepository(prisma);
  const searchHistoryRepo = new SearchHistoryRepository(prisma);

  const jobService = new JobService(jobRepo, companyRepo, dedup);
  const searchService = new SearchService(searchAgent, jobService, searchHistoryRepo, logger);

  // Resume & Application (Phase 4)
  const resumeRepo = new ResumeRepository(prisma);
  const textExtraction = new TextExtractionService(
    [new PdfTextExtractor(), new DocxTextExtractor(), new TxtTextExtractor()],
    logger,
    new TesseractOcrExtractor(logger),
  );
  const resumeService = new ResumeService(
    resumeRepo,
    new LocalStorage(env.UPLOAD_DIR),
    textExtraction,
    new HeuristicStructuredExtractor(),
    logger,
  );

  // AI agents (Phase 5) — LLM or heuristic backend depending on config.
  const agents = buildAiAgents();
  const matchResultRepo = new MatchResultRepository(prisma);
  const resumeVersionRepo = new ResumeVersionRepository(prisma);
  const coverLetterRepo = new CoverLetterRepository(prisma);

  const jobAnalysisService = new JobAnalysisService(agents.jobAnalysis, jobRepo);
  const matchingService = new MatchingService(
    agents.matching,
    agents.jobAnalysis,
    jobRepo,
    resumeRepo,
    matchResultRepo,
  );
  const applicationDocsService = new ApplicationDocsService(
    agents.optimizer,
    agents.coverLetter,
    agents.jobAnalysis,
    jobRepo,
    resumeRepo,
    resumeVersionRepo,
    coverLetterRepo,
  );

  // Auth + application workflow (Phase 6)
  const userRepo = new UserRepository(prisma);
  const authService = new AuthService(userRepo);
  const applicationRepo = new ApplicationRepository(prisma);
  const applicationService = new ApplicationService(applicationRepo, jobRepo, resumeRepo);

  // Notifications (Phase 8): in-app always on; Telegram/email if configured.
  const notificationService = new NotificationService(
    [
      new InAppChannel(),
      new TelegramChannel({ token: env.TELEGRAM_TOKEN, defaultChatId: env.TELEGRAM_CHAT_ID }),
      new EmailChannel({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        user: env.EMAIL_USER,
        password: env.EMAIL_PASSWORD,
        from: env.EMAIL_FROM,
      }),
    ],
    new NotificationRepository(prisma),
    userRepo,
    logger,
  );

  // Analytics, career assistant, scheduler (Phase 9)
  const analyticsService = new AnalyticsService(prisma);
  const careerAssistantService = new CareerAssistantService(
    agents.matching,
    agents.jobAnalysis,
    agents.assistant,
    jobRepo,
    resumeRepo,
  );
  const scheduler = new SchedulerService(
    prisma,
    searchService,
    notificationService,
    analyticsService,
    logger,
  );

  const resolveDemoUserId = async (): Promise<string> => {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) {
      throw new Error('No user found — run `npm run prisma:seed` to create the demo user');
    }
    return user.id;
  };

  return {
    jobService,
    searchService,
    resumeService,
    jobAnalysisService,
    matchingService,
    applicationDocsService,
    applicationService,
    notificationService,
    analyticsService,
    careerAssistantService,
    scheduler,
    authService,
    resolveDemoUserId,
  };
}
