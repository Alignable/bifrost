import React from "react";
import { LayoutComponent } from "./types";

export const MainNavLayout: LayoutComponent = (props) => (
  <div>
    <nav>Main Nav Layout vite</nav>
    <p>selected: {props.currentNav}</p>
    {props.children}
  </div>
);