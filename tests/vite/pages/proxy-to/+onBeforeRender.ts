import { render } from "vike/abort";
import { PageContext } from "vike/types";

export default function () {
  throw render(`/custom?page={"title":"b"}`);
}
