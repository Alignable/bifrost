import { OnBeforeRender } from "@alignable/bifrost";

const onBeforeRender: OnBeforeRender = (pageContext) => {
  return {
    pageContext: { layoutProps: { currentNav: "INSERTED BY ONBEFORERENDER" } },
  };
};

export default onBeforeRender;
