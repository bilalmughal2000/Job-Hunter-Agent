# frontend/

The Angular dashboard is scaffolded in **Phase 7**. It will be a standalone
Angular (latest) + Angular Material + RxJS/Signals app created with:

```bash
npx @angular/cli@latest new frontend --directory . --style=scss --routing --ssr=false
```

Planned pages (see spec §"Dashboard Features"): Dashboard, Today's Jobs, Saved
Jobs, Applied Jobs, Resume Manager, Cover Letters, Applications board,
Analytics, Settings, Notifications, Search History, Admin.

The production image (`docker/frontend.Dockerfile`) builds this app and serves
it through nginx, proxying `/api/` to the backend. It is intentionally tolerant
of the app not existing yet so the Docker skeleton builds during Phase 1.
