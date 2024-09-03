import React from "react";
import { PropsWithChildren } from "react";

export const PassThruLayout: React.ComponentType<PropsWithChildren> = ({
  children,
}) => <>{children}</>;
