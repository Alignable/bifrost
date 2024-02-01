import React, { useContext, useState } from "react";
import { getGlobalObject } from "./utils/getGlobalObject.js";

export { NavigationProvider };
export { useNavigation };
export { setNavigation };

let setNavigation = (navigation: Navigation) => {};

interface Navigation {
  state: "idle" | "loading";
}

const { Context } = getGlobalObject("useNavigation.ts", {
  Context: React.createContext<Navigation>(undefined as never),
});

function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [navigation, setNav] = useState<Navigation>({ state: "idle" });
  // bit of a hack - lets us trigger from outside react.
  setNavigation = setNav;
  if (!navigation) throw new Error("Argument navigation missing");
  return <Context.Provider value={navigation}>{children}</Context.Provider>;
}

/** Access the navigation from any React component */
function useNavigation() {
  const navigation = useContext(Context);
  if (!navigation)
    throw new Error(
      "<NavigationProvider> is needed for being able to use useNavigation()"
    );
  return navigation;
}
