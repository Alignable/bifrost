dajin rubberducking 🐥

### Click link flow/visit

- click link/Turbolinks.visit
- controller checks if destination should be handled turbolinks. if so, **proposes** the visit to the adapter
- `adapter#visitProposedToLocationWithAction`: browser adapter responds to proposal by calling controller `startVisitToLocationWithAction`. (iOS uses proposal to setup buttons and sometimes does NOT start the visit so it can intercept and show native UI instead!)
- `controller#startVisitToLocationWithAction`: controller creates the Visit and starts it.
- `visit#start`: visit tells adapter `visitStarted`
- `adapter#visitStarted`: adapter just tells visit to issuerequest or use snapshot cache (iOS adapter has custom placeholder loading logic it has to handle)
- if request was issued, visit gets called back with response and status code (`requestCompletedWithResponse` or `requestFailedWithStatusCode`)
- visit forwards the callback to the adapter
- `adapter#visitRequestCompleted` goes back to visit `loadResponse` (iOS has special behavior to take a screenshot of old page and show it while new page is rendering... weird but it means we must wait for the adapter to call loadResponse... also on Fail it intercepts status code to change behavior)
- `visit#loadResponse` caches a snapshot, creates new Snapshot from http response and asks controller to render it. also tells adapter it rendered which does nothing on web. (iOS uses this to remove the placeholder)

How to translate this to VPS
- in short, the async gap of `visit.issueRequest` => `adapter.visitRequestCompleted` is replaced by `navigate` => `onRenderClient`. From Turbolinks' perspective nothing has really changed.
- One complication is render itself is now async because we wait for blocking head scripts to run so Turbolinks internals had to be adapted.


Open questions
- we have double popState listeners. Use turbolinks' or VPS'?
- how do we hook into the request status?
  - VPS uses fetch which lacks progress support - progress bar is either dead or fake or we ask brillout for new feature
  - idea: passToClient status code and handle in onRenderClient: if fail, early return?


can we use turbolinks renderer interface?
- snapshot renderer works for proxied pages? - adapt mergeHead back in? Major change is async since we have to wait for blocking scripts.
- existing flow of rendering is:
  1. get html from server
  2. create snapshot
  3. render from snapshot
- this works for turbolinks cause it makes rendering from cache and rendering from fresh request the same
- Problem: new pages dont have snapshots, nor should they
- new render flow:
  1. get pageContext from VPS (cached or not) + any useHistoryState automatically is pulled
  2. render
- is there anything to share?
  - we need the turbolinks adapter to run for iOS
  - head merging? we could leave head scripts in string format (from onRenderHtml pipeline) and reuse turbolinks merging functionality
- snapshot format:
  - snapshotting and pagecontext go hand in hand.
  - the format that the index.pageContext.json response returns should ideally correspond to the snapshot.
  - option 1: take the pagecontext and build snapshot if it does not exist yet. onbeforeroute restores snapshot when visit says it should. Use the snapshot and its helpers to render
  - option 2: convert snapshot to "dumb" and just have it store an object and use existing rendering path.

  - snapshot answers questions about the body by turning body string into a real thing. that's not good cause react is just going to do it again.
  - altho we have to do it anyway to pull body out of big html