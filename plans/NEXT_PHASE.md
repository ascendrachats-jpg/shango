# NEXT_PHASE - Antigravity Phase 2: Integration & Provider Normalization

## Phase 1 Complete ✓

Core merge engine implemented and thoroughly tested:
- `src/lib/antigravity.ts` - Deterministic merge engine with full validation
- 23 comprehensive tests covering all invariants
- All 147 tests passing with no regressions
- Protected files enforced (package.json, tsconfig.json, .env*)
- Provenance recording infrastructure ready

## Phase 2 - Next: Versioning Integration & Provider Pipeline

Phase Name
----------
Antigravity Phase 2: Versioning Integration & Provider Normalization

Objective
---------
Integrate the Antigravity merge engine into the generation pipeline and make all provider responses deterministic.

Success Criteria
----------------
- ✓ applyGenerationResultToProject() uses antigravity merge engine instead of artifact-based merge
- ✓ normalizeProviderOperations() converts all artifact responses to BuildFileOperation[]
- ✓ recordMergeProvenance() captures operation metadata in GenerationProvenance
- ✓ All existing tests pass with no regressions
- ✓ Version history preserves full merge provenance for rollback
- ✓ TypeCheck, build, and all tests remain clean

Implementation Checklist
------------------------
1. [ ] Update `src/lib/versioning.ts` applyGenerationResultToProject()
   - Replace mergeWorkspaceFilesWithArtifact() call with buildAntigravityMerge()
   - Apply normalized operations instead of raw artifact
   - Capture provenance with recordMergeProvenance()

2. [ ] Validate integration with existing tests
   - All 124 existing tests must pass
   - versioning.test.ts passes without modification
   - Generation flow unchanged for consumers

3. [ ] Optional Phase 2b: Provider pipeline normalization
   - Add normalizeProviderOperations() call in generation.ts
   - Store normalized operations in GenerationResult
   - Update server generation pipeline to normalize before returning

4. [ ] Update CURRENT_MILESTONE on completion

Expected Outcomes
-----------------
- Workspace-first model fully enforced in runtime
- All file operations deterministic and auditable
- Provenance captured at operation level with full metadata
- Rollback capability enabled via version history
- Zero breaking changes for existing functionality

Files to Modify (Phase 2)
------------------------
- `src/lib/versioning.ts` - applyGenerationResultToProject()
- `src/lib/generation.ts` - Optional: integrate provider normalization
- `CURRENT_MILESTONE.md` - Update on completion

Files to Review (Reference Only - Frozen)
------------------------------------------
- `SHANGO_ARCHITECTURE.md`
- `SHANGO_PROJECT_MODEL.md`
- `SHANGO_INTELLIGENCE_ARCHITECTURE.md`
- `SHANGO_PROVENANCE_ARCHITECTURE.md`

Testing Strategy
----------------
1. Run existing 124 tests - must all pass
2. Run new 23 antigravity tests - must all pass
3. No new tests needed - coverage already exists
4. TypeCheck, build, lint all pass
5. Manual verification of generation flow in UI

Definition of Complete (Phase 2)
-------------------------------
Phase 2 is complete when:
- versioning.ts uses antigravity merge engine
- All 147 tests pass with no regressions
- Provenance is captured for every generation
- TypeCheck and build are clean
- Version history preserves full audit trail
