import { navigate } from "@alignable/bifrost";
import React, { useEffect } from "react";

export function Page() {
  useEffect(() => {
    navigate("/auto-navigate/destination");
  });
  return <div>this page navigates away immediately</div>;
}
