# SHANGO Project Model

## Canonical Owner

Project.files is the single source of truth.

Everything else is derived from Project.files.

## Project

Project owns:

- metadata
- versions
- deployments
- settings
- files

The project workspace is represented by Project.files.

## GeneratedArtifact

GeneratedArtifact is a temporary transport object produced by AI generation.

It exists only during generation and is not the canonical project.

It may contain:

- html
- css
- js
- metadata

## Project.artifact

Project.artifact is a derived render projection.

It is used only for:

- PreviewPanel
- rendering
- UI convenience

It never owns the workspace.

## Version

Version stores snapshots of Project.files.

Versions are not snapshots of Project.artifact.

## Preview

Preview is always derived from Project.files.

Preview is never the source of truth.

## Code Explorer

Code Explorer always reads from Project.files.

## Persistence

Persistence persists Project.files.

Project.artifact may be regenerated when required.

## Deployment

Deployment deploys Project.files.

## GitHub Export

GitHub export exports Project.files.

## ZIP Export

ZIP export exports Project.files.

## Iteration

AI modifies Project.files.

Artifact is regenerated afterwards.

## Ownership Flow

```text
Prompt
  → Provider
  → GeneratedArtifact
  → Project.files
  → Derived Artifact
  → Preview
```

## Architectural Rule

Project.files is the permanent canonical workspace.

GeneratedArtifact is a temporary transport object.

Project.artifact is a derived render projection.

Every future implementation follows this ownership model.
