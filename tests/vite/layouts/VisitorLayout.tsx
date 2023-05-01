import React from "react";
import { LayoutComponent } from "./types";

export const VisitorLayout: LayoutComponent = (props) => (
  <div>
    <nav>visitor layout</nav>
    <p>selected: {props.currentNav}</p>
    {props.children}
  </div>
);