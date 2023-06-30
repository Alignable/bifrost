import { LayoutComponent } from "@alignable/bifrost";
import React from "react";

export const MainNavLayout: LayoutComponent = (props) => (
  <div>
    <nav>Main Nav Layout vite</nav>
    <p>selected: {props.currentNav}</p>
    {props.children}
  </div>
);