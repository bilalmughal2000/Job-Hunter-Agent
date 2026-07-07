# providers/

One pluggable module per job source, each implementing a shared
`JobSourceProvider` interface (Phase 3). Sources: LinkedIn (compliant/export
only), Indeed, Rozee.pk, Mustakbil, Wellfound, Google Jobs, Greenhouse, Lever,
company career pages. Providers must respect each site's Terms of Service.
