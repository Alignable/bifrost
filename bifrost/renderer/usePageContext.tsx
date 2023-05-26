// `usePageContext` allows us to access `pageContext` in any React component.
// See https://vite-plugin-ssr.com/pageContext-anywhere

import React, { useContext } from 'react'
import { PageContext } from "../types/internal.js";
import { getGlobalObject } from './utils/getGlobalObject.js';

export { PageContextProvider }
export { usePageContext }

const { Context } = getGlobalObject('PageContextProvider.ts', {
  Context: React.createContext<PageContext>(undefined as never)
})

function PageContextProvider({ pageContext, children }: { pageContext: PageContext; children: React.ReactNode }) {
  if (!pageContext) throw new Error('Argument pageContext missing')
  return <Context.Provider value={pageContext}>{children}</Context.Provider>
}

/** Access the pageContext from any React component */
function usePageContext() {
  const pageContext = useContext(Context)
  if (!pageContext) throw new Error('<PageContextProvider> is needed for being able to use usePageContext()')
  return pageContext
}
