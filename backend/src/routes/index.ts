import { Router } from 'express';
import { healthRouter } from './health.routes.js';

/**
 * Root API router. Feature routers (jobs, resume, applications, …) are
 * mounted here in their respective phases.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);

// Placeholder mounts for later phases (kept documented, not yet implemented):
// apiRouter.use('/jobs', jobsRouter);            // Phase 3
// apiRouter.use('/resume', resumeRouter);        // Phase 4
// apiRouter.use('/applications', applicationsRouter); // Phase 6
// apiRouter.use('/analytics', analyticsRouter);  // Phase 9
