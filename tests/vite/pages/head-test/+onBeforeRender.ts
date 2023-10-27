import { OnBeforeRenderSync } from "@alignable/bifrost";

const onBeforeRender: OnBeforeRenderSync = (pageContext) => {
  return {
    pageContext: { layoutProps: { currentNav: "INSERTED BY ONBEFORERENDER" } },
  };
};

export default onBeforeRender;
