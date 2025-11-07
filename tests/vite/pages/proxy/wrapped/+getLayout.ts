import { GetLayout } from "@alignable/bifrost/config";

// Could use zod for validation
const VALID_LAYOUTS = ["main_nav", "biz_layout", "visitor"];

const getLayout: GetLayout = function (headers) {
  const layoutName = headers["x-react-layout"] as string;
  const currentNav = headers["x-react-current-nav"] as string;

  if (VALID_LAYOUTS.includes(layoutName)) {
    return {
      [layoutName]: {
        currentNav,
      },
    };
  }
  return null;
};
export default getLayout;
