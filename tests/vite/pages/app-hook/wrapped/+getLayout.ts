import { GetLayout } from "@alignable/bifrost/config";

const getLayout: GetLayout = (headers) =>
  headers["x-react-layout"]
    ? { main_nav: { currentNav: headers["x-react-current-nav"] as string } }
    : null;

export default getLayout;
