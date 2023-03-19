import { LayoutComponent } from "@vite-turbolinks-bridge/types";
import React from "react";

export const VisitorLayout: LayoutComponent = (props) => (
  <div>
    <nav>visitor layout</nav>
    <p>selected: {props.currentNav}</p>
    {props.children}
  </div>
);