import { OnBeforeRenderAsync } from "@alignable/bifrost";

function sleep(timeout: number) {
  return new Promise(function (resolve) {
    setTimeout(resolve, timeout);
  });
}
const onBeforeRender: OnBeforeRenderAsync = async (pageContext) => {
  await sleep(500);
  return {
    pageContext: {},
  };
};

export default onBeforeRender;
