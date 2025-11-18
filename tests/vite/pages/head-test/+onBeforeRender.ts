import { PageContext } from "vike/types";

const onBeforeRender = (pageContext: PageContext) => {
  pageContext.currentNav = "INSERTED BY ONBEFORERENDER";
};

export default onBeforeRender;
