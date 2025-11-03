import { GetLayout } from "@alignable/bifrost/config";

const getLayout: GetLayout = function (headers) {
  return {
    layout: headers["x-react-layout"] as string,
    layoutProps: {
      currentNav: headers["x-react-current-nav"] as string,
    },
  };
};
export default getLayout;
