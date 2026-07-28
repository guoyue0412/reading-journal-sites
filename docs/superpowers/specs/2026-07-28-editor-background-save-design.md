# Editor Background Save Design

## Goal

Keep the writing cursor and newest local text stable while a draft is saved in the background.

## Behaviour

- Editing updates the local draft and recovery copy immediately.
- A save begins 800 ms after the most recent change.
- Only one request may save at a time. If typing continues during that request, save the newest pending draft after it finishes.
- A completed request may update the server version, but may never replace newer local text.
- The toolbar communicates waiting, saving, saved, failure, and version-conflict states without reloading the editor.
- Explicit operations such as publish and changing articles flush pending edits first.

## Validation

Source-level tests cover the debounce delay, serialized saves, and protection against stale save responses. The production build and existing test suite must pass.
