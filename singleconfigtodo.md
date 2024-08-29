- typescript needs to be a discriminated union?
- need wrapped/restoration to be able to live on the same route

  - onbeforerender needs to be isomorphic so that when it is restoration, the client can choose not to make a network request. This can no longer be config/route controller and is now a runtime decision by onBeforeRender
  - subgoal: skip bifrost entirely on client navigation to rails pages

- simplify import paths?
