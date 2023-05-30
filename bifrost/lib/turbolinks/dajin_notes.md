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

- we have double popState listeners. Use turbolinks' or VPS'?
- Turbolinks needs to communicate to onBeforeRoute whether to issueRequest or restore snapshot
- how do we hook into the request status?
  - VPS uses fetch which lacks progress support - progress bar is either dead or fake or we ask brillout for new feature
  - idea: passToClient status code and handle in onRenderClient: if fail, early return?
- when issuerequest/changehistory/loadcachedsnapshot is called, `navigate`. maybe just do it on issueRequest and no-op the latter 2
- onRenderClient: call adapter.requestCompletedWithResponse (and maybe withSTatusCode if possible) and requestFinished. await adapter calling loadResponse
-
