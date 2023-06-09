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
