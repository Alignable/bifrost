import { GetLayout } from "@alignable/bifrost/config";

const getLayout: GetLayout = function (headers) {
  if (headers["x-react-layout"] !== "visitor_layout") return null;
  return {
    bench_visitor: {
      currentNav: headers["x-react-current-nav"] as string,
      tracking: decodeURIComponent(headers["x-react-tracking"] as string),
      footer: headers["x-react-footer"] === "true",
    },
  };
};
export default getLayout;
